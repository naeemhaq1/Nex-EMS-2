import express from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { whatsappMessages } from '../../shared/schema';
import { eq, desc, asc, or, and, isNull, isNotNull } from 'drizzle-orm';

const router = express.Router();

// Mock data for individual message tracking with WAMNum system
const mockQueueItems = [
  {
    id: 'queue_001',
    wamNum: 1, // WAMNum - Sequential WhatsApp Message Number
    messageId: 'wamid.001',
    recipient: '+92300846660',
    recipientName: 'Muhammad Ahmad',
    message: 'Important company announcement: Please report to office tomorrow at 9 AM.',
    status: 'sent',
    priority: 'high',
    messageType: 'text',
    createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    sentAt: new Date(Date.now() - 240000).toISOString(), // 4 minutes ago
    deliveredAt: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
    readAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    attempts: 1,
    errorMessage: null,
    groupId: 'broadcast_001',
    groupName: 'All Staff',
    originalGroupSize: 100
  },
  {
    id: 'queue_002',
    wamNum: 2, // WAMNum - Sequential WhatsApp Message Number
    messageId: 'wamid.002',
    recipient: '+92301123456',
    recipientName: 'Fatima Khan',
    message: 'Important company announcement: Please report to office tomorrow at 9 AM.',
    status: 'sent',
    priority: 'high',
    messageType: 'text',
    createdAt: new Date(Date.now() - 300000).toISOString(),
    sentAt: new Date(Date.now() - 240000).toISOString(),
    deliveredAt: new Date(Date.now() - 180000).toISOString(),
    readAt: null, // Not read yet
    attempts: 1,
    errorMessage: null,
    groupId: 'broadcast_001',
    groupName: 'All Staff',
    originalGroupSize: 100
  },
  {
    id: 'queue_003',
    wamNum: 3, // WAMNum - Sequential WhatsApp Message Number
    messageId: null,
    recipient: '+92302987654',
    recipientName: 'Ali Hassan',
    message: 'Important company announcement: Please report to office tomorrow at 9 AM.',
    status: 'processing',
    priority: 'high',
    messageType: 'text',
    createdAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    attempts: 1,
    errorMessage: null,
    groupId: 'broadcast_001',
    groupName: 'All Staff',
    originalGroupSize: 100
  },
  {
    id: 'queue_004',
    wamNum: 4, // WAMNum - Sequential WhatsApp Message Number
    messageId: null,
    recipient: '+92303invalid',
    recipientName: 'Sara Ahmed',
    message: 'Important company announcement: Please report to office tomorrow at 9 AM.',
    status: 'failed',
    priority: 'high',
    messageType: 'text',
    createdAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    attempts: 2,
    errorMessage: 'Invalid phone number format',
    groupId: 'broadcast_001',
    groupName: 'All Staff',
    originalGroupSize: 100
  },
  {
    id: 'queue_005',
    messageId: 'wamid.005',
    recipient: '+92304567890',
    recipientName: 'Hassan Malik',
    message: 'Reminder: Monthly safety meeting at 2 PM today.',
    status: 'sent',
    priority: 'normal',
    messageType: 'text',
    createdAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    sentAt: new Date(Date.now() - 840000).toISOString(),
    deliveredAt: new Date(Date.now() - 780000).toISOString(),
    readAt: new Date(Date.now() - 720000).toISOString(),
    attempts: 1,
    errorMessage: null,
    groupId: 'safety_team',
    groupName: 'Safety Team',
    originalGroupSize: 25
  }
];

// Get queue items with filtering
router.get('/', requireAuth, (req, res) => {
  try {
    const { status, priority } = req.query;
    
    let filteredItems = [...mockQueueItems];
    
    if (status) {
      filteredItems = filteredItems.filter(item => item.status === status);
    }
    
    if (priority) {
      filteredItems = filteredItems.filter(item => item.priority === priority);
    }
    
    console.log(`[WhatsApp Queue] Returning ${filteredItems.length} queue items`);
    res.json(filteredItems);
  } catch (error) {
    console.error('[WhatsApp Queue] Error fetching queue items:', error);
    res.status(500).json({ error: 'Failed to fetch queue items' });
  }
});

// Get queue statistics
router.get('/stats', requireAuth, (req, res) => {
  try {
    const stats = {
      pending: mockQueueItems.filter(item => item.status === 'pending').length,
      processing: mockQueueItems.filter(item => item.status === 'processing').length,
      sent: mockQueueItems.filter(item => item.status === 'sent').length,
      failed: mockQueueItems.filter(item => item.status === 'failed').length,
      delivered: mockQueueItems.filter(item => item.deliveredAt).length,
      read: mockQueueItems.filter(item => item.readAt).length,
      retryCount: mockQueueItems.filter(item => item.attempts > 1).length
    };
    
    console.log('[WhatsApp Queue] Queue stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('[WhatsApp Queue] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
});

// Process a specific queue item
router.post('/process/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const item = mockQueueItems.find(item => item.id === id);
    
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' });
    }
    
    if (item.status !== 'pending') {
      return res.status(400).json({ error: 'Item is not in pending status' });
    }
    
    // Simulate processing
    item.status = 'processing';
    console.log(`[WhatsApp Queue] Processing item ${id}`);
    
    res.json({ success: true, message: 'Item processing started' });
  } catch (error) {
    console.error('[WhatsApp Queue] Error processing item:', error);
    res.status(500).json({ error: 'Failed to process item' });
  }
});

// Retry a failed queue item
router.post('/retry/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const item = mockQueueItems.find(item => item.id === id);
    
    if (!item) {
      return res.status(404).json({ error: 'Queue item not found' });
    }
    
    if (item.status !== 'failed') {
      return res.status(400).json({ error: 'Item is not in failed status' });
    }
    
    // Reset for retry
    item.status = 'pending';
    item.attempts += 1;
    item.errorMessage = null;
    console.log(`[WhatsApp Queue] Retrying item ${id} (attempt ${item.attempts})`);
    
    res.json({ success: true, message: 'Item queued for retry' });
  } catch (error) {
    console.error('[WhatsApp Queue] Error retrying item:', error);
    res.status(500).json({ error: 'Failed to retry item' });
  }
});

// Remove a queue item
router.delete('/remove/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const index = mockQueueItems.findIndex(item => item.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Queue item not found' });
    }
    
    mockQueueItems.splice(index, 1);
    console.log(`[WhatsApp Queue] Removed item ${id}`);
    
    res.json({ success: true, message: 'Item removed from queue' });
  } catch (error) {
    console.error('[WhatsApp Queue] Error removing item:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Bulk operations
router.post('/bulk/process', requireAuth, (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'IDs must be an array' });
    }
    
    let processed = 0;
    for (const id of ids) {
      const item = mockQueueItems.find(item => item.id === id);
      if (item && item.status === 'pending') {
        item.status = 'processing';
        processed++;
      }
    }
    
    console.log(`[WhatsApp Queue] Bulk processed ${processed} items`);
    res.json({ success: true, processed });
  } catch (error) {
    console.error('[WhatsApp Queue] Error in bulk processing:', error);
    res.status(500).json({ error: 'Failed to process items' });
  }
});

// Flush/clear queue
router.post('/flush', requireAuth, (req, res) => {
  try {
    const { status } = req.body;
    
    if (status) {
      const originalLength = mockQueueItems.length;
      for (let i = mockQueueItems.length - 1; i >= 0; i--) {
        if (mockQueueItems[i].status === status) {
          mockQueueItems.splice(i, 1);
        }
      }
      const removed = originalLength - mockQueueItems.length;
      console.log(`[WhatsApp Queue] Flushed ${removed} items with status: ${status}`);
      res.json({ success: true, removed, message: `Flushed ${removed} ${status} items` });
    } else {
      const originalLength = mockQueueItems.length;
      mockQueueItems.length = 0;
      console.log(`[WhatsApp Queue] Flushed all ${originalLength} items`);
      res.json({ success: true, removed: originalLength, message: 'Flushed entire queue' });
    }
  } catch (error) {
    console.error('[WhatsApp Queue] Error flushing queue:', error);
    res.status(500).json({ error: 'Failed to flush queue' });
  }
});

// Update delivery status (webhook simulation)
router.post('/webhook/delivery', (req, res) => {
  try {
    const { messageId, status, timestamp } = req.body;
    
    const item = mockQueueItems.find(item => item.messageId === messageId);
    if (item) {
      if (status === 'delivered' && !item.deliveredAt) {
        item.deliveredAt = timestamp || new Date().toISOString();
        console.log(`[WhatsApp Queue] Message ${messageId} delivered`);
      } else if (status === 'read' && !item.readAt) {
        item.readAt = timestamp || new Date().toISOString();
        console.log(`[WhatsApp Queue] Message ${messageId} read`);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp Queue] Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;