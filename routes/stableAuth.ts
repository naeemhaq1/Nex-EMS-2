import { Router, Request, Response } from 'express';
import { stableAuthService } from '../services/stableAuth';
import { requireStableAuth, requirePermission } from '../middleware/stableAuth';

const router = Router();

/**
 * Login endpoint
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await stableAuthService.authenticate(username, password);

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    if (!result.user) {
      return res.status(500).json({ error: 'Authentication error' });
    }

    // Set stable session data
    req.session.stableUserId = result.user.id;
    req.session.stableUsername = result.user.username;
    req.session.stableRole = result.user.role;
    req.session.stableAuthTime = Date.now();

    // Also set legacy session data for backward compatibility
    req.session.userId = result.user.id.toString();
    req.session.usernum = result.user.id;
    req.session.username = result.user.username;
    req.session.role = result.user.role;
    req.session.employeeId = result.user.employeeId;
    req.session.permissions = result.user.permissions;

    console.log(`[StableAuth] Login successful: ${result.user.username}`);

    res.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
        fullName: result.user.fullName,
        employeeCode: result.user.employeeCode,
        permissions: result.user.permissions,
      },
      requiresPasswordChange: result.requiresPasswordChange
    });

  } catch (error) {
    console.error('[StableAuth] Login error:', error);
    res.status(500).json({ error: 'Authentication system error' });
  }
});

/**
 * Logout endpoint
 */
router.post('/logout', (req: Request, res: Response) => {
  try {
    const username = req.session.stableUsername || 'unknown';

    // Clear all session data
    req.session.destroy((err) => {
      if (err) {
        console.error('[StableAuth] Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }

      console.log(`[StableAuth] Logout successful: ${username}`);
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('[StableAuth] Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Get current user info
 */
router.get('/me', requireStableAuth, (req: Request, res: Response) => {
  if (!req.stableUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    user: {
      id: req.stableUser.id,
      username: req.stableUser.username,
      role: req.stableUser.role,
      fullName: req.stableUser.fullName,
      employeeCode: req.stableUser.employeeCode,
      permissions: req.stableUser.permissions,
    }
  });
});

/**
 * Change password
 */
router.post('/change-password', requireStableAuth, async (req: Request, res: Response) => {
  try {
    if (!req.stableUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const success = await stableAuthService.changePassword(req.stableUser.id, newPassword);

    if (!success) {
      return res.status(500).json({ error: 'Failed to change password' });
    }

    console.log(`[StableAuth] Password changed for: ${req.stableUser.username}`);
    res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('[StableAuth] Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * Create new user (admin only)
 */
router.post('/create-user', requireStableAuth, requirePermission('canCreateUsers'), async (req: Request, res: Response) => {
  try {
    if (!req.stableUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { username, password, role, employeeId, managedDepartments } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role required' });
    }

    const result = await stableAuthService.createUser(req.stableUser, {
      username,
      password,
      role,
      employeeId,
      managedDepartments
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    console.log(`[StableAuth] User created: ${username} by ${req.stableUser.username}`);
    res.json({ success: true, userId: result.userId, message: 'User created successfully' });

  } catch (error) {
    console.error('[StableAuth] Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Initialize default roles (system setup)
 */
router.post('/init-roles', async (req: Request, res: Response) => {
  try {
    await stableAuthService.initializeDefaultRoles();
    res.json({ success: true, message: 'Default roles initialized' });
  } catch (error) {
    console.error('[StableAuth] Initialize roles error:', error);
    res.status(500).json({ error: 'Failed to initialize roles' });
  }
});

export default router;