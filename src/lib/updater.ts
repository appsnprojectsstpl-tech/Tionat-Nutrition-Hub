import { Capacitor } from '@capacitor/core';
import packageJson from '../../package.json';

interface Release {
    tag_name: string;
    html_url: string;
    body: string;
}

const GITHUB_REPO = "appsnprojectsstpl-tech/Tionat-Nutrition-Hub"; // Assuming repo pattern, can be config'd

export async function checkForUpdates(): Promise<{ hasUpdate: boolean, latestVersion: string, downloadUrl: string, releaseNotes: string } | null> {
    if (!Capacitor.isNativePlatform()) return null;

    try {
        // Public GitHub API (Rate limited to 60/hr per IP if unauth, usually fine for sporadic checks)
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);

        if (!response.ok) return null;

        const data: Release = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        const currentVersion = packageJson.version;

        if (compareVersions(latestVersion, currentVersion) > 0) {
            return {
                hasUpdate: true,
                latestVersion: latestVersion,
                downloadUrl: data.html_url, // Link to release page
                releaseNotes: data.body
            };
        }

        return null;

    } catch (error) {
        console.error("Update check failed", error);
        return null;
    }
}

function compareVersions(v1: string, v2: string): number {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}
