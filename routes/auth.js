import { Router } from 'express';
import { storage } from '../storage.js';
import bcrypt from 'bcrypt';

const router = Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    console.log(`🔐 [LOGIN] Attempting login for: ${username.trim()}`);

    // Get user from storage
    const user = await storage.getUserByUsername(username.trim());

    if (!user) {
      console.log('❌ [LOGIN] User not found');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }

    console.log('🔐 [LOGIN] User found, checking password...');

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      console.log('❌ [LOGIN] Invalid password');
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

    // Set session data
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'employee';
    req.session.employeeId = user.employeeId;

    console.log(`✅ [LOGIN] Login successful for: ${username} (ID: ${user.id})`);

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
      error: 'Internal server error' 
    });
  }
});

// Check auth status
router.get('/check', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }

    const user = await storage.getUserById(parseInt(req.session.userId));

    if (!user || !user.isActive) {
      req.session.destroy();
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid session' 
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({ 
      success: true, 
      user: userWithoutPassword 
    });

  } catch (error) {
    console.error('💥 [AUTH_CHECK] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('💥 [LOGOUT] Error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Logout failed' 
      });
    }

    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

export default router;