import express from 'express';
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

// Serve static files from build output
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Add basic auth routes for testing
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Temporary test user for development
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      user: {
        id: 1,
        username: 'admin',
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  // Return null for now - will be implemented with proper session management
  res.json({ user: null });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 NEXLINX EMS Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
});