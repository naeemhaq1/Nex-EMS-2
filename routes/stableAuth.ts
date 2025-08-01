import { Router, Request, Response } from 'express';
import { stableAuthService } from '../services/stableAuth';
import { requireStableAuth, requirePermission } from '../middleware/stableAuth';

const router = Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Stable auth login attempt:', username);

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    const result = await stableAuthService.authenticateUser(username, password);
    console.log('Authentication result:', result.success ? 'Success' : result.error);

    if (result.success && result.user) {
      req.session.stableUserId = result.user.id;
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, error: 'Session error' });
        }

        console.log('Session saved for user:', result.user.id);
        res.json({ 
          success: true, 
          user: result.user,
          message: 'Login successful' 
        });
      });
    } else {
      console.log('Login failed:', result.error);
      res.status(401).json({ 
        success: false, 
        error: result.error || 'Invalid credentials' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
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

// Get current user info
router.get('/user', requireStableAuth, async (req, res) => {
  try {
    if (!req.stableUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await stableAuthService.getUserById(req.stableUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      employeeCode: user.employeeCode,
      permissions: user.permissions
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  // Get current user info (alternative endpoint)
  router.get('/me', requireStableAuth, async (req, res) => {
    try {
    if (!req.stableUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
      const user = await stableAuthService.getUserById(req.stableUser.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        employeeCode: user.employeeCode,
        permissions: user.permissions
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
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