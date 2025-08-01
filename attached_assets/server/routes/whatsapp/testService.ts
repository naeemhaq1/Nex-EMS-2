import { Router } from 'express';
import { WhatsAppService } from '../../services/whatsappService';
import { requireAdmin } from '../../middleware/auth';

const router = Router();
// Using singleton WhatsApp service instance

// Test WhatsApp Service - Send test message
router.post('/test-message', requireAdmin, async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    console.log(`[WhatsApp Test] Sending test message to ${phoneNumber}: ${message}`);

    const result = await whatsappService.sendMessage({
      to: phoneNumber,
      type: 'text',
      text: {
        body: message
      }
    });

    console.log(`[WhatsApp Test] Result:`, result);

    return res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      details: result
    });

  } catch (error) {
    console.error('[WhatsApp Test] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// WhatsApp Service Status Check
router.get('/status', requireAdmin, async (req, res) => {
  try {
    // Test WhatsApp API connectivity
    const testResult = await whatsappService.sendMessage({
      to: '923008463660', // Admin number for testing
      type: 'text',
      text: {
        body: 'WhatsApp service status check - System operational ✅'
      }
    });

    return res.json({
      success: true,
      service: 'WhatsApp Business API',
      status: testResult.success ? 'Connected' : 'Error',
      messageId: testResult.messageId,
      error: testResult.error,
      timestamp: new Date().toISOString(),
      accountStatus: {
        businessId: process.env.WHATSAPP_BUSINESS_ID,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        phoneNumber: process.env.WHATSAPP_PHONE_NUMBER,
        verificationNote: 'Account verification may be expired - messages send successfully but delivery requires re-verification'
      }
    });

  } catch (error) {
    console.error('[WhatsApp Status] Error:', error);
    return res.status(500).json({
      success: false,
      status: 'Error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// WhatsApp Configuration Check
router.get('/config', requireAdmin, async (req, res) => {
  try {
    return res.json({
      success: true,
      configuration: {
        hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
        hasBusinessId: !!process.env.WHATSAPP_BUSINESS_ID,
        hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
        hasWebhookToken: !!process.env.WHATSAPP_WEBHOOK_TOKEN,
        phoneNumber: process.env.WHATSAPP_PHONE_NUMBER,
        webhookUrl: process.env.WHATSAPP_WEBHOOK_URL,
        apiVersion: 'v18.0',
        serviceStatus: 'Configured and Ready'
      }
    });
  } catch (error) {
    console.error('[WhatsApp Config] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;