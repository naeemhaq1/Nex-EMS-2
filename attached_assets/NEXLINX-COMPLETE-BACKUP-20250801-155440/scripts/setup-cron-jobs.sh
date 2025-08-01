#!/bin/bash

# Setup Cron Jobs for Daily Biometric Monitoring
# This script sets up automated daily tasks for biometric device management

echo "🔧 SETTING UP DAILY BIOMETRIC MONITORING CRON JOBS"
echo "=================================================="

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

# Create logs directory for cron job outputs
mkdir -p "$PROJECT_DIR/logs/cron"
echo "📋 Created logs directory: $PROJECT_DIR/logs/cron"

# Backup existing crontab
crontab -l > "$PROJECT_DIR/logs/cron/crontab_backup_$(date +%Y%m%d_%H%M%S).txt" 2>/dev/null || echo "# No existing crontab" > "$PROJECT_DIR/logs/cron/crontab_backup_$(date +%Y%m%d_%H%M%S).txt"
echo "💾 Backed up existing crontab"

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Preserve existing crontab entries (excluding our biometric monitoring jobs)
crontab -l 2>/dev/null | grep -v "# BIOMETRIC MONITORING" | grep -v "daily-device-sync.js" | grep -v "daily-biometric-exemption-monitor.js" > "$TEMP_CRON"

# Add our new cron jobs
cat >> "$TEMP_CRON" << EOF

# BIOMETRIC MONITORING - Daily Device and Exemption Management
# ============================================================

# Daily Device Sync - 5:30 AM (before exemption monitoring)
# Fetches latest device status from BioTime API
30 5 * * * cd "$PROJECT_DIR" && "$NODE_PATH" scripts/daily-device-sync.js >> logs/cron/device-sync.log 2>&1

# Daily Biometric Exemption Monitor - 6:00 AM (after device sync)
# Checks if exempted employees used biometric attendance and removes exemptions
0 6 * * * cd "$PROJECT_DIR" && "$NODE_PATH" scripts/daily-biometric-exemption-monitor.js >> logs/cron/exemption-monitor.log 2>&1

# Weekly log cleanup - Sunday 2:00 AM
# Keeps last 30 days of logs
0 2 * * 0 find "$PROJECT_DIR/logs/cron" -name "*.log" -mtime +30 -delete 2>/dev/null

EOF

# Install the new crontab
crontab "$TEMP_CRON"

# Clean up temporary file
rm "$TEMP_CRON"

echo ""
echo "✅ CRON JOBS INSTALLED SUCCESSFULLY"
echo "==================================="
echo ""
echo "📅 SCHEDULED TASKS:"
echo "   5:30 AM Daily - Device Synchronization"
echo "   6:00 AM Daily - Biometric Exemption Monitor"  
echo "   2:00 AM Sunday - Log Cleanup (30 days retention)"
echo ""
echo "📋 LOG FILES:"
echo "   Device Sync: $PROJECT_DIR/logs/cron/device-sync.log"
echo "   Exemption Monitor: $PROJECT_DIR/logs/cron/exemption-monitor.log"
echo ""
echo "🔍 VIEW CURRENT CRONTAB:"
echo "   crontab -l"
echo ""
echo "📊 MANUAL TESTING:"
echo "   Device Sync: node scripts/daily-device-sync.js"
echo "   Exemption Monitor: node scripts/daily-biometric-exemption-monitor.js"
echo ""

# Show current crontab for verification
echo "🔍 CURRENT CRONTAB:"
echo "=================="
crontab -l | grep -E "(BIOMETRIC|daily-device|daily-biometric|scripts/)"

echo ""
echo "🎯 SETUP COMPLETE!"
echo ""
echo "⚠️  IMPORTANT NOTES:"
echo "   • Ensure .env file contains DATABASE_URL"
echo "   • Scripts run in project directory context"
echo "   • Logs are written to logs/cron/ directory"
echo "   • Old logs are automatically cleaned up after 30 days"
echo "   • Test scripts manually before relying on cron execution"
echo ""
echo "🔧 TROUBLESHOOTING:"
echo "   • Check cron service: sudo systemctl status cron"
echo "   • View cron logs: tail -f logs/cron/*.log"
echo "   • Test manually: cd $PROJECT_DIR && node scripts/daily-device-sync.js"