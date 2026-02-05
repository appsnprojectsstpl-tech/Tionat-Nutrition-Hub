const fs = require('fs');
const path = require('path');

/**
 * Generate version.json file for mobile app update checks
 * This file is used by the app to check for new versions on GitHub
 */
function generateVersionJson() {
    try {
        // Read current version from package.json
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const version = packageJson.version;

        // Prepare version data
        const versionData = {
            version: version,
            versionCode: null, // Will be populated from build.gradle if available
            releaseDate: new Date().toISOString(),
            downloadUrl: `https://github.com/appsnprojectsstpl-tech/Tionat-Nutrition-Hub/releases/download/v${version}/tionat-v${version}.apk`,
            releaseNotesUrl: `https://github.com/appsnprojectsstpl-tech/Tionat-Nutrition-Hub/releases/tag/v${version}`
        };

        // Try to read versionCode from build.gradle
        const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
        if (fs.existsSync(buildGradlePath)) {
            const gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
            const versionCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);
            if (versionCodeMatch) {
                versionData.versionCode = parseInt(versionCodeMatch[1]);
            }
        }

        // Write to public directory (for web builds)
        const publicDir = path.join(__dirname, '..', 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        const publicVersionPath = path.join(publicDir, 'version.json');
        fs.writeFileSync(publicVersionPath, JSON.stringify(versionData, null, 2) + '\n');
        console.log(`✅ Generated version.json in public/: v${version} (code: ${versionData.versionCode})`);

        // Also write to root for GitHub releases
        const rootVersionPath = path.join(__dirname, '..', 'version.json');
        fs.writeFileSync(rootVersionPath, JSON.stringify(versionData, null, 2) + '\n');
        console.log(`✅ Generated version.json in root: v${version}`);

        return versionData;
    } catch (error) {
        console.error('❌ Error generating version.json:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    generateVersionJson();
}

module.exports = { generateVersionJson };
