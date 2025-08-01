
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, employeeRecords } from '@shared/schema';
import { eq, and, or, like, desc } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { roleManagementService, Role, UserRole } from '../services/roleManagementService';

const router = Router();

// Get all available roles
router.get('/roles', requireAdmin, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const currentUserRole = roleManagementService.getRoleById(currentUser.role);
    
    if (!currentUserRole) {
      return res.status(403).json({ error: 'Invalid user role' });
    }

    const roles = roleManagementService.getAllRoles();
    const assignableRoles = roleManagementService.getAssignableRoles(currentUserRole);
    
    res.json({
      roles,
      assignableRoles: assignableRoles.map(role => role.id),
      currentUserRole: currentUserRole.id,
      canManageRoles: currentUserRole.canManageRoles
    });
  } catch (error) {
    console.error('[RoleManagement] Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get role hierarchy
router.get('/roles/hierarchy', requireAdmin, async (req: Request, res: Response) => {
  try {
    const hierarchy = roleManagementService.getRoleHierarchy();
    res.json(hierarchy);
  } catch (error) {
    console.error('[RoleManagement] Error fetching role hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch role hierarchy' });
  }
});

// Get permissions by category
router.get('/permissions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const permissions = roleManagementService.getPermissionCategories();
    res.json(permissions);
  } catch (error) {
    console.error('[RoleManagement] Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Get users with their roles
router.get('/user-roles', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { search, role, limit = '50' } = req.query;
    const searchLimit = Math.min(parseInt(limit as string), 100);

    let query = db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        employee: {
          id: employeeRecords.id,
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          department: employeeRecords.department,
          employeeCode: employeeRecords.employeeCode,
          designation: employeeRecords.designation,
          poslevel: employeeRecords.poslevel
        }
      })
      .from(users)
      .leftJoin(employeeRecords, eq(users.employeeId, employeeRecords.id))
      .orderBy(desc(users.createdAt))
      .limit(searchLimit);

    // Apply filters
    const conditions = [];
    
    if (search && typeof search === 'string' && search.length >= 2) {
      const searchTerm = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          like(users.username, searchTerm),
          like(employeeRecords.firstName, searchTerm),
          like(employeeRecords.lastName, searchTerm),
          like(employeeRecords.employeeCode, searchTerm),
          like(employeeRecords.department, searchTerm)
        )
      );
    }
    
    if (role && typeof role === 'string') {
      conditions.push(eq(users.role, role));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;

    // Enhance with role information
    const usersWithRoles = result.map(user => {
      const roleInfo = roleManagementService.getRoleById(user.role);
      return {
        ...user,
        roleInfo: roleInfo ? {
          id: roleInfo.id,
          name: roleInfo.name,
          description: roleInfo.description,
          level: roleInfo.level,
          accessScope: roleInfo.accessScope,
          canManageRoles: roleInfo.canManageRoles,
          canDeleteData: roleInfo.canDeleteData
        } : null
      };
    });

    res.json(usersWithRoles);
  } catch (error) {
    console.error('[RoleManagement] Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// Assign role to user
router.put('/users/:userId/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { roleId, scope } = req.body;
    const currentUser = (req as any).user;
    
    if (!roleId) {
      return res.status(400).json({ error: 'Role ID is required' });
    }

    // Validate current user permissions
    const assignerRole = roleManagementService.getRoleById(currentUser.role);
    const targetRole = roleManagementService.getRoleById(roleId);
    
    if (!assignerRole || !targetRole) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    if (!roleManagementService.canAssignRole(assignerRole, targetRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to assign this role' });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user role
    await db
      .update(users)
      .set({ 
        role: roleId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Log the role assignment
    console.log(`[RoleManagement] Role ${roleId} assigned to user ${userId} by ${currentUser.username}`);

    res.json({ 
      success: true, 
      message: 'Role assigned successfully',
      data: {
        userId,
        roleId,
        assignedBy: currentUser.username,
        assignedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[RoleManagement] Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// Remove role from user (set to staff)
router.delete('/users/:userId/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentUser = (req as any).user;
    
    // Validate current user permissions
    const assignerRole = roleManagementService.getRoleById(currentUser.role);
    
    if (!assignerRole || !assignerRole.canManageRoles) {
      return res.status(403).json({ error: 'Insufficient permissions to remove roles' });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent removing role from superadmin unless current user is superadmin
    if (existingUser.role === 'superadmin' && assignerRole.id !== 'superadmin') {
      return res.status(403).json({ error: 'Cannot remove superadmin role' });
    }

    // Update user role to staff (default)
    await db
      .update(users)
      .set({ 
        role: 'staff',
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log(`[RoleManagement] Role removed from user ${userId} by ${currentUser.username}`);

    res.json({ 
      success: true, 
      message: 'Role removed successfully',
      data: {
        userId,
        newRole: 'staff',
        removedBy: currentUser.username,
        removedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[RoleManagement] Error removing role:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

// Get role statistics
router.get('/statistics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await db
      .select({
        role: users.role,
        isActive: users.isActive,
        department: employeeRecords.department
      })
      .from(users)
      .leftJoin(employeeRecords, eq(users.employeeId, employeeRecords.id));

    const roles = roleManagementService.getAllRoles();
    const statistics = roles.map(role => {
      const roleUsers = allUsers.filter(user => user.role === role.id);
      const activeUsers = roleUsers.filter(user => user.isActive);
      const departments = [...new Set(roleUsers.map(user => user.department).filter(Boolean))];
      
      return {
        roleId: role.id,
        roleName: role.name,
        totalUsers: roleUsers.length,
        activeUsers: activeUsers.length,
        departments: departments.length,
        level: role.level
      };
    });

    res.json({
      statistics,
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(user => user.isActive).length,
      roles: roles.length
    });
  } catch (error) {
    console.error('[RoleManagement] Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch role statistics' });
  }
});

export { router as default };
