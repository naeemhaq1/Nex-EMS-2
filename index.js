
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting NEXLINX EMS Server...');

// Configure CORS with specific settings
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON bodies with limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration with improved security
app.use(session({
  secret: process.env.SESSION_SECRET || 'nexlinx-ems-secret-key-2024-updated',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  name: 'nexlinx-session'
}));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path} - Session: ${req.session?.userId ? 'Active' : 'None'}`);
  next();
});

// Auth routes
app.use('/api/auth', authRoutes);

// Serve static files
app.use(express.static(join(__dirname, 'client/dist')));
app.use('/public', express.static(join(__dirname, 'public')));

// Health check with detailed info
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

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working',
    session: req.session?.userId ? 'authenticated' : 'not authenticated',
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'client/dist/index.html'));
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
});
