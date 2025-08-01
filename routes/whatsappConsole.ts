import { Router } from 'express';
import { WhatsAppMainService } from '../services/whatsappCoreService';
import { db } from '../db';
import { employeeRecords } from '@shared/schema';
import { sql } from 'drizzle-orm';
// Authentication will be handled by main routes
import { z } from 'zod';

const router = Router();

// Initialize WhatsApp Main Service
const whatsappMainService = new WhatsAppMainService();

// Start the service
whatsappMainService.start().catch(console.error);

// API Status Check
router.get('/api/whatsapp/status', async (req, res) => {
  try {
    const status = await whatsappMainService.checkApiStatus();
    res.json(status);
  } catch (error) {
    console.error('[WhatsApp API] Status check error:', error);
    res.status(500).json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Send Message - Basic Test Endpoint
router.post('/api/whatsapp/send', async (req: any, res) => {
  try {
    const { to, content, messageType = 'text', priority = 2 } = req.body;
    
    if (!to || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message content are required' 
      });
    }

    console.log(`[WhatsApp API] Send request from ${req.user?.claims?.sub}: ${to} -> "${content}"`);

    const result = await whatsappMainService.sendMessageEnhanced({
      to,
      content,
      messageType,
      sentBy: req.user?.claims?.sub || 'admin',
      priority
    });

    res.json(result);
  } catch (error) {
    console.error('[WhatsApp API] Send message error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send message' 
    });
  }
});

// Test Send Message - Simple endpoint for testing
router.post('/api/whatsapp/test-send', async (req: any, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number and message are required' 
      });
    }

    console.log(`[WhatsApp API] Test send: ${phoneNumber} -> "${message}"`);

    // Use the basic sendMessage method for testing
    const result = await whatsappMainService.sendMessage(phoneNumber, message, req.user?.claims?.sub);

    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[WhatsApp API] Test send error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Test send failed' 
    });
  }
});

// Get Contacts - Real employee data from employee_records table with department-based access control
router.get('/api/whatsapp/contacts', async (req: any, res) => {
  try {
    console.log('[WhatsApp Console] 🔍 Fetching real employee contacts for console...');
    const { search, department, includePrivate = 'true' } = req.query;
    
    // Get user info from session for department-based access control
    const userRole = req.session?.role || 'user';
    const userId = req.session?.userId || req.session?.usernum;
    
    console.log(`[WhatsApp Console] User ${userId} with role ${userRole} requesting contacts`);
    
    let departmentFilter = '';
    
    // Apply department-based access control
    if (userRole === 'superadmin' || userRole === 'general_admin') {
      // Admins see all contacts
      console.log('[WhatsApp Console] Admin user - showing all contacts');
      departmentFilter = '';
    } else {
      // Regular users only see contacts from their managed departments
      try {
        const userQuery = await db.execute(`
          SELECT managed_departments FROM users WHERE id = ${userId}
        `);
        
        const managedDepartments = userQuery.rows[0]?.managed_departments;
        
        if (managedDepartments && Array.isArray(managedDepartments) && managedDepartments.length > 0) {
          const deptList = managedDepartments.map(dept => `'${dept}'`).join(',');
          departmentFilter = `AND department IN (${deptList})`;
          console.log(`[WhatsApp Console] Regular user - filtering to departments: ${managedDepartments.join(', ')}`);
        } else {
          // User has no managed departments, show no contacts
          console.log('[WhatsApp Console] User has no managed departments - showing no contacts');
          return res.json([]);
        }
      } catch (error) {
        console.error('[WhatsApp Console] Error checking user departments:', error);
        return res.json([]);
      }
    }
    
    // Add specific department filter if requested
    if (department) {
      departmentFilter += departmentFilter ? ` AND department = '${department}'` : `AND department = '${department}'`;
    }
    
    // Directly fetch real employees from employee_records table using wanumber for WhatsApp
    const employeeContacts = await db.execute(`
      SELECT 
        employee_code as id,
        employee_code,
        CONCAT(first_name, ' ', last_name) as name,
        wanumber as phone,
        mobile as original_mobile,
        department,
        first_name,
        last_name,
        designation,
        is_active
      FROM employee_records 
      WHERE wanumber IS NOT NULL 
        AND wanumber != '' 
        AND wanumber != '0' 
        AND wanumber != 'NULL'
        AND LENGTH(wanumber) >= 10
        AND is_active = true
        AND department != 'EX-EMPLOYEES'
        ${departmentFilter}
      ORDER BY first_name, last_name
      LIMIT 100
    `);
    
    // Import AvatarService for professional avatars
    const { AvatarService } = await import('../services/AvatarService');
    
    // Transform to WhatsApp contact format with professional avatars
    const transformedContacts = employeeContacts.rows.map((emp: any) => {
      const firstName = emp.first_name || 'Employee';
      const lastName = emp.last_name || '';
      const designation = emp.designation || 'Employee';
      const employeeCode = emp.employee_code;
      
      // Generate professional avatar based on gender and designation
      const avatar = AvatarService.generateProfessionalAvatar(firstName, lastName, designation, employeeCode, 80);
      
      return {
        id: emp.employee_code,
        name: emp.name,
        phoneNumber: emp.phone.startsWith('+') ? emp.phone : `+${emp.phone}`,
        phone: emp.phone.startsWith('+') ? emp.phone : `+${emp.phone}`,
        originalPhone: emp.original_mobile,
        department: emp.department,
        designation: designation,
        contactType: 'employees',
        isEmployee: true,
        isActive: true,
        isOnline: Math.random() > 0.5, // Random online status for demo
        lastMessage: 'Available for messaging',
        lastSeen: 'Online',
        unreadCount: 0,
        employeeCode: emp.employee_code,
        firstName: firstName,
        lastName: lastName,
        avatar: avatar, // Professional gender/designation-specific avatar
        profileImage: avatar // Also set profileImage for compatibility
      };
    });
    
    // Apply search filter if provided
    let filteredContacts = transformedContacts;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredContacts = transformedContacts.filter((contact: any) => 
        contact.name.toLowerCase().includes(searchLower) ||
        contact.phone.includes(search) ||
        contact.department.toLowerCase().includes(searchLower) ||
        contact.employeeCode.toLowerCase().includes(searchLower)
      );
    }

    console.log(`[WhatsApp Console] ✅ Returning ${filteredContacts.length} real employee contacts to frontend`);
    res.json(filteredContacts);
  } catch (error) {
    console.error('[WhatsApp Console] ❌ Get contacts error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get contacts' 
    });
  }
});

// Add Contact
router.post('/api/whatsapp/contacts', async (req: any, res) => {
  try {
    const contactData = {
      ...req.body,
      addedBy: req.user?.claims?.sub || 'admin'
    };

    const result = await whatsappMainService.addContact(contactData);
    res.json(result);
  } catch (error) {
    console.error('[WhatsApp API] Add contact error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add contact' 
    });
  }
});

// Get Departments - Real data from employee_records
router.get('/api/whatsapp-console/departments', async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT department as name, COUNT(*) as count 
      FROM employee_records 
      WHERE department IS NOT NULL 
        AND department != '' 
        AND is_active = true 
        AND department != 'EX-EMPLOYEES'
      GROUP BY department 
      ORDER BY department
    `);
    
    // Extract rows from PostgreSQL result
    const departments = result.rows || [];
    console.log(`[WhatsApp Console] ✅ Returning ${departments.length} real departments`);
    res.json(departments);
  } catch (error) {
    console.error('[WhatsApp Console] ❌ Get departments error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get departments' 
    });
  }
});

// Get Designations - Real data from employee_records
router.get('/api/whatsapp-console/designations', async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT DISTINCT designation as name, COUNT(*) as count 
      FROM employee_records 
      WHERE designation IS NOT NULL 
        AND designation != '' 
        AND is_active = true 
        AND department != 'EX-EMPLOYEES'
      GROUP BY designation 
      ORDER BY designation
    `);
    
    // Extract rows from PostgreSQL result
    const designations = result.rows || [];
    console.log(`[WhatsApp Console] ✅ Returning ${designations.length} real designations`);
    res.json(designations);
  } catch (error) {
    console.error('[WhatsApp Console] ❌ Get designations error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get designations' 
    });
  }
});

// Get Groups
router.get('/api/whatsapp/groups', async (req: any, res) => {
  try {
    // For now, return empty array - will implement group management later
    res.json([]);
  } catch (error) {
    console.error('[WhatsApp API] Get groups error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get groups' 
    });
  }
});

// Get Messages for conversation
router.get('/api/whatsapp/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = '50' } = req.query;

    const messages = await whatsappMainService.getConversationHistory(
      conversationId, 
      parseInt(limit as string)
    );

    res.json(messages);
  } catch (error) {
    console.error('[WhatsApp API] Get messages error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get messages' 
    });
  }
});

// Health check for WhatsApp service
router.get('/api/whatsapp/health', async (req, res) => {
  try {
    const health = whatsappMainService.getHealthStatus();
    res.json(health);
  } catch (error) {
    console.error('[WhatsApp API] Health check error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Health check failed' 
    });
  }
});

// Process message queue manually (for testing)
router.post('/api/whatsapp/process-queue', async (req, res) => {
  try {
    await whatsappMainService.processMessageQueue();
    res.json({ success: true, message: 'Queue processing initiated' });
  } catch (error) {
    console.error('[WhatsApp API] Queue processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Queue processing failed' 
    });
  }
});

export default router;