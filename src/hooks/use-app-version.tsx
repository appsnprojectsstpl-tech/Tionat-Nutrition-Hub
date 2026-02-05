'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import packageJson from '../../package.json';

interface UpdateStatus {
    updateAvailable: boolean;
    forceUpdate: boolean;
    currentVersion: string;
    newVersion: string;
    updateUrl: string;
    releaseNotes: string;
    isLoading: boolean;
    lastChecked: Date | null;
    checkVersion: () => Promise<void>;
}

export function useAppVersion(): UpdateStatus {
    const currentVersion = packageJson.version;
    const GITHUB_REPO = 'appsnprojectsstpl-tech/Tionat-Nutrition-Hub';
    const CHECK_INTERVAL = 1000 * 60 * 30; // Check every 30 mins

    const [updateStatus, setUpdateStatus] = useState<Omit<UpdateStatus, 'checkVersion'>>({
        updateAvailable: false,
        forceUpdate: false,
        currentVersion: currentVersion,
        newVersion: '',
        updateUrl: '',
        releaseNotes: '',
        isLoading: true,
        lastChecked: null
    });

    const checkVersion = useCallback(async () => {
        setUpdateStatus(prev => ({ ...prev, isLoading: true }));
        try {
            // Add cache busting to ensure fresh results
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest?t=${new Date().getTime()}`);

            if (!response.ok) {
                if (response.status === 403) {
                    console.warn("GitHub API rate limit exceeded for update check.");
                } else if (response.status === 404) {
                    console.info("No releases found in GitHub repo.");
                }
                setUpdateStatus(prev => ({ ...prev, isLoading: false, lastChecked: new Date() }));
                return;
            }

            const data = await response.json();
            const latestVersion = data.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
            const needsUpdate = compareVersions(currentVersion, latestVersion) < 0;

            // Check for "FORCE_UPDATE" flag in release body text
            const isForceUpdate = data.body?.includes('[FORCE_UPDATE]') || false;

            // Find APK Asset
            const apkAsset = data.assets?.find((asset: any) => asset.name.endsWith('.apk'));
            const downloadUrl = apkAsset ? apkAsset.browser_download_url : data.html_url;

            setUpdateStatus({
                updateAvailable: needsUpdate,
                forceUpdate: isForceUpdate,
                currentVersion,
                newVersion: latestVersion,
                updateUrl: downloadUrl,
                releaseNotes: data.body || 'New version available',
                isLoading: false,
                lastChecked: new Date()
            });
        } catch (error) {
            console.error("Update check failed:", error);
            setUpdateStatus(prev => ({ ...prev, isLoading: false, lastChecked: new Date() }));
        }
    }, [currentVersion]);

    useEffect(() => {
        checkVersion();
        const interval = setInterval(checkVersion, CHECK_INTERVAL);
        return () => clearInterval(interval);
    }, [checkVersion]);

    return useMemo(() => ({ ...updateStatus, checkVersion }), [updateStatus, checkVersion]);
}

// Compare semantic versions (e.g., "1.0.0" vs "1.1.0")
// Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 < num2) return -1;
        if (num1 > num2) return 1;
    }

    return 0;
}
