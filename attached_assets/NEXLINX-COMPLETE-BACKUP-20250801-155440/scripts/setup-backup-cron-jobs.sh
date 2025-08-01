#!/bin/bash

# Setup Complete Backup System Cron Jobs
# This script sets up automated daily and monthly backup tasks

echo "💾 SETTING UP COMPREHENSIVE BACKUP SYSTEM CRON JOBS"
echo "==================================================="

# Get the current working directory
PROJECT_DIR=$(pwd)
NODE_PATH=$(which node)

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Node.js is available
if [ -z "$NODE_PATH" ]; then
    echo "❌ Error: Node.js not found in PATH"
    exit 1
fi

echo "📁 Project Directory: $PROJECT_DIR"
echo "🟢 Node.js Path: $NODE_PATH"

# Create backup directories
mkdir -p "$PROJECT_DIR/backups/daily-backups"
mkdir -p "$PROJECT_DIR/backups/monthly-backups"
mkdir -p "$PROJECT_DIR/logs/backup"
echo "📋 Created backup directories"

# Backup existing crontab
crontab -l > "$PROJECT_DIR/logs/backup/crontab_backup_$(date +%Y%m%d_%H%M%S).txt" 2>/dev/null || echo "# No existing crontab" > "$PROJECT_DIR/logs/backup/crontab_backup_$(date +%Y%m%d_%H%M%S).txt"
echo "💾 Backed up existing crontab"

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Preserve existing crontab entries (excluding our backup jobs)
crontab -l 2>/dev/null | grep -v "# BACKUP SYSTEM" | grep -v "daily-backup-system.js" | grep -v "monthly-backup-system.js" | grep -v "daily-biometric-exemption-monitor.js" | grep -v "daily-device-sync.js" > "$TEMP_CRON"

# Add our comprehensive backup and monitoring system
cat >> "$TEMP_CRON" << EOF

# BACKUP SYSTEM - Automated Daily and Monthly Backups with Monitoring
# ====================================================================

# Daily Device Sync - 5:30 AM (before other operations)
# Fetches latest device status from BioTime API
30 5 * * * cd "$PROJECT_DIR" && "$NODE_PATH" scripts/daily-device-sync.cjs >> logs/backup/device-sync.log 2>&1

# Daily Biometric Exemption Monitor - 6:00 AM (after device sync)
# Checks and removes exemptions for employees using biometric attendance
0 6 * * * cd "$PROJECT_DIR" && "$NODE_PATH" scripts/daily-biometric-exemption-monitor.cjs >> logs/backup/exemption-monitor.log 2>&1

# Daily Backup System - 00:15 AM (15 minutes after midnight)
# Backs up previous day's attendance and employee data
15 0 * * * cd "$PROJECT_DIR" && "$NODE_PATH" scripts/daily-backup-system.cjs >> logs/backup/daily-backup.log 2>&1

# Monthly Backup System - Last day of month at 23:45
# Creates comprehensive SQL dump and compressed monthly archive
45 23 L * * cd "$PROJECT_DIR" && "$NODE_PATH" scripts/monthly-backup-system.cjs >> logs/backup/monthly-backup.log 2>&1

# Log cleanup - Sunday 3:00 AM
# Keeps last 60 days of backup logs
0 3 * * 0 find "$PROJECT_DIR/logs/backup" -name "*.log" -mtime +60 -delete 2>/dev/null

EOF

# Install the new crontab
crontab "$TEMP_CRON"

# Clean up temporary file
rm "$TEMP_CRON"

echo ""
echo "✅ COMPREHENSIVE BACKUP SYSTEM INSTALLED"
echo "========================================"
echo ""
echo "📅 SCHEDULED TASKS:"
echo "   05:30 Daily - Device Synchronization"
echo "   06:00 Daily - Biometric Exemption Monitor"  
echo "   00:15 Daily - Daily Data Backup (previous day)"
echo "   23:45 Monthly - Monthly Comprehensive Backup (last day)"
echo "   03:00 Sunday - Log Cleanup (60 days retention)"
echo ""
echo "📁 BACKUP LOCATIONS:"
echo "   Daily Backups: $PROJECT_DIR/backups/daily-backups/"
echo "   Monthly Backups: $PROJECT_DIR/backups/monthly-backups/"
echo ""
echo "📋 LOG FILES:"
echo "   Device Sync: $PROJECT_DIR/logs/backup/device-sync.log"
echo "   Exemption Monitor: $PROJECT_DIR/logs/backup/exemption-monitor.log"
echo "   Daily Backup: $PROJECT_DIR/logs/backup/daily-backup.log"
echo "   Monthly Backup: $PROJECT_DIR/logs/backup/monthly-backup.log"
echo ""
echo "🔍 VIEW CURRENT CRONTAB:"
echo "   crontab -l"
echo ""
echo "📊 MANUAL TESTING:"
echo "   Device Sync: node scripts/daily-device-sync.js"
echo "   Exemption Monitor: node scripts/daily-biometric-exemption-monitor.js"
echo "   Daily Backup: node scripts/daily-backup-system.js"
echo "   Monthly Backup: node scripts/monthly-backup-system.js"
echo ""

# Show current crontab for verification
echo "🔍 CURRENT BACKUP CRONTAB:"
echo "=========================="
crontab -l | grep -E "(BACKUP|backup|device|exemption|scripts/)"

echo ""
echo "🎯 BACKUP SYSTEM SETUP COMPLETE!"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "   • Ensure .env file contains DATABASE_URL and SENDGRID_API_KEY"
echo "   • Daily backups run at 00:15 for previous day"
echo "   • Monthly backups run at 23:45 on last day of month"  
echo "   • Failed backups automatically email naeemhaq1@gmail.com"
echo "   • Backup folders excluded from Docker deployment"
echo "   • Test all scripts manually before relying on cron execution"
echo ""
echo "💾 BACKUP RETENTION:"
echo "   • Daily backups: 30 days"
echo "   • Monthly backups: 24 months"
echo "   • Logs: 60 days"
echo ""
echo "🔧 TROUBLESHOOTING:"
echo "   • Check cron service: sudo systemctl status cron"
echo "   • View backup logs: tail -f logs/backup/*.log"
echo "   • Test manually: cd $PROJECT_DIR && node scripts/daily-backup-system.js"
echo "   • Check pg_dump availability: which pg_dump"