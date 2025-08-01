
# NEXLINX EMS - Backup Preparation Guide

## Critical Issues to Prevent

### 1. React Hook Dispatcher Errors
**Problem**: `TypeError: can't access property "useRef", dispatcher is null`
**Root Cause**: Multiple React instances or incorrect module resolution

### 2. Module Resolution Issues
**Problem**: Vite cannot resolve `@shared` imports
**Root Cause**: Incorrect path aliases or file system restrictions

## Pre-Backup Checklist

### A. Verify Module Structure
```bash
# 1. Ensure shared directory exists at project root
ls -la shared/

# 2. Verify shared/index.ts exports all necessary modules
cat shared/index.ts

# 3. Check that all shared modules have proper exports
grep -r "export" shared/
```

### B. Validate Configuration Files

#### 1. Check vite.config.ts
Ensure it contains:
```typescript
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, 'shared'),
    '@': path.resolve(__dirname, 'client/src')
  }
},
server: {
  fs: {
    allow: ['..', '.']  // Critical for cross-directory access
  }
}
```

#### 2. Check tsconfig.json
Ensure it contains:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

### C. Create Essential Files

#### 1. shared/index.ts (Central Export)
```typescript
// Export all shared modules
export * from './schema';
export * from './versioning';
export * from './departmentFieldConfig';
export * from './departmentGroups';
export * from './geofenceSchema';
export * from './jobSites';
export * from './location-schema';
export * from './version';
export * from './whatsappSchema';
```

#### 2. Component Import Verification
Check that components import from shared correctly:
```typescript
// ✅ Correct
import { ComponentVersion } from '@shared/versioning';
import { UserSchema } from '@shared/schema';

// ❌ Incorrect (causes dispatcher errors)
import { ComponentVersion } from '../../../shared/versioning';
```

## Backup Preparation Commands

### 1. Pre-Backup Validation
```bash
# Clear any cached dependencies
rm -rf node_modules/.vite
npm run build --dry-run

# Test module resolution
node -e "console.log(require.resolve('./shared/index.ts'))"

# Verify React version consistency
npm list react react-dom
```

### 2. Dependencies Cleanup
```bash
# Remove problematic cache
rm -rf node_modules/.vite
rm -rf dist/
rm -rf client/dist/

# Reinstall with clean slate
npm ci
```

### 3. Environment Preparation
```bash
# Create .env.backup with essential variables
cp .env .env.backup

# Ensure DATABASE_URL is properly formatted
echo "DATABASE_URL=postgresql://username:password@localhost:5432/nexlinx_ems" >> .env.example
```

## Critical Files to Include in Backup

### Essential Configuration Files
- `vite.config.ts` - Module resolution configuration
- `tsconfig.json` - TypeScript path mapping
- `package.json` - Dependency versions
- `package-lock.json` - Exact dependency tree
- `.env.example` - Environment template

### Shared Module Structure
- `shared/index.ts` - Central export file
- `shared/schema.ts` - Database schemas
- `shared/versioning.ts` - Version management
- All other shared/*.ts files

### React Components
- Ensure all components in `client/src/components/` use `@shared` imports
- Verify `client/src/main.tsx` and `client/src/App.tsx` are properly configured

## Installation Instructions for Backup

### 1. Dependencies Installation
```bash
# Install with exact versions from lock file
npm ci

# Verify no React version conflicts
npm ls react react-dom
```

### 2. Module Resolution Test
```bash
# Test shared module imports
node -e "
try {
  require('./shared/index.ts');
  console.log('✅ Shared modules accessible');
} catch(e) {
  console.log('❌ Shared module error:', e.message);
}
"
```

### 3. Development Server Test
```bash
# Start with verbose output to catch issues early
npm run dev -- --debug

# Check for specific errors:
# - React Hook dispatcher errors
# - Module resolution failures
# - WebSocket connection issues
```

## Troubleshooting Quick Fixes

### If React Hook Errors Occur:
```bash
# 1. Clear all caches
rm -rf node_modules/.vite dist/ client/dist/

# 2. Reinstall dependencies
npm ci

# 3. Check for duplicate React instances
npm ls react
```

### If Module Resolution Fails:
```bash
# 1. Verify shared directory exists
ls -la shared/

# 2. Check vite.config.ts has correct alias
grep -A 5 "alias:" vite.config.ts

# 3. Restart development server
npm run dev
```

## Production Deployment Notes

### For Replit Deployment:
1. Ensure `.replit` file includes all necessary files
2. Set deployment command: `npm run build && npm start`
3. Configure ports properly (5000 for main interface)
4. Test WebSocket connections work in production

### Environment Variables:
- `DATABASE_URL` - Properly formatted PostgreSQL connection
- `NODE_ENV=production` for production builds
- All WhatsApp API keys and tokens

## Backup Verification Checklist

Before considering backup complete:

- [ ] `npm ci` runs without errors
- [ ] `npm run build` completes successfully
- [ ] `npm run dev` starts without React Hook errors
- [ ] All `@shared` imports resolve correctly
- [ ] WebSocket connections establish properly
- [ ] Database connection works
- [ ] All services start on correct ports

## Emergency Recovery Commands

If backup deployment fails:

```bash
# 1. Emergency cache clear
rm -rf node_modules/.vite dist/ client/dist/

# 2. Force dependency reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Manual module resolution fix
cd shared && npm link
cd ../client && npm link shared

# 4. Restart with clean environment
npm run dev
```

---

**Note**: This guide specifically addresses the React Hook dispatcher and module resolution issues encountered. Following this checklist will prevent the "TypeError: can't access property useRef, dispatcher is null" errors and ensure proper `@shared` module imports in future deployments.
