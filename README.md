# Nexlinx EMS - Complete Working Application

## Overview
This is a complete, fully functional backup of the Nexlinx Enterprise Management System. This package contains all files necessary to run the application on any compatible server.

## Quick Installation

### 1. Extract and Install
```bash
tar -xzf nexlinx-complete-working-backup.tar.gz
cd nexlinx-complete-working-backup
./install.sh
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb nexlinx_ems

# Edit .env file with your database credentials
nano .env
# Update DATABASE_URL="postgresql://username:password@localhost:5432/nexlinx_ems"

# Initialize database schema
npm run db:push
```

### 3. Start Application
```bash
# Development mode (recommended for testing)
npm run dev

# Production mode
npm run build
npm start
```

## Access Points
- **Main Application**: http://localhost:5000
- **Services API**: http://localhost:5001
- **WhatsApp Services**: http://localhost:5002

## Default Login
- **Username**: admin
- **Password**: admin123
- **⚠️ Change password immediately after first login**

## System Requirements
- Node.js 18+ or 20+
- PostgreSQL 12+
- 4GB+ RAM
- 10GB+ disk space

## Package Contents
- ✅ Complete React frontend with all components
- ✅ Complete Express.js backend with all services
- ✅ Database schemas and migrations
- ✅ All configuration files
- ✅ Installation and setup scripts
- ✅ Three-tier microservice architecture
- ✅ WhatsApp Business API integration
- ✅ Mobile-responsive interfaces
- ✅ Real-time attendance tracking
- ✅ Advanced analytics dashboards

## Troubleshooting

### Port Issues
If ports are in use, edit .env:
```env
PORT=5000  # Change to available port
```

### Database Connection
Verify DATABASE_URL format:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

### Missing Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Permission Errors
```bash
chmod +x install.sh
sudo chown -R $USER:$USER .
```

## Production Deployment
1. Set `NODE_ENV=production` in .env
2. Configure production database
3. Set up SSL certificates
4. Use process manager (PM2)
5. Configure reverse proxy (nginx)

## Features Included
- **Admin Dashboard**: Comprehensive admin interface
- **Employee Portal**: Mobile-optimized employee interface
- **WhatsApp Integration**: Full Business API integration
- **Real-time Tracking**: Live attendance and location tracking
- **Analytics**: Advanced reporting and metrics
- **User Management**: Complete user and role management
- **Offline Support**: PWA with offline capabilities
- **Three-tier Architecture**: Scalable microservice design

This is a complete, production-ready application that will run immediately after proper database setup.
# Nexlinx EMS - Fresh Installation

## Status: Clean Installation Ready

This is a fresh, clean installation of the Nexlinx Employee Management System.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Access the application:
- Main server: http://localhost:5000
- Health check: http://localhost:5000/health

## Next Steps

1. Configure your database connection in `.env`
2. Set up your authentication system
3. Add your business logic and routes
4. Configure frontend components

## Port Configuration

- Development: Port 5000 (default)
- Production: Port 5000 (Replit optimized)
- Host: 0.0.0.0 (external access enabled)

## Features to Implement

- [ ] Database setup and migrations
- [ ] Authentication system
- [ ] Employee management
- [ ] Attendance tracking  
- [ ] Mobile interface
- [ ] Reporting system
- [ ] WhatsApp integration (optional)

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run install-deps` - Install all dependencies
