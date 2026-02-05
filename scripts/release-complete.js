const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

const args = process.argv.slice(2);
const isAuto = args.includes('--auto');

if (!isAuto) {
    console.log("Currently only --auto mode is supported via this script wrapper.");
    process.exit(0);
}

try {
    // 1. Version Bump
    console.log("\n📈 Step 1/3: Version Bump...");
    execSync('node scripts/version-bump.js patch', { stdio: 'inherit' });

    // 2. Build Web App
    console.log("\n🌐 Step 2/5: Build Web App...");
    execSync('npm run build', { stdio: 'inherit' });

    // 3. Capacitor Sync
    console.log("\n🔄 Step 3/5: Capacitor Sync...");
    execSync('npx cap sync android', { stdio: 'inherit' });

    // 3.5. Generate version.json
    console.log("\n📄 Step 3.5/5: Generate version.json...");
    execSync('node scripts/generate-version-json.js', { stdio: 'inherit' });

    // 4. Build Signed APK
    console.log("\n📱 Step 4/5: Build Signed APK...");
    const isWin = process.platform === "win32";
    const gradlew = isWin ? 'gradlew.bat' : './gradlew';
    const androidDir = 'android';

    if (!fs.existsSync(androidDir)) {
        throw new Error("Android directory not found!");
    }

    execSync(`${gradlew} assembleRelease`, { cwd: androidDir, stdio: 'inherit' });

    // 5. Search & Publish
    console.log("\n☁️ Step 5/5: Search & Publish...");
    if (!process.env.GITHUB_TOKEN) {
        console.warn("⚠️ GITHUB_TOKEN not set. Skipping upload. APK is built locally.");
    } else {
        execSync('node scripts/publish-github.js', { stdio: 'inherit' });
    }

    console.log("\n✅ Release Automation Complete!");

} catch (error) {
    console.error("\n❌ Release Trigger Failed:", error.message);
    process.exit(1);
}
