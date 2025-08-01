import { Router } from 'express';
import { whatsappService } from '../services/whatsappService';
import { whatsappAnnouncementService } from '../services/whatsappAnnouncementService';
import { requireAuth } from '../middleware/auth';
import { storage } from '../storage';
import { normalizeWhatsAppNumber } from '../../shared/utils/phoneUtils';

const router = Router();

// Log router initialization
console.log('[WhatsApp] Router initialized and routes being registered');

// Simple test route to check if router is working
router.get('/test', (req, res) => {
  console.log('[WhatsApp] Test route called successfully');
  res.json({ success: true, message: 'WhatsApp router is working' });
});

// Test message endpoint (no auth required for debugging)
router.post('/test-send', async (req, res) => {
  try {
    // Support both parameter formats: { phoneNumber, message } and { to, message }
    const { phoneNumber, to, message } = req.body;
    const targetPhone = phoneNumber || to;
    
    console.log('[WhatsApp] Test send message request:', { phoneNumber, to, targetPhone, message });
    
    if (!targetPhone || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number and message are required' 
      });
    }

    // Format phone number - WhatsApp API expects numbers WITHOUT + prefix
    const formattedPhone = targetPhone.replace(/^\+/, '');
    
    const result = await whatsappService.sendMessage({
      to: formattedPhone,
      type: 'text',
      text: {
        body: message
      }
    });
    console.log('[WhatsApp] Test send message result:', result);
    
    if (result.success) {
      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Test message sent successfully',
        timestamp: new Date().toISOString(),
        phoneNumber: targetPhone
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error: any) {
    console.error('[WhatsApp] Test send message error:', error);
    
    let userFriendlyError = 'Failed to send test message';
    let errorDetails = error.message;
    
    // Provide specific error feedback based on error type
    if (error.message?.includes('not a function')) {
      userFriendlyError = 'WhatsApp service configuration error';
      errorDetails = 'Internal service method error - contact administrator';
    } else if (error.message?.includes('credentials')) {
      userFriendlyError = 'WhatsApp API credentials missing or invalid';
      errorDetails = 'Please configure WhatsApp access token, phone number ID, and business ID';
    } else if (error.message?.includes('rate limit')) {
      userFriendlyError = 'WhatsApp API rate limit exceeded';
      errorDetails = 'Too many messages sent. Please wait a few minutes before trying again';
    } else if (error.message?.includes('phone number')) {
      userFriendlyError = 'Invalid phone number format';
      errorDetails = 'Please use international format (e.g., +923001234567)';
    } else if (error.message?.includes('database') || error.code === '23502') {
      userFriendlyError = 'Database configuration error';
      errorDetails = 'Message logging failed - contact administrator';
    }
    
    res.status(500).json({ 
      success: false, 
      error: userFriendlyError,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
});

// Template message endpoint - bypasses verification issue
router.post('/send-template', async (req, res) => {
  try {
    const { phoneNumber, templateName, language = 'en_US' } = req.body;
    console.log('[WhatsApp] Template request:', { phoneNumber, templateName });
    
    if (!phoneNumber || !templateName) {
      return res.status(400).json({ success: false, error: 'Phone number and template required' });
    }

    const formattedPhone = phoneNumber.replace(/^\+/, '');
    
    const response = await fetch(`https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language }
        }
      })
    });

    const data = await response.json();
    console.log('[WhatsApp] Template response:', data);
    
    if (response.ok && data.messages?.[0]?.id) {
      res.json({ 
        success: true, 
        messageId: data.messages[0].id,
        message: `Template "${templateName}" sent successfully`,
        templateName,
        deliveryStatus: 'accepted'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: data.error?.message || 'Template send failed',
        details: data
      });
    }
  } catch (error: any) {
    console.error('[WhatsApp] Template error:', error);
    res.status(500).json({ success: false, error: 'Server error', details: error.message });
  }
});

// Force reload configuration endpoint
router.post('/reload-config', async (req, res) => {
  try {
    console.log('[WhatsApp] 🔄 Force reloading WhatsApp service configuration...');
    
    // Reload WhatsApp service config directly
    whatsappService.reloadConfig();
    
    res.json({ 
      success: true, 
      message: 'WhatsApp configuration reloaded successfully',
      timestamp: new Date().toISOString(),
      token: process.env.WHATSAPP_ACCESS_TOKEN?.substring(0, 20) + '...',
      phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID
    });
  } catch (error: any) {
    console.error('[WhatsApp] Config reload error:', error);
    res.status(500).json({ success: false, error: 'Failed to reload configuration', details: error.message });
  }
});

// Webhook verification endpoint
router.get('/webhook', (req, res) => {
  console.log('[WhatsApp] ========== WEBHOOK VERIFICATION REQUEST ==========');
  console.log('[WhatsApp] Request URL:', req.originalUrl);
  console.log('[WhatsApp] Request method:', req.method);
  console.log('[WhatsApp] Request headers:', req.headers);
  console.log('[WhatsApp] Request query:', req.query);
  console.log('[WhatsApp] THIS IS THE WEBHOOK ENDPOINT BEING CALLED');
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[WhatsApp] Webhook verification attempt:', {
    mode,
    token,
    challenge,
    expectedToken: whatsappService.getConfig().webhookToken
  });

  if (mode && token && challenge) {
    if (mode === 'subscribe' && token === whatsappService.getConfig().webhookToken) {
      console.log('[WhatsApp] Webhook verified successfully - sending challenge');
      res.status(200).send(challenge);
    } else {
      console.log('[WhatsApp] Webhook verification failed - token mismatch');
      res.sendStatus(403);
    }
  } else {
    console.log('[WhatsApp] Webhook verification failed - missing parameters');
    res.sendStatus(400);
  }
});

// Webhook endpoint for incoming messages
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('[WhatsApp] Webhook received:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      // Handle incoming message
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === 'messages') {
            const messages = change.value.messages;
            const statuses = change.value.statuses;

            // Process incoming messages
            messages?.forEach(async (message: any) => {
              await whatsappService.handleIncomingMessage({
                id: message.id,
                from: message.from,
                timestamp: message.timestamp,
                text: message.text,
                type: message.type
              });
            });

            // Process message status updates
            statuses?.forEach((status: any) => {
              console.log(`[WhatsApp] Message ${status.id} status: ${status.status}`);
            });
          }
        });
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[WhatsApp] Webhook error:', error);
    res.sendStatus(500);
  }
});

// Get all WhatsApp messages for console
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const messages = await storage.getWhatsAppMessages();
    res.json(messages);
  } catch (error) {
    console.error('[WhatsApp] Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send custom message endpoint
router.post('/send-custom', requireAuth, async (req, res) => {
  try {
    const { to, recipientName, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await whatsappService.sendCustomMessage(to, recipientName || 'User', message);
    
    if (result.success) {
      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Message sent successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Send custom message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send template message endpoint
router.post('/send-template', requireAuth, async (req, res) => {
  try {
    const { to, templateName } = req.body;
    
    if (!to || !templateName) {
      return res.status(400).json({ error: 'Phone number and template name are required' });
    }

    const result = await whatsappService.sendTemplateMessage(to, templateName);
    
    if (result.success) {
      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Template message sent successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Send template message error:', error);
    res.status(500).json({ error: 'Failed to send template message' });
  }
});

// Send message endpoint
router.post('/send-message', requireAuth, async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await whatsappService.sendTextMessage(to, message);
    
    if (result.success) {
      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Message sent successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send attendance report endpoint
router.post('/send-attendance-report', requireAuth, async (req, res) => {
  try {
    const { employeeId, date } = req.body;
    
    const employee = await storage.getEmployee(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (!employee.phone) {
      return res.status(400).json({ error: 'Employee phone number not registered' });
    }

    // Get attendance data for the date
    const attendance = await storage.getAttendanceRecords({
      employeeId,
      startDate: new Date(date),
      endDate: new Date(date)
    });

    const status = attendance.length > 0 ? 'Present' : 'Absent';
    
    const result = await whatsappService.sendAttendanceReport(
      employee.phone,
      `${employee.firstName} ${employee.lastName}`,
      date,
      status
    );
    
    if (result.success) {
      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Attendance report sent successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Send attendance report error:', error);
    res.status(500).json({ error: 'Failed to send attendance report' });
  }
});

// Send late arrival alert endpoint
router.post('/send-late-alert', requireAuth, async (req, res) => {
  try {
    const { employeeId, arrivalTime } = req.body;
    
    const employee = await storage.getEmployee(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (!employee.phone) {
      return res.status(400).json({ error: 'Employee phone number not registered' });
    }

    const result = await whatsappService.sendLateArrivalAlert(
      employee.phone,
      `${employee.firstName} ${employee.lastName}`,
      arrivalTime
    );
    
    if (result.success) {
      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Late arrival alert sent successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Send late alert error:', error);
    res.status(500).json({ error: 'Failed to send late arrival alert' });
  }
});

// Get WhatsApp configuration
router.get('/config', requireAuth, (req, res) => {
  const config = whatsappService.getConfig();
  
  // Remove sensitive data before sending
  const safeConfig = {
    businessId: config.businessId,
    phoneNumber: config.phoneNumber,
    webhookUrl: config.webhookUrl,
    phoneNumberId: config.phoneNumberId,
    status: 'enabled',
    serviceType: 'direct'
  };
  
  res.json(safeConfig);
});

// Test direct service endpoint
router.post('/test-direct', requireAuth, async (req, res) => {
  try {
    const { phoneNumber, testMessage } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const message = testMessage || '🚀 *Direct WhatsApp Service Test*\n\nThis is a test message from Nexlinx Smart EMS using direct Meta Business API.\n\n✅ Direct service is working correctly!\n\n_Nexlinx Smart EMS_';
    
    const result = await whatsappService.sendTextMessage(phoneNumber, message);
    
    if (result.success) {
      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Direct service test successful',
        phoneNumber: phoneNumber,
        serviceType: 'direct'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error,
        serviceType: 'direct'
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Direct service test error:', error);
    res.status(500).json({ error: 'Direct service test failed' });
  }
});

// Get business profile
router.get('/business-profile', requireAuth, async (req, res) => {
  try {
    const profile = await whatsappService.getBusinessProfile();
    res.json(profile);
  } catch (error) {
    console.error('[WhatsApp] Get business profile error:', error);
    res.status(500).json({ error: 'Failed to get business profile' });
  }
});

// Get phone number info
router.get('/phone-info', requireAuth, async (req, res) => {
  try {
    const phoneInfo = await whatsappService.getPhoneNumberInfo();
    res.json(phoneInfo);
  } catch (error) {
    console.error('[WhatsApp] Get phone info error:', error);
    res.status(500).json({ error: 'Failed to get phone number info' });
  }
});

// Test message endpoint
router.post('/test-message', requireAuth, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const testMessage = '🧪 *Test Message*\n\nThis is a test message from Nexlinx Smart EMS WhatsApp service.\n\n✅ Service is working correctly!\n\n_Nexlinx Smart EMS_';
    
    const result = await whatsappService.sendTextMessage(phoneNumber, testMessage);
    
    if (result.success) {
      res.json({ 
        success: true, 
        messageId: result.messageId,
        message: 'Test message sent successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Test message error:', error);
    res.status(500).json({ error: 'Failed to send test message' });
  }
});

// Admin statistics endpoint
router.get('/admin/stats', requireAuth, async (req, res) => {
  try {
    // Get all messages from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const messageStats = await storage.getWhatsAppMessageStats(thirtyDaysAgo);
    
    // Get employees with WhatsApp numbers
    const employees = await storage.getEmployees({ isActive: true });
    const employeesWithWhatsApp = employees.filter(emp => emp.phone && emp.phone.trim());
    
    // Get today's message count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStats = await storage.getWhatsAppMessageStats(today);
    
    // Calculate stats
    const stats = {
      totalMessages: messageStats.totalMessages || 0,
      totalEmployees: employeesWithWhatsApp.length,
      activeConversations: messageStats.activeConversations || 0,
      messagesSentToday: todayStats.totalMessages || 0,
      deliveryRate: Math.round((messageStats.deliveredMessages || 0) / Math.max(messageStats.totalMessages || 1, 1) * 100),
      responseRate: Math.round((messageStats.respondedMessages || 0) / Math.max(messageStats.totalMessages || 1, 1) * 100)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('[WhatsApp] Admin stats error:', error);
    // Return default stats if error occurs
    res.json({
      totalMessages: 0,
      totalEmployees: 0,
      activeConversations: 0,
      messagesSentToday: 0,
      deliveryRate: 0,
      responseRate: 0
    });
  }
});

// Get all messages endpoint
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const messages = await storage.getWhatsAppMessages();
    res.json(messages);
  } catch (error) {
    console.error('[WhatsApp] Get messages error:', error);
    res.json([]);
  }
});

// Mount diagnostic router
import diagnosticRouter from './whatsapp-diagnostic';
router.use('/diagnostic', diagnosticRouter);

// Full Send/Receive Test System
router.post('/full-test', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number is required for full test' 
      });
    }

    console.log('[WhatsApp] Starting full send/receive test for:', phoneNumber);
    
    // Step 1: Send test message with unique identifier
    const testId = Date.now().toString();
    const testMessage = `🧪 FULL TEST ${testId}\n\nThis is a comprehensive send/receive test.\n\nReply with: TEST-${testId}\n\n✅ Testing both directions!\n\n_Nexlinx Smart EMS_`;
    
    // Format phone number - WhatsApp API expects numbers WITHOUT + prefix
    const formattedPhone = phoneNumber.replace(/^\+/, '');
    
    const sendResult = await whatsappService.sendMessage({
      to: formattedPhone,
      type: 'text',
      text: {
        body: testMessage
      }
    });
    
    if (!sendResult.success) {
      return res.json({
        success: false,
        error: `Send failed: ${sendResult.error}`,
        testId
      });
    }

    // Step 2: Set up receive monitoring
    const receiveTimeout = 30000; // 30 seconds to reply
    const startTime = Date.now();
    
    // Store test session for webhook to find
    global.activeTests = global.activeTests || new Map();
    global.activeTests.set(testId, {
      phoneNumber,
      startTime,
      sendMessageId: sendResult.messageId,
      expectedReply: `TEST-${testId}`,
      status: 'waiting_for_reply'
    });

    res.json({
      success: true,
      testId,
      sendMessageId: sendResult.messageId,
      message: 'Test message sent successfully',
      instructions: `Reply with: TEST-${testId}`,
      waitingForReply: true,
      timeout: receiveTimeout / 1000,
      timestamp: new Date().toISOString(),
      phoneNumber
    });

  } catch (error) {
    console.error('[WhatsApp] Full test error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Full test failed' 
    });
  }
});

// Check full test status
router.get('/test-status/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    
    if (!global.activeTests || !global.activeTests.has(testId)) {
      return res.json({
        success: false,
        error: 'Test not found or expired',
        testId
      });
    }

    const test = global.activeTests.get(testId);
    const elapsed = Date.now() - test.startTime;
    const isExpired = elapsed > 30000; // 30 seconds timeout

    if (isExpired && test.status === 'waiting_for_reply') {
      test.status = 'timeout';
      global.activeTests.delete(testId);
    }

    res.json({
      success: true,
      testId,
      status: test.status,
      elapsed: Math.round(elapsed / 1000),
      sendMessageId: test.sendMessageId,
      receivedReply: test.receivedReply || null,
      receivedAt: test.receivedAt || null,
      replyMessageId: test.replyMessageId || null
    });

  } catch (error) {
    console.error('[WhatsApp] Test status error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get test status' 
    });
  }
});

// Process webhook for receive testing
router.post('/webhook-test', async (req, res) => {
  try {
    console.log('[WhatsApp] Webhook test data:', JSON.stringify(req.body, null, 2));
    
    // Extract message data from webhook
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.status(200).json({ received: true, processed: false });
    }

    const message = messages[0];
    const fromPhone = message.from;
    const messageText = message.text?.body;
    const messageId = message.id;

    console.log('[WhatsApp] Received message:', { fromPhone, messageText, messageId });

    // Check if this matches any active test
    if (global.activeTests) {
      for (const [testId, test] of global.activeTests.entries()) {
        if (test.phoneNumber.includes(fromPhone) || fromPhone.includes(test.phoneNumber.replace('+', ''))) {
          if (messageText && messageText.includes(`TEST-${testId}`)) {
            // Test completed successfully!
            test.status = 'completed';
            test.receivedReply = messageText;
            test.receivedAt = new Date().toISOString();
            test.replyMessageId = messageId;
            
            console.log('[WhatsApp] Full test completed successfully:', testId);
            
            // Send confirmation
            const confirmPhone = test.phoneNumber.replace(/^\+/, '');
            await whatsappService.sendMessage({
              to: confirmPhone,
              type: 'text',
              text: {
                body: `✅ FULL TEST COMPLETED!\n\nTest ID: ${testId}\nSend ✓ Receive ✓\n\nBoth directions working perfectly!\n\n_Nexlinx Smart EMS_`
              }
            });
            
            break;
          }
        }
      }
    }

    res.status(200).json({ received: true, processed: true });

  } catch (error) {
    console.error('[WhatsApp] Webhook test error:', error);
    res.status(200).json({ received: true, error: error.message });
  }
});

// Get unique departments from employee database - REAL DATA ONLY
router.get('/departments', requireAuth, async (req: any, res) => {
  try {
    console.log('[WhatsApp Routes] 🔍 Fetching REAL departments from employee database (NO MOCK DATA)...');
    console.log('[WhatsApp Routes] 🔐 Auth check - User ID:', req.user?.id, 'Session ID:', req.sessionID);
    
    const { db } = await import('../db');
    
    const departments = await db.execute(`
      SELECT DISTINCT department, COUNT(*) as employee_count
      FROM employee_records 
      WHERE department IS NOT NULL 
        AND department != '' 
        AND department != 'EX-EMPLOYEES'
        AND department NOT LIKE '%ex-%'
        AND department NOT LIKE 'former%'
        AND department != 'MIGRATED_TO_FORMER_EMPLOYEES'
        AND is_active = true
      GROUP BY department
      ORDER BY department ASC
    `);

    const departmentList = departments.rows.map((row: any) => row.department);
    
    console.log(`[WhatsApp Routes] ✅ Returning ${departmentList.length} REAL departments from database:`, departmentList.slice(0, 5));
    res.setHeader('Content-Type', 'application/json');
    res.json(departmentList);

  } catch (error) {
    console.error('[WhatsApp API] Get departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get unique designations from employee database - REAL DATA ONLY
router.get('/designations', requireAuth, async (req: any, res) => {
  try {
    console.log('[WhatsApp Routes] 🔍 Fetching REAL designations from employee database (NO MOCK DATA)...');
    
    const { db } = await import('../db');
    
    const designations = await db.execute(`
      SELECT DISTINCT designation, COUNT(*) as employee_count
      FROM employee_records 
      WHERE designation IS NOT NULL 
        AND designation != '' 
        AND department != 'EX-EMPLOYEES'
        AND department NOT LIKE '%ex-%'
        AND department NOT LIKE 'former%'
        AND department != 'MIGRATED_TO_FORMER_EMPLOYEES'
        AND is_active = true
      GROUP BY designation
      ORDER BY designation ASC
    `);

    const designationList = designations.rows.map((row: any) => row.designation);
    
    console.log(`[WhatsApp Routes] ✅ Returning ${designationList.length} REAL designations from database`);
    res.json(designationList);

  } catch (error) {
    console.error('[WhatsApp API] Get designations error:', error);
    res.status(500).json({ error: 'Failed to fetch designations' });
  }
});

// Get real department groups from database - REAL DATA ONLY
router.get('/department-groups', requireAuth, async (req: any, res) => {
  try {
    console.log('[WhatsApp Routes] 🔍 Fetching REAL department groups from database (NO MOCK DATA)...');
    
    const { db } = await import('../db');
    
    // Get real department groups from department_groups table
    const departmentGroups = await db.execute(`
      SELECT 
        id,
        name,
        description,
        departments,
        color,
        is_system,
        sort_order,
        created_at
      FROM department_groups 
      ORDER BY sort_order ASC, name ASC
    `);

    const groupList = departmentGroups.rows.map((row: any) => {
      // Parse departments array from JSON string if needed
      let departmentsList = [];
      try {
        if (typeof row.departments === 'string') {
          departmentsList = JSON.parse(row.departments);
        } else if (Array.isArray(row.departments)) {
          departmentsList = row.departments;
        }
      } catch (e) {
        console.log('[WhatsApp Routes] Error parsing departments JSON for group:', row.name);
        departmentsList = [];
      }

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        departments: departmentsList,
        color: row.color || '#10B981',
        isSystem: row.is_system || false,
        sortOrder: row.sort_order || 0,
        departmentCount: departmentsList.length,
        createdAt: row.created_at
      };
    });
    
    console.log(`[WhatsApp Routes] ✅ Returning ${groupList.length} REAL department groups from database`);
    res.json(groupList);

  } catch (error) {
    console.error('[WhatsApp API] Get department groups error:', error);
    res.status(500).json({ error: 'Failed to fetch department groups' });
  }
});

export default router;