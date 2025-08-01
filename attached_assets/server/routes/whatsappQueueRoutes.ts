import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Queue item interface and validation
const QueueItemSchema = z.object({
  id: z.string(),
  messageId: z.string().optional(),
  phoneNumber: z.string(),
  recipientName: z.string(),
  messageType: z.enum(['text', 'image', 'video', 'audio', 'document', 'template']),
  content: z.string(),
  templateName: z.string().optional(),
  templateParams: z.record(z.string()).optional(),
  mediaUrl: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  status: z.enum(['pending', 'processing', 'sent', 'failed', 'cancelled']),
  attempts: z.number(),
  maxAttempts: z.number(),
  scheduledAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  errorMessage: z.string().optional(),
  groupId: z.string().optional(),
  isBulkMessage: z.boolean(),
  tags: z.array(z.string()).optional()
});

type QueueItem = z.infer<typeof QueueItemSchema>;

// In-memory queue storage (in production, this would be Redis or database)
const messageQueue: QueueItem[] = [];
let queueIdCounter = 1;

// Generate sample queue data for development
function generateSampleQueueData(): QueueItem[] {
  const sampleMessages: QueueItem[] = [
    {
      id: 'queue_001',
      messageId: 'msg_001',
      phoneNumber: '+923001234567',
      recipientName: 'Ahmed Hassan',
      messageType: 'text',
      content: 'Welcome to Nexlinx! Your attendance has been marked successfully.',
      priority: 'normal',
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      isBulkMessage: false,
      tags: ['attendance', 'notification']
    },
    {
      id: 'queue_002',
      phoneNumber: '+923009876543',
      recipientName: 'Fatima Ali',
      messageType: 'template',
      content: 'Shift reminder notification',
      templateName: 'shift_reminder',
      templateParams: { employee_name: 'Fatima Ali', shift_time: '9:00 AM' },
      priority: 'high',
      status: 'processing',
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      isBulkMessage: false,
      tags: ['shift', 'reminder']
    },
    {
      id: 'queue_003',
      phoneNumber: '+923007654321',
      recipientName: 'Muhammad Khan',
      messageType: 'text',
      content: 'Your leave request has been approved for tomorrow.',
      priority: 'normal',
      status: 'failed',
      attempts: 3,
      maxAttempts: 3,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      errorMessage: 'Failed to deliver: Phone number not reachable',
      isBulkMessage: false,
      tags: ['leave', 'approval']
    },
    {
      id: 'queue_004',
      phoneNumber: '+923006543210',
      recipientName: 'Aisha Rahman',
      messageType: 'document',
      content: 'Payslip for December 2024',
      mediaUrl: '/uploads/payslips/aisha_dec2024.pdf',
      priority: 'high',
      status: 'pending',
      attempts: 0,
      maxAttempts: 5,
      scheduledAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      isBulkMessage: false,
      tags: ['payroll', 'document']
    },
    {
      id: 'queue_005',
      phoneNumber: 'BULK_MESSAGE',
      recipientName: 'All Staff - HR Department',
      messageType: 'text',
      content: 'Important: New company policy updates effective immediately.',
      priority: 'urgent',
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      groupId: 'hr_department',
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      isBulkMessage: true,
      tags: ['bulk', 'policy', 'urgent']
    }
  ];
  
  return sampleMessages;
}

// Initialize with sample data
if (messageQueue.length === 0) {
  messageQueue.push(...generateSampleQueueData());
}

// GET /api/whatsapp-queue/stats - Queue KPIs and statistics
router.get('/stats', (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const stats = {
    // Current queue status
    pending: messageQueue.filter(item => item.status === 'pending').length,
    processing: messageQueue.filter(item => item.status === 'processing').length,
    failed: messageQueue.filter(item => item.status === 'failed').length,
    sent: messageQueue.filter(item => item.status === 'sent').length,
    cancelled: messageQueue.filter(item => item.status === 'cancelled').length,
    
    // Priority breakdown
    priorityBreakdown: {
      urgent: messageQueue.filter(item => item.priority === 'urgent' && item.status === 'pending').length,
      high: messageQueue.filter(item => item.priority === 'high' && item.status === 'pending').length,
      normal: messageQueue.filter(item => item.priority === 'normal' && item.status === 'pending').length,
      low: messageQueue.filter(item => item.priority === 'low' && item.status === 'pending').length
    },
    
    // Today's statistics
    todayStats: {
      totalProcessed: messageQueue.filter(item => 
        new Date(item.updatedAt) >= todayStart && 
        ['sent', 'failed'].includes(item.status)
      ).length,
      successRate: (() => {
        const todayProcessed = messageQueue.filter(item => 
          new Date(item.updatedAt) >= todayStart && 
          ['sent', 'failed'].includes(item.status)
        );
        const todaySuccess = todayProcessed.filter(item => item.status === 'sent');
        return todayProcessed.length > 0 ? Math.round((todaySuccess.length / todayProcessed.length) * 100) : 0;
      })(),
      avgProcessingTime: '2.3s', // Mock data - would be calculated from actual processing times
      peakHour: '10:00 AM' // Mock data - would be calculated from actual processing times
    },
    
    // Queue health metrics
    queueHealth: {
      oldestPendingAge: (() => {
        const oldestPending = messageQueue
          .filter(item => item.status === 'pending')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        
        if (!oldestPending) return '0m';
        
        const ageMs = now.getTime() - new Date(oldestPending.createdAt).getTime();
        const ageMinutes = Math.floor(ageMs / (1000 * 60));
        return ageMinutes > 60 ? `${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m` : `${ageMinutes}m`;
      })(),
      avgRetryCount: (() => {
        const retriedItems = messageQueue.filter(item => item.attempts > 0);
        if (retriedItems.length === 0) return 0;
        return Math.round(retriedItems.reduce((sum, item) => sum + item.attempts, 0) / retriedItems.length * 10) / 10;
      })(),
      stuckMessages: messageQueue.filter(item => 
        item.status === 'processing' && 
        new Date(item.updatedAt).getTime() < (now.getTime() - 10 * 60 * 1000) // Processing for more than 10 minutes
      ).length
    },
    
    // Message type breakdown
    messageTypes: {
      text: messageQueue.filter(item => item.messageType === 'text').length,
      template: messageQueue.filter(item => item.messageType === 'template').length,
      document: messageQueue.filter(item => item.messageType === 'document').length,
      image: messageQueue.filter(item => item.messageType === 'image').length,
      video: messageQueue.filter(item => item.messageType === 'video').length,
      audio: messageQueue.filter(item => item.messageType === 'audio').length
    },
    
    totalItems: messageQueue.length,
    lastUpdated: now.toISOString()
  };
  
  res.json(stats);
});

// GET /api/whatsapp-queue/items - Get queue items with pagination and filtering
router.get('/items', (req, res) => {
  const {
    page = '1',
    limit = '20',
    status,
    priority,
    messageType,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  let filteredItems = [...messageQueue];

  // Apply filters
  if (status) {
    filteredItems = filteredItems.filter(item => item.status === status);
  }
  
  if (priority) {
    filteredItems = filteredItems.filter(item => item.priority === priority);
  }
  
  if (messageType) {
    filteredItems = filteredItems.filter(item => item.messageType === messageType);
  }
  
  if (search && typeof search === 'string') {
    const searchLower = search.toLowerCase();
    filteredItems = filteredItems.filter(item =>
      item.recipientName.toLowerCase().includes(searchLower) ||
      item.phoneNumber.includes(search) ||
      item.content.toLowerCase().includes(searchLower) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // Apply sorting
  filteredItems.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt).getTime();
        bValue = new Date(b.updatedAt).getTime();
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
        break;
      case 'attempts':
        aValue = a.attempts;
        bValue = b.attempts;
        break;
      default:
        aValue = a.recipientName;
        bValue = b.recipientName;
    }

    if (sortOrder === 'desc') {
      return aValue < bValue ? 1 : -1;
    } else {
      return aValue > bValue ? 1 : -1;
    }
  });

  // Apply pagination
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  
  const paginatedItems = filteredItems.slice(startIndex, endIndex);
  
  res.json({
    items: paginatedItems,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(filteredItems.length / limitNum),
      totalItems: filteredItems.length,
      itemsPerPage: limitNum,
      hasNextPage: endIndex < filteredItems.length,
      hasPrevPage: pageNum > 1
    },
    filters: {
      status,
      priority,
      messageType,
      search
    }
  });
});

// POST /api/whatsapp-queue/actions/process - Process specific queue item
router.post('/actions/process/:id', (req, res) => {
  const { id } = req.params;
  const item = messageQueue.find(q => q.id === id);
  
  if (!item) {
    return res.status(404).json({ error: 'Queue item not found' });
  }
  
  if (item.status !== 'pending' && item.status !== 'failed') {
    return res.status(400).json({ error: 'Item cannot be processed in current status' });
  }
  
  // Simulate processing
  item.status = 'processing';
  item.attempts += 1;
  item.updatedAt = new Date().toISOString();
  
  // Simulate random success/failure (in real implementation, this would call WhatsApp API)
  setTimeout(() => {
    const success = Math.random() > 0.2; // 80% success rate
    item.status = success ? 'sent' : 'failed';
    item.updatedAt = new Date().toISOString();
    
    if (!success) {
      item.errorMessage = 'Simulated delivery failure - network error';
    }
  }, 2000);
  
  res.json({ success: true, message: 'Item processing started', item });
});

// POST /api/whatsapp-queue/actions/retry - Retry failed queue item
router.post('/actions/retry/:id', (req, res) => {
  const { id } = req.params;
  const item = messageQueue.find(q => q.id === id);
  
  if (!item) {
    return res.status(404).json({ error: 'Queue item not found' });
  }
  
  if (item.status !== 'failed') {
    return res.status(400).json({ error: 'Only failed items can be retried' });
  }
  
  if (item.attempts >= item.maxAttempts) {
    return res.status(400).json({ error: 'Maximum retry attempts exceeded' });
  }
  
  item.status = 'pending';
  item.errorMessage = undefined;
  item.updatedAt = new Date().toISOString();
  
  res.json({ success: true, message: 'Item queued for retry', item });
});

// DELETE /api/whatsapp-queue/actions/remove/:id - Remove item from queue
router.delete('/actions/remove/:id', (req, res) => {
  const { id } = req.params;
  const index = messageQueue.findIndex(q => q.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Queue item not found' });
  }
  
  const item = messageQueue[index];
  
  if (item.status === 'processing') {
    return res.status(400).json({ error: 'Cannot remove item currently being processed' });
  }
  
  messageQueue.splice(index, 1);
  
  res.json({ success: true, message: 'Item removed from queue' });
});

// POST /api/whatsapp-queue/actions/cancel/:id - Cancel pending queue item
router.post('/actions/cancel/:id', (req, res) => {
  const { id } = req.params;
  const item = messageQueue.find(q => q.id === id);
  
  if (!item) {
    return res.status(404).json({ error: 'Queue item not found' });
  }
  
  if (item.status === 'processing') {
    return res.status(400).json({ error: 'Cannot cancel item currently being processed' });
  }
  
  if (item.status === 'sent') {
    return res.status(400).json({ error: 'Cannot cancel item that has already been sent' });
  }
  
  item.status = 'cancelled';
  item.updatedAt = new Date().toISOString();
  
  res.json({ success: true, message: 'Item cancelled', item });
});

// POST /api/whatsapp-queue/actions/process-all - Process all pending items
router.post('/actions/process-all', (req, res) => {
  const pendingItems = messageQueue.filter(item => item.status === 'pending');
  
  if (pendingItems.length === 0) {
    return res.json({ success: true, message: 'No pending items to process', processedCount: 0 });
  }
  
  // Start processing all pending items
  pendingItems.forEach(item => {
    item.status = 'processing';
    item.attempts += 1;
    item.updatedAt = new Date().toISOString();
    
    // Simulate processing with random delays
    setTimeout(() => {
      const success = Math.random() > 0.15; // 85% success rate for bulk processing
      item.status = success ? 'sent' : 'failed';
      item.updatedAt = new Date().toISOString();
      
      if (!success) {
        item.errorMessage = 'Bulk processing failure - rate limit exceeded';
      }
    }, Math.random() * 5000 + 1000); // Random delay between 1-6 seconds
  });
  
  res.json({ 
    success: true, 
    message: `Started processing ${pendingItems.length} pending items`,
    processedCount: pendingItems.length
  });
});

// POST /api/whatsapp-queue/actions/clear-failed - Clear all failed items
router.post('/actions/clear-failed', (req, res) => {
  const failedCount = messageQueue.filter(item => item.status === 'failed').length;
  
  // Remove all failed items
  for (let i = messageQueue.length - 1; i >= 0; i--) {
    if (messageQueue[i].status === 'failed') {
      messageQueue.splice(i, 1);
    }
  }
  
  res.json({ 
    success: true, 
    message: `Cleared ${failedCount} failed items from queue`,
    clearedCount: failedCount
  });
});

// GET /api/whatsapp-queue/analytics - Detailed queue analytics
router.get('/analytics', (req, res) => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Generate hourly statistics for the last 24 hours
  const hourlyStats = [];
  for (let i = 23; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    
    const hourItems = messageQueue.filter(item => {
      const itemTime = new Date(item.updatedAt);
      return itemTime >= hourStart && itemTime < hourEnd;
    });
    
    hourlyStats.push({
      hour: hourStart.getHours(),
      timestamp: hourStart.toISOString(),
      sent: hourItems.filter(item => item.status === 'sent').length,
      failed: hourItems.filter(item => item.status === 'failed').length,
      total: hourItems.length
    });
  }
  
  const analytics = {
    performance: {
      last24Hours: {
        totalProcessed: messageQueue.filter(item => 
          new Date(item.updatedAt) >= last24Hours && 
          ['sent', 'failed'].includes(item.status)
        ).length,
        successRate: (() => {
          const processed = messageQueue.filter(item => 
            new Date(item.updatedAt) >= last24Hours && 
            ['sent', 'failed'].includes(item.status)
          );
          const successful = processed.filter(item => item.status === 'sent');
          return processed.length > 0 ? Math.round((successful.length / processed.length) * 100) : 0;
        })(),
        avgRetryCount: 1.2, // Mock data
        avgProcessingTime: '2.1s' // Mock data
      },
      last7Days: {
        totalProcessed: messageQueue.filter(item => 
          new Date(item.updatedAt) >= last7Days && 
          ['sent', 'failed'].includes(item.status)
        ).length,
        successRate: 89, // Mock data
        peakDay: 'Monday', // Mock data
        peakHour: '10:00 AM' // Mock data
      }
    },
    
    trends: {
      hourlyStats,
      topFailureReasons: [
        { reason: 'Network timeout', count: 12, percentage: 35 },
        { reason: 'Invalid phone number', count: 8, percentage: 24 },
        { reason: 'Rate limit exceeded', count: 7, percentage: 21 },
        { reason: 'Template not approved', count: 4, percentage: 12 },
        { reason: 'Other errors', count: 3, percentage: 8 }
      ]
    },
    
    messageTypePerformance: Object.entries(
      messageQueue.reduce((acc, item) => {
        if (!acc[item.messageType]) {
          acc[item.messageType] = { total: 0, sent: 0, failed: 0 };
        }
        acc[item.messageType].total++;
        if (item.status === 'sent') acc[item.messageType].sent++;
        if (item.status === 'failed') acc[item.messageType].failed++;
        return acc;
      }, {} as Record<string, { total: number; sent: number; failed: number }>)
    ).map(([type, stats]) => ({
      messageType: type,
      ...stats,
      successRate: stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0
    })),
    
    lastUpdated: now.toISOString()
  };
  
  res.json(analytics);
});

// POST /api/whatsapp-queue/process-all - Process all pending items
router.post('/process-all', requireAuth, async (req, res) => {
  try {
    console.log('[WhatsApp Queue] Processing all pending queue items...');
    
    const pendingItems = messageQueue.filter(item => item.status === 'pending');
    const processedCount = pendingItems.length;
    
    // Start processing all pending items
    pendingItems.forEach(item => {
      item.status = 'processing';
      item.attempts += 1;
      item.updatedAt = new Date().toISOString();
    });
    
    console.log(`[WhatsApp Queue] Successfully started processing ${processedCount} items`);
    res.json({ 
      success: true, 
      message: `Processing started for ${processedCount} items`,
      processedCount 
    });
  } catch (error) {
    console.error('[WhatsApp Queue] Error processing all items:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process queue items' 
    });
  }
});

// POST /api/whatsapp-queue/flush-all - Clear all queue items
router.post('/flush-all', requireAuth, async (req, res) => {
  try {
    console.log('[WhatsApp Queue] Flushing all queue items...');
    
    const flushedCount = messageQueue.length;
    messageQueue.length = 0; // Clear the array
    
    console.log(`[WhatsApp Queue] Successfully flushed ${flushedCount} items`);
    res.json({ 
      success: true, 
      message: `Flushed ${flushedCount} items from queue`,
      flushedCount 
    });
  } catch (error) {
    console.error('[WhatsApp Queue] Error flushing queue:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to flush queue' 
    });
  }
});

// POST /api/whatsapp-queue/flush-and-requeue - Flush failed items and requeue
router.post('/flush-and-requeue', requireAuth, async (req, res) => {
  try {
    console.log('[WhatsApp Queue] Flushing failed items and requeuing...');
    
    const failedItems = messageQueue.filter(item => item.status === 'failed');
    const flushedCount = failedItems.length;
    
    // Reset failed items to pending status for requeue
    failedItems.forEach(item => {
      item.status = 'pending';
      item.attempts = 0;
      item.errorMessage = undefined;
      item.updatedAt = new Date().toISOString();
    });
    
    console.log(`[WhatsApp Queue] Flushed and requeued ${flushedCount} failed items`);
    res.json({ 
      success: true, 
      message: `Flushed and requeued ${flushedCount} failed items`,
      flushedCount,
      requeuedCount: flushedCount
    });
  } catch (error) {
    console.error('[WhatsApp Queue] Error in flush and requeue:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to flush and requeue' 
    });
  }
});

// POST /api/whatsapp-queue/requeue-failed - Requeue only failed items
router.post('/requeue-failed', requireAuth, async (req, res) => {
  try {
    console.log('[WhatsApp Queue] Requeuing failed items...');
    
    const failedItems = messageQueue.filter(item => item.status === 'failed' && item.attempts < item.maxAttempts);
    const requeuedCount = failedItems.length;
    
    // Reset failed items to pending status
    failedItems.forEach(item => {
      item.status = 'pending';
      item.errorMessage = undefined;
      item.updatedAt = new Date().toISOString();
    });
    
    console.log(`[WhatsApp Queue] Successfully requeued ${requeuedCount} failed items`);
    res.json({ 
      success: true, 
      message: `Requeued ${requeuedCount} failed items`,
      requeuedCount 
    });
  } catch (error) {
    console.error('[WhatsApp Queue] Error requeuing failed items:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to requeue failed items' 
    });
  }
});

export { router as whatsappQueueRouter };