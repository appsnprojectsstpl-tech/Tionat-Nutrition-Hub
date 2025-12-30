'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExternalLink, Sparkles } from 'lucide-react';

interface UpdateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    version: string;
    releaseNotes: string;
    updateUrl: string;
    forceUpdate: boolean;
}

export function UpdateDialog({
    open,
    onOpenChange,
    version,
    releaseNotes,
    updateUrl,
    forceUpdate,
}: UpdateDialogProps) {
    const handleUpdate = () => {
        // Open APK download URL in browser
        window.open(updateUrl, '_blank');

        // If not forced, allow closing
        if (!forceUpdate) {
            onOpenChange(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={forceUpdate ? undefined : onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <AlertDialogTitle className="text-lg">
                                {forceUpdate ? 'Critical Update Required ⚠️' : 'Update Available! 🎉'}
                            </AlertDialogTitle>
                            <p className="text-xs text-muted-foreground">Version {version}</p>
                        </div>
                    </div>
                    <AlertDialogDescription className="text-sm">
                        {forceUpdate ? (
                            <span className="text-destructive font-medium">
                                This update is required to continue using the app.
                            </span>
                        ) : (
                            'A new version is now available with improvements and bug fixes.'
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="my-4 p-4 bg-secondary/50 rounded-lg border border-border/50">
                    <h4 className="font-semibold text-sm mb-2">What's New:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {releaseNotes}
                    </p>
                </div>

                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    {!forceUpdate && (
                        <AlertDialogCancel className="mt-0">Later</AlertDialogCancel>
                    )}
                    <AlertDialogAction
                        onClick={handleUpdate}
                        className="bg-primary hover:bg-primary/90 gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Update Now
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
