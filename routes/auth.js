import { Router } from 'express';
import { storage } from '../storage.js';
import { authService } from '../services/auth.ts';
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

    console.log(`🔐 [LOGIN] Looking up user: ${username}`);
    
    // Direct user lookup from storage
    const user = await storage.getUserByUsername(username.trim());
    
    if (!user) {
      console.log('❌ [LOGIN] User not found');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    console.log('🔐 [LOGIN] User found, verifying password...');
    console.log('🔐 [LOGIN] User details:', {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password
    });

    // Direct bcrypt comparison
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔐 [LOGIN] Password verification result:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ [LOGIN] Password verification failed');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ [LOGIN] User is inactive');
      return res.status(401).json({ 
        success: false, 
        error: 'Account is inactive' 
      });
    }

    // Set session with all required fields
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'employee';
    req.session.employeeId = user.employeeId;

    console.log(`✅ [LOGIN] Login successful for user: ${username} (ID: ${user.id})`);
    console.log('✅ [LOGIN] Session data set:', {
      userId: req.session.userId,
      usernum: req.session.usernum,
      username: req.session.username,
      role: req.session.role
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ 
      success: true, 
      user: userWithoutPassword 
    });

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