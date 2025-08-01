# NEXLINX EMS - Complete System Installation Guide

## 🚨 CRITICAL: Follow This Order to Prevent React Hook Errors

### Pre-Installation Validation Checklist

Before starting installation, verify these files exist:
- [ ] `vite.config.ts` - Module resolution configuration
- [ ] `tsconfig.json` - TypeScript path mapping  
- [ ] `package.json` - Dependency versions
- [ ] `package-lock.json` - Exact dependency tree
- [ ] `shared/index.ts` - Central export file (CRITICAL!)
- [ ] `replit.md` - Project documentation

## Step 1: Environment Setup

```bash
# 1. Extract backup to new directory
mkdir nexlinx-ems-restored
cd nexlinx-ems-restored

# 2. Copy all files from backup
cp -r /path/to/backup/* .

# 3. Verify shared/index.ts exists and has content
cat shared/index.ts
# Should show: export * from './schema'; etc.
```

## Step 2: Dependencies Installation (CRITICAL ORDER)

```bash
# 1. Clear any existing cache/builds
rm -rf node_modules/.vite
rm -rf dist/
rm -rf client/dist/

# 2. Install dependencies with EXACT versions
npm ci

# 3. Verify React version consistency (MUST be 18.3.1)
npm list react react-dom
# All should show: react@18.3.1
```

## Step 3: Module Resolution Verification

```bash
# 1. Test shared module accessibility
node -e "
try {
  require('./shared/index.ts');
  console.log('✅ Shared modules accessible');
} catch(e) {
  console.log('❌ Shared module error:', e.message);
}
"

# 2. Verify vite config has correct aliases
grep -A 10 "alias:" vite.config.ts
# Should show: '@shared': path.resolve(...)
```

## Step 4: Database Setup

```bash
# 1. Create .env file from template
cp .env.template .env

# 2. Configure database connection
# Edit .env and set:
# DATABASE_URL=postgresql://username:password@host:port/database

# 3. Push database schema
npm run db:push
```

## Step 5: Build Verification

```bash
# 1. Test build process
npm run build

# 2. If build fails with React Hook errors:
rm -rf node_modules/.vite
rm -rf node_modules/.cache
npm ci
npm run build
```

## Step 6: Development Server Start

```bash
# Start development server
npm run dev

# The server should start without:
# ❌ React Hook dispatcher errors
# ❌ Module resolution failures
# ❌ WebSocket connection issues
```

## Expected Port Configuration

- **Port 5000**: Main web interface and general APIs
- **Port 5001**: Core services (attendance, monitoring, backup, polling)  
- **Port 5002**: WhatsApp services (messaging, chatbot, monitoring, contacts)

## Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Production mode (set for production deployment)
NODE_ENV=production

# WhatsApp Business API (if using WhatsApp features)
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

## Troubleshooting Common Issues

### React Hook Dispatcher Error
```
TypeError: can't access property "useRef", dispatcher is null
```

**Solution:**
```bash
# 1. Clear all caches
rm -rf node_modules/.vite dist/ client/dist/

# 2. Reinstall dependencies
npm ci

# 3. Verify no duplicate React instances
npm ls react
```

### Module Resolution Error
```
Failed to resolve import "@shared/schema"
```

**Solution:**
```bash
# 1. Verify shared/index.ts exists
ls -la shared/index.ts

# 2. Check vite.config.ts aliases
grep -A 5 "alias:" vite.config.ts

# 3. Restart dev server
npm run dev
```

### Build Failures

```bash
# Emergency recovery commands:
rm -rf node_modules/.vite dist/ client/dist/
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Production Deployment

### For Replit:
1. Ensure all files are in repository
2. Set environment variables in Replit Secrets
3. Use deployment command: `npm run build && npm start`
4. Configure WebSocket connections for production

### For Other Platforms:
1. Set `NODE_ENV=production` 
2. Configure proper database URL
3. Set up process manager (PM2, systemd)
4. Configure reverse proxy (nginx)

## System Architecture Summary

### Three-Tier Architecture:
- **Frontend**: React + Vite (client/)
- **Backend**: Express.js + PostgreSQL (server/)
- **Shared**: Common schemas and utilities (shared/)

### Key Features:
- Employee management with biometric integration
- WhatsApp Business API integration
- Real-time attendance tracking
- Advanced analytics and reporting
- Mobile-responsive design

## Verification Checklist

After installation, verify:
- [ ] Application starts without errors
- [ ] All pages load correctly
- [ ] Database connection works
- [ ] Search functionality works
- [ ] All 309 employees visible in reports
- [ ] WhatsApp services operational (if configured)
- [ ] Mobile responsiveness working

## Support

If issues persist:
1. Check browser console for specific errors
2. Review server logs for backend issues
3. Verify environment variables are set
4. Ensure database is accessible
5. Check firewall/network configuration

---

**BACKUP GENERATED**: $(date)
**SYSTEM STATUS**: All modules validated and ready for deployment
**CRITICAL FILES**: All essential configurations included