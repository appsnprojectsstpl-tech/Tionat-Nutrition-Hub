const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Release Build Process...');

const run = (cmd, cwd) => {
    console.log(`> Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd: cwd || process.cwd() });
};

try {
    // 0. Bump Version
    console.log('\n🔢 Step 0: Bumping Version...');
    run('npm run bump');
    const newVersion = require('../package.json').version;

    // 1. Build Web Assets
    console.log(`\n📦 Step 1: Building Web Assets (v${newVersion})...`);
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

    // 4. Archive APK
    console.log('\n📂 Step 4: Archiving APK...');
    const apkSource = path.join(process.cwd(), 'android/app/build/outputs/apk/release/app-release.apk');
    const releasesDir = path.join(process.cwd(), 'releases');
    if (!fs.existsSync(releasesDir)) fs.mkdirSync(releasesDir);

    const apkDest = path.join(releasesDir, `tionat-v${newVersion}.apk`);
    fs.copyFileSync(apkSource, apkDest);
    console.log(`APK archived to: ${apkDest}`);

    console.log('\n✅ Build Complete!');

    // 5. Git Push (with APK)
    console.log('\n🚀 Step 5: Pushing to GitHub...');
    try {
        run('git add .');
        run(`git commit -m "Release v${newVersion}: Auto-generated APK"`);
        run('git push origin main');
    } catch (e) {
        console.warn('Git push failed or nothing to commit. Continuing...');
    }

} catch (error) {
    console.error('\n❌ Build Failed:', error.message);
    process.exit(1);
}
