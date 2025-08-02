
import { Router } from 'express';
import { storage } from '../storage.js';
import bcrypt from 'bcrypt';

const router = Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 [LOGIN] Login attempt started');
    
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log('❌ [LOGIN] Missing username or password');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    console.log(`🔐 [LOGIN] Attempting login for: "${username}"`);

    // Get user from storage
    const user = storage.getUserByUsername(username.trim());

    if (!user) {
      console.log(`❌ [LOGIN] User "${username}" not found`);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    console.log(`🔐 [LOGIN] User found - ID: ${user.id}, Role: ${user.role}, Active: ${user.isActive}`);

    // Check if user is active
    if (!user.isActive) {
      console.log('❌ [LOGIN] User account is inactive');
      return res.status(401).json({ 
        success: false, 
        error: 'Account is inactive' 
      });
    }

    // Verify password
    console.log('🔐 [LOGIN] Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log('❌ [LOGIN] Password verification failed');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    console.log('✅ [LOGIN] Password verified successfully');

    // Set session data
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'employee';
    req.session.employeeId = user.employeeId;

    console.log(`✅ [LOGIN] Session created for user: ${username} (ID: ${user.id})`);
    console.log('📋 [LOGIN] Session data:', {
      userId: req.session.userId,
      username: req.session.username,
      role: req.session.role
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      success: true, 
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('💥 [LOGIN] Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during login' 
    });
  }
});

// Check authentication status
router.get('/check', async (req, res) => {
  try {
    console.log('🔍 [AUTH_CHECK] Checking authentication status');
    console.log('🔍 [AUTH_CHECK] Session data:', {
      userId: req.session?.userId,
      username: req.session?.username,
      role: req.session?.role
    });

    if (!req.session?.userId) {
      console.log('❌ [AUTH_CHECK] No session found');
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated - no session' 
      });
    }

    const user = storage.getUserById(parseInt(req.session.userId));

    if (!user) {
      console.log('❌ [AUTH_CHECK] User not found in storage');
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.isActive) {
      console.log('❌ [AUTH_CHECK] User account is inactive');
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        error: 'Account is inactive' 
      });
    }

    console.log(`✅ [AUTH_CHECK] Authentication valid for user: ${user.username}`);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      success: true, 
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('💥 [AUTH_CHECK] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during auth check' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  try {
    console.log('🚪 [LOGOUT] Logout request');
    
    req.session.destroy((err) => {
      if (err) {
        console.error('💥 [LOGOUT] Error destroying session:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Logout failed' 
        });
      }

      res.clearCookie('nexlinx-session');
      console.log('✅ [LOGOUT] Session destroyed successfully');
      res.json({ success: true });
    });
  } catch (error) {
    console.error('💥 [LOGOUT] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

export default router;
