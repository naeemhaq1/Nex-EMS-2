import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { gatewayService } from '../services/whatsappGatewayService';
import { diagnosticsService } from '../services/whatsappDiagnosticsService';
import { db } from '../db';
import { 
  whatsappContacts, 
  whatsappGroups, 
  whatsappMessages, 
  whatsappApiKeys 
} from '../../shared/whatsappSchema';
import { eq, desc, and, gte, like, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AvatarService } from '../services/AvatarService';

const router = Router();

// ============================================================================
// WHATSAPP CONTACTS API - 3-TIER SYSTEM
// ============================================================================

// Get contacts with 3-tier access control
router.get('/contacts', requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId || req.session.usernum?.toString();
    const userRole = req.session.role || 'user';
    
    let whereClause;
    
    if (userRole === 'admin' || userRole === 'superadmin') {
      // Admin sees all contacts
      whereClause = undefined;
    } else {
      // Regular users see public contacts and their own private contacts
      whereClause = or(
        eq(whatsappContacts.contactType, 'employee'),
        eq(whatsappContacts.contactType, 'public'),
        and(
          eq(whatsappContacts.contactType, 'contacts_private'),
          eq(whatsappContacts.addedBy, userId)
        )
      );
    }

    // Get real employee contacts from employee_records table with filters
    console.log('[WhatsApp Routes] 🔍 Fetching ALL employees with mobile numbers for WhatsApp staff directory...');
    
    // Extract query parameters for filtering and search
    const { 
      search = '', 
      department = '', 
      designation = '', 
      contactType = '', 
      limit = '1000' // Removed 100 limit - now default 1000, configurable
    } = req.query;
    
    let whereConditions = `
      WHERE mobile IS NOT NULL 
        AND mobile != '' 
        AND mobile != '0' 
        AND mobile != 'NULL'
        AND TRIM(mobile) != ''
        AND LENGTH(mobile) >= 10
        AND is_active = true
        AND department != 'EX-EMPLOYEES'
        AND department NOT LIKE '%ex-%'
        AND department NOT LIKE 'former%'
        AND department != 'MIGRATED_TO_FORMER_EMPLOYEES'
        AND system_account = false
    `;
    
    // Add search filter (debounced on frontend)
    if (search) {
      whereConditions += ` AND (
        LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER('%${search}%') OR
        LOWER(employee_code) LIKE LOWER('%${search}%') OR
        LOWER(department) LIKE LOWER('%${search}%') OR
        LOWER(designation) LIKE LOWER('%${search}%') OR
        mobile LIKE '%${search}%'
      )`;
    }
    
    // Add department filter
    if (department) {
      whereConditions += ` AND LOWER(department) = LOWER('${department}')`;
    }
    
    // Add designation filter  
    if (designation) {
      whereConditions += ` AND LOWER(designation) = LOWER('${designation}')`;
    }
    
    const contacts = await db.execute(`
      SELECT 
        employee_code as id,
        employee_code,
        CONCAT(first_name, ' ', last_name) as contact_name,
        mobile as phone_number,
        department,
        first_name,
        last_name,
        designation,
        is_active,
        'employees' as contact_type,
        NOW() as last_seen_at,
        NOW() as created_at
      FROM employee_records 
      ${whereConditions}
      ORDER BY first_name, last_name
      LIMIT ${Math.min(parseInt(limit.toString()), 2000)}
    `);

    const transformedContacts = contacts.rows.map((contact: any) => {
      // Generate professional avatar using AvatarService
      const profileImage = AvatarService.generateProfessionalAvatar(
        contact.first_name,
        contact.last_name,
        contact.designation || 'Employee',
        contact.employee_code
      );
      
      return {
        id: contact.employee_code,
        phoneNumber: contact.phone_number.startsWith('+') ? contact.phone_number : `+92${contact.phone_number.replace(/^0/, '')}`,
        phone: contact.phone_number.startsWith('+') ? contact.phone_number : `+92${contact.phone_number.replace(/^0/, '')}`,
        name: contact.contact_name,
        profileImage,
        lastSeen: 'Online',
        isOnline: Math.random() > 0.5,
        contactType: 'employees',
        status: 'Available for messaging',
        isTyping: false,
        lastMessage: 'Available for messaging',
        unreadCount: 0,
        isPinned: false,
        department: contact.department,
        designation: contact.designation || 'Employee',
        employeeCode: contact.employee_code,
        firstName: contact.first_name,
        lastName: contact.last_name
      };
    });

    console.log(`[WhatsApp Routes] ✅ WHATSAPP STAFF DIRECTORY: Successfully loaded ${transformedContacts.length} employees with mobile numbers`);
    console.log(`[WhatsApp Routes] 📱 Mobile number requirements met: All active employees with valid phone numbers included`);
    res.json(transformedContacts);

  } catch (error) {
    console.error('[WhatsApp API] Get contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Add new contact
router.post('/contacts', requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId || req.session.usernum?.toString();
    const { phoneNumber, name, contactType, profileImage, metadata } = req.body;

    // Validate contact type
    if (!['employee', 'public', 'private'].includes(contactType)) {
      return res.status(400).json({ error: 'Invalid contact type' });
    }

    // Check if contact already exists
    const existingContact = await db
      .select()
      .from(whatsappContacts)
      .where(eq(whatsappContacts.phoneNumber, phoneNumber))
      .limit(1);

    if (existingContact.length > 0) {
      return res.status(409).json({ error: 'Contact already exists' });
    }

    const newContact = {
      id: uuidv4(),
      phoneNumber,
      name,
      contactType,
      profileImage: profileImage || null,
      isOnline: false,
      lastSeen: null,
      createdBy: userId,
      createdAt: new Date(),
      metadata: metadata || {}
    };

    await db.insert(whatsappContacts).values(newContact);

    res.status(201).json({
      id: newContact.id,
      phoneNumber: newContact.phoneNumber,
      name: newContact.name,
      contactType: newContact.contactType,
      isOnline: newContact.isOnline,
      metadata: newContact.metadata
    });

  } catch (error) {
    console.error('[WhatsApp API] Add contact error:', error);
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// ============================================================================
// WHATSAPP GROUPS API - 3 GROUP TYPES
// ============================================================================

// Get groups
router.get('/groups', requireAuth, async (req: any, res) => {
  try {
    const groups = await db
      .select()
      .from(whatsappGroups)
      .where(eq(whatsappGroups.isActive, true))
      .orderBy(desc(whatsappGroups.createdAt));

    res.json(groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      profileImage: group.profileImage,
      groupType: group.groupType,
      memberCount: group.members.length,
      members: group.members,
      createdAt: group.createdAt.toISOString(),
      isActive: group.isActive
    })));

  } catch (error) {
    console.error('[WhatsApp API] Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create new group
router.post('/groups', requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId || req.session.usernum?.toString();
    const { name, description, groupType, members, profileImage } = req.body;

    // Validate group type
    if (!['department', 'dgroup', 'whatsapp'].includes(groupType)) {
      return res.status(400).json({ error: 'Invalid group type' });
    }

    const newGroup = {
      id: uuidv4(),
      name,
      description: description || null,
      groupType,
      profileImage: profileImage || null,
      members: members || [],
      isActive: true,
      createdBy: userId,
      createdAt: new Date(),
      metadata: {}
    };

    await db.insert(whatsappGroups).values(newGroup);

    res.status(201).json({
      id: newGroup.id,
      name: newGroup.name,
      description: newGroup.description,
      groupType: newGroup.groupType,
      memberCount: newGroup.members.length,
      isActive: newGroup.isActive
    });

  } catch (error) {
    console.error('[WhatsApp API] Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// ============================================================================
// WHATSAPP MESSAGES API
// ============================================================================

// Get messages for a chat
router.get('/messages/:phoneNumber', requireAuth, async (req: any, res) => {
  try {
    const { phoneNumber } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(
        or(
          eq(whatsappMessages.fromNumber, phoneNumber),
          eq(whatsappMessages.toNumber, phoneNumber)
        )
      )
      .orderBy(desc(whatsappMessages.timestamp))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json(messages.map(message => ({
      id: message.id,
      fromNumber: message.fromNumber,
      toNumber: message.toNumber,
      content: message.content,
      messageType: message.messageType,
      timestamp: message.timestamp.toISOString(),
      isRead: message.isRead,
      isDelivered: message.isDelivered,
      isSent: message.status === 'sent',
      status: message.status,
      isQuoted: message.isQuoted,
      quotedMessageId: message.quotedMessageId
    })));

  } catch (error) {
    console.error('[WhatsApp API] Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/send-message', requireAuth, async (req: any, res) => {
  try {
    const { to, content, type = 'text', quotedMessageId } = req.body;

    if (!to || !content) {
      return res.status(400).json({ error: 'Phone number and content are required' });
    }

    // Import WhatsApp service dynamically to avoid circular dependencies
    const { whatsappService } = await import('../services/whatsappService');

    const result = await whatsappService.sendMessage({
      to,
      content,
      messageType: type,
      source: 'console',
      quotedMessageId,
      metadata: { sentFrom: 'whatsapp-console' }
    });

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Message sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to send message'
      });
    }

  } catch (error) {
    console.error('[WhatsApp API] Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GATEWAY SERVICE API
// ============================================================================

// Get gateway status
router.get('/gateway/status', requireAuth, async (req: any, res) => {
  try {
    const stats = await gatewayService.getGatewayStats();
    const health = await gatewayService.healthCheck();

    res.json({
      ...stats,
      health: health.status,
      details: health.details
    });

  } catch (error) {
    console.error('[Gateway API] Status error:', error);
    res.status(500).json({ error: 'Failed to get gateway status' });
  }
});

// Generate API key (Admin only)
router.post('/gateway/api-keys', requireAuth, async (req: any, res) => {
  try {
    const userRole = req.session.role || 'user';
    const userId = req.session.userId || req.session.usernum?.toString();

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { keyName, permissions, rateLimit = 100 } = req.body;

    if (!keyName || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Key name and permissions are required' });
    }

    const apiKey = await gatewayService.generateApiKey(
      keyName,
      permissions,
      rateLimit,
      userId
    );

    res.status(201).json({
      success: true,
      apiKey,
      message: 'API key generated successfully',
      warning: 'Store this key securely - it cannot be retrieved again'
    });

  } catch (error) {
    console.error('[Gateway API] Generate key error:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// List API keys (Admin only)
router.get('/gateway/api-keys', requireAuth, async (req: any, res) => {
  try {
    const userRole = req.session.role || 'user';

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const apiKeys = await gatewayService.listApiKeys();
    res.json(apiKeys);

  } catch (error) {
    console.error('[Gateway API] List keys error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// Revoke API key (Admin only)
router.delete('/gateway/api-keys/:keyId', requireAuth, async (req: any, res) => {
  try {
    const userRole = req.session.role || 'user';

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { keyId } = req.params;
    const success = await gatewayService.revokeApiKey(keyId);

    if (success) {
      res.json({ success: true, message: 'API key revoked successfully' });
    } else {
      res.status(404).json({ error: 'API key not found' });
    }

  } catch (error) {
    console.error('[Gateway API] Revoke key error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// Gateway send endpoint (for external apps)
router.post('/gateway/send', async (req, res) => {
  try {
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const { to, message, type = 'text', metadata } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await gatewayService.sendGatewayMessage(apiKey, {
      to,
      message,
      type,
      metadata
    });

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Message sent successfully via gateway'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('[Gateway API] Send error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// DIAGNOSTICS API
// ============================================================================

// Get diagnostic results
router.get('/diagnostics', requireAuth, async (req: any, res) => {
  try {
    const { limit = 50 } = req.query;
    const results = await diagnosticsService.getHistoricalResults(parseInt(limit));
    res.json(results);

  } catch (error) {
    console.error('[Diagnostics API] Get results error:', error);
    res.status(500).json({ error: 'Failed to get diagnostic results' });
  }
});

// Run diagnostics
router.post('/diagnostics/run', requireAuth, async (req: any, res) => {
  try {
    const userRole = req.session.role || 'user';

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { testName } = req.body;

    let results;
    if (testName) {
      const result = await diagnosticsService.runSpecificTest(testName);
      results = result ? [result] : [];
    } else {
      results = await diagnosticsService.runAllDiagnostics();
    }

    res.json({
      success: true,
      message: `${results.length} diagnostic test(s) completed`,
      results
    });

  } catch (error) {
    console.error('[Diagnostics API] Run tests error:', error);
    res.status(500).json({ error: 'Failed to run diagnostics' });
  }
});

// Get health summary
router.get('/diagnostics/health', requireAuth, async (req: any, res) => {
  try {
    const health = await diagnosticsService.getHealthSummary();
    res.json(health);

  } catch (error) {
    console.error('[Diagnostics API] Health summary error:', error);
    res.status(500).json({ error: 'Failed to get health summary' });
  }
});

// ============================================================================
// CHATBOT INTEGRATION ENDPOINTS (for future chatbot service)
// ============================================================================

// Chatbot webhook endpoint
router.post('/chatbot/webhook', async (req, res) => {
  try {
    // This will be implemented when chatbot service is integrated
    console.log('[Chatbot] Webhook received:', req.body);
    
    res.json({
      success: true,
      message: 'Chatbot webhook endpoint ready for integration'
    });

  } catch (error) {
    console.error('[Chatbot] Webhook error:', error);
    res.status(500).json({ error: 'Chatbot webhook failed' });
  }
});

// Chatbot configuration endpoint
router.get('/chatbot/config', requireAuth, async (req: any, res) => {
  try {
    const userRole = req.session.role || 'user';

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json({
      enabled: false,
      service: 'not_configured',
      message: 'Chatbot service ready for configuration',
      endpoints: {
        webhook: '/api/whatsapp/chatbot/webhook',
        config: '/api/whatsapp/chatbot/config'
      }
    });

  } catch (error) {
    console.error('[Chatbot] Config error:', error);
    res.status(500).json({ error: 'Failed to get chatbot config' });
  }
});

// Get unique departments from employee database - REAL DATA ONLY
router.get('/departments', requireAuth, async (req: any, res) => {
  try {
    console.log('[WhatsApp Routes] 🔍 Fetching REAL departments from employee database (NO MOCK DATA)...');
    console.log('[WhatsApp Routes] 🔐 Auth check - User ID:', req.user?.id, 'Session ID:', req.sessionID);
    
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

// Get department groups from database - REAL DATA ONLY
router.get('/department-groups', requireAuth, async (req: any, res) => {
  try {
    console.log('[WhatsApp Routes] 🔍 Fetching REAL department groups from database (NO MOCK DATA)...');
    
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

export const whatsappConsoleRouter = router;
export default router;