import express from 'express';
import { notificationService } from '../services/notificationService.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

// Create recipient schema
const createRecipientSchema = z.object({
  recipientType: z.enum(['email', 'mobile', 'whatsapp']),
  recipientValue: z.string().min(1),
  recipientName: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  alertTypes: z.array(z.string()).optional(),
  severityLevels: z.array(z.string()).optional(),
  notificationMethods: z.array(z.string()).min(1),
});

// Update recipient schema
const updateRecipientSchema = z.object({
  recipientName: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  alertTypes: z.array(z.string()).optional(),
  severityLevels: z.array(z.string()).optional(),
  notificationMethods: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Get all recipients
router.get('/recipients', requireAuth, async (req, res) => {
  try {
    const { recipientType, department, isActive, isVerified } = req.query;
    
    const filters = {
      recipientType: recipientType as string,
      department: department as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
    };

    const recipients = await notificationService.getRecipients(filters);
    res.json(recipients);
  } catch (error) {
    console.error('[NotificationManagement API] Error fetching recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

// Add new recipient
router.post('/recipients', requireAuth, async (req, res) => {
  try {
    const validation = createRecipientSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid recipient data', details: validation.error.issues });
    }

    const recipientData = {
      ...validation.data,
      createdBy: req.user?.id,
    };
    
    const recipientId = await notificationService.addRecipient(recipientData);
    res.status(201).json({ success: true, recipientId });
  } catch (error) {
    console.error('[NotificationManagement API] Error adding recipient:', error);
    res.status(500).json({ error: 'Failed to add recipient' });
  }
});

// Update recipient
router.put('/recipients/:id', requireAuth, async (req, res) => {
  try {
    const recipientId = parseInt(req.params.id);
    const validation = updateRecipientSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid update data', details: validation.error.issues });
    }

    await notificationService.updateRecipient(recipientId, validation.data);
    res.json({ success: true });
  } catch (error) {
    console.error('[NotificationManagement API] Error updating recipient:', error);
    res.status(500).json({ error: 'Failed to update recipient' });
  }
});

// Delete recipient
router.delete('/recipients/:id', requireAuth, async (req, res) => {
  try {
    const recipientId = parseInt(req.params.id);
    await notificationService.deleteRecipient(recipientId);
    res.json({ success: true });
  } catch (error) {
    console.error('[NotificationManagement API] Error deleting recipient:', error);
    res.status(500).json({ error: 'Failed to delete recipient' });
  }
});

// Verify recipient
router.post('/recipients/:id/verify', requireAuth, async (req, res) => {
  try {
    const recipientId = parseInt(req.params.id);
    await notificationService.verifyRecipient(recipientId);
    res.json({ success: true });
  } catch (error) {
    console.error('[NotificationManagement API] Error verifying recipient:', error);
    res.status(500).json({ error: 'Failed to verify recipient' });
  }
});

// Get delivery statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const stats = await notificationService.getDeliveryStats(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );
    
    res.json(stats);
  } catch (error) {
    console.error('[NotificationManagement API] Error fetching delivery stats:', error);
    res.status(500).json({ error: 'Failed to fetch delivery statistics' });
  }
});

// Get service status
router.get('/service/status', requireAuth, async (req, res) => {
  try {
    const status = notificationService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('[NotificationManagement API] Error fetching service status:', error);
    res.status(500).json({ error: 'Failed to fetch service status' });
  }
});

// Test notification
router.post('/test', requireAuth, async (req, res) => {
  try {
    const { recipientType, recipientValue, message } = req.body;
    
    if (!recipientType || !recipientValue || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const testNotification = {
      alertType: 'test',
      severity: 'info',
      title: 'Test Notification',
      message: message,
      source: 'manual_test',
      metadata: { testId: Date.now() }
    };

    // Create a temporary recipient for testing
    const tempRecipient = {
      id: 0,
      recipientType,
      recipientValue,
      recipientName: 'Test User',
      isActive: true,
      isVerified: true,
      notificationMethods: [recipientType === 'email' ? 'email' : recipientType === 'mobile' ? 'sms' : 'whatsapp']
    };

    await notificationService.sendNotificationsForAlert(testNotification);
    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('[NotificationManagement API] Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;