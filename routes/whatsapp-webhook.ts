import { Router } from 'express';
// WhatsApp chatbot temporarily disabled during service recreation
// import { whatsappChatbot } from '../services/whatsappChatbot';
// WhatsApp delivery tracker temporarily disabled during service recreation
// import { deliveryTracker } from '../services/whatsappDeliveryTracker';

const router = Router();

// WhatsApp Webhook Verification (GET request)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Use environment variable or default verification token
  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'nexlinx-webhook-verify-token';
  
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('[WhatsApp Webhook] Verification failed - invalid token');
      res.status(403).send('Forbidden');
    }
  } else {
    console.log('[WhatsApp Webhook] Verification failed - missing parameters');
    res.status(400).send('Bad Request');
  }
});

// WhatsApp Webhook Event Handler (POST request)
router.post('/webhook', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(`[WhatsApp Webhook] ${timestamp} - WEBHOOK RECEIVED:`, JSON.stringify(req.body, null, 2));
    console.log(`[WhatsApp Webhook] ${timestamp} - Request headers:`, JSON.stringify(req.headers, null, 2));
    
    const body = req.body;

    // WhatsApp webhook event format validation - handle both official webhooks and test messages
    if (body.object === 'whatsapp_business_account' || !body.object) {
      console.log(`[WhatsApp Webhook] ${timestamp} - Processing webhook (object: ${body.object || 'undefined'})`);
      
      if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]) {
        const change = body.entry[0].changes[0];
        console.log(`[WhatsApp Webhook] ${timestamp} - Processing change:`, JSON.stringify(change, null, 2));

        // Process delivery status updates
        if (change.value.statuses) {
          console.log(`[WhatsApp Webhook] ${timestamp} - Processing ${change.value.statuses.length} delivery status updates`);
          await deliveryTracker.processWebhookStatus(change.value);
        }
        
        // Process message events - handle both official format and direct message format
        if ((change.field === 'messages' && change.value && change.value.messages) || 
            (!change.field && change.value && change.value.messages)) {
          console.log(`[WhatsApp Webhook] ${timestamp} - Found ${change.value.messages.length} messages`);
          
          for (const message of change.value.messages) {
            console.log(`[WhatsApp Webhook] ${timestamp} - Processing message:`, JSON.stringify(message, null, 2));
            const result = await processIncomingMessage(message, change.value);
            console.log(`[WhatsApp Webhook] ${timestamp} - Message processing result:`, result);
          }
        } else {
          console.log(`[WhatsApp Webhook] ${timestamp} - No messages found - field: ${change.field}`);
          console.log(`[WhatsApp Webhook] ${timestamp} - Change value:`, JSON.stringify(change.value, null, 2));
        }
      } else {
        console.log(`[WhatsApp Webhook] ${timestamp} - Invalid structure - body keys:`, Object.keys(body));
      }
      
      // Always return 200 OK to acknowledge receipt
      res.status(200).send('OK');
    } else {
      console.log(`[WhatsApp Webhook] ${timestamp} - Unknown object type: ${body.object}`);
      console.log(`[WhatsApp Webhook] ${timestamp} - Full body:`, JSON.stringify(body, null, 2));
      res.status(200).send('OK');
    }
    
  } catch (error) {
    console.error(`[WhatsApp Webhook] ${new Date().toISOString()} - WEBHOOK ERROR:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process individual incoming WhatsApp message
 */
async function processIncomingMessage(message: any, webhookValue: any): Promise<void> {
  try {
    // Extract message details
    const phoneNumber = message.from; // Sender's phone number
    const messageId = message.id;
    const timestamp = parseInt(message.timestamp);
    
    // Skip status messages and non-text messages for now
    if (message.type !== 'text') {
      console.log(`[WhatsApp Webhook] Skipping non-text message: ${message.type}`);
      return;
    }
    
    const messageContent = message.text?.body || '';
    
    console.log(`[WhatsApp Webhook] Processing text message from ${phoneNumber}: "${messageContent}"`);
    
    // Process through chatbot system with message ID for deduplication
    const chatbotResponse = await whatsappChatbot.processIncomingMessage(phoneNumber, messageContent, messageId);
    
    // Log processing result
    if (chatbotResponse.success) {
      console.log(`[WhatsApp Webhook] ✅ Message processed successfully: ${chatbotResponse.action}`);
      
      // Special logging for employee registration events
      if (chatbotResponse.employeeFound) {
        if (chatbotResponse.action === 'register_prompt') {
          console.log(`[WhatsApp Webhook] 🔔 Employee registration prompt sent to ${phoneNumber}`);
        } else if (chatbotResponse.action === 'registration_complete') {
          console.log(`[WhatsApp Webhook] ✅ Employee registration completed for ${phoneNumber}`);
        }
      } else {
        console.log(`[WhatsApp Webhook] 📝 Unknown user acknowledged: ${phoneNumber}`);
      }
    } else {
      console.log(`[WhatsApp Webhook] ❌ Message processing failed: ${chatbotResponse.message}`);
    }
    
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing individual message:', error);
  }
}

// Chatbot management endpoints
router.get('/chatbot/status', (req, res) => {
  const status = whatsappChatbot.getStatus();
  res.json({
    success: true,
    ...status,
    message: 'Chatbot status retrieved successfully'
  });
});

router.post('/chatbot/enable', (req, res) => {
  whatsappChatbot.setEnabled(true);
  res.json({
    success: true,
    enabled: true,
    message: 'Chatbot enabled successfully'
  });
});

router.post('/chatbot/disable', (req, res) => {
  whatsappChatbot.setEnabled(false);
  res.json({
    success: true,
    enabled: false,
    message: 'Chatbot disabled successfully'
  });
});

// Test endpoint for manual message processing
router.post('/chatbot/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and message are required'
      });
    }
    
    const response = await whatsappChatbot.processIncomingMessage(phoneNumber, message);
    res.json({
      success: true,
      response,
      message: 'Test message processed successfully'
    });
    
  } catch (error) {
    console.error('[WhatsApp Webhook] Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process test message'
    });
  }
});

export { router as whatsappWebhookRouter };