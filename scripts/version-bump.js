const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

function bumpVersion(type = 'patch') {
    // 1. Update package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const oldVersion = packageJson.version;
    const parts = oldVersion.split('.').map(Number);

    if (type === 'patch') parts[2]++;
    else if (type === 'minor') { parts[1]++; parts[2] = 0; }
    else if (type === 'major') { parts[0]++; parts[1] = 0; parts[2] = 0; }

    const newVersion = parts.join('.');
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated package.json: ${oldVersion} -> ${newVersion}`);

    // 2. Update android/app/build.gradle
    if (fs.existsSync(buildGradlePath)) {
        let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');

        // Update versionName
        const versionNameRegex = /versionName "([0-9.]+)"/;
        gradleContent = gradleContent.replace(versionNameRegex, `versionName "${newVersion}"`);

        // Update versionCode (increment by 1)
        const versionCodeRegex = /versionCode (\d+)/;
        const match = gradleContent.match(versionCodeRegex);
        if (match) {
            const newVersionCode = parseInt(match[1]) + 1;
            gradleContent = gradleContent.replace(versionCodeRegex, `versionCode ${newVersionCode}`);
            console.log(`Updated build.gradle: versionCode ${match[1]} -> ${newVersionCode}, versionName -> ${newVersion}`);
        }

        fs.writeFileSync(buildGradlePath, gradleContent);
    }

    return newVersion;
}

const type = process.argv[2] || 'patch';
const newVersion = bumpVersion(type);

// Generate version.json after bumping
console.log('\n📄 Generating version.json...');
try {
    const { generateVersionJson } = require('./generate-version-json');
    generateVersionJson();
} catch (error) {
    console.warn('⚠️ Failed to generate version.json:', error.message);
}
