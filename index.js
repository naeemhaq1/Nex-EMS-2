
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting NEXLINX EMS Server...');

// Ensure data directory exists
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log('📁 Created data directory');
}

// Configure CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'nexlinx-ems-secret-key-2024-updated',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'nexlinx-session'
}));

// Simple auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  console.log(`🔐 Login attempt for: ${username}`);
  
  // Simple hardcoded authentication for now
  if (username === 'test' && password === 'test') {
    req.session.userId = 1;
    req.session.username = username;
    req.session.role = 'admin';
    
    console.log('✅ Login successful');
    res.json({
      success: true,
      user: {
        id: 1,
        username: username,
        role: 'admin'
      }
    });
  } else {
    console.log('❌ Login failed');
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.get('/api/auth/session', (req, res) => {
  if (req.session?.userId) {
    res.json({
      success: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
    
    res.clearCookie('nexlinx-session');
    console.log('✅ Logout successful');
    res.json({ success: true });
  });
});

// Serve static files
app.use(express.static(join(__dirname, 'client/dist')));
app.use('/public', express.static(join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    session: req.session?.userId ? 'active' : 'none',
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  };
  
  console.log('💚 Health check:', health);
  res.json(health);
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working',
    session: req.session?.userId ? 'authenticated' : 'not authenticated',
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  const indexPath = join(__dirname, 'client/dist/index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built. Please run the build process.');
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ NEXLINX EMS Server started successfully');
  console.log(`📱 Local: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log('🔐 Authentication system ready');
  console.log('👤 Test credentials: username=test, password=test');
});
