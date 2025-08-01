import express from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { whatsappMessages, employeeRecords } from '../../shared/schema';
import { eq, desc, asc, or, and, isNull, isNotNull } from 'drizzle-orm';

const router = express.Router();

// Helper function to get recipient name from phone number
async function getRecipientName(phoneNumber: string): Promise<string> {
  try {
    // Try to get name from employee records
    const employee = await db.query.employeeRecords.findFirst({
      where: (employees, { eq, or }) => or(
        eq(employees.mobile, phoneNumber),
        eq(employees.wanumber, phoneNumber)
      ),
      columns: {
        firstName: true,
        lastName: true
      }
    });
    
    if (employee) {
      return `${employee.firstName} ${employee.lastName}`.trim();
    }
    
    // Fallback to phone number if no name found
    return phoneNumber;
  } catch (error) {
    console.error('[WhatsApp Queue] Error getting recipient name:', error);
    return phoneNumber;
  }
}

// Transform database record to queue item format with WAMNum display
async function transformMessageToQueueItem(message: any) {
  const recipientName = await getRecipientName(message.toNumber);
  
  // Create the "Message Number -> Recipient Name/Number" format
  const displayName = recipientName !== message.toNumber 
    ? `${message.wamNum} -> ${recipientName} (${message.toNumber})`
    : `${message.wamNum} -> ${message.toNumber}`;
  
  return {
    id: message.id.toString(),
    wamNum: message.wamNum, // Sequential WhatsApp Message Number starting from 1
    messageId: message.messageId,
    recipient: message.toNumber,
    recipientName,
    displayName, // "Message Number -> Recipient Name/Number" format
    message: message.messageContent,
    status: message.messageStatus, // 'pending', 'sent', 'delivered', 'read', 'failed'
    priority: 'normal', // Can be enhanced based on message content or type
    messageType: 'text',
    createdAt: message.createdAt?.toISOString(),
    sentAt: message.sentAt?.toISOString(),
    deliveredAt: message.deliveredAt?.toISOString(),
    readAt: message.readAt?.toISOString(),
    attempts: message.deliveryAttempts || 0,
    errorMessage: message.errorDetails || null,
    groupId: message.groupId?.toString() || null,
    groupName: null, // Can be enhanced by joining with groups table
    originalGroupSize: null
  };
}

// Get queue items with filtering (REAL DATA)
router.get('/items', requireAuth, async (req, res) => {
  try {
    const { status, priority, limit = 100 } = req.query;
    
    console.log('[WhatsApp Queue] Fetching real queue items from database...');
    
    // Build query conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(whatsappMessages.messageStatus, status as string));
    }
    
    // Fetch real messages from database
    const messages = await db.select()
      .from(whatsappMessages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(whatsappMessages.wamNum)) // Order by WAMNum descending
      .limit(parseInt(limit as string));
    
    console.log(`[WhatsApp Queue] Found ${messages.length} real messages in database`);
    
    // Transform messages to queue item format
    const queueItems = [];
    for (const message of messages) {
      const item = await transformMessageToQueueItem(message);
      queueItems.push(item);
    }
    
    // Categorize items for queue display
    const categorized = {
      processing: queueItems.filter(item => item.status === 'pending' || item.status === 'processing'),
      sent: queueItems.filter(item => item.status === 'sent' || item.status === 'delivered'),
      failed: queueItems.filter(item => item.status === 'failed')
    };
    
    console.log(`[WhatsApp Queue] Categorized: ${categorized.processing.length} processing, ${categorized.sent.length} sent, ${categorized.failed.length} failed`);
    
    res.json({ items: queueItems, categorized });
  } catch (error) {
    console.error('[WhatsApp Queue] Error fetching real queue items:', error);
    res.status(500).json({ error: 'Failed to fetch queue items' });
  }
});

// Get queue statistics (REAL DATA)
router.get('/stats', requireAuth, async (req, res) => {
  try {
    console.log('[WhatsApp Queue] Calculating real queue statistics...');
    
    // Get actual counts from database
    const [
      pendingCount,
      processingCount,
      sentCount,
      failedCount,
      deliveredCount,
      readCount
    ] = await Promise.all([
      db.select().from(whatsappMessages).where(eq(whatsappMessages.messageStatus, 'pending')),
      db.select().from(whatsappMessages).where(eq(whatsappMessages.messageStatus, 'processing')),
      db.select().from(whatsappMessages).where(eq(whatsappMessages.messageStatus, 'sent')),
      db.select().from(whatsappMessages).where(eq(whatsappMessages.messageStatus, 'failed')),
      db.select().from(whatsappMessages).where(isNotNull(whatsappMessages.deliveredAt)),
      db.select().from(whatsappMessages).where(isNotNull(whatsappMessages.readAt))
    ]);
    
    const stats = {
      pending: pendingCount.length,
      processing: processingCount.length,
      sent: sentCount.length,
      failed: failedCount.length,
      delivered: deliveredCount.length,
      read: readCount.length,
      total: pendingCount.length + processingCount.length + sentCount.length + failedCount.length
    };
    
    console.log('[WhatsApp Queue] Real queue stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('[WhatsApp Queue] Error fetching real stats:', error);
    res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
});

// Get specific message details for full review (clickable functionality)
router.get('/message/:wamNum', requireAuth, async (req, res) => {
  try {
    const { wamNum } = req.params;
    
    console.log(`[WhatsApp Queue] Fetching message details for WAMNum: ${wamNum}`);
    
    const message = await db.query.whatsappMessages.findFirst({
      where: eq(whatsappMessages.wamNum, parseInt(wamNum))
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const messageDetails = await transformMessageToQueueItem(message);
    
    // Add additional details for full review
    const fullDetails = {
      ...messageDetails,
      deliveryStatusDetails: message.deliveryStatusDetails,
      gatewayResponse: message.gatewayResponse,
      retryCount: message.retryCount,
      lastDeliveryAttempt: message.lastDeliveryAttempt?.toISOString(),
      visibleToUserIds: message.visibleToUserIds,
      departmentAccess: message.departmentAccess
    };
    
    console.log(`[WhatsApp Queue] Message ${wamNum} details retrieved`);
    res.json(fullDetails);
  } catch (error) {
    console.error('[WhatsApp Queue] Error fetching message details:', error);
    res.status(500).json({ error: 'Failed to fetch message details' });
  }
});

// Action items endpoint for live updates
router.get('/action-items', requireAuth, async (req, res) => {
  try {
    // Get items that need action (pending, failed, processing)
    const actionItems = await db.select()
      .from(whatsappMessages)
      .where(or(
        eq(whatsappMessages.messageStatus, 'pending'),
        eq(whatsappMessages.messageStatus, 'processing'),
        eq(whatsappMessages.messageStatus, 'failed')
      ))
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(50);
    
    const transformedItems = [];
    for (const item of actionItems) {
      const transformed = await transformMessageToQueueItem(item);
      transformedItems.push(transformed);
    }
    
    res.json(transformedItems);
  } catch (error) {
    console.error('[WhatsApp Queue] Error fetching action items:', error);
    res.status(500).json({ error: 'Failed to fetch action items' });
  }
});

// Process a specific queue item (REAL DATA)
router.post('/process/:wamNum', requireAuth, async (req, res) => {
  try {
    const { wamNum } = req.params;
    
    const message = await db.query.whatsappMessages.findFirst({
      where: eq(whatsappMessages.wamNum, parseInt(wamNum))
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.messageStatus !== 'pending') {
      return res.status(400).json({ error: 'Message is not in pending status' });
    }
    
    // Update to processing status
    await db.update(whatsappMessages)
      .set({ 
        messageStatus: 'processing',
        lastDeliveryAttempt: new Date()
      })
      .where(eq(whatsappMessages.wamNum, parseInt(wamNum)));
    
    console.log(`[WhatsApp Queue] Processing message WAMNum ${wamNum}`);
    res.json({ success: true, message: 'Message processing started' });
    
  } catch (error) {
    console.error('[WhatsApp Queue] Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Retry a failed queue item (REAL DATA)
router.post('/retry/:wamNum', requireAuth, async (req, res) => {
  try {
    const { wamNum } = req.params;
    
    const message = await db.query.whatsappMessages.findFirst({
      where: eq(whatsappMessages.wamNum, parseInt(wamNum))
    });
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (message.messageStatus !== 'failed') {
      return res.status(400).json({ error: 'Message is not in failed status' });
    }
    
    // Reset for retry
    await db.update(whatsappMessages)
      .set({ 
        messageStatus: 'pending',
        deliveryAttempts: message.deliveryAttempts + 1,
        errorDetails: null,
        lastDeliveryAttempt: new Date()
      })
      .where(eq(whatsappMessages.wamNum, parseInt(wamNum)));
    
    console.log(`[WhatsApp Queue] Retrying message WAMNum ${wamNum} (attempt ${message.deliveryAttempts + 1})`);
    res.json({ success: true, message: 'Message queued for retry' });
    
  } catch (error) {
    console.error('[WhatsApp Queue] Error retrying message:', error);
    res.status(500).json({ error: 'Failed to retry message' });
  }
});

export default router;