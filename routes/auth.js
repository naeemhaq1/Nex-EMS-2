import { Router } from 'express';
import { storage } from '../storage.js';
import bcrypt from 'bcrypt';

const router = Router();

// Test endpoint
router.get('/test', (req, res) => {
  console.log('🧪 [AUTH TEST] Test endpoint hit');
  res.json({ 
    success: true, 
    message: 'Auth routes are working',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 [LOGIN] Received login request');
    console.log('🔐 [LOGIN] Username:', username);
    console.log('🔐 [LOGIN] Password length:', password ? password.length : 0);

    if (!username || !password) {
      console.log('❌ [LOGIN] Missing credentials');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    console.log(`🔐 [LOGIN] Attempting login for user: ${username}`);
    const result = await authService.login(username, password);

    console.log('🔐 [LOGIN] Auth service result:', result);

    if (result.success) {
      // Set session
      req.session.userId = result.user.id;
      req.session.user = result.user;

      console.log(`✅ [LOGIN] Login successful for user: ${username} (ID: ${result.user.id})`);
      res.json(result);
    } else {
      console.log(`❌ [LOGIN] Login failed for user: ${username} - ${result.error}`);
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('💥 [LOGIN] Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Check authentication endpoint
router.get('/me', (req, res) => {
  try {
    console.log('🔍 [AUTH] Auth check - session:', {
      userId: req.session.userId,
      usernum: req.session.usernum,
      username: req.session.username,
      role: req.session.role
    });

    if (!req.session.userId && !req.session.usernum) {
      console.log('❌ [AUTH] No valid session');
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }

    console.log('✅ [AUTH] Valid session found');

    res.json({
      user: {
        id: req.session.userId || req.session.usernum?.toString(),
        username: req.session.username,
        role: req.session.role || 'employee'
      }
    });

  } catch (error) {
    console.error('💥 [AUTH] Auth check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication check failed' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  try {
    console.log('🚪 [AUTH] Logout request for:', req.session.username);

    req.session.destroy((err) => {
      if (err) {
        console.error('❌ [AUTH] Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Logout failed' 
        });
      }

      console.log('✅ [AUTH] Logout successful');
      res.json({ success: true });
    });

  } catch (error) {
    console.error('💥 [AUTH] Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

export default router;