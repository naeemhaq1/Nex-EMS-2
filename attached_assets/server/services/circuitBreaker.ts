import { db } from '../db';
import { whatsappMessageLogs, whatsappBlacklist, whatsappSpamConfig } from '@shared/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export interface CircuitBreakerConfig {
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
  maxMessagesPerDay: number;
  blacklistThreshold: number;
  blockDurationMinutes: number;
  suspiciousPatternDetection: boolean;
  aiUsageLimit: number;
  aiCooldownMinutes: number;
}

export interface MessageAnalysis {
  isBlocked: boolean;
  reason?: string;
  rateLimit?: {
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  riskScore: number;
  actions: string[];
}

export class WhatsAppCircuitBreaker {
  private static instance: WhatsAppCircuitBreaker;
  private config: CircuitBreakerConfig;
  private cache: Map<string, any> = new Map();

  private constructor() {
    // Very reasonable limits that only block genuine spam and malicious use
    this.config = {
      maxMessagesPerMinute: 30, // 30 messages/min - generous for normal employee conversations
      maxMessagesPerHour: 200,  // 200 messages/hour - allows heavy business usage
      maxMessagesPerDay: 1000,  // 1000 messages/day - enterprise-level daily limit
      blacklistThreshold: 90,   // High threshold (90 risk score) - only auto-blacklist extreme cases
      blockDurationMinutes: 60, // 1 hour temporary blocks - reasonable timeout
      suspiciousPatternDetection: true,
      aiUsageLimit: 100,        // 100 AI requests/day - generous for registered employees
      aiCooldownMinutes: 2      // 2 minute AI cooldown - minimal delay
    };
  }

  public static getInstance(): WhatsAppCircuitBreaker {
    if (!WhatsAppCircuitBreaker.instance) {
      WhatsAppCircuitBreaker.instance = new WhatsAppCircuitBreaker();
    }
    return WhatsAppCircuitBreaker.instance;
  }

  public async loadConfig(): Promise<void> {
    try {
      const [configRecord] = await db.select().from(whatsappSpamConfig).limit(1);
      if (configRecord) {
        this.config = {
          maxMessagesPerMinute: configRecord.maxMessagesPerMinute,
          maxMessagesPerHour: configRecord.maxMessagesPerHour,
          maxMessagesPerDay: configRecord.maxMessagesPerDay,
          blacklistThreshold: configRecord.blacklistThreshold,
          blockDurationMinutes: configRecord.blockDurationMinutes,
          suspiciousPatternDetection: configRecord.suspiciousPatternDetection,
          aiUsageLimit: configRecord.aiUsageLimit,
          aiCooldownMinutes: configRecord.aiCooldownMinutes
        };
      }
    } catch (error) {
      console.error('[CircuitBreaker] Error loading config:', error);
    }
  }

  public async updateConfig(newConfig: Partial<CircuitBreakerConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    try {
      await db.insert(whatsappSpamConfig)
        .values({
          id: 1,
          maxMessagesPerMinute: this.config.maxMessagesPerMinute,
          maxMessagesPerHour: this.config.maxMessagesPerHour,
          maxMessagesPerDay: this.config.maxMessagesPerDay,
          blacklistThreshold: this.config.blacklistThreshold,
          blockDurationMinutes: this.config.blockDurationMinutes,
          suspiciousPatternDetection: this.config.suspiciousPatternDetection,
          aiUsageLimit: this.config.aiUsageLimit,
          aiCooldownMinutes: this.config.aiCooldownMinutes,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [whatsappSpamConfig.id],
          set: {
            maxMessagesPerMinute: this.config.maxMessagesPerMinute,
            maxMessagesPerHour: this.config.maxMessagesPerHour,
            maxMessagesPerDay: this.config.maxMessagesPerDay,
            blacklistThreshold: this.config.blacklistThreshold,
            blockDurationMinutes: this.config.blockDurationMinutes,
            suspiciousPatternDetection: this.config.suspiciousPatternDetection,
            aiUsageLimit: this.config.aiUsageLimit,
            aiCooldownMinutes: this.config.aiCooldownMinutes,
            updatedAt: new Date()
          }
        });
    } catch (error) {
      console.error('[CircuitBreaker] Error saving config:', error);
    }
  }

  public async analyzeMessage(phoneNumber: string, messageContent: string, isIncoming: boolean = true): Promise<MessageAnalysis> {
    const now = new Date();
    const analysis: MessageAnalysis = {
      isBlocked: false,
      riskScore: 0,
      actions: []
    };

    // Check if number is blacklisted
    const blacklistCheck = await this.isBlacklisted(phoneNumber);
    if (blacklistCheck.isBlacklisted) {
      analysis.isBlocked = true;
      analysis.reason = `Blacklisted: ${blacklistCheck.reason}`;
      analysis.riskScore = 100;
      analysis.actions.push('BLOCK_BLACKLISTED');
      return analysis;
    }

    // Get message counts for rate limiting
    const rates = await this.getMessageRates(phoneNumber);
    analysis.rateLimit = rates;

    // Rate limiting checks
    if (rates.perMinute >= this.config.maxMessagesPerMinute) {
      analysis.isBlocked = true;
      analysis.reason = `Rate limit exceeded: ${rates.perMinute} messages per minute`;
      analysis.riskScore += 40;
      analysis.actions.push('RATE_LIMIT_MINUTE');
    }

    if (rates.perHour >= this.config.maxMessagesPerHour) {
      analysis.isBlocked = true;
      analysis.reason = `Rate limit exceeded: ${rates.perHour} messages per hour`;
      analysis.riskScore += 30;
      analysis.actions.push('RATE_LIMIT_HOUR');
    }

    if (rates.perDay >= this.config.maxMessagesPerDay) {
      analysis.isBlocked = true;
      analysis.reason = `Rate limit exceeded: ${rates.perDay} messages per day`;
      analysis.riskScore += 20;
      analysis.actions.push('RATE_LIMIT_DAY');
    }

    // Suspicious pattern detection
    if (this.config.suspiciousPatternDetection) {
      const patternRisk = await this.analyzeSuspiciousPatterns(phoneNumber, messageContent);
      analysis.riskScore += patternRisk.score;
      analysis.actions.push(...patternRisk.actions);

      if (patternRisk.score >= 50) {
        analysis.isBlocked = true;
        analysis.reason = `Suspicious pattern detected: ${patternRisk.reason}`;
      }
    }

    // Auto-blacklist if threshold reached
    if (analysis.riskScore >= this.config.blacklistThreshold && !blacklistCheck.isBlacklisted) {
      await this.addToBlacklist(phoneNumber, `Auto-blacklisted: Risk score ${analysis.riskScore}`);
      analysis.actions.push('AUTO_BLACKLIST');
    }

    return analysis;
  }

  /**
   * Main method to check if a message should be processed (called by chatbot)
   */
  public async shouldProcessMessage(phoneNumber: string, messageContent: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const analysis = await this.analyzeMessage(phoneNumber, messageContent, true);
      
      if (analysis.isBlocked) {
        return {
          allowed: false,
          reason: analysis.reason || 'Message blocked by circuit breaker'
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[CircuitBreaker] Error in shouldProcessMessage:', error);
      // Fail open - allow message if there's an error to prevent service disruption
      return { allowed: true };
    }
  }

  private async getMessageRates(phoneNumber: string): Promise<{ perMinute: number; perHour: number; perDay: number }> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const [perMinute] = await db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessageLogs)
        .where(and(
          eq(whatsappMessageLogs.phoneNumber, phoneNumber),
          gte(whatsappMessageLogs.timestamp, oneMinuteAgo)
        ));

      const [perHour] = await db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessageLogs)
        .where(and(
          eq(whatsappMessageLogs.phoneNumber, phoneNumber),
          gte(whatsappMessageLogs.timestamp, oneHourAgo)
        ));

      const [perDay] = await db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessageLogs)
        .where(and(
          eq(whatsappMessageLogs.phoneNumber, phoneNumber),
          gte(whatsappMessageLogs.timestamp, oneDayAgo)
        ));

      return {
        perMinute: Number(perMinute?.count || 0),
        perHour: Number(perHour?.count || 0),
        perDay: Number(perDay?.count || 0)
      };
    } catch (error) {
      console.error('[CircuitBreaker] Error getting message rates:', error);
      return { perMinute: 0, perHour: 0, perDay: 0 };
    }
  }

  private async isBlacklisted(phoneNumber: string): Promise<{ isBlacklisted: boolean; reason?: string }> {
    try {
      const [blacklistEntry] = await db.select()
        .from(whatsappBlacklist)
        .where(and(
          eq(whatsappBlacklist.phoneNumber, phoneNumber),
          eq(whatsappBlacklist.isActive, true)
        ))
        .limit(1);

      if (blacklistEntry) {
        // Check if temporary block has expired
        if (blacklistEntry.expiresAt && new Date() > blacklistEntry.expiresAt) {
          await db.update(whatsappBlacklist)
            .set({ isActive: false })
            .where(eq(whatsappBlacklist.id, blacklistEntry.id));
          return { isBlacklisted: false };
        }

        return { 
          isBlacklisted: true, 
          reason: blacklistEntry.reason 
        };
      }

      return { isBlacklisted: false };
    } catch (error) {
      console.error('[CircuitBreaker] Error checking blacklist:', error);
      return { isBlacklisted: false };
    }
  }

  private async addToBlacklist(phoneNumber: string, reason: string, permanent: boolean = false): Promise<void> {
    try {
      const expiresAt = permanent ? null : new Date(Date.now() + this.config.blockDurationMinutes * 60 * 1000);

      await db.insert(whatsappBlacklist)
        .values({
          phoneNumber,
          reason,
          isActive: true,
          isPermanent: permanent,
          expiresAt,
          createdAt: new Date()
        });

      console.log(`[CircuitBreaker] Added ${phoneNumber} to blacklist: ${reason}`);
    } catch (error) {
      console.error('[CircuitBreaker] Error adding to blacklist:', error);
    }
  }

  private async analyzeSuspiciousPatterns(phoneNumber: string, messageContent: string): Promise<{ score: number; reason: string; actions: string[] }> {
    let score = 0;
    const reasons: string[] = [];
    const actions: string[] = [];

    // Check for spam keywords
    const spamKeywords = ['urgent', 'click here', 'call now', 'free', 'winner', 'congratulations', 'offer', 'limited time'];
    const foundSpamWords = spamKeywords.filter(keyword => 
      messageContent.toLowerCase().includes(keyword.toLowerCase())
    );

    if (foundSpamWords.length > 0) {
      score += foundSpamWords.length * 10;
      reasons.push(`Spam keywords: ${foundSpamWords.join(', ')}`);
      actions.push('SPAM_KEYWORDS');
    }

    // Check for excessive special characters
    const specialCharCount = (messageContent.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    const specialCharRatio = specialCharCount / messageContent.length;

    if (specialCharRatio > 0.3) {
      score += 20;
      reasons.push('Excessive special characters');
      actions.push('SPECIAL_CHARS');
    }

    // Check for very long messages
    if (messageContent.length > 1000) {
      score += 15;
      reasons.push('Extremely long message');
      actions.push('LONG_MESSAGE');
    }

    // Check for repeated identical messages
    try {
      const recentSimilar = await db.select({ count: sql<number>`count(*)` })
        .from(whatsappMessageLogs)
        .where(and(
          eq(whatsappMessageLogs.phoneNumber, phoneNumber),
          eq(whatsappMessageLogs.messageText, messageContent),
          gte(whatsappMessageLogs.timestamp, new Date(Date.now() - 60 * 60 * 1000))
        ));

      const similarCount = Number(recentSimilar[0]?.count || 0);
      if (similarCount >= 3) {
        score += 30;
        reasons.push(`Repeated message ${similarCount} times`);
        actions.push('REPEATED_MESSAGE');
      }
    } catch (error) {
      console.error('[CircuitBreaker] Error checking repeated messages:', error);
    }

    return {
      score,
      reason: reasons.join('; '),
      actions
    };
  }

  public async logMessage(
    phoneNumber: string, 
    messageContent: string, 
    direction: 'inbound' | 'outbound', 
    employeeCode?: string | null,
    riskScore: number = 0,
    isBlocked: boolean = false,
    blockReason?: string,
    aiUsed: boolean = false
  ): Promise<void> {
    try {
      await db.insert(whatsappMessageLogs)
        .values({
          phoneNumber,
          messageText: messageContent.substring(0, 1000), // Truncate long messages
          direction,
          messageType: 'text', // Default message type
          employeeCode,
          riskScore,
          isBlocked,
          blockReason,
          aiUsed,
          timestamp: new Date(),
          processed: true
        });
    } catch (error) {
      console.error('[CircuitBreaker] Error logging message:', error);
    }
  }

  public getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  public async getBlacklistedNumbers(): Promise<Array<{ phoneNumber: string; reason: string; createdAt: Date; expiresAt?: Date }>> {
    try {
      return await db.select({
        phoneNumber: whatsappBlacklist.phoneNumber,
        reason: whatsappBlacklist.reason,
        createdAt: whatsappBlacklist.createdAt,
        expiresAt: whatsappBlacklist.expiresAt
      })
        .from(whatsappBlacklist)
        .where(eq(whatsappBlacklist.isActive, true))
        .orderBy(desc(whatsappBlacklist.createdAt));
    } catch (error) {
      console.error('[CircuitBreaker] Error getting blacklist:', error);
      return [];
    }
  }

  public async removeFromBlacklist(phoneNumber: string): Promise<void> {
    try {
      await db.update(whatsappBlacklist)
        .set({ isActive: false })
        .where(eq(whatsappBlacklist.phoneNumber, phoneNumber));
      
      console.log(`[CircuitBreaker] Removed ${phoneNumber} from blacklist`);
    } catch (error) {
      console.error('[CircuitBreaker] Error removing from blacklist:', error);
    }
  }
}

export const circuitBreaker = WhatsAppCircuitBreaker.getInstance();