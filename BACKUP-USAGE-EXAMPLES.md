# NEXEMS-BKP-0731-SAMEDB Usage Examples

## 🚀 Quick Start Examples

### Example 1: Basic Backup Creation
```bash
# Create a standard backup
./backup-system/launcher.sh

# Or using the enhanced JavaScript creator directly
node backup-system/enhanced-backup-creator.cjs
```

### Example 2: Test Before Creating Backup
```bash
# Run system validation first
./backup-system/launcher.sh test

# If tests pass, create backup
./backup-system/launcher.sh create
```

### Example 3: Interactive Mode
```bash
# Launch interactive menu
./backup-system/launcher.sh --interactive

# Choose from:
# 1) Enhanced JavaScript creator (recommended)
# 2) Bash script creator
# 3) Simple Node.js creator
# 4) Run tests first
# 5) Exit
```

## 🎯 Installation Examples

### Example 1: Replit Deployment
```bash
# Upload NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54.tar.gz to Replit

# Extract backup
tar -xzf NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54.tar.gz

# Navigate to backup directory
cd NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54

# Install with Replit optimization
./scripts/deploy-replit.sh
./install.sh

# Application will auto-start on port 5000
```

### Example 2: Production Server Installation
```bash
# On your production server
wget [backup-url]/NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54.tar.gz

# Quick extraction and installation
./extract-NEXEMS-BKP-0731-SAMEDB.sh
cd NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54
./install.sh

# For production deployment
./scripts/deploy-server.sh
pm2 start ecosystem.config.js
```

### Example 3: Docker Deployment
```bash
# Extract backup
tar -xzf NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54.tar.gz
cd NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54

# Setup Docker environment
./scripts/deploy-docker.sh

# Configure environment
cp config/.env .env
# Edit .env with your settings

# Deploy with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

## 🔧 Advanced Usage Examples

### Example 1: Verbose Installation with Validation
```bash
# Dry run first (validation only)
./install.sh --dry-run

# If validation passes, install with detailed output
./install.sh --verbose

# Force installation (overwrite existing)
./install.sh --force
```

### Example 2: Custom Environment Setup
```bash
# Extract backup
tar -xzf NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54.tar.gz
cd NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54

# Verify backup integrity first
./verify.sh

# Custom environment configuration
cp config/.env .env

# Edit environment variables
nano .env
# Update DATABASE_URL, ports, secrets, etc.

# Install with custom configuration
./install.sh
```

### Example 3: Multi-Server Deployment
```bash
# Server 1: Main Application (Port 5000)
./install.sh
export PORT=5000
npm run dev

# Server 2: Core Services (Port 5001)
./install.sh
export PORT=5001
export SERVICES_ONLY=true
npm run services

# Server 3: WhatsApp Services (Port 5002)
./install.sh
export PORT=5002
export WHATSAPP_ONLY=true
npm run whatsapp
```

## 🛠️ Troubleshooting Examples

### Example 1: Installation Failure Recovery
```bash
# If installation fails, check the log
cat installation-YYYYMMDD-HHMMSS.log

# Fix permissions if needed
chmod +x install.sh
chmod +x scripts/*.sh

# Try installation again with verbose output
./install.sh --verbose
```

### Example 2: Database Connection Issues
```bash
# Check database configuration
cat database/db-config.env

# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Update connection string if needed
nano .env
# Edit DATABASE_URL

# Retry installation
./install.sh --force
```

### Example 3: Port Conflicts
```bash
# Check what's using the ports
netstat -tuln | grep :5000
netstat -tuln | grep :5001
netstat -tuln | grep :5002

# Update ports in environment
nano .env
# Change PORT, CORE_SERVICES_PORT, WHATSAPP_PORT

# Reinstall with new ports
./install.sh --force
```

## 📊 Monitoring Examples

### Example 1: Health Checks
```bash
# Check application health
curl http://localhost:5000/health

# Check service status
curl http://localhost:5001/health
curl http://localhost:5002/health

# Check database connectivity
npm run db:status
```

### Example 2: Performance Monitoring
```bash
# Check application logs
tail -f logs/application.log

# Monitor system resources
htop
df -h

# Check process status
pm2 status
pm2 logs
```

### Example 3: Update Procedures
```bash
# Create new backup from updated source
./backup-system/launcher.sh create

# Deploy updated backup
tar -xzf NEW-BACKUP.tar.gz
cd NEW-BACKUP-DIR

# Backup current configuration
cp ../old-deployment/.env .env.backup

# Install update
./install.sh

# Restore custom configuration
cp .env.backup .env
```

## 🔄 Maintenance Examples

### Example 1: Regular Backup Creation
```bash
# Weekly backup creation script
#!/bin/bash
cd /path/to/nexems
./backup-system/launcher.sh create --verbose

# Move backup to storage
mv backups/NEXEMS-BKP-*.tar.gz /backup/storage/
```

### Example 2: Backup Verification
```bash
# Verify backup integrity
cd backup-directory
./verify.sh

# Test installation in staging
./install.sh --dry-run

# Full installation test
mkdir test-install
cd test-install
../install.sh
```

### Example 3: Environment Migration
```bash
# From development to production

# 1. Create backup in development
./backup-system/launcher.sh create

# 2. Transfer to production server
scp NEXEMS-BKP-*.tar.gz production-server:/tmp/

# 3. Install on production
ssh production-server
cd /tmp
tar -xzf NEXEMS-BKP-*.tar.gz
cd NEXEMS-BKP-*
./install.sh

# 4. Configure for production
nano .env
# Set NODE_ENV=production
# Update database URLs
# Set strong secrets

# 5. Start production services
./scripts/deploy-server.sh
```

## 📱 Mobile Integration Examples

### Example 1: Mobile App Deployment
```bash
# Extract backup with mobile support
tar -xzf NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54.tar.gz
cd NEXEMS-BKP-0731-SAMEDB-2025-08-01T01-56-54

# Install base system
./install.sh

# Configure mobile components
cd mobile
npm install

# Build mobile app
npx expo build:android
```

### Example 2: WebView Configuration
```bash
# Install with mobile optimization
./install.sh

# Configure WebView settings
nano client/src/mobile/webview-config.js

# Build optimized version
npm run build:mobile

# Test mobile interface
npm run dev
# Access mobile interface at /mobile
```

This comprehensive backup system provides everything needed for seamless deployment and maintenance of the Nexlinx EMS across any platform!

---

**Quick Reference**:
- **Create Backup**: `./backup-system/launcher.sh`
- **Install Backup**: `./install.sh`
- **Test System**: `./backup-system/launcher.sh test`
- **Verify Integrity**: `./verify.sh`
- **Get Help**: `./install.sh --help`