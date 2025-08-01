import { Router } from 'express';
import { authService } from '../services/auth';
import { authenticateToken, devAutoLogin } from '../middleware/jwtAuth';

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
      // Set HTTP-only cookie for token
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({
        success: true,
        user: result.user
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error,
        requiresPasswordChange: result.requiresPasswordChange,
        userId: result.userId
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
 * Get current user
 */
router.get('/user', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * Logout endpoint
 */
router.post('/logout', (req, res) => {
  // Clear the auth cookie
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Dev auto-login (development only)
 */
router.post('/dev', devAutoLogin);

/**
 * Token verification
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required'
      });
    }

    const result = await authService.verifyToken(token);
    res.json(result);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Change password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password required'
      });
    }

    const result = await authService.changePassword(
      req.user!.userId, 
      currentPassword, 
      newPassword
    );

    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;