import { Router } from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Comprehensive WhatsApp diagnostic endpoint
router.get('/diagnostic', requireAuth, async (req, res) => {
  try {
    const accessToken = process.env.WHATSAPP_PERMANENT_TOKEN || 
                       process.env.WHATSAPP_ACCESS_TOKEN || 
                       'EAASCFu0JZBfMBPA6yNYhqLU07y0WG6RtcnYFKpXjqHT5yFe9FYZBh4XOGn7eL0lpMX8BrGXA312aN6vNtX4yDgeSFmvS8enObCxZA0kSl4S52uOuXDnDUZCNTO5QgBR2lQW3qEmcysjqVNahH9uShYvBZAbG3tjzkRC4vcZBeSCDxpDiFOVBU5lMbGZCRYZAAgZDZD';
    
    const businessId = process.env.WHATSAPP_BUSINESS_ID;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    console.log('[WhatsApp Diagnostic] Starting comprehensive diagnostic check...');

    // Test 1: Business Account Status
    let businessStatus = null;
    try {
      const businessResponse = await axios.get(`https://graph.facebook.com/v18.0/${businessId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      businessStatus = businessResponse.data;
    } catch (error: any) {
      businessStatus = { error: error.response?.data || error.message };
    }

    // Test 2: Phone Number Status
    let phoneStatus = null;
    try {
      const phoneResponse = await axios.get(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      phoneStatus = phoneResponse.data;
    } catch (error: any) {
      phoneStatus = { error: error.response?.data || error.message };
    }

    // Test 3: Message Templates
    let templates = null;
    try {
      const templatesResponse = await axios.get(`https://graph.facebook.com/v18.0/${businessId}/message_templates`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      templates = templatesResponse.data;
    } catch (error: any) {
      templates = { error: error.response?.data || error.message };
    }

    // Test 4: API Connection Test
    let apiTest = null;
    try {
      const testResponse = await axios.post(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '923008463660',
        type: 'text',
        text: { body: '🔍 DIAGNOSTIC TEST: API connectivity verification - ' + new Date().toISOString() }
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      apiTest = { success: true, messageId: testResponse.data.messages[0].id };
    } catch (error: any) {
      apiTest = { success: false, error: error.response?.data || error.message };
    }

    // Analysis and recommendations
    const analysis = {
      deliveryBlocks: [] as string[],
      recommendations: [] as string[],
      severity: 'info' as 'info' | 'warning' | 'error'
    };

    // Check for common delivery blockers
    if (phoneStatus?.code_verification_status === 'EXPIRED') {
      analysis.deliveryBlocks.push('Phone number verification expired');
      analysis.recommendations.push('Re-verify phone number in Meta Business Manager');
      analysis.severity = 'error';
    }

    if (phoneStatus?.quality_rating === 'RED') {
      analysis.deliveryBlocks.push('Poor message quality rating');
      analysis.recommendations.push('Review message content and user feedback');
      analysis.severity = 'error';
    }

    if (!templates?.data || templates.data.length === 0) {
      analysis.deliveryBlocks.push('No approved message templates');
      analysis.recommendations.push('Create and approve message templates in Meta Business Manager');
      if (analysis.severity !== 'error') analysis.severity = 'warning';
    }

    const diagnostic = {
      timestamp: new Date().toISOString(),
      status: 'completed',
      business: businessStatus,
      phone: phoneStatus,
      templates,
      apiTest,
      analysis,
      environment: {
        hasPermToken: !!process.env.WHATSAPP_PERMANENT_TOKEN,
        webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || 'https://nex-ems.replit.app/api/whatsapp/webhook',
        webhookToken: process.env.WHATSAPP_WEBHOOK_TOKEN || 'nexlinx_webhook_secure_token_2025'
      }
    };

    console.log('[WhatsApp Diagnostic] Diagnostic completed:', {
      businessName: businessStatus?.name,
      phoneStatus: phoneStatus?.code_verification_status,
      qualityRating: phoneStatus?.quality_rating,
      templatesCount: templates?.data?.length || 0,
      apiTestSuccess: apiTest?.success
    });

    res.json(diagnostic);
  } catch (error) {
    console.error('[WhatsApp Diagnostic] Error:', error);
    res.status(500).json({ error: 'Diagnostic failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Message delivery status check
router.get('/delivery-status/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const accessToken = process.env.WHATSAPP_PERMANENT_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

    // Note: WhatsApp doesn't provide direct message status API
    // Status updates come via webhooks
    res.json({
      messageId,
      note: 'Message delivery status is provided via webhooks. Check webhook logs for delivery updates.',
      webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || 'https://nex-ems.replit.app/api/whatsapp/webhook'
    });
  } catch (error) {
    console.error('[WhatsApp] Delivery status error:', error);
    res.status(500).json({ error: 'Failed to check delivery status' });
  }
});

// Quick fix webhook configuration
router.post('/fix-webhook', requireAuth, async (req, res) => {
  try {
    const { webhookUrl, verifyToken } = req.body;
    
    if (!webhookUrl || !verifyToken) {
      return res.status(400).json({ error: 'webhookUrl and verifyToken are required' });
    }

    // Note: Webhook configuration must be done manually in Meta Business Manager
    // This endpoint provides instructions
    res.json({
      success: true,
      message: 'Webhook configuration instructions provided',
      instructions: {
        step1: 'Go to Meta Business Manager → WhatsApp → Configuration',
        step2: `Set Webhook URL to: ${webhookUrl}`,
        step3: `Set Verify Token to: ${verifyToken}`,
        step4: 'Subscribe to message events',
        currentConfig: {
          webhookUrl: process.env.WHATSAPP_WEBHOOK_URL,
          verifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN
        }
      }
    });
  } catch (error) {
    console.error('[WhatsApp] Fix webhook error:', error);
    res.status(500).json({ error: 'Failed to provide webhook fix instructions' });
  }
});

export default router;