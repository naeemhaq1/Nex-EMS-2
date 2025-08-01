import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { whatsappMessages } from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// Mock data for demo
const mockContacts = [
  {
    id: '1',
    name: 'Ahmed Hassan',
    phone: '923001234567',
    department: 'IT Department',
    status: 'online',
    isPrivate: false,
    createdBy: 'admin',
    lastMessage: {
      content: 'Good morning!',
      timestamp: new Date().toISOString(),
      type: 'received'
    }
  },
  {
    id: '2',
    name: 'Fatima Khan',
    phone: '923009876543',
    department: 'HR Department', 
    status: 'away',
    isPrivate: true,
    createdBy: 'admin',
    lastMessage: {
      content: 'Meeting at 3 PM',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      type: 'sent'
    }
  },
  {
    id: '3',
    name: 'Muhammad Ali',
    phone: '923005556789',
    department: 'Operations',
    status: 'offline',
    isPrivate: false,
    createdBy: 'admin'
  }
];

const mockDepartments = [
  { id: 'it', name: 'IT Department', memberCount: 15 },
  { id: 'hr', name: 'HR Department', memberCount: 8 },
  { id: 'ops', name: 'Operations', memberCount: 25 },
  { id: 'finance', name: 'Finance', memberCount: 12 }
];

const mockMessages = [
  {
    id: '1',
    content: 'Hello, how are you?',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    type: 'sent',
    status: 'delivered',
    messageType: 'template',
    templateName: 'nexlinx_hello_world'
  },
  {
    id: '2', 
    content: 'I am doing well, thank you!',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'received',
    status: 'read',
    messageType: 'text'
  },
  {
    id: '3',
    content: 'Great to hear! Have a good day.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: 'sent',
    status: 'read',
    messageType: 'template',
    templateName: 'nexlinx_business_notification'
  }
];

// Get contacts - REAL EMPLOYEE DATA WITH FILTERS AND SEARCH
router.get('/contacts', requireAuth, async (req: any, res) => {
  try {
    const userId = req.session.userId || req.session.usernum?.toString();
    const userRole = req.session.role || 'user';
    
    // Extract query parameters for filtering and search
    const { 
      search = '', 
      department = '', 
      designation = '', 
      contactType = '', 
      limit = '1000'
    } = req.query;
    
    console.log(`[WhatsApp Master Console] 🔍 Fetching real employees with filters: search="${search}", dept="${department}", desig="${designation}", contactType="${contactType}", limit=${limit}`);
    
    let whereConditions = `
      WHERE wanumber IS NOT NULL 
        AND wanumber != '' 
        AND wanumber != '0' 
        AND wanumber != 'NULL'
        AND LENGTH(wanumber) >= 10
        AND is_active = true
        AND department != 'EX-EMPLOYEES'
        AND department NOT LIKE '%ex-%'
        AND department NOT LIKE 'former%'
        AND department != 'MIGRATED_TO_FORMER_EMPLOYEES'
        AND system_account = false
    `;
    
    // Add search filter (debounced on frontend)
    if (search && search.length >= 3) {
      whereConditions += ` AND (
        LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER('%${search}%') OR
        LOWER(employee_code) LIKE LOWER('%${search}%') OR
        LOWER(department) LIKE LOWER('%${search}%') OR
        LOWER(designation) LIKE LOWER('%${search}%') OR
        wanumber LIKE '%${search}%'
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
        CONCAT(first_name, ' ', last_name) as name,
        mobile as phoneNumber,
        mobile as phone,
        department,
        first_name,
        last_name,
        designation,
        is_active,
        'employees' as contactType,
        CASE WHEN is_active THEN 'online' ELSE 'offline' END as status,
        false as isPrivate,
        'system' as createdBy,
        NOW() as lastSeenAt,
        NOW() as createdAt
      FROM employee_records 
      ${whereConditions}
      ORDER BY first_name, last_name
      LIMIT ${parseInt(limit.toString())}
    `);

    const transformedContacts = contacts.rows
      .filter((contact: any) => contact.phone && contact.phone.trim().length > 0)
      .map((contact: any) => ({
        id: contact.employee_code,
        phoneNumber: contact.phone.startsWith('+') ? contact.phone : `+92${contact.phone.replace(/^0/, '')}`,
        phone: contact.phone.startsWith('+') ? contact.phone : `+92${contact.phone.replace(/^0/, '')}`,
        name: contact.name,
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.employee_code}&backgroundColor=2A2B5E&clothingColor=3366FF`, // Male avatars only
        department: contact.department,
        designation: contact.designation,
        contactType: 'employee', // Fixed contactType
        status: contact.status,
        isOnline: contact.status === 'online',
        isPrivate: false,
        createdBy: 'system',
        employeeCode: contact.employee_code,
        firstName: contact.first_name,
        lastName: contact.last_name,
        unreadCount: 0,
        lastMessage: null,
        lastSeenAt: contact.lastseenAt || new Date().toISOString(),
        createdAt: contact.createdat || new Date().toISOString()
      }));

    console.log(`[WhatsApp Master Console] ✅ Loaded ${transformedContacts.length} real employee contacts`);
    res.json(transformedContacts);
  } catch (error) {
    console.error('[WhatsApp Master Console] ❌ Error fetching real contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get departments
router.get('/departments', requireAuth, async (req, res) => {
  try {
    res.json(mockDepartments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get messages for contact
router.get('/messages/:contactId', requireAuth, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Return mock messages for demo
    res.json(mockMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get queue status
router.get('/queue-status', requireAuth, async (req, res) => {
  try {
    // Return mock queue status
    res.json({
      pending: 2,
      sent: 15,
      failed: 1
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

// Send message
router.post('/send-message', requireAuth, async (req, res) => {
  try {
    const { contactId, content, type, templateName } = req.body;
    
    if (!contactId || !content) {
      return res.status(400).json({ error: 'Contact ID and content are required' });
    }

    const contact = mockContacts.find(c => c.id === contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // For demo, we'll simulate sending via the actual WhatsApp API
    const messageData = {
      to: contact.phone,
      type: 'template',
      template: {
        name: templateName || 'nexlinx_business_notification',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Admin User' },
              { type: 'text', text: content }
            ]
          }
        ]
      }
    };

    // Use the actual WhatsApp service to send
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN_TEMP || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (accessToken && phoneNumberId) {
      try {
        const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            ...messageData
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log(`[WhatsApp Master Console] Message sent successfully: ${result.messages[0].id}`);
          
          // Store message in database
          await db.insert(whatsappMessages).values({
            fromNumber: phoneNumberId,
            toNumber: contact.phone,
            messageType: 'outgoing',
            messageContent: content,
            messageStatus: 'sent',
            sentAt: new Date(),
            messageId: result.messages[0].id
          });

          res.json({
            success: true,
            messageId: result.messages[0].id,
            status: 'sent'
          });
        } else {
          throw new Error(result.error?.message || 'WhatsApp API error');
        }
      } catch (apiError) {
        console.error('[WhatsApp Master Console] API Error:', apiError);
        
        // Store failed message
        await db.insert(whatsappMessages).values({
          fromNumber: phoneNumberId || 'CONSOLE',
          toNumber: contact.phone,
          messageType: 'outgoing',
          messageContent: content,
          messageStatus: 'failed',
          failedAt: new Date(),
          errorDetails: apiError instanceof Error ? apiError.message : 'Unknown error'
        });

        res.status(500).json({
          success: false,
          error: 'Failed to send message via WhatsApp API',
          details: apiError instanceof Error ? apiError.message : 'Unknown error'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'WhatsApp credentials not configured'
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create contact
router.post('/contacts', requireAuth, async (req, res) => {
  try {
    const { name, phone, department, isPrivate } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const newContact = {
      id: String(Date.now()),
      name,
      phone,
      department,
      status: 'offline',
      isPrivate: Boolean(isPrivate),
      createdBy: 'admin'
    };

    // For demo, add to mock array (in real app, save to database)
    mockContacts.push(newContact);
    
    res.json(newContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Retry failed message
router.post('/retry-message/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // For demo, just return success
    res.json({
      success: true,
      message: 'Message queued for retry'
    });
  } catch (error) {
    console.error('Error retrying message:', error);
    res.status(500).json({ error: 'Failed to retry message' });
  }
});

export default router;