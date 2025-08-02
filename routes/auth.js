
import { Router } from 'express';
import { storage } from '../storage.js';
import bcrypt from 'bcrypt';

const router = Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('🚀 [AUTH] Login attempt:', req.body);
    
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('❌ [AUTH] Missing credentials');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password required' 
      });
    }

    // Get user from storage
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      console.log('❌ [AUTH] User not found:', username);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ [AUTH] Invalid password for user:', username);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Set session
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'employee';
    req.session.employeeId = user.employeeId || `EMP${user.id}`;
    req.session.userAgent = req.get('User-Agent') || '';
    req.session.ipAddress = req.ip || '';
    req.session.loginTime = new Date().toISOString();

    console.log('✅ [AUTH] Login successful for:', username);
    
    res.json({
      success: true,
      user: {
        id: user.id.toString(),
        username: user.username,
        role: user.role || 'employee'
      }
    });

  } catch (error) {
    console.error('💥 [AUTH] Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
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
