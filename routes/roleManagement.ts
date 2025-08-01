
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { roleManagementService } from '../services/roleManagementService';

const router = Router();

// Get all roles
router.get('/roles', requireAuth, async (req: Request, res: Response) => {
  try {
    const roles = await roleManagementService.getAllRoles();
    res.json(roles);
  } catch (error) {
    console.error('[Role Management API] Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Create new role (SuperAdmin only)
router.post('/roles', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).session?.role;
    if (userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Only SuperAdmin can create new roles' });
    }

    const userId = (req as any).session?.userId;
    const result = await roleManagementService.createRole(req.body, userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Role Management API] Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update existing role (SuperAdmin only)
router.put('/roles/:roleName', requireAuth, async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).session?.role;
    if (userRole !== 'superadmin') {
      return res.status(403).json({ error: 'Only SuperAdmin can update roles' });
    }

    const userId = (req as any).session?.userId;
    const result = await roleManagementService.updateRole(req.params.roleName, req.body, userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[Role Management API] Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Get role hierarchy
router.get('/roles/hierarchy', requireAuth, async (req: Request, res: Response) => {
  try {
    const hierarchy = await roleManagementService.getRoleHierarchy();
    res.json(hierarchy);
  } catch (error) {
    console.error('[Role Management API] Error fetching role hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch role hierarchy' });
  }
});

export default router;
