import { Router } from "express";
import { authService } from "../services/auth";
import { authenticateToken, requireAdmin, requireSuperAdmin } from '../middleware/jwtAuth';

const router = Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Missing username or password"
      });
    }

    const result = await authService.login(username, password);

    if (result.success && result.token) {
      // Set HTTP-only cookie for web clients
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Get current user
router.get('/user', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: "Logged out successfully" });
});

// Dev mode auto-login (development only)
router.post('/dev', devAutoLogin);

// Token verification endpoint
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token required"
      });
    }

    const result = await authService.verifyToken(token);
    res.json(result);
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Password reset endpoints
router.post('/reset-password-request', async (req, res) => {
  try {
    const { username, mobileNumber } = req.body;

    if (!username || !mobileNumber) {
      return res.status(400).json({
        success: false,
        error: "Username and mobile number required"
      });
    }

    const result = await authService.initiatePasswordReset(username, mobileNumber);
    res.json(result);
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Token and new password required"
      });
    }

    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password required"
      });
    }

    const result = await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

export default router;