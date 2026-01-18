'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';

interface AppVersion {
    currentVersion: string;
    minRequiredVersion: string;
    updateUrl: string;
    releaseNotes: string;
    forceUpdate: boolean;
}

interface UpdateStatus {
    updateAvailable: boolean;
    forceUpdate: boolean;
    currentVersion: string;
    newVersion: string;
    updateUrl: string;
    releaseNotes: string;
    isLoading: boolean;
}

const APP_VERSION = '1.0.15'; // From package.json

export function useAppVersion(): UpdateStatus {
    const firestore = useFirestore();
    const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
        updateAvailable: false,
        forceUpdate: false,
        currentVersion: APP_VERSION,
        newVersion: '',
        updateUrl: '',
        releaseNotes: '',
        isLoading: true,
    });

    const versionDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'app_config', 'version') : null),
        [firestore]
    );

    const { data: versionData, isLoading } = useDoc<AppVersion>(versionDocRef);

    useEffect(() => {
        if (!isLoading && versionData) {
            const serverVersion = versionData.currentVersion;
            const minRequired = versionData.minRequiredVersion;

            // Simple version comparison (assumes semantic versioning)
            const needsUpdate = compareVersions(APP_VERSION, serverVersion) < 0;
            const isForcedUpdate = compareVersions(APP_VERSION, minRequired) < 0;

            setUpdateStatus({
                updateAvailable: needsUpdate,
                forceUpdate: isForcedUpdate,
                currentVersion: APP_VERSION,
                newVersion: serverVersion,
                updateUrl: versionData.updateUrl || '',
                releaseNotes: versionData.releaseNotes || 'New version available',
                isLoading: false,
            });
        } else if (!isLoading) {
            setUpdateStatus(prev => ({ ...prev, isLoading: false }));
        }
    }, [versionData, isLoading]);

    return updateStatus;
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
