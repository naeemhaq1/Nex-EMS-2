import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { departmentGroups } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { insertWhatsappContactsSchema, insertWhatsappGroupsSchema, insertWhatsappGroupMembersSchema, insertWhatsappMessagesSchema } from '@shared/schema';
// WhatsApp directory services temporarily disabled during service recreation
/*
import { 
  getWhatsAppDirectory, 
  searchContacts, 
  getContactByEmployeeCode, 
  getContactByPhone,
  getContactsByDepartment,
  getContactsByLocation,
  refreshDirectory,
  getDirectoryStats,
  normalizePhoneNumber,
  type WhatsAppContact
} from '../services/whatsappDirectory.js';
*/

const router = Router();

// All routes require authentication for admin isolation
router.use(requireAuth);

// ========== WhatsApp Contacts Management ==========

// Get admin-specific contacts with admin isolation
router.get('/contacts', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const { department, contactType, isActive } = req.query;
    
    const filters: any = {};
    if (department) filters.department = department as string;
    if (contactType) filters.contactType = contactType as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    
    const contacts = await storage.getWhatsAppContacts(userId, filters);
    res.json(contacts);
  } catch (error) {
    console.error('[WhatsApp Contacts] Get contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// ========== WhatsApp Directory System (Cached) ==========

// Get comprehensive WhatsApp directory with caching
router.get('/directory', async (req, res) => {
  try {
    const { forceRefresh } = req.query;
    const directory = await getWhatsAppDirectory(forceRefresh === 'true');
    
    res.json({
      contacts: directory.contacts,
      totalContacts: directory.totalContacts,
      lastRefresh: directory.lastRefresh
    });
  } catch (error) {
    console.error('[WhatsApp Directory] Get directory error:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp directory' });
  }
});

// Get directory statistics with cache performance metrics
router.get('/directory/stats', async (req, res) => {
  try {
    const stats = await getDirectoryStats();
    res.json(stats);
  } catch (error) {
    console.error('[WhatsApp Directory] Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch directory statistics' });
  }
});

// Search system contacts with advanced caching (300+ employees) by name
router.get('/system-contacts/search', async (req, res) => {
  try {
    const { query, limit = 50 } = req.query;
    
    if (!query || typeof query !== 'string' || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const contacts = await searchContacts(query, Number(limit));
    
    // Transform for frontend compatibility
    const systemContacts = contacts.map(contact => ({
      id: contact.id,
      employeeCode: contact.employeeCode,
      firstName: contact.firstName,
      lastName: contact.lastName,
      displayName: contact.fullName,
      phone: contact.normalizedPhone.startsWith('92') ? '+' + contact.normalizedPhone : contact.normalizedPhone,
      originalPhone: contact.originalPhone,
      department: contact.department,
      contactType: 'employee',
      isSystemContact: true,
      translatedPhone: contact.normalizedPhone.startsWith('92') ? '+' + contact.normalizedPhone : contact.normalizedPhone
    }));
    
    res.json(systemContacts);
  } catch (error) {
    console.error('[WhatsApp Directory] Search error:', error);
    res.status(500).json({ error: 'Failed to search system contacts' });
  }
});

// Get contact by employee code (cached lookup)
router.get('/directory/employee/:employeeCode', async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const contact = await getContactByEmployeeCode(employeeCode);
    
    if (!contact) {
      return res.status(404).json({ error: 'Employee not found in WhatsApp directory' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('[WhatsApp Directory] Get by employee code error:', error);
    res.status(500).json({ error: 'Failed to fetch employee contact' });
  }
});

// Get contact by phone number (cached lookup)
router.get('/directory/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const contact = await getContactByPhone(phone);
    
    if (!contact) {
      return res.status(404).json({ error: 'Phone number not found in WhatsApp directory' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('[WhatsApp Directory] Get by phone error:', error);
    res.status(500).json({ error: 'Failed to fetch phone contact' });
  }
});

// Get contacts by department (cached)
router.get('/directory/department/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const contacts = await getContactsByDepartment(department);
    
    res.json({
      department,
      contacts,
      totalContacts: contacts.length
    });
  } catch (error) {
    console.error('[WhatsApp Directory] Get by department error:', error);
    res.status(500).json({ error: 'Failed to fetch department contacts' });
  }
});

// Get contacts by location prefix (cached)
router.get('/directory/location/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const contacts = await getContactsByLocation(location);
    
    res.json({
      location,
      contacts,
      totalContacts: contacts.length
    });
  } catch (error) {
    console.error('[WhatsApp Directory] Get by location error:', error);
    res.status(500).json({ error: 'Failed to fetch location contacts' });
  }
});

// Refresh directory cache (force rebuild)
router.post('/directory/refresh', async (req, res) => {
  try {
    await refreshDirectory();
    const directory = await getWhatsAppDirectory();
    
    res.json({
      message: 'WhatsApp directory refreshed successfully',
      totalContacts: directory.totalContacts,
      lastRefresh: directory.lastRefresh
    });
  } catch (error) {
    console.error('[WhatsApp Directory] Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh directory' });
  }
});

// Normalize phone number endpoint
router.post('/directory/normalize-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const normalized = normalizePhoneNumber(phone);
    
    res.json({
      originalPhone: phone,
      normalizedPhone: normalized,
      isValid: normalized.length >= 12 && normalized.startsWith('92')
    });
  } catch (error) {
    console.error('[WhatsApp Directory] Normalize phone error:', error);
    res.status(500).json({ error: 'Failed to normalize phone number' });
  }
});

// Initialize directory and get performance benchmarks
router.post('/directory/initialize', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Force refresh directory to build from scratch
    await refreshDirectory();
    const directory = await getWhatsAppDirectory(true);
    
    // Test search performance
    const searchStart = Date.now();
    const searchResults = await searchContacts('Muhammad', 10);
    const searchTime = Date.now() - searchStart;
    
    // Test employee code lookup performance
    const lookupStart = Date.now();
    const firstContact = directory.contacts[0];
    if (firstContact) {
      await getContactByEmployeeCode(firstContact.employeeCode);
    }
    const lookupTime = Date.now() - lookupStart;
    
    const totalTime = Date.now() - startTime;
    
    res.json({
      message: 'WhatsApp directory initialized successfully',
      performance: {
        totalInitTime: totalTime + 'ms',
        searchTime: searchTime + 'ms',
        lookupTime: lookupTime + 'ms'
      },
      directory: {
        totalContacts: directory.totalContacts,
        lastRefresh: directory.lastRefresh,
        sampleNormalizedNumbers: directory.contacts.slice(0, 5).map(c => ({
          employeeCode: c.employeeCode,
          name: c.fullName,
          originalPhone: c.originalPhone,
          normalizedPhone: c.normalizedPhone
        }))
      }
    });
  } catch (error) {
    console.error('[WhatsApp Directory] Initialize error:', error);
    res.status(500).json({ error: 'Failed to initialize directory' });
  }
});

// Add system contact to admin's personal contacts
router.post('/contacts/add-system-contact', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const { employeeId, customName } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    // Get employee details
    const employee = await storage.getEmployee(employeeId);
    if (!employee || !employee.phone) {
      return res.status(404).json({ error: 'Employee not found or has no phone number' });
    }
    
    // Translate phone number
    let translatedPhone = employee.phone;
    if (employee.phone.startsWith('0')) {
      translatedPhone = '92' + employee.phone.substring(1);
    }
    if (!translatedPhone.startsWith('+')) {
      translatedPhone = '+' + translatedPhone;
    }
    
    // Check if contact already exists
    const existingContacts = await storage.getWhatsAppContacts(userId, {});
    if (existingContacts.length > 0) {
      return res.status(409).json({ error: 'Contact already exists in your contact list' });
    }
    
    // Add to admin's contacts
    const contactData = {
      phoneNumber: translatedPhone,
      formattedPhone: translatedPhone.replace(/^\+/, ''),
      contactName: customName || `${employee.firstName} ${employee.lastName}`,
      createdByUserId: userId,
      employeeId: employee.id,
      department: employee.department,
      contactType: 'employee',
      firstName: employee.firstName,
      lastName: employee.lastName,
      displayName: customName || `${employee.firstName} ${employee.lastName}`,
      isActive: true,
      employeeCode: employee.employeeCode
    };
    
    const contact = await storage.createWhatsAppContact(contactData);
    res.status(201).json(contact);
  } catch (error) {
    console.error('[WhatsApp Contacts] Add system contact error:', error);
    res.status(500).json({ error: 'Failed to add system contact' });
  }
});

// Get single contact
router.get('/contacts/:id', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const contactId = parseInt(req.params.id);
    
    const contact = await storage.getWhatsAppContact(contactId, userId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('[WhatsApp Contacts] Get contact error:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Create new contact
router.post('/contacts', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const userInfo = await storage.getUser(userId);
    
    if (!userInfo) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Validate request body
    const validatedData = insertWhatsappContactsSchema.parse({
      ...req.body,
      createdByUserId: userId,
      formattedPhone: req.body.phoneNumber?.replace(/^\+/, ''), // Remove + for API compatibility
    });
    
    const contact = await storage.createWhatsAppContact(validatedData);
    res.status(201).json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    
    console.error('[WhatsApp Contacts] Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/contacts/:id', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const contactId = parseInt(req.params.id);
    
    // Format phone if provided
    if (req.body.phoneNumber) {
      req.body.formattedPhone = req.body.phoneNumber.replace(/^\+/, '');
    }
    
    const contact = await storage.updateWhatsAppContact(contactId, req.body, userId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found or unauthorized' });
    }
    
    res.json(contact);
  } catch (error) {
    console.error('[WhatsApp Contacts] Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/contacts/:id', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const contactId = parseInt(req.params.id);
    
    await storage.deleteWhatsAppContact(contactId, userId);
    res.status(204).send();
  } catch (error) {
    console.error('[WhatsApp Contacts] Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// ========== WhatsApp Groups Management ==========

// Get system groups and department groups using real department_groups data
router.get('/broadcast-groups', async (req, res) => {
  try {
    console.log('[WhatsApp Groups] 🔍 Fetching real department groups and employee data...');
    
    // Get real department groups from department_groups table  
    const departmentGroupsResult = await db.execute(sql`
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
    
    // Extract rows from PostgreSQL result
    const departmentGroupsRows = departmentGroupsResult.rows || [];
    
    // Get all active employees with phone numbers
    const employeesResult = await storage.getEmployees({ isActive: true });
    const employees = employeesResult.employees || [];
    const departmentMap = new Map<string, any[]>();
    const systemGroupMap = new Map<string, any[]>();
    
    // Process employees for department and system grouping
    employees.forEach((emp: any) => {
      if (emp.phone || emp.mobile) {
        // Use mobile if available, fallback to phone
        const phoneNumber = emp.mobile || emp.phone;
        
        // Translate phone number (0 → 92)
        let translatedPhone = phoneNumber;
        if (phoneNumber.startsWith('0')) {
          translatedPhone = '92' + phoneNumber.substring(1);
        }
        if (!translatedPhone.startsWith('+')) {
          translatedPhone = '+' + translatedPhone;
        }
        
        const memberData = {
          id: emp.id,
          employeeCode: emp.employeeCode,
          firstName: emp.firstName,
          lastName: emp.lastName,
          displayName: `${emp.firstName} ${emp.lastName}`,
          phone: translatedPhone,
          originalPhone: phoneNumber,
          department: emp.department
        };

        // Add to department groups
        if (emp.department) {
          if (!departmentMap.has(emp.department)) {
            departmentMap.set(emp.department, []);
          }
          departmentMap.get(emp.department)!.push(memberData);
        }

        // Add to system groups (location-based like LHE-ALL, ISB-ALL, etc.)
        const location = emp.department ? emp.department.split('-')[0] : null;
        if (location) {
          const systemGroupKey = `${location}-ALL`;
          if (!systemGroupMap.has(systemGroupKey)) {
            systemGroupMap.set(systemGroupKey, []);
          }
          systemGroupMap.get(systemGroupKey)!.push(memberData);
        }
      }
    });
    
    // Convert to system groups (location-based like LHE-ALL)
    const systemGroups = Array.from(systemGroupMap.entries()).map(([groupKey, members]) => ({
      id: `system-${groupKey.toLowerCase()}`,
      name: groupKey,
      type: 'system',
      location: groupKey.split('-')[0],
      memberCount: members.length,
      members: members,
      description: `All employees in ${groupKey.split('-')[0]} location`,
      isSystemGroup: true,
      color: '#3B82F6', // Blue for system groups
      createdAt: new Date().toISOString()
    }));

    // Convert real department groups from database with proper member matching
    const realDepartmentGroups = departmentGroupsRows.map((deptGroup: any) => {
      // Parse departments array from JSON string
      let departmentsList = [];
      try {
        departmentsList = JSON.parse(deptGroup.departments || '[]');
      } catch {
        departmentsList = [];
      }
      
      // Get members from all departments in this group
      let members: any[] = [];
      departmentsList.forEach((dept: string) => {
        const deptMembers = departmentMap.get(dept) || [];
        members = members.concat(deptMembers);
      });
      
      return {
        id: `dgroup-${deptGroup.id}`,
        name: deptGroup.name,
        type: 'department_groups',
        departments: departmentsList,
        description: deptGroup.description,
        color: deptGroup.color || '#10B981', // Green default for department groups
        memberCount: members.length,
        members: members,
        isDepartmentGroup: true,
        isRealDepartmentGroup: true,
        createdAt: deptGroup.created_at,
        sortOrder: deptGroup.sort_order
      };
    });

    // Also include basic department groups for departments without specific department_groups entries
    const coveredDepartments = new Set();
    realDepartmentGroups.forEach(group => {
      if (group.departments) {
        group.departments.forEach((dept: string) => coveredDepartments.add(dept));
      }
    });
    
    const basicDepartmentGroups = Array.from(departmentMap.entries())
      .filter(([dept, members]) => !coveredDepartments.has(dept))
      .map(([dept, members]) => ({
        id: `dept-${dept.toLowerCase().replace(/\s+/g, '-')}`,
        name: dept,
        type: 'department',
        department: dept,
        memberCount: members.length,
        members: members,
        description: `All employees in ${dept} department`,
        isDepartmentGroup: true,
        color: '#8B5CF6', // Purple for basic department groups
        createdAt: new Date().toISOString()
      }));

    // Combine all department groups
    const allDepartmentGroups = [...realDepartmentGroups, ...basicDepartmentGroups];
    
    console.log(`[WhatsApp Groups] ✅ Loaded ${systemGroups.length} system groups, ${realDepartmentGroups.length} real department groups, ${basicDepartmentGroups.length} basic department groups`);

    res.json({
      systemGroups: systemGroups,
      departmentGroups: allDepartmentGroups,
      totalSystemGroups: systemGroups.length,
      totalDepartmentGroups: allDepartmentGroups.length,
      realDepartmentGroups: realDepartmentGroups.length,
      basicDepartmentGroups: basicDepartmentGroups.length
    });
  } catch (error) {
    console.error('[WhatsApp Department Groups] Get department groups error:', error);
    res.status(500).json({ error: 'Failed to fetch department groups' });
  }
});

// Get broadcast preview with recipient selection capability
router.get('/broadcast-preview/:groupId', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const { groupId } = req.params;
    
    if (groupId.startsWith('dept-')) {
      // Handle department group
      const department = groupId.replace('dept-', '').replace(/-/g, ' ');
      const employeesResult = await storage.getEmployees({ 
        isActive: true, 
        department: department 
      });
      const employees = employeesResult.employees || [];
      
      const members = employees
        .filter((emp: any) => emp.phone)
        .map((emp: any) => {
          let translatedPhone = emp.phone;
          if (emp.phone.startsWith('0')) {
            translatedPhone = '92' + emp.phone.substring(1);
          }
          if (!translatedPhone.startsWith('+')) {
            translatedPhone = '+' + translatedPhone;
          }
          
          return {
            id: emp.id,
            phoneNumber: translatedPhone,
            displayName: `${emp.firstName} ${emp.lastName}`,
            department: emp.department,
            employeeCode: emp.employeeCode,
            isSelected: true // Default to selected, admin can deselect
          };
        });
      
      res.json({
        groupId,
        groupName: `${department} Department`,
        groupType: 'department',
        totalMembers: members.length,
        members
      });
    } else {
      // Handle custom group
      const group = await storage.getWhatsAppGroup(parseInt(groupId), userId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      const groupMembers = await storage.getWhatsAppGroupMembers(parseInt(groupId));
      const members = groupMembers.map((member: any) => ({
        ...member,
        isSelected: true // Default to selected
      }));
      
      res.json({
        groupId: group.id,
        groupName: group.name,
        groupType: 'custom',
        totalMembers: members.length,
        members
      });
    }
  } catch (error) {
    console.error('[WhatsApp Groups] Get broadcast preview error:', error);
    res.status(500).json({ error: 'Failed to get broadcast preview' });
  }
});

// ========== WhatsApp Groups Management ==========

// Get all groups with admin isolation
router.get('/groups', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const { groupType, departmentName, isActive } = req.query;
    
    const filters: any = {};
    if (groupType) filters.groupType = groupType as string;
    if (departmentName) filters.departmentName = departmentName as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    
    const groups = await storage.getWhatsAppGroups(userId, filters);
    res.json(groups);
  } catch (error) {
    console.error('[WhatsApp Groups] Get groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get single group
router.get('/groups/:id', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const groupId = parseInt(req.params.id);
    
    const group = await storage.getWhatsAppGroup(groupId, userId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('[WhatsApp Groups] Get group error:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Create new group
router.post('/groups', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const userInfo = await storage.getUser(userId);
    
    if (!userInfo) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Validate request body
    const validatedData = insertWhatsappGroupsSchema.parse({
      ...req.body,
      createdByUserId: userId,
    });
    
    const group = await storage.createWhatsAppGroup(validatedData);
    res.status(201).json(group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    
    console.error('[WhatsApp Groups] Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Update group
router.put('/groups/:id', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const groupId = parseInt(req.params.id);
    
    const group = await storage.updateWhatsAppGroup(groupId, req.body, userId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found or unauthorized' });
    }
    
    res.json(group);
  } catch (error) {
    console.error('[WhatsApp Groups] Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Delete group
router.delete('/groups/:id', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const groupId = parseInt(req.params.id);
    
    await storage.deleteWhatsAppGroup(groupId, userId);
    res.status(204).send();
  } catch (error) {
    console.error('[WhatsApp Groups] Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// ========== Group Members Management ==========

// Get group members
router.get('/groups/:id/members', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const groupId = parseInt(req.params.id);
    
    const members = await storage.getGroupMembers(groupId, userId);
    res.json(members);
  } catch (error) {
    console.error('[WhatsApp Groups] Get group members error:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

// Add member to group
router.post('/groups/:id/members', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const groupId = parseInt(req.params.id);
    
    // Check if user can manage the group
    const group = await storage.getWhatsAppGroup(groupId, userId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found or unauthorized' });
    }
    
    const validatedData = insertWhatsappGroupMembersSchema.parse({
      ...req.body,
      groupId,
      addedByUserId: userId,
    });
    
    const member = await storage.addGroupMember(validatedData);
    res.status(201).json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    
    console.error('[WhatsApp Groups] Add group member error:', error);
    res.status(500).json({ error: 'Failed to add group member' });
  }
});

// Remove member from group
router.delete('/groups/:groupId/members/:contactId', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const groupId = parseInt(req.params.groupId);
    const contactId = parseInt(req.params.contactId);
    
    await storage.removeGroupMember(groupId, contactId, userId);
    res.status(204).send();
  } catch (error) {
    console.error('[WhatsApp Groups] Remove group member error:', error);
    res.status(500).json({ error: 'Failed to remove group member' });
  }
});

// ========== WhatsApp Messages Management ==========

// Get messages with admin isolation (replaces the mock data endpoint)
router.get('/messages', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const { phoneNumber, messageType, messageStatus, groupId, limit } = req.query;
    
    const filters: any = {};
    if (phoneNumber) filters.phoneNumber = phoneNumber as string;
    if (messageType) filters.messageType = messageType as string;
    if (messageStatus) filters.messageStatus = messageStatus as string;
    if (groupId) filters.groupId = parseInt(groupId as string);
    if (limit) filters.limit = parseInt(limit as string);
    
    const messages = await storage.getWhatsAppMessages(userId, filters);
    res.json(messages);
  } catch (error) {
    console.error('[WhatsApp Messages] Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create new message (when sending)
router.post('/messages', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const userInfo = await storage.getUser(userId);
    
    if (!userInfo) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Set admin isolation fields
    const messageData = {
      ...req.body,
      sentByUserId: userId,
      visibleToUserIds: [userId], // Initially visible only to sender
      departmentAccess: userInfo.managedDepartments || [],
    };
    
    const validatedData = insertWhatsappMessagesSchema.parse(messageData);
    const message = await storage.createWhatsAppMessage(validatedData);
    
    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    
    console.error('[WhatsApp Messages] Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Update message status
router.put('/messages/:id', async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    
    const message = await storage.updateWhatsAppMessage(messageId, req.body);
    res.json(message);
  } catch (error) {
    console.error('[WhatsApp Messages] Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// ========== Bulk Operations ==========

// Bulk import contacts from employee records
router.post('/contacts/bulk-import', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const userInfo = await storage.getUser(userId);
    
    if (!userInfo || userInfo.role === 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions for bulk import' });
    }
    
    const { departments, contactType = 'employee' } = req.body;
    
    // Get employees from specified departments
    const employees = await storage.getEmployees({
      departments: departments || [],
      isActive: true
    });
    
    const importedContacts = [];
    
    for (const employee of employees) {
      if (employee.mobile) {
        try {
          // Check if contact already exists
          const existingContact = await storage.getWhatsAppContactByPhone(employee.mobile, userId);
          if (existingContact) continue;
          
          const contactData = {
            phoneNumber: employee.mobile,
            formattedPhone: employee.mobile.replace(/^\+/, ''),
            contactName: `${employee.firstName} ${employee.lastName}`.trim(),
            employeeId: employee.id,
            employeeCode: employee.employeeCode,
            department: employee.department,
            designation: employee.position,
            contactType,
            createdByUserId: userId,
            managedByUserIds: [userId],
            departmentAccess: [employee.department],
            accessLevel: 'department'
          };
          
          const contact = await storage.createWhatsAppContact(contactData);
          importedContacts.push(contact);
        } catch (error) {
          console.error(`Failed to import contact for employee ${employee.employeeCode}:`, error);
        }
      }
    }
    
    res.json({
      success: true,
      imported: importedContacts.length,
      total: employees.length,
      contacts: importedContacts
    });
  } catch (error) {
    console.error('[WhatsApp Contacts] Bulk import error:', error);
    res.status(500).json({ error: 'Failed to bulk import contacts' });
  }
});

// Auto-create department groups
router.post('/groups/auto-create-departments', async (req, res) => {
  try {
    const userId = req.session.userId || req.session.usernum;
    const userInfo = await storage.getUser(userId);
    
    if (!userInfo || userInfo.role === 'staff') {
      return res.status(403).json({ error: 'Insufficient permissions to create department groups' });
    }
    
    // Get all departments
    const departments = await storage.getDepartments();
    const createdGroups = [];
    
    for (const department of departments) {
      try {
        // Check if group already exists
        const existingGroups = await storage.getWhatsAppGroups(userId, {
          groupType: 'department',
          departmentName: department
        });
        
        if (existingGroups.length > 0) continue;
        
        const groupData = {
          groupName: `${department} Department`,
          groupDescription: `WhatsApp group for ${department} department communications`,
          groupType: 'department',
          departmentName: department,
          createdByUserId: userId,
          managedByUserIds: [userId],
          visibleToUserIds: [userId],
          accessLevel: 'department',
          autoAddEmployees: true
        };
        
        const group = await storage.createWhatsAppGroup(groupData);
        createdGroups.push(group);
      } catch (error) {
        console.error(`Failed to create group for department ${department}:`, error);
      }
    }
    
    res.json({
      success: true,
      created: createdGroups.length,
      total: departments.length,
      groups: createdGroups
    });
  } catch (error) {
    console.error('[WhatsApp Groups] Auto-create departments error:', error);
    res.status(500).json({ error: 'Failed to auto-create department groups' });
  }
});

// ========== Enhanced Broadcast Messaging with Error Handling ==========

// Import WhatsApp service for broadcast functionality
import { whatsappService } from '../services/whatsappService';

// Broadcast message to group with comprehensive error reporting
router.post('/broadcast-message', async (req, res) => {
  try {
    const { recipients, message, messageType = 'text' } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ 
        error: 'Recipients list is required and must be a non-empty array',
        details: 'Provide an array of recipients with phone and name properties'
      });
    }
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        error: 'Message content is required',
        details: 'Message cannot be empty or contain only whitespace'
      });
    }

    // Validate and filter recipients with phone numbers
    const validRecipients = [];
    const invalidRecipients = [];
    
    for (const recipient of recipients) {
      if (!recipient.phone || recipient.phone.trim().length === 0) {
        invalidRecipients.push({
          name: recipient.name || 'Unknown',
          phone: recipient.phone || 'No phone',
          error: 'Phone number is empty or missing'
        });
        continue;
      }
      
      // Use WhatsApp directory for phone validation
      const normalized = normalizePhoneNumber(recipient.phone);
      if (normalized.length < 12 || !normalized.startsWith('92')) {
        invalidRecipients.push({
          name: recipient.name || 'Unknown',
          phone: recipient.phone,
          error: 'Invalid Pakistani mobile number format'
        });
        continue;
      }
      
      validRecipients.push({
        phone: normalized.startsWith('92') ? '+' + normalized : normalized,
        name: recipient.name || 'Unknown Contact'
      });
    }

    // If no valid recipients, return error
    if (validRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid recipients found',
        totalRecipients: recipients.length,
        validRecipients: 0,
        invalidRecipients: invalidRecipients.length,
        failedContacts: invalidRecipients,
        summary: `All ${recipients.length} recipients have invalid phone numbers`
      });
    }

    // Using singleton WhatsApp service instance
    
    const broadcastResult = await whatsappService.broadcastMessage(
      validRecipients,
      {
        type: messageType,
        text: messageType === 'text' ? { body: message } : undefined
      }
    );

    // Combine pre-validation failures with API failures
    const allFailedContacts = [
      ...invalidRecipients.map(contact => ({
        success: false,
        error: contact.error,
        errorCode: 'INVALID_PHONE',
        recipientPhone: contact.phone,
        recipientName: contact.name
      })),
      ...broadcastResult.failedContacts
    ];

    // Generate comprehensive response
    const totalRecipients = recipients.length;
    const successfulDeliveries = broadcastResult.successfulDeliveries;
    const totalFailures = allFailedContacts.length;

    let summary = `${successfulDeliveries} messages sent successfully`;
    if (totalFailures > 0) {
      summary += `, ${totalFailures} failed`;
      if (invalidRecipients.length > 0) {
        summary += ` (${invalidRecipients.length} invalid numbers, ${broadcastResult.failedDeliveries} API failures)`;
      }
    }
    summary += ` out of ${totalRecipients} total recipients`;

    const response = {
      success: successfulDeliveries > 0,
      totalRecipients,
      successfulDeliveries,
      failedDeliveries: totalFailures,
      validRecipients: validRecipients.length,
      invalidRecipients: invalidRecipients.length,
      successfulContacts: broadcastResult.successfulContacts,
      failedContacts: allFailedContacts,
      summary,
      details: {
        message: `Broadcast messaging complete`,
        validationErrors: invalidRecipients.length,
        apiErrors: broadcastResult.failedDeliveries,
        rateLimit: 'Messages sent with 200ms delays (5 per second max)'
      }
    };

    res.json(response);
    
  } catch (error) {
    console.error('[WhatsApp Broadcast] Broadcast error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during broadcast',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Validate recipients endpoint for pre-broadcast checking
router.post('/validate-recipients', async (req, res) => {
  try {
    const { recipients } = req.body;
    
    if (!recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ 
        error: 'Recipients array is required' 
      });
    }

    // Using singleton WhatsApp service instance
    const validationResults = [];
    
    for (const recipient of recipients) {
      const validation = whatsappService.validatePhoneNumber(recipient.phone || '');
      validationResults.push({
        name: recipient.name || 'Unknown',
        phone: recipient.phone || 'No phone',
        isValid: validation.isValid,
        error: validation.error,
        normalizedPhone: validation.normalizedPhone
      });
    }

    const validCount = validationResults.filter(r => r.isValid).length;
    const invalidCount = recipients.length - validCount;

    res.json({
      totalRecipients: recipients.length,
      validRecipients: validCount,
      invalidRecipients: invalidCount,
      validationResults,
      summary: `${validCount} valid, ${invalidCount} invalid recipients`
    });
    
  } catch (error) {
    console.error('[WhatsApp Validation] Recipient validation error:', error);
    res.status(500).json({ 
      error: 'Failed to validate recipients'
    });
  }
});

// ========== WhatsApp Service Status Monitoring ==========

// Get WhatsApp service status
router.get('/service-status', async (req, res) => {
  try {
    // Import the status monitor
    const { whatsappAPIMonitor } = await import('../services/whatsappStatusMonitor.js');
    const status = whatsappAPIMonitor.getStatusForAPI();
    
    res.json(status);
  } catch (error) {
    console.error('[WhatsApp Status] Get status error:', error);
    res.status(500).json({ 
      status: 'disconnected',
      statusText: 'Status Check Failed',
      error: 'Failed to check service status',
      lastChecked: new Date().toISOString(),
      nextCheck: 'Unknown',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

// Force refresh WhatsApp service status
router.post('/service-status/refresh', async (req, res) => {
  try {
    const { whatsappAPIMonitor } = await import('../services/whatsappStatusMonitor.js');
    const status = await whatsappAPIMonitor.forceRefresh();
    
    res.json({
      ...status,
      message: 'Status refreshed successfully'
    });
  } catch (error) {
    console.error('[WhatsApp Status] Force refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh service status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;