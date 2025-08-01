# GitHub Actions APK Build Setup

## Current Status
Your GitHub repository is configured for automatic APK building with the updated workflow.

## Setup Required

### 1. Add Expo Token to GitHub Secrets
1. Go to: https://expo.dev/settings/access-tokens
2. Create a new token named "GitHub Actions"
3. Copy the token
4. In your GitHub repo: Settings → Secrets and Variables → Actions
5. Add new secret: `EXPO_TOKEN` with your token value

### 2. Push Your Mobile App
```bash
git add nexlinx-mobile-standalone/
git commit -m "Add Nexlinx EMS mobile app"
git push origin main
```

### 3. Trigger Build
The workflow will automatically trigger when:
- You push changes to `nexlinx-mobile-standalone/` folder
- You manually trigger it from Actions tab
- Someone creates a PR affecting the mobile app

### 4. Download APK
After successful build:
- Go to Actions tab in your GitHub repo
- Click on the latest workflow run
- Download the `nexlinx-ems-mobile-apk` artifact
- Extract and install the APK on Android devices

## Workflow Features
- Builds APK automatically on code changes
- Uploads APK as GitHub artifact
- Creates releases with downloadable APK
- Proper working directory for mobile app
- Uses latest Expo/EAS versions

## Your Mobile App
- **API Endpoint**: https://nex-ems.replit.app
- **Package Name**: com.nexlinx.ems
- **Features**: Employee auth, attendance, role-based UI
- **Build Profile**: Preview (creates installable APK)

The automatic build eliminates the need for manual EAS authentication!