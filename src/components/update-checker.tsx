'use client';

import { useAppVersion } from '@/hooks/use-app-version';
import { UpdateDialog } from './update-dialog';
import { useState, useEffect } from 'react';

export function UpdateChecker() {
    // Always call hooks unconditionally (React rule)
    const updateStatus = useAppVersion();
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        // Show dialog if update is available and not already shown this session
        if (updateStatus.updateAvailable && !updateStatus.isLoading) {
            const hasSeenUpdate = sessionStorage.getItem(`update_seen_${updateStatus.newVersion}`);

            // For forced updates, always show. For optional, show once per session.
            if (updateStatus.forceUpdate || !hasSeenUpdate) {
                setDialogOpen(true);
                if (!updateStatus.forceUpdate) {
                    sessionStorage.setItem(`update_seen_${updateStatus.newVersion}`, 'true');
                }
            }
        }
    }, [updateStatus]);

    return (
        <UpdateDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            version={updateStatus.newVersion}
            releaseNotes={updateStatus.releaseNotes}
            updateUrl={updateStatus.updateUrl}
            forceUpdate={updateStatus.forceUpdate}
        />
    );
}
