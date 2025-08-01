import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireSuperAdmin, requireAdmin } from '../middleware/auth';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { authService } from '../services/auth';

const router = Router();

// Get all users (Admin and SuperAdmin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    // Remove password from response
    const safeUsers = users.map(user => ({
      ...user,
      password: undefined
    }));
    res.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new admin user (SuperAdmin only)
router.post('/admin', requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, employeeId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
      role: 'admin',
      employeeId: employeeId || null,
      isActive: true
    });

    // Remove password from response
    const safeUser = {
      ...newUser,
      password: undefined
    };

    res.status(201).json(safeUser);
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Update user (SuperAdmin only)
router.patch('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, password, role, employeeId, isActive } = req.body;

    const updateData: any = {};

    if (username) updateData.username = username;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (role) updateData.role = role;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await storage.updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const safeUser = {
      ...updatedUser,
      password: undefined
    };

    res.json(safeUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user role (Admin and SuperAdmin)
router.post('/:id/role', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Prevent non-superadmin from setting superadmin role
    if (role === 'superadmin' && req.session.user?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only SuperAdmin can assign SuperAdmin role' });
    }

    const updatedUser = await storage.updateUser(userId, { role });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const safeUser = {
      ...updatedUser,
      password: undefined
    };

    res.json(safeUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (SuperAdmin only)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deletion of SuperAdmin users
    const user = await storage.getUserById(userId);
    if (user && user.role === 'superadmin') {
      return res.status(400).json({ error: 'Cannot delete SuperAdmin users' });
    }

    const success = await storage.deleteUser(userId);

    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (!req.session) {
      return res.status(500).json({ error: 'Session middleware not configured' });
    }

    // Use storage service to verify user
    const user = await storage.verifyUser(username, password);
    if (!user) {
      console.log('Invalid credentials for username:', username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log('User authenticated:', user.username);

    // Get role permissions
    const rolePermissions = await storage.getRolePermissionByName(user.role);
    if (!rolePermissions) {
      console.log('No role permissions found for role:', user.role);
      return res.status(403).json({ error: "Role permissions not found" });
    }

    console.log('Role permissions found:', rolePermissions);

    // Set session data
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.employeeId = user.employeeId;
    req.session.realName = user.realName;
    req.session.userAgent = req.get('User-Agent') || '';
    req.session.ipAddress = req.ip || '';
    req.session.loginTime = new Date().toISOString();
    req.session.location = user.location || '';
    req.session.permissions = {
      canCreateUsers: rolePermissions.canCreateUsers,
      canDeleteUsers: rolePermissions.canDeleteUsers,
      canDeleteData: rolePermissions.canDeleteData,
      canAccessFinancialData: rolePermissions.canAccessFinancialData,
      canManageSystem: rolePermissions.canManageSystem,
      canManageTeams: rolePermissions.canManageTeams,
      canChangeDesignations: rolePermissions.canChangeDesignations,
      accessLevel: rolePermissions.accessLevel,
    };

    console.log('Session data set, saving session...');

    // Force session save and wait for it
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          console.log('Session saved successfully');
          resolve();
        }
      });
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId,
        realName: user.realName,
        permissions: req.session.permissions,
      },
      message: "Login successful"
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ success: false, error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// Get current user
router.get('/user', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.usernum || parseInt(req.session.userId || '0', 10);
    if (!userId) {
      return res.status(401).json({ error: 'No user session' });
    }

    const result = await authService.getUserById(userId);
    if (result.success) {
      return res.json(result.user);
    } else {
      return res.status(404).json({ error: result.error });
    }
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Session debug endpoint (development only)
router.get('/dev/session-debug', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    session: req.session,
    sessionID: req.sessionID,
    cookies: req.headers.cookie
  });
});

// Clear all sessions (development only)
router.post('/dev/clear-sessions', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    const { sql } = await import('../db');
    await sql`DELETE FROM session`;
    res.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    res.status(500).json({ error: 'Failed to clear sessions' });
  }
});



// DEV ENVIRONMENT: Auto-login as dev/dev
router.post('/dev', async (req, res) => {
  try {
    console.log('DEV auto-login attempt');
    console.log('Session exists:', !!req.session);
    console.log('Session ID:', req.sessionID);

    if (!req.session) {
      return res.status(500).json({ error: 'Session middleware not configured' });
    }

    // Create dev session with valid numeric IDs
    req.session.userId = '1';
    req.session.usernum = 1;
    req.session.username = 'dev';
    req.session.role = 'superadmin';
    req.session.realName = 'Developer';
    req.session.employeeId = 'DEV001';
    req.session.userAgent = req.get('User-Agent') || '';
    req.session.ipAddress = req.ip || '';
    req.session.loginTime = new Date().toISOString();
    req.session.location = 'Development Environment';
    req.session.permissions = {
      canCreateUsers: true,
      canDeleteUsers: true,
      canDeleteData: true,
      canAccessFinancialData: true,
      canManageSystem: true,
      canManageTeams: true,
      canChangeDesignations: true,
      accessLevel: 10
    };

    console.log('Session properties set, saving...');

    // Force session save and wait for it
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          console.log('Session saved successfully');
          resolve();
        }
      });
    });

    console.log('Final session state - userId:', req.session.userId, 'usernum:', req.session.usernum);

    res.json({
      success: true,
      user: {
        id: req.session.usernum,
        userId: req.session.userId,
        usernum: req.session.usernum,
        username: req.session.username,
        role: req.session.role,
        realName: req.session.realName,
        employeeId: req.session.employeeId,
        permissions: req.session.permissions
      },
      message: 'DEV auto-login successful'
    });
  } catch (error) {
    console.error('DEV auto-login error:', error);
    res.status(500).json({ error: 'DEV auto-login failed', details: error.message });
  }
});

export default router;