
import { Router } from 'express';
import { stableAuth } from '../services/stableAuth';
import { requireStableAuth } from '../middleware/stableAuth';
import { sessionMiddleware } from '../middleware/auth';

const router = Router();

// Apply session middleware
router.use(sessionMiddleware);

/**
 * Login endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Username and password are required" 
      });
    }

    // Authenticate user
    const result = await stableAuth.authenticateUser(username, password);
    
    if (!result.success) {
      return res.status(401).json(result);
    }

    const user = result.user!;

    // Clear any existing sessions for this user (single sign-on)
    await stableAuth.clearUserSessions(user.id);

    // Create new session
    req.session.stableUserId = user.id;
    req.session.stableUsername = user.username;
    req.session.stableUserRole = user.role;
    req.session.stableLoginTime = new Date().toISOString();
    req.session.stableLastActivity = new Date().toISOString();

    // Also set legacy session data for compatibility
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    console.log(`[StableAuth] Login successful: ${user.username}, Role: ${user.role}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[StableAuth] Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Login failed" 
    });
  }
});

/**
 * Logout endpoint
 */
router.post('/logout', (req, res) => {
  try {
    const username = req.session.stableUsername;
    
    req.session.destroy((err) => {
      if (err) {
        console.error('[StableAuth] Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          error: "Logout failed" 
        });
      }

      console.log(`[StableAuth] Logout successful: ${username}`);
      res.json({ success: true });
    });
  } catch (error) {
    console.error('[StableAuth] Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Logout failed" 
    });
  }
});

/**
 * Get current user endpoint
 */
router.get('/user', requireStableAuth, async (req, res) => {
  try {
    const user = (req as any).stableUser;
    
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      lastPasswordChange: user.lastPasswordChange
    });
  } catch (error) {
    console.error('[StableAuth] Get user error:', error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

/**
 * Change password endpoint
 */
router.post('/change-password', requireStableAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).stableUser.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: "Current password and new password are required" 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: "New password must be at least 8 characters long" 
      });
    }

    const result = await stableAuth.changePassword(userId, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    console.error('[StableAuth] Change password error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to change password" 
    });
  }
});

/**
 * Set first-time password endpoint
 */
router.post('/set-first-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: "User ID and new password are required" 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        error: "Password must be at least 8 characters long" 
      });
    }

    const result = await stableAuth.setFirstTimePassword(userId, newPassword);
    res.json(result);
  } catch (error) {
    console.error('[StableAuth] Set first password error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to set password" 
    });
  }
});

/**
 * Dev auto-login endpoint (for development environment)
 */
router.post('/dev/auto-login', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        success: false, 
        error: "Auto-login not available in production" 
      });
    }

    console.log('[StableAuth] Dev auto-login attempt');

    // Try to find admin user
    const adminUser = await stableAuth.getUserById(1); // Assuming admin has ID 1
    
    if (!adminUser) {
      return res.status(404).json({ 
        success: false, 
        error: "Admin user not found for auto-login" 
      });
    }

    // Create session for admin user
    req.session.stableUserId = adminUser.id;
    req.session.stableUsername = adminUser.username;
    req.session.stableUserRole = adminUser.role;
    req.session.stableLoginTime = new Date().toISOString();
    req.session.stableLastActivity = new Date().toISOString();

    // Also set legacy session data for compatibility
    req.session.userId = adminUser.id.toString();
    req.session.usernum = adminUser.id;
    req.session.username = adminUser.username;
    req.session.role = adminUser.role;

    console.log(`[StableAuth] Dev auto-login successful: ${adminUser.username}`);

    res.json({
      success: true,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
        createdAt: adminUser.createdAt
      }
    });
  } catch (error) {
    console.error('[StableAuth] Dev auto-login error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Auto-login failed" 
    });
  }
});

export default router;
