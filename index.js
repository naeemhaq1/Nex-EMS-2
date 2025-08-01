
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock employee endpoint for development
app.get('/api/employees/me', (req, res) => {
  res.json({ 
    id: 1, 
    name: 'Test Employee', 
    email: 'test@nexlinx.com',
    role: 'employee' 
  });
});

// Mock other endpoints
app.get('/api/mobile-attendance/punch-status', (req, res) => {
  res.json({ status: 'out', lastPunch: null });
});

app.get('/api/employees/me/metrics', (req, res) => {
  res.json({ hoursWorked: 40, attendance: 95 });
});

app.get('/api/announcements/employee', (req, res) => {
  res.json([]);
});

// Catch all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NEXLINX EMS Server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Access your app at: http://0.0.0.0:${PORT}`);
});
