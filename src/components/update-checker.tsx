'use client';

import { useAppVersion } from '@/hooks/use-app-version';
import { UpdateDialog } from './update-dialog';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function UpdateChecker() {
    // Always call hooks unconditionally (React rule)
    const updateStatus = useAppVersion();
    const [dialogOpen, setDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Show dialog if update is available and not already shown this session
        if (updateStatus.updateAvailable && !updateStatus.isLoading) {
            const hasSeenUpdate = sessionStorage.getItem(`update_seen_${updateStatus.newVersion}`);

            // For forced updates, always show. For optional, show once per session.
            if (updateStatus.forceUpdate || !hasSeenUpdate) {
                setDialogOpen(true);

                // Also show a toast for non-forced updates (less intrusive reminder)
                if (!updateStatus.forceUpdate) {
                    toast({
                        title: "Update Available 🚀",
                        description: `Version ${updateStatus.newVersion} is ready to install.`,
                        action: <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>View</Button>,
                        duration: 10000,
                    });
                    sessionStorage.setItem(`update_seen_${updateStatus.newVersion}`, 'true');
                }
            }
        }
    }, [updateStatus, toast]);

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
