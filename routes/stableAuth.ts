import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Login endpoint for mobile
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Stable auth login attempt:', { username });

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }

    // Find user by username
    const [user] = await db.select().from(users).where(eq(users.username, username.trim()));

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Create session
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Login failed' 
        });
      }

      console.log('Login successful for user:', username);
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    });

  } catch (error) {
    console.error('Stable auth login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

// Get current user endpoint
router.get('/me', async (req, res) => {
  try {
    console.log('Stable auth me check, session:', req.session?.userId);

    if (!req.session?.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));

    if (!user) {
      console.log('User not found in database:', req.session.userId);
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    console.log('User found:', user.username);
    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });

  } catch (error) {
    console.error('Stable auth me error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication check failed' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Logout failed' 
      });
    }
    res.json({ success: true });
  });
});

export default router;