const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
require('dotenv').config();

const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error("Error: GITHUB_TOKEN is not set.");
    process.exit(1);
}

// Get Repo
let repo = "appsnprojectsstpl-tech/Tionat-Nutrition-Hub";
try {
    const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();
    const match = remoteUrl.match(/github\.com[:\/](.+?)\/(.+?)(\.git)?$/);
    if (match) repo = `${match[1]}/${match[2]}`;
} catch (e) {
    console.warn("Could not detect repo from git config, using default:", repo);
}

const packageJson = require('../package.json');
const version = packageJson.version;
const tagName = `v${version}`;

const apkPath = path.join(__dirname, '../android/app/build/outputs/apk/release/app-release.apk');
if (!fs.existsSync(apkPath)) {
    console.error("APK not found at:", apkPath);
    process.exit(1);
}

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
    process.exit(1);
});

async function run() {
    try {
        console.log(`Creating Release ${tagName} for ${repo}...`);

        // 1. Create Release
        const release = await request('POST', `/repos/${repo}/releases`, {
            tag_name: tagName,
            target_commitish: 'main',
            name: tagName,
            body: 'Auto-generated release',
            draft: false,
            prerelease: false,
            generate_release_notes: true
        });

        console.log("Release created:", release.html_url);
        const uploadUrlTemplate = release.upload_url;
        const uploadUrlBase = uploadUrlTemplate.split('{')[0];

        // 2. Upload APK
        console.log("Uploading APK...");
        const apkName = `tionat-${tagName}.apk`;
        const apkStat = fs.statSync(apkPath);

        await uploadAssetStream(uploadUrlBase, apkName, apkPath, apkStat.size, 'application/vnd.android.package-archive');
        console.log("APK uploaded.");

        // 3. Upload version.json
        console.log("Uploading version.json...");
        const versionJsonPath = path.join(__dirname, '..', 'version.json');

        if (!fs.existsSync(versionJsonPath)) {
            console.warn("⚠️ version.json not found, generating it now...");
            const { generateVersionJson } = require('./generate-version-json');
            generateVersionJson();
        }

        const versionJsonContent = fs.readFileSync(versionJsonPath);
        await uploadAssetBuffer(uploadUrlBase, 'version.json', versionJsonContent, 'application/json');
        console.log("version.json uploaded.");

        console.log("Publishing Complete!");

    } catch (error) {
        console.error("Publish failed:", error);
        if (error.body) {
            console.error("Response Body:", error.body);
        }
        process.exit(1);
    }
}

function request(method, urlPath, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: urlPath,
            method: method,
            headers: {
                'User-Agent': 'Node.js Release Script',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
                } else {
                    reject({ statusCode: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

function uploadAssetBuffer(baseUrl, name, buffer, contentType) {
    const url = new URL(baseUrl);
    url.searchParams.append('name', name);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'User-Agent': 'Node.js Release Script',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': contentType,
                'Content-Length': buffer.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject({ statusCode: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        req.write(buffer);
        req.end();
    });
}

function uploadAssetStream(baseUrl, name, filePath, size, contentType) {
    const url = new URL(baseUrl);
    url.searchParams.append('name', name);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'User-Agent': 'Node.js Release Script',
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': contentType,
                'Content-Length': size
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject({ statusCode: res.statusCode, body });
                }
            });
        });

        req.on('error', reject);

        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', reject);
        fileStream.pipe(req);
    });
}

run();
