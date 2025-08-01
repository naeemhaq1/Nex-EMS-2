
import { Router } from 'express';
import { authService } from '../services/authService';
import { authenticateToken } from '../middleware/jwtAuth';

const router = Router();

/**
 * Login endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    const result = await authService.login(username, password);

    if (result.success) {
      res.json({
        success: true,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error,
        requiresPasswordChange: result.requiresPasswordChange
      });
    }
  } catch (error) {
    console.error('Login endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Refresh token endpoint
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Refresh token is required' 
      });
    }

    const result = await authService.refreshToken(refreshToken);

    if (result.success) {
      res.json({
        success: true,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Refresh token endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Get current user endpoint
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await authService.getUserById(req.user.userId);

    if (result.success) {
      res.json(result.user);
    } else {
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    console.error('Get user endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Change password endpoint
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password and new password are required' 
      });
    }

    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }

    const result = await authService.changePassword(
      req.user.userId, 
      currentPassword, 
      newPassword
    );

    res.json(result);
  } catch (error) {
    console.error('Change password endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
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
        error: 'User ID and new password are required' 
      });
    }

    const result = await authService.setFirstTimePassword(userId, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Set first password endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Logout endpoint (client-side token invalidation)
 */
router.post('/logout', (req, res) => {
  // With JWT, logout is primarily handled client-side by removing tokens
  // In the future, we could implement a token blacklist for added security
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
