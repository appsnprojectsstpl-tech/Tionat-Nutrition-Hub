# Automated Pipeline Documentation

## Overview

This project uses automated pipelines for continuous integration and deployment. The pipelines handle version management, building, and releasing both web and mobile applications.

## Pipeline Components

### 1. Version Management

**Script**: `scripts/version-bump.js`

Automatically increments version numbers across:
- `package.json`
- `android/app/build.gradle` (versionCode and versionName)
- `src/hooks/use-app-version.tsx`
- Generates `version.json` for mobile app update checks

**Usage**:
```bash
npm run bump              # Patch version (1.0.0 -> 1.0.1)
node scripts/version-bump.js minor  # Minor version (1.0.0 -> 1.1.0)
node scripts/version-bump.js major  # Major version (1.0.0 -> 2.0.0)
```

### 2. Version JSON Generator

**Script**: `scripts/generate-version-json.js`

Generates `version.json` file containing:
- Current version number
- Version code (from Android build.gradle)
- Release date
- Download URL for APK
- Release notes URL

**Output Locations**:
- `public/version.json` - Included in web builds
- `version.json` - Uploaded to GitHub releases

**Usage**:
```bash
npm run generate:version
```

### 3. Local Release Automation

**Script**: `scripts/release-complete.js`

Automated release process that:
1. Bumps version number
2. Builds web app
3. Syncs Capacitor
4. Generates version.json
5. Builds signed Android APK
6. Publishes to GitHub (if GITHUB_TOKEN is set)

**Usage**:
```bash
npm run release:auto
```

**Prerequisites**:
- `GITHUB_TOKEN` environment variable (in `.env` file)
- Android keystore configured at `android/keystore.properties`

### 4. GitHub Release Publisher

**Script**: `scripts/publish-github.js`

Publishes releases to GitHub with:
- APK file
- version.json file
- Auto-generated release notes

**Usage**:
```bash
# Called automatically by release-complete.js
node scripts/publish-github.js
```

## GitHub Actions Workflows

### Web Deployment (`deploy.yml`)

**Trigger**: Push to `main` branch or manual dispatch

**Jobs**:
1. **web-deploy**: Builds and deploys to GitHub Pages
   - Generates version.json
   - Builds Next.js with GitHub Pages basePath
   - Deploys to `gh-pages` branch

2. **mobile-build**: Builds debug APK
   - Generates version.json
   - Builds Next.js without basePath
   - Syncs Capacitor
   - Builds debug APK
   - Uploads APK as artifact

**Web URL**: https://appsnprojectsstpl-tech.github.io/Tionat-Nutrition-Hub/

### Android Release (`android-release.yml`)

**Trigger**: Push tag matching `v*` (e.g., `v1.0.38`)

**Process**:
1. Checkout code
2. Setup Node.js, Java, and Android SDK
3. Install dependencies
4. Build Next.js app
5. Sync Capacitor
6. Generate version.json
7. Decode keystore from secrets
8. Build signed release APK
9. Create GitHub release with APK and version.json

**Release Assets**:
- `tionat-nutrition-hub-v*.apk` - Signed APK
- `version.json` - Version metadata for app updates

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### Android Signing
- `ANDROID_KEYSTORE_BASE64` - Base64 encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD` - Keystore password
- `ANDROID_KEY_ALIAS` - Key alias
- `ANDROID_KEY_PASSWORD` - Key password

### Firebase Configuration
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Mobile App Update Notifications

The mobile app checks for updates by:
1. Fetching `version.json` from the latest GitHub release
2. Comparing with the installed app version
3. Showing update notification if newer version available
4. Linking to GitHub release page for download

**Implementation**: `src/hooks/use-app-version.tsx`

## Workflow Examples

### Creating a New Release

1. **Automatic (Recommended)**:
   ```bash
   npm run release:auto
   ```
   This will bump version, build, and publish everything.

2. **Manual**:
   ```bash
   # 1. Bump version
   npm run bump
   
   # 2. Commit changes
   git add .
   git commit -m "Release v1.0.38"
   
   # 3. Create and push tag
   git tag v1.0.38
   git push origin main --tags
   ```
   
   GitHub Actions will automatically build and release.

### Testing Workflows Locally

```bash
# Test version bump
npm run bump

# Test version.json generation
npm run generate:version

# Verify generated files
cat version.json
cat public/version.json
```

## Troubleshooting

### Issue: APK not signed properly
**Solution**: Verify `android/keystore.properties` exists and contains:
```properties
storeFile=release.keystore
storePassword=YOUR_PASSWORD
keyAlias=YOUR_ALIAS
keyPassword=YOUR_PASSWORD
```

### Issue: GitHub Actions failing on build
**Solution**: Check that all Firebase secrets are configured in GitHub repository settings.

### Issue: Mobile app not showing update notification
**Solution**: 
1. Verify `version.json` is uploaded to GitHub release
2. Check app has internet permission
3. Verify version number in app is lower than release version

### Issue: version.json not found
**Solution**: Run `npm run generate:version` before building or releasing.

## Maintenance

### Updating Action Versions
GitHub Actions are configured to use:
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/setup-java@v4`
- `android-actions/setup-android@v3`
- `softprops/action-gh-release@v1`
- `peaceiris/actions-gh-pages@v4`

Check for updates periodically and test before updating.

### Keystore Management
- Keep keystore file secure and backed up
- Never commit keystore to version control
- Store `ANDROID_KEYSTORE_BASE64` secret securely
- Rotate keys according to security best practices
