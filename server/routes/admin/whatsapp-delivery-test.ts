import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { whatsappService } from '../../services/whatsappService';
// WhatsApp delivery tracker temporarily disabled during service recreation
// import { deliveryTracker } from '../../services/whatsappDeliveryTracker';

const router = Router();
// Temporarily disabled during service recreation

// Test WhatsApp delivery tracking
router.post('/whatsapp-delivery-test', requireAuth, async (req, res) => {
  try {
    const testPhone = '923008463660'; // Real test number
    const testMessage = `📊 WhatsApp Delivery Test - ${new Date().toLocaleTimeString()}`;
    
    console.log('[Delivery Test] Sending test message with delivery tracking...');
    console.log('[Delivery Test] Target phone:', testPhone);
    console.log('[Delivery Test] Message content:', testMessage);
    
    // Send test message
    const result = await whatsappService.sendTextMessage(testPhone, testMessage);
    console.log('[Delivery Test] WhatsApp service result:', JSON.stringify(result, null, 2));
    
    if (result && result.success && result.messageId) {
      // Simulate delivery status updates (since webhook may not be immediate)
      setTimeout(async () => {
        if (result.messageId) {
          await deliveryTracker.updateDeliveryStatus({
            messageId: result.messageId,
            status: 'delivered',
            timestamp: new Date().toISOString(),
            details: { test_update: true }
          });
          console.log(`[Delivery Test] Updated ${result.messageId} to delivered`);
        }
      }, 3000);

      // Simulate read status after 8 seconds
      setTimeout(async () => {
        if (result.messageId) {
          await deliveryTracker.updateDeliveryStatus({
            messageId: result.messageId,
            status: 'read',
            timestamp: new Date().toISOString(),
            details: { test_update: true, read_simulation: true }
          });
          console.log(`[Delivery Test] Updated ${result.messageId} to read`);
        }
      }, 8000);

      res.json({
        success: true,
        messageId: result.messageId,
        testPhone,
        message: 'Test message sent with delivery tracking',
        checkmarkInfo: deliveryTracker.getCheckmarkStatus('sent')
      });
    } else {
      console.log('[Delivery Test] Message sending failed:', result);
      res.status(400).json({
        success: false,
        error: result?.error || 'WhatsApp service returned failure',
        errorCode: result?.errorCode || 'UNKNOWN_ERROR',
        details: result
      });
    }
  } catch (error) {
    console.error('[Delivery Test] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    res.status(500).json({ 
      error: 'Test failed', 
      details: errorMessage,
      stack: errorStack
    });
  }
});

// Get delivery status for message
router.get('/whatsapp-delivery-status/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const details = await deliveryTracker.getMessageDeliveryDetails(messageId);
    
    if (!details) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const checkmarkStatus = deliveryTracker.getCheckmarkStatus(details.status);

    res.json({
      ...details,
      checkmarkDisplay: checkmarkStatus,
      formattedTimestamps: {
        sent: details.timestamps.sent ? new Date(details.timestamps.sent).toLocaleString() : null,
        delivered: details.timestamps.delivered ? new Date(details.timestamps.delivered).toLocaleString() : null,
        read: details.timestamps.read ? new Date(details.timestamps.read).toLocaleString() : null,
      }
    });
  } catch (error) {
    console.error('[Delivery Status] Error:', error);
    res.status(500).json({ error: 'Failed to get delivery status' });
  }
});

export default router;