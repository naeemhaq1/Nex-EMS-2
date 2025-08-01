# NEXLINX EMS - Complete Deployment Guide

## 🚀 Quick Deployment (All Platforms)

### Option 1: Replit Deployment (Recommended)
```bash
# 1. Import to Replit
# - Upload all files from this backup
# - Replit will automatically detect package.json

# 2. Configure Environment
# - Copy .env.production to .env
# - Update DATABASE_URL with your PostgreSQL connection
# - Set other required variables

# 3. Install Dependencies
npm install

# 4. Deploy Database Schema
npm run db:push

# 5. Start Application
npm run dev
```

### Option 2: Local/Server Deployment
```bash
# 1. Extract files to deployment directory
mkdir nexlinx-ems && cd nexlinx-ems
cp -r backup-contents/* .

# 2. Install Node.js 20+ and PostgreSQL
# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql

# 3. Setup Environment
cp .env.production .env
# Edit .env with your actual values

# 4. Install Dependencies
npm ci

# 5. Setup Database
npm run db:push

# 6. Start Production Server
npm run build
npm start
```

## 🗄️ Database Setup

### PostgreSQL Configuration
```sql
-- Create database and user
CREATE DATABASE nexlinx_ems;
CREATE USER nexlinx_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE nexlinx_ems TO nexlinx_user;

-- Update your .env file:
DATABASE_URL=postgresql://nexlinx_user:secure_password@localhost:5432/nexlinx_ems
```

### Initialize Schema
```bash
# This will create all necessary tables
npm run db:push
```

## 🔧 Configuration Requirements

### Essential Environment Variables
```bash
# Database (CRITICAL)
DATABASE_URL=postgresql://user:pass@host:port/db

# Application
NODE_ENV=production
PORT=5000

# WhatsApp Business API (if using)
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

### Optional Features Configuration
```bash
# Email Reports
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Google Maps Integration
GOOGLE_MAPS_API_KEY=your_api_key

# External Biometric System
BIOTIME_API_URL=http://your-biotime-server/employees.aspx
```

## 📱 System Architecture

### Three-Tier Port Configuration
- **Port 5000**: Main web interface and general APIs
- **Port 5001**: Core services (attendance, monitoring, backup, polling)
- **Port 5002**: WhatsApp services (messaging, chatbot, monitoring)

### Application Structure
```
nexlinx-ems/
├── client/          # React frontend
├── server/          # Express.js backend
├── shared/          # Common schemas and utilities
├── package.json     # Dependencies and scripts
├── vite.config.ts   # Build configuration
├── drizzle.config.ts # Database configuration
└── .env             # Environment variables
```

## 🧪 Testing Deployment

### Health Check Endpoints
```bash
# Test main application
curl http://localhost:5000/api/health

# Test core services
curl http://localhost:5001/api/health

# Test WhatsApp services (if configured)
curl http://localhost:5002/api/health
```

### Frontend Access
- Main Dashboard: `http://localhost:5000`
- Admin Panel: `http://localhost:5000/admin`
- Monthly Reports: `http://localhost:5000/monthly-report`

## 🔒 Security Configuration

### Production Security Checklist
- [ ] Change default SESSION_SECRET
- [ ] Use strong database passwords
- [ ] Configure firewall rules
- [ ] Enable HTTPS in production
- [ ] Set secure headers
- [ ] Configure CORS properly

### Environment Security
```bash
# Secure file permissions
chmod 600 .env
chown app:app .env

# Database user with minimal privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexlinx_user;
```

## 📊 Features Included

### Core Features
- ✅ Employee Management (309+ biometric employees)
- ✅ Attendance Tracking with BioTime integration
- ✅ Monthly Reports with accurate business rules
- ✅ Real-time Dashboard with ultra-fast caching
- ✅ Mobile-responsive design
- ✅ Role-based authentication

### WhatsApp Integration
- ✅ WhatsApp Business API integration
- ✅ Automated messaging and notifications
- ✅ Contact management
- ✅ Queue management system

### Analytics & Reporting
- ✅ Comprehensive monthly attendance reports
- ✅ Employee hours calculation with correct business rules
- ✅ Performance analytics
- ✅ Department-based filtering and search

## 🚨 Troubleshooting

### Common Issues and Solutions

#### React Hook Dispatcher Error
```bash
rm -rf node_modules/.vite dist/ client/dist/
npm ci
npm run dev
```

#### Module Resolution Error
```bash
# Verify shared/index.ts exists
ls -la shared/index.ts

# Check vite.config.ts aliases
npm run dev
```

#### Database Connection Error
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Recreate schema
npm run db:push
```

#### Port Already in Use
```bash
# Kill existing processes
pkill -f "node.*5000"
npm run dev
```

## 📞 Support Information

### System Requirements
- Node.js 20+ 
- PostgreSQL 12+
- 2GB+ RAM
- 10GB+ disk space

### Monitoring
- System uptime monitoring included
- Health check endpoints available
- Performance metrics dashboard
- Real-time service status

---

**Deployment Package**: Complete NEXLINX EMS system
**Generated**: $(date)
**Version**: Production-ready with all critical fixes
**Support**: All essential features validated and tested