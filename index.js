import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from client build
app.use(express.static(path.join(__dirname, 'client/dist')));

// Basic API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle React Router - send all requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NEXLINX EMS Server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Mobile interface: http://0.0.0.0:${PORT}/mobile`);
  console.log(`💻 Desktop interface: http://0.0.0.0:${PORT}/admin`);
});