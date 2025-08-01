import { Router } from 'express';
import { db } from '../db';
import { whatsappMessageLogs, whatsappBlacklist, whatsappSpamConfig, whatsappAnalytics } from '@shared/schema';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';
import { circuitBreaker } from '../services/circuitBreaker';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Get WhatsApp analytics dashboard data
router.get('/analytics/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's statistics
    const [todayStats] = await db.select()
      .from(whatsappAnalytics)
      .where(eq(whatsappAnalytics.date, today))
      .limit(1);

    // Yesterday's statistics
    const [yesterdayStats] = await db.select()
      .from(whatsappAnalytics)
      .where(eq(whatsappAnalytics.date, yesterday))
      .limit(1);

    // Last 7 days statistics
    const weeklyStats = await db.select()
      .from(whatsappAnalytics)
      .where(gte(whatsappAnalytics.date, weekAgo))
      .orderBy(desc(whatsappAnalytics.date));

    // Current circuit breaker config
    const config = circuitBreaker.getConfig();

    // Active blacklist count
    const [blacklistCount] = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappBlacklist)
      .where(eq(whatsappBlacklist.isActive, true));

    // Message volume by hour (last 24 hours)
    const hourlyMessages = await db.select({
      hour: sql<number>`EXTRACT(hour FROM timestamp)`,
      count: count()
    })
    .from(whatsappMessageLogs)
    .where(gte(whatsappMessageLogs.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)))
    .groupBy(sql`EXTRACT(hour FROM timestamp)`)
    .orderBy(sql`EXTRACT(hour FROM timestamp)`);

    // Top active employees
    const topEmployees = await db.select({
      employeeCode: whatsappMessageLogs.employeeCode,
      messageCount: count()
    })
    .from(whatsappMessageLogs)
    .where(and(
      gte(whatsappMessageLogs.timestamp, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      sql`${whatsappMessageLogs.employeeCode} IS NOT NULL`
    ))
    .groupBy(whatsappMessageLogs.employeeCode)
    .orderBy(desc(count()))
    .limit(10);

    res.json({
      today: todayStats || {
        totalInbound: 0,
        totalOutbound: 0,
        uniqueContacts: 0,
        newRegistrations: 0,
        aiRequests: 0,
        blockedMessages: 0,
        spamDetected: 0,
        averageResponseTime: 0,
        peakHour: 0
      },
      yesterday: yesterdayStats || {
        totalInbound: 0,
        totalOutbound: 0,
        uniqueContacts: 0,
        newRegistrations: 0,
        aiRequests: 0,
        blockedMessages: 0,
        spamDetected: 0,
        averageResponseTime: 0,
        peakHour: 0
      },
      weeklyTrend: weeklyStats,
      circuitBreakerConfig: config,
      blacklistedNumbers: Number(blacklistCount?.count || 0),
      hourlyMessageVolume: hourlyMessages,
      topActiveEmployees: topEmployees
    });
  } catch (error) {
    console.error('[WhatsApp Analytics] Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp analytics' });
  }
});

// Get detailed message logs with filtering
router.get('/analytics/messages', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      direction, 
      employeeCode, 
      startDate, 
      endDate,
      blocked,
      aiUsed
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let conditions = [];

    if (direction) {
      conditions.push(eq(whatsappMessageLogs.direction, direction as string));
    }

    if (employeeCode) {
      conditions.push(eq(whatsappMessageLogs.employeeCode, employeeCode as string));
    }

    if (startDate) {
      conditions.push(gte(whatsappMessageLogs.timestamp, new Date(startDate as string)));
    }

    if (endDate) {
      const endDateTime = new Date(endDate as string);
      endDateTime.setHours(23, 59, 59, 999);
      conditions.push(sql`${whatsappMessageLogs.timestamp} <= ${endDateTime}`);
    }

    if (blocked !== undefined) {
      conditions.push(eq(whatsappMessageLogs.isBlocked, blocked === 'true'));
    }

    if (aiUsed !== undefined) {
      conditions.push(eq(whatsappMessageLogs.aiUsed, aiUsed === 'true'));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const messages = await db.select()
      .from(whatsappMessageLogs)
      .where(whereClause)
      .orderBy(desc(whatsappMessageLogs.timestamp))
      .offset(offset)
      .limit(Number(limit));

    const [totalCount] = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappMessageLogs)
      .where(whereClause);

    res.json({
      messages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(totalCount?.count || 0),
        totalPages: Math.ceil(Number(totalCount?.count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('[WhatsApp Analytics] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch message logs' });
  }
});

// Update circuit breaker configuration
router.put('/analytics/circuit-breaker', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      maxMessagesPerMinute,
      maxMessagesPerHour,
      maxMessagesPerDay,
      blacklistThreshold,
      blockDurationMinutes,
      suspiciousPatternDetection,
      aiUsageLimit,
      aiCooldownMinutes
    } = req.body;

    await circuitBreaker.updateConfig({
      maxMessagesPerMinute,
      maxMessagesPerHour,
      maxMessagesPerDay,
      blacklistThreshold,
      blockDurationMinutes,
      suspiciousPatternDetection,
      aiUsageLimit,
      aiCooldownMinutes
    });

    const updatedConfig = circuitBreaker.getConfig();
    res.json({ 
      success: true, 
      config: updatedConfig,
      message: 'Circuit breaker configuration updated successfully'
    });
  } catch (error) {
    console.error('[WhatsApp Analytics] Error updating config:', error);
    res.status(500).json({ error: 'Failed to update circuit breaker configuration' });
  }
});

// Get blacklisted numbers
router.get('/analytics/blacklist', requireAuth, requireAdmin, async (req, res) => {
  try {
    const blacklistedNumbers = await circuitBreaker.getBlacklistedNumbers();
    res.json(blacklistedNumbers);
  } catch (error) {
    console.error('[WhatsApp Analytics] Error fetching blacklist:', error);
    res.status(500).json({ error: 'Failed to fetch blacklisted numbers' });
  }
});

// Remove number from blacklist
router.delete('/analytics/blacklist/:phoneNumber', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    await circuitBreaker.removeFromBlacklist(phoneNumber);
    res.json({ 
      success: true,
      message: `Removed ${phoneNumber} from blacklist` 
    });
  } catch (error) {
    console.error('[WhatsApp Analytics] Error removing from blacklist:', error);
    res.status(500).json({ error: 'Failed to remove from blacklist' });
  }
});

// Get analytics summary for KPIs
router.get('/analytics/kpis', requireAuth, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Total messages (all time)
    const [totalMessages] = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappMessageLogs);

    // Today's inbound messages
    const [todayInbound] = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappMessageLogs)
      .where(and(
        gte(whatsappMessageLogs.timestamp, new Date(today)),
        eq(whatsappMessageLogs.direction, 'inbound')
      ));

    // Today's outbound messages
    const [todayOutbound] = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappMessageLogs)
      .where(and(
        gte(whatsappMessageLogs.timestamp, new Date(today)),
        eq(whatsappMessageLogs.direction, 'outbound')
      ));

    // Unique contacts (last 30 days)
    const [uniqueContacts] = await db.select({ 
      count: sql<number>`count(distinct ${whatsappMessageLogs.phoneNumber})` 
    })
    .from(whatsappMessageLogs)
    .where(gte(whatsappMessageLogs.timestamp, new Date(monthAgo)));

    // AI requests (last 7 days)
    const [aiRequests] = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappMessageLogs)
      .where(and(
        gte(whatsappMessageLogs.timestamp, new Date(weekAgo)),
        eq(whatsappMessageLogs.aiUsed, true)
      ));

    // Blocked messages (last 7 days)
    const [blockedMessages] = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappMessageLogs)
      .where(and(
        gte(whatsappMessageLogs.timestamp, new Date(weekAgo)),
        eq(whatsappMessageLogs.isBlocked, true)
      ));

    // Active blacklisted numbers
    const [activeBlacklist] = await db.select({ count: sql<number>`count(*)` })
      .from(whatsappBlacklist)
      .where(eq(whatsappBlacklist.isActive, true));

    // Response rate calculation
    const [responseRate] = await db.select({
      inbound: sql<number>`count(*) filter (where direction = 'inbound')`,
      outbound: sql<number>`count(*) filter (where direction = 'outbound')`
    })
    .from(whatsappMessageLogs)
    .where(gte(whatsappMessageLogs.timestamp, new Date(weekAgo)));

    const responseRatePercent = responseRate?.inbound > 0 
      ? Math.round((Number(responseRate.outbound) / Number(responseRate.inbound)) * 100)
      : 0;

    res.json({
      totalMessages: Number(totalMessages?.count || 0),
      todayInbound: Number(todayInbound?.count || 0),
      todayOutbound: Number(todayOutbound?.count || 0),
      uniqueContacts: Number(uniqueContacts?.count || 0),
      aiRequestsWeek: Number(aiRequests?.count || 0),
      blockedMessagesWeek: Number(blockedMessages?.count || 0),
      activeBlacklist: Number(activeBlacklist?.count || 0),
      responseRate: responseRatePercent
    });
  } catch (error) {
    console.error('[WhatsApp Analytics] Error fetching KPIs:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp KPIs' });
  }
});

export default router;