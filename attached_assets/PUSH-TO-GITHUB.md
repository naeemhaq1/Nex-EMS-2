# Push Mobile App to GitHub for Auto-Build

## Current Status
Your mobile app is ready but needs to be pushed to GitHub to trigger the automatic build.

## Steps to Trigger Build

### 1. Prepare Mobile App for GitHub
```bash
# Create deployment package
tar -czf nexlinx-mobile-app-ready.tar.gz nexlinx-mobile-standalone/
```

### 2. Add to Your GitHub Repository
```bash
# Navigate to your GitHub repo directory
cd /path/to/nex-ems-web

# Copy mobile app
cp -r nexlinx-mobile-standalone/ .

# Add files
git add nexlinx-mobile-standalone/
git add .github/workflows/build-mobile-apk.yml

# Commit
git commit -m "Add Nexlinx EMS mobile app with auto-build"

# Push to trigger build
git push origin main
```

### 3. Set Up GitHub Secrets (Required)
Before the build works, add this secret to your GitHub repo:

1. Go to: https://expo.dev/settings/access-tokens
2. Create token named "GitHub Actions"
3. In GitHub repo: Settings → Secrets → Add `EXPO_TOKEN`

### 4. Monitor Build
- Go to: https://github.com/naeemhaq1/Nex-EMS-Web/actions
- Watch the "Build Nexlinx Mobile APK" workflow
- Download APK from artifacts when complete

## Build Will Auto-Trigger When:
- You push changes to `nexlinx-mobile-standalone/` folder
- Someone creates a PR affecting mobile app
- You manually trigger from Actions tab

## Your Mobile App Configuration
- **API**: https://nex-ems.replit.app
- **Package**: com.nexlinx.ems  
- **Native**: React Native (not webview)
- **Features**: Employee auth, attendance, role UI

The build process will create an installable APK for Android devices.