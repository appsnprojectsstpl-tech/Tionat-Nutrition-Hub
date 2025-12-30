const fs = require('fs');
const path = require('path');

// Paths
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');
const GRADLE_PATH = path.join(__dirname, '../android/app/build.gradle');
const VERSION_HOOK_PATH = path.join(__dirname, '../src/hooks/use-app-version.tsx');

// Helpers
function incrementVersion(version) {
    const parts = version.split('.').map(Number);
    parts[2] += 1; // Patch increment
    return parts.join('.');
}

function updatePackageJson() {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    const oldVersion = pkg.version;
    const newVersion = incrementVersion(oldVersion);
    pkg.version = newVersion;
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated package.json: ${oldVersion} -> ${newVersion}`);
    return newVersion;
}

function updateGradle(newVersion) {
    let gradleContent = fs.readFileSync(GRADLE_PATH, 'utf8');

    // Update versionCode (increment existing)
    const versionCodeRegex = /versionCode (\d+)/;
    const match = gradleContent.match(versionCodeRegex);
    if (match) {
        const oldCode = parseInt(match[1]);
        const newCode = oldCode + 1;
        gradleContent = gradleContent.replace(versionCodeRegex, `versionCode ${newCode}`);
        console.log(`Updated build.gradle versionCode: ${oldCode} -> ${newCode}`);
    }

    // Update versionName
    const versionNameRegex = /versionName "(.*?)"/;
    gradleContent = gradleContent.replace(versionNameRegex, `versionName "${newVersion}"`);
    console.log(`Updated build.gradle versionName -> ${newVersion}`);

    fs.writeFileSync(GRADLE_PATH, gradleContent);
}

function updateVersionHook(newVersion) {
    let hookContent = fs.readFileSync(VERSION_HOOK_PATH, 'utf8');

    // Update APP_VERSION constant
    const versionRegex = /const APP_VERSION = '(.*?)';/;
    hookContent = hookContent.replace(versionRegex, `const APP_VERSION = '${newVersion}';`);

    fs.writeFileSync(VERSION_HOOK_PATH, hookContent);
    console.log(`Updated use-app-version.tsx -> ${newVersion}`);
}

// Main
try {
    const newVersion = updatePackageJson();
    updateGradle(newVersion);
    updateVersionHook(newVersion);
    console.log(`Successfully bumped version to ${newVersion}`);
} catch (error) {
    console.error('Error bumping version:', error);
    process.exit(1);
}
