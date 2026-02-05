'use client';

import { useEffect, useState } from 'react';
import { checkForUpdates } from '@/lib/updater';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function UpdatePrompt() {
    const [update, setUpdate] = useState<{ latestVersion: string, downloadUrl: string, releaseNotes: string } | null>(null);

    useEffect(() => {
        const check = async () => {
            const result = await checkForUpdates();
            if (result && result.hasUpdate) {
                setUpdate(result);
            }
        };

        // Check on mount
        check();
    }, []);

    if (!update) return null;

    return (
        <Dialog open={!!update} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Available 🚀</DialogTitle>
                    <DialogDescription>
                        A new version ({update.latestVersion}) of the app is available.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[200px] overflow-y-auto bg-muted p-2 rounded text-sm">
                    <p className="font-semibold mb-1">What's New:</p>
                    <pre className="whitespace-pre-wrap font-sans">{update.releaseNotes}</pre>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setUpdate(null)}>
                        Skip
                    </Button>
                    <Button className="gap-2" onClick={() => window.open(update.downloadUrl, '_system')}>
                        <Download className="w-4 h-4" />
                        Download Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
