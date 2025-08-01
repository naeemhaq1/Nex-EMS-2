import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Add middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add session management
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files from build output
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Development auto-login endpoint
app.post('/api/dev/auto-login', async (req, res) => {
  try {
    console.log('Development auto-login attempted');

    // Auto-login with admin user for development
    const user = {
      id: 1,
      username: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    // Set session data
    req.session = req.session || {};
    req.session.user = user;

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Auto-login error:', error);
    res.status(500).json({
      success: false,
      error: 'Auto-login failed'
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);

    const { username, password } = req.body;

    // Temporary test user for development
    if (username === 'admin' && password === 'admin123') {
      const user = {
        id: 1,
        username: 'admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      };

      // Set session data
      req.session = req.session || {};
      req.session.user = user;

      res.json({
        success: true,
        user: user
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// User authentication check endpoint
app.get('/api/auth/user', async (req, res) => {
  try {
    console.log('Auth check - session user:', req.session?.user);

    if (req.session && req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// Import routes
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessionManagement.js';
import dataInterfaceRoutes from './routes/dataInterface.ts';
import dataQualityRoutes from './routes/dataQuality.ts';
import employeesRoutes from './routes/employees.ts';
import dashboardRoutes from './routes/dashboard.ts';
import attendanceRoutes from './routes/attendance.ts';
import reportsRoutes from './routes/reports.ts';
import stableAuthRoutes from './routes/stableAuth.js';

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/data', dataInterfaceRoutes);
app.use('/api/data', dataQualityRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/stable-auth', stableAuthRoutes);

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 NEXLINX EMS Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
});