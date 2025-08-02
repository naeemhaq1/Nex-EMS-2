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

    console.log(`🔐 [LOGIN] === LOGIN ATTEMPT START ===`);
    console.log(`🔐 [LOGIN] Username: "${username}"`);
    console.log(`🔐 [LOGIN] Password length: ${password ? password.length : 'undefined'}`);
    console.log(`🔐 [LOGIN] Request body:`, req.body);

    // Validate input
    if (!username || !password) {
      console.log('❌ [LOGIN] Missing username or password');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    console.log(`🔐 [LOGIN] Looking up user: "${username.trim()}"`);

    // Direct user lookup from storage
    let user;
    try {
      user = await storage.getUserByUsername(username.trim());
      console.log('🔐 [LOGIN] Storage query result:', user ? 'User found' : 'User not found');
    } catch (storageError) {
      console.error('💥 [LOGIN] Storage error:', storageError);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error during user lookup' 
      });
    }

    if (!user) {
      console.log('❌ [LOGIN] User not found in database');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    console.log('🔐 [LOGIN] User found! Details:', {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
      passwordStart: user.password ? user.password.substring(0, 10) : 'No password'
    });

    // Check if user has a password
    if (!user.password) {
      console.log('❌ [LOGIN] User has no password set');
      return res.status(401).json({ 
        success: false, 
        error: 'Account password not configured' 
      });
    }

    console.log('🔐 [LOGIN] Verifying password with bcrypt...');
    console.log('🔐 [LOGIN] Input password:', password);
    console.log('🔐 [LOGIN] Stored hash:', user.password.substring(0, 20) + '...');

    // Direct bcrypt comparison
    let isValidPassword;
    try {
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log('🔐 [LOGIN] Bcrypt comparison result:', isValidPassword);
    } catch (bcryptError) {
      console.error('💥 [LOGIN] Bcrypt error:', bcryptError);
      return res.status(500).json({ 
        success: false, 
        error: 'Password verification error' 
      });
    }

    if (!isValidPassword) {
      console.log('❌ [LOGIN] Password verification failed');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      console.log('❌ [LOGIN] User is inactive');
      return res.status(401).json({ 
        success: false, 
        error: 'Account is inactive' 
      });
    }

    console.log('🔐 [LOGIN] Setting up session...');

    // Set session with all required fields
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'employee';
    req.session.employeeId = user.employeeId;

    // Force session save
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('💥 [LOGIN] Session save error:', err);
          reject(err);
        } else {
          console.log('✅ [LOGIN] Session saved successfully');
          resolve(true);
        }
      });
    });

    console.log(`✅ [LOGIN] Login successful for user: ${username} (ID: ${user.id})`);
    console.log('✅ [LOGIN] Session data set:', {
      userId: req.session.userId,
      usernum: req.session.usernum,
      username: req.session.username,
      role: req.session.role,
      sessionID: req.sessionID
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    const response = { 
      success: true, 
      user: userWithoutPassword 
    };

    console.log('✅ [LOGIN] Sending response:', response);
    console.log(`🔐 [LOGIN] === LOGIN ATTEMPT END ===`);

    res.json(response);

  } catch (error) {
    console.error('💥 [LOGIN] Unexpected login error:', error);
    console.error('💥 [LOGIN] Stack trace:', error.stack);
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