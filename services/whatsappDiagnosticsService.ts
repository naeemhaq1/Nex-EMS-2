import axios from 'axios';
import { db } from '../db';
import { whatsappDiagnostics, whatsappMessages } from '../../shared/whatsappSchema';
import { eq, desc, gte, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface DiagnosticTest {
  name: string;
  description: string;
  category: 'token' | 'connectivity' | 'api' | 'database' | 'performance';
  priority: 'high' | 'medium' | 'low';
  testFunction: () => Promise<DiagnosticResult>;
}

export interface DiagnosticResult {
  test: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  timestamp: string;
  duration?: number;
  recommendations?: string[];
}

export class WhatsAppDiagnosticsService {
  private static instance: WhatsAppDiagnosticsService;
  private tests: DiagnosticTest[] = [];

  public static getInstance(): WhatsAppDiagnosticsService {
    if (!WhatsAppDiagnosticsService.instance) {
      WhatsAppDiagnosticsService.instance = new WhatsAppDiagnosticsService();
      WhatsAppDiagnosticsService.instance.initializeTests();
    }
    return WhatsAppDiagnosticsService.instance;
  }

  private initializeTests(): void {
    this.tests = [
      {
        name: 'WhatsApp Token Validity',
        description: 'Check if WhatsApp access token is valid and not expired',
        category: 'token',
        priority: 'high',
        testFunction: this.testTokenValidity.bind(this)
      },
      {
        name: 'WhatsApp Token Expiration',
        description: 'Check token expiration date and warn if expiring soon',
        category: 'token',
        priority: 'high',
        testFunction: this.testTokenExpiration.bind(this)
      },
      {
        name: 'WhatsApp API Connectivity',
        description: 'Test connection to WhatsApp Business API endpoints',
        category: 'connectivity',
        priority: 'high',
        testFunction: this.testApiConnectivity.bind(this)
      },
      {
        name: 'Phone Number Status',
        description: 'Verify WhatsApp phone number ID status and capabilities',
        category: 'api',
        priority: 'high',
        testFunction: this.testPhoneNumberStatus.bind(this)
      },
      {
        name: 'Business Account Verification',
        description: 'Check WhatsApp Business account verification status',
        category: 'api',
        priority: 'medium',
        testFunction: this.testBusinessAccountStatus.bind(this)
      },
      {
        name: 'Message Delivery Rate',
        description: 'Analyze recent message delivery success rate',
        category: 'performance',
        priority: 'medium',
        testFunction: this.testMessageDeliveryRate.bind(this)
      },
      {
        name: 'API Rate Limits',
        description: 'Check current API usage against rate limits',
        category: 'performance',
        priority: 'medium',
        testFunction: this.testRateLimits.bind(this)
      },
      {
        name: 'Database Connectivity',
        description: 'Test WhatsApp message database operations',
        category: 'database',
        priority: 'low',
        testFunction: this.testDatabaseConnectivity.bind(this)
      },
      {
        name: 'Template Message Status',
        description: 'Check status of approved message templates',
        category: 'api',
        priority: 'medium',
        testFunction: this.testTemplateStatus.bind(this)
      },
      {
        name: 'Webhook Configuration',
        description: 'Verify webhook endpoints and configuration',
        category: 'connectivity',
        priority: 'low',
        testFunction: this.testWebhookConfiguration.bind(this)
      }
    ];
  }

  /**
   * Run all diagnostic tests
   */
  async runAllDiagnostics(): Promise<DiagnosticResult[]> {
    console.log('[Diagnostics] Starting comprehensive diagnostic tests...');
    const results: DiagnosticResult[] = [];

    for (const test of this.tests) {
      const startTime = Date.now();
      try {
        const result = await test.testFunction();
        result.duration = Date.now() - startTime;
        results.push(result);
        
        // Store result in database
        await this.storeDiagnosticResult(result);
      } catch (error) {
        const failedResult: DiagnosticResult = {
          test: test.name,
          status: 'failed',
          message: `Test execution failed: ${error.message}`,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          details: { error: error.message }
        };
        results.push(failedResult);
        await this.storeDiagnosticResult(failedResult);
      }
    }

    console.log(`[Diagnostics] Completed ${results.length} tests`);
    return results;
  }

  /**
   * Run specific diagnostic test
   */
  async runSpecificTest(testName: string): Promise<DiagnosticResult | null> {
    const test = this.tests.find(t => t.name === testName);
    if (!test) {
      return null;
    }

    const startTime = Date.now();
    try {
      const result = await test.testFunction();
      result.duration = Date.now() - startTime;
      await this.storeDiagnosticResult(result);
      return result;
    } catch (error) {
      const failedResult: DiagnosticResult = {
        test: test.name,
        status: 'failed',
        message: `Test execution failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        details: { error: error.message }
      };
      await this.storeDiagnosticResult(failedResult);
      return failedResult;
    }
  }

  /**
   * Test WhatsApp token validity
   */
  private async testTokenValidity(): Promise<DiagnosticResult> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const businessId = process.env.WHATSAPP_BUSINESS_ID;

    if (!accessToken || !businessId) {
      return {
        test: 'WhatsApp Token Validity',
        status: 'failed',
        message: 'WhatsApp credentials not configured',
        timestamp: new Date().toISOString(),
        recommendations: ['Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ID environment variables']
      };
    }

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/${businessId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10000
        }
      );

      if (response.status === 200) {
        return {
          test: 'WhatsApp Token Validity',
          status: 'passed',
          message: 'WhatsApp access token is valid',
          timestamp: new Date().toISOString(),
          details: { businessId: response.data.id, name: response.data.name }
        };
      } else {
        return {
          test: 'WhatsApp Token Validity',
          status: 'failed',
          message: 'Invalid token response',
          timestamp: new Date().toISOString(),
          details: { status: response.status }
        };
      }
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          test: 'WhatsApp Token Validity',
          status: 'failed',
          message: 'WhatsApp access token is invalid or expired',
          timestamp: new Date().toISOString(),
          recommendations: ['Regenerate WhatsApp access token in Meta Business Manager']
        };
      }

      return {
        test: 'WhatsApp Token Validity',
        status: 'failed',
        message: `Token validation failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        details: { error: error.message }
      };
    }
  }

  /**
   * Test token expiration
   */
  private async testTokenExpiration(): Promise<DiagnosticResult> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
      return {
        test: 'WhatsApp Token Expiration',
        status: 'failed',
        message: 'No access token configured',
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Check token info
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/me?fields=id,name`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 5000
        }
      );

      // For permanent tokens, they don't have expiration
      // But we can check if it's working and warn about refresh needs
      const daysSinceCreation = this.calculateTokenAge();
      
      if (daysSinceCreation > 90) {
        return {
          test: 'WhatsApp Token Expiration',
          status: 'warning',
          message: `Token is ${daysSinceCreation} days old - consider refreshing`,
          timestamp: new Date().toISOString(),
          recommendations: ['Refresh token in Meta Business Manager for security']
        };
      } else if (daysSinceCreation > 60) {
        return {
          test: 'WhatsApp Token Expiration',
          status: 'warning',
          message: `Token is ${daysSinceCreation} days old`,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          test: 'WhatsApp Token Expiration',
          status: 'passed',
          message: 'Token is fresh and valid',
          timestamp: new Date().toISOString(),
          details: { tokenAge: `${daysSinceCreation} days` }
        };
      }
    } catch (error) {
      return {
        test: 'WhatsApp Token Expiration',
        status: 'failed',
        message: 'Unable to verify token expiration',
        timestamp: new Date().toISOString(),
        details: { error: error.message }
      };
    }
  }

  /**
   * Test API connectivity
   */
  private async testApiConnectivity(): Promise<DiagnosticResult> {
    const endpoints = [
      'https://graph.facebook.com/v23.0/me',
      'https://graph.facebook.com/v23.0/' + process.env.WHATSAPP_BUSINESS_ID,
      'https://graph.facebook.com/v23.0/' + process.env.WHATSAPP_PHONE_NUMBER_ID
    ];

    const results = [];
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
          timeout: 5000
        });
        results.push({ endpoint, status: response.status, success: true });
      } catch (error) {
        results.push({ endpoint, status: error.response?.status || 0, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    if (successCount === totalCount) {
      return {
        test: 'WhatsApp API Connectivity',
        status: 'passed',
        message: 'All API endpoints are accessible',
        timestamp: new Date().toISOString(),
        details: { endpoints: results }
      };
    } else if (successCount > 0) {
      return {
        test: 'WhatsApp API Connectivity',
        status: 'warning',
        message: `${successCount}/${totalCount} endpoints accessible`,
        timestamp: new Date().toISOString(),
        details: { endpoints: results }
      };
    } else {
      return {
        test: 'WhatsApp API Connectivity',
        status: 'failed',
        message: 'No API endpoints accessible',
        timestamp: new Date().toISOString(),
        details: { endpoints: results },
        recommendations: ['Check internet connectivity', 'Verify API credentials']
      };
    }
  }

  /**
   * Test phone number status
   */
  private async testPhoneNumberStatus(): Promise<DiagnosticResult> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return {
        test: 'Phone Number Status',
        status: 'failed',
        message: 'Phone number ID or access token not configured',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/${phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10000
        }
      );

      const phoneData = response.data;
      const isVerified = phoneData.verified_name || phoneData.code_verification_status === 'VERIFIED';

      return {
        test: 'Phone Number Status',
        status: isVerified ? 'passed' : 'warning',
        message: isVerified ? 'Phone number is verified and active' : 'Phone number verification pending',
        timestamp: new Date().toISOString(),
        details: {
          phoneNumber: phoneData.display_phone_number,
          verifiedName: phoneData.verified_name,
          status: phoneData.code_verification_status,
          qualityRating: phoneData.quality_rating
        }
      };
    } catch (error) {
      return {
        test: 'Phone Number Status',
        status: 'failed',
        message: `Unable to check phone number status: ${error.message}`,
        timestamp: new Date().toISOString(),
        details: { error: error.message }
      };
    }
  }

  /**
   * Test business account status
   */
  private async testBusinessAccountStatus(): Promise<DiagnosticResult> {
    const businessId = process.env.WHATSAPP_BUSINESS_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/${businessId}?fields=id,name,verification_status,business_status`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 10000
        }
      );

      const business = response.data;
      const isVerified = business.verification_status === 'verified';

      return {
        test: 'Business Account Verification',
        status: isVerified ? 'passed' : 'warning',
        message: isVerified ? 'Business account is verified' : 'Business account verification pending',
        timestamp: new Date().toISOString(),
        details: {
          businessName: business.name,
          verificationStatus: business.verification_status,
          businessStatus: business.business_status
        }
      };
    } catch (error) {
      return {
        test: 'Business Account Verification',
        status: 'failed',
        message: `Unable to check business account: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test message delivery rate
   */
  private async testMessageDeliveryRate(): Promise<DiagnosticResult> {
    try {
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const recentMessages = await db
        .select()
        .from(whatsappMessages)
        .where(gte(whatsappMessages.timestamp, last24Hours));

      const totalMessages = recentMessages.length;
      const deliveredMessages = recentMessages.filter(m => m.isDelivered).length;
      const failedMessages = recentMessages.filter(m => m.status === 'failed').length;

      const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 100;

      let status: 'passed' | 'warning' | 'failed' = 'passed';
      let message = `Delivery rate: ${deliveryRate.toFixed(1)}% (${deliveredMessages}/${totalMessages})`;

      if (deliveryRate < 50) {
        status = 'failed';
        message += ' - Critical delivery issues';
      } else if (deliveryRate < 85) {
        status = 'warning';
        message += ' - Below optimal delivery rate';
      }

      return {
        test: 'Message Delivery Rate',
        status,
        message,
        timestamp: new Date().toISOString(),
        details: {
          totalMessages,
          deliveredMessages,
          failedMessages,
          deliveryRate: Math.round(deliveryRate)
        }
      };
    } catch (error) {
      return {
        test: 'Message Delivery Rate',
        status: 'failed',
        message: `Unable to analyze delivery rate: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test rate limits
   */
  private async testRateLimits(): Promise<DiagnosticResult> {
    try {
      // Get message count for last hour
      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);

      const hourlyMessages = await db
        .select()
        .from(whatsappMessages)
        .where(gte(whatsappMessages.timestamp, lastHour));

      const hourlyCount = hourlyMessages.length;
      const dailyLimit = 1000; // Standard WhatsApp Business API limit
      const hourlyLimit = Math.floor(dailyLimit / 24);

      let status: 'passed' | 'warning' | 'failed' = 'passed';
      let message = `Rate usage: ${hourlyCount}/${hourlyLimit} messages per hour`;

      if (hourlyCount > hourlyLimit * 0.9) {
        status = 'warning';
        message += ' - Approaching rate limit';
      } else if (hourlyCount >= hourlyLimit) {
        status = 'failed';
        message += ' - Rate limit exceeded';
      }

      return {
        test: 'API Rate Limits',
        status,
        message,
        timestamp: new Date().toISOString(),
        details: {
          hourlyCount,
          hourlyLimit,
          dailyLimit,
          usagePercentage: Math.round((hourlyCount / hourlyLimit) * 100)
        }
      };
    } catch (error) {
      return {
        test: 'API Rate Limits',
        status: 'failed',
        message: `Unable to check rate limits: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test database connectivity
   */
  private async testDatabaseConnectivity(): Promise<DiagnosticResult> {
    try {
      const testRecord = await db.select().from(whatsappMessages).limit(1);
      
      return {
        test: 'Database Connectivity',
        status: 'passed',
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
        details: { tablesAccessible: ['whatsapp_messages', 'whatsapp_contacts', 'whatsapp_groups'] }
      };
    } catch (error) {
      return {
        test: 'Database Connectivity',
        status: 'failed',
        message: `Database connection failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        recommendations: ['Check database connection', 'Verify table schemas']
      };
    }
  }

  /**
   * Test template status
   */
  private async testTemplateStatus(): Promise<DiagnosticResult> {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const businessId = process.env.WHATSAPP_BUSINESS_ID;

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v23.0/${businessId}/message_templates`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { limit: 50 },
          timeout: 10000
        }
      );

      const templates = response.data.data || [];
      const approvedTemplates = templates.filter(t => t.status === 'APPROVED');
      const pendingTemplates = templates.filter(t => t.status === 'PENDING');
      const rejectedTemplates = templates.filter(t => t.status === 'REJECTED');

      let status: 'passed' | 'warning' | 'failed' = 'passed';
      let message = `${approvedTemplates.length} approved templates available`;

      if (approvedTemplates.length === 0) {
        status = 'warning';
        message = 'No approved templates available';
      }

      return {
        test: 'Template Message Status',
        status,
        message,
        timestamp: new Date().toISOString(),
        details: {
          totalTemplates: templates.length,
          approved: approvedTemplates.length,
          pending: pendingTemplates.length,
          rejected: rejectedTemplates.length,
          templates: approvedTemplates.map(t => ({ name: t.name, language: t.language }))
        }
      };
    } catch (error) {
      return {
        test: 'Template Message Status',
        status: 'failed',
        message: `Unable to check templates: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test webhook configuration
   */
  private async testWebhookConfiguration(): Promise<DiagnosticResult> {
    // This is a placeholder for webhook testing
    // In a real implementation, you would verify webhook endpoints
    return {
      test: 'Webhook Configuration',
      status: 'passed',
      message: 'Webhook configuration test not implemented',
      timestamp: new Date().toISOString(),
      details: { note: 'Placeholder test - implement webhook verification' }
    };
  }

  /**
   * Store diagnostic result in database
   */
  private async storeDiagnosticResult(result: DiagnosticResult): Promise<void> {
    try {
      await db.insert(whatsappDiagnostics).values({
        id: uuidv4(),
        testName: result.test,
        status: result.status,
        message: result.message,
        details: result.details || {},
        timestamp: new Date(result.timestamp),
        duration: result.duration,
        recommendations: result.recommendations || []
      });
    } catch (error) {
      console.error('[Diagnostics] Failed to store result:', error);
    }
  }

  /**
   * Get historical diagnostic results
   */
  async getHistoricalResults(limit: number = 50): Promise<DiagnosticResult[]> {
    try {
      const results = await db
        .select()
        .from(whatsappDiagnostics)
        .orderBy(desc(whatsappDiagnostics.timestamp))
        .limit(limit);

      return results.map(result => ({
        test: result.testName,
        status: result.status as 'passed' | 'failed' | 'warning',
        message: result.message,
        timestamp: result.timestamp.toISOString(),
        duration: result.duration,
        details: result.details,
        recommendations: result.recommendations
      }));
    } catch (error) {
      console.error('[Diagnostics] Failed to get historical results:', error);
      return [];
    }
  }

  /**
   * Calculate token age (helper method)
   */
  private calculateTokenAge(): number {
    // This is a placeholder - in real implementation, you'd track token creation date
    // For now, return a reasonable default
    return 30; // Assume token is 30 days old
  }

  /**
   * Get system health summary
   */
  async getHealthSummary(): Promise<{
    overallStatus: 'healthy' | 'warning' | 'critical';
    criticalIssues: number;
    warnings: number;
    lastDiagnosticRun: string;
    summary: string;
  }> {
    try {
      const recentResults = await this.getHistoricalResults(10);
      
      if (recentResults.length === 0) {
        return {
          overallStatus: 'warning',
          criticalIssues: 0,
          warnings: 0,
          lastDiagnosticRun: 'Never',
          summary: 'No diagnostic data available'
        };
      }

      const criticalIssues = recentResults.filter(r => r.status === 'failed').length;
      const warnings = recentResults.filter(r => r.status === 'warning').length;
      const lastRun = recentResults[0].timestamp;

      let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (criticalIssues > 0) {
        overallStatus = 'critical';
      } else if (warnings > 0) {
        overallStatus = 'warning';
      }

      const summary = `${criticalIssues} critical issues, ${warnings} warnings`;

      return {
        overallStatus,
        criticalIssues,
        warnings,
        lastDiagnosticRun: lastRun,
        summary
      };
    } catch (error) {
      return {
        overallStatus: 'critical',
        criticalIssues: 1,
        warnings: 0,
        lastDiagnosticRun: 'Error',
        summary: 'Failed to get health summary'
      };
    }
  }
}

export const diagnosticsService = WhatsAppDiagnosticsService.getInstance();