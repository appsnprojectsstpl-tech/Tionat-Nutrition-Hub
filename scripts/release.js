const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Release Build Process...');

const run = (cmd, cwd) => {
    console.log(`> Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd: cwd || process.cwd() });
};

try {
    // 1. Build Web Assets
    console.log('\n📦 Step 1: Building Web Assets (Static Export)...');
    run('npm run export');

    // 2. Sync Capacitor
    console.log('\n📱 Step 2: Syncing Capacitor...');
    run('npx cap sync android');

    // 3. Build Android APK
    console.log('\n🤖 Step 3: Building Android Release APK...');
    const androidDir = path.join(process.cwd(), 'android');
    if (process.platform === 'win32') {
        run('gradlew.bat assembleRelease', androidDir);
    } else {
        run('./gradlew assembleRelease', androidDir);
    }

    console.log('\n✅ Build Complete!');
    console.log('APK Location: android/app/build/outputs/apk/release/app-release-unsigned.apk');

    // Optional: Git Push
    console.log('\n🚀 Step 4: Pushing to GitHub...');
    try {
        run('git add .');
        run('git commit -m "Automated Release Build: v' + require('../package.json').version + '"');
        run('git push origin main');
    } catch (e) {
        console.warn('Git push failed or nothing to commit. Continuing...');
    }

} catch (error) {
    console.error('\n❌ Build Failed:', error.message);
    process.exit(1);
}
