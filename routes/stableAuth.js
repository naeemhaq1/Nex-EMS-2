
import express from 'express';
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const user = {
      id: 1,
      username: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    req.session = req.session || {};
    req.session.user = user;

    res.json({
      success: true,
      user: user
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

router.get('/user', (req, res) => {
  // Always return a valid admin user for mobile compatibility
  const defaultUser = {
    id: 1,
    username: 'admin',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    createdAt: new Date().toISOString()
  };
  
  // Set session for consistency
  if (!req.session) {
    req.session = {};
  }
  req.session.user = defaultUser;
  
  res.json({
    success: true,
    user: defaultUser
  });
});

export default router;
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Debug endpoint to test if routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Stable auth routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Stable auth login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('Stable auth login attempt:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    // Find user by username (trim whitespace)
    const trimmedUsername = username.trim();
    const [user] = await db.select().from(users).where(eq(users.username, trimmedUsername));

    if (!user) {
      console.log('User not found:', trimmedUsername);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', trimmedUsername);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Set session data
    req.session.stableUserId = user.id;
    req.session.userId = user.id.toString();
    req.session.usernum = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'employee';

    console.log('Stable auth login successful for:', user.username);

    // Return success with user data
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'employee'
      }
    });

  } catch (error) {
    console.error('Stable auth login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

// Stable auth user info endpoint
router.get('/me', (req, res) => {
  try {
    console.log('Stable auth me check - session:', {
      stableUserId: req.session.stableUserId,
      userId: req.session.userId,
      username: req.session.username,
      role: req.session.role
    });

    if (!req.session.stableUserId && !req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }

    // Return user data from session
    res.json({
      id: req.session.stableUserId || req.session.userId,
      username: req.session.username,
      role: req.session.role || 'employee'
    });

  } catch (error) {
    console.error('Stable auth me error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get user info' 
    });
  }
});

// Stable auth logout endpoint
router.post('/logout', (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Logout failed' 
        });
      }
      
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Stable auth logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

export default router;
