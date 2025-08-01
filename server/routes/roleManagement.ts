
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/jwtAuth';
import { roleManagementService } from '../services/roleManagementService';

const router = Router();

/**
 * Get all available roles
 */
router.get('/roles', requireAuth, async (req: Request, res: Response) => {
  try {
    const roles = await roleManagementService.getAllRoles();
    res.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

/**
 * Get role by ID
 */
router.get('/roles/:roleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const role = await roleManagementService.getRoleById(roleId);
    
    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }
    
    res.json({ success: true, role });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch role' });
  }
});

/**
 * Get users by role
 */
router.get('/roles/:roleId/users', requireAuth, async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    const users = await roleManagementService.getUsersByRole(roleId);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

/**
 * Assign role to user
 */
router.post('/users/:userId/assign-role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { roleId, accessScope, restrictions } = req.body;
    const assignedBy = req.user?.username || 'unknown';

    if (!roleId) {
      return res.status(400).json({ success: false, error: 'Role ID is required' });
    }

    const result = await roleManagementService.assignUserRole(
      userId, 
      roleId, 
      assignedBy,
      accessScope,
      restrictions
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: 'Role assigned successfully' });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ success: false, error: 'Failed to assign role' });
  }
});

/**
 * Remove role from user
 */
router.delete('/users/:userId/remove-role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const removedBy = req.user?.username || 'unknown';

    const result = await roleManagementService.removeUserRole(userId, removedBy);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({ success: true, message: 'Role removed successfully' });
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({ success: false, error: 'Failed to remove role' });
  }
});

/**
 * Get role statistics
 */
router.get('/roles/statistics/overview', requireAuth, async (req: Request, res: Response) => {
  try {
    const stats = await roleManagementService.getRoleStatistics();
    res.json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Error fetching role statistics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

/**
 * Get user role history
 */
router.get('/users/:userId/role-history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const history = await roleManagementService.getUserRoleHistory(userId);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching role history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch role history' });
  }
});

/**
 * Validate user permission
 */
router.post('/users/:userId/validate-permission', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { permission } = req.body;

    if (!permission) {
      return res.status(400).json({ success: false, error: 'Permission is required' });
    }

    const hasPermission = await roleManagementService.validateUserPermission(userId, permission);
    res.json({ success: true, hasPermission });
  } catch (error) {
    console.error('Error validating permission:', error);
    res.status(500).json({ success: false, error: 'Failed to validate permission' });
  }
});

export default router;
