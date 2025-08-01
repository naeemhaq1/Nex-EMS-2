` tags.
```
<replit_final_file>
import express from "express";
import cors from "cors";

// Import route modules
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import adminRoutes from "./routes/admin";
import employeeRoutes from "./routes/employees";
import attendanceRoutes from "./routes/attendance";
import mobileRoutes from "./routes/mobile";
import analyticsRoutes from "./routes/analytics";
import whatsappRoutes from "./routes/whatsapp";
import deviceRoutes from "./routes/devices";
import settingsRoutes from "./routes/settings";
import healthRoutes from "./routes/health";
import { requireAuth, requireAdmin } from "./middleware/auth";

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://nexlinx-ems.replit.app']
    : ['http://localhost:5173', 'http://0.0.0.0:5173'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/health', healthRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all route
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;