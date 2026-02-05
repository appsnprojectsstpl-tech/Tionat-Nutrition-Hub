'use client';

import { useAppVersion } from '@/hooks/use-app-version';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function AppUpdateCard() {
    const {
        currentVersion,
        updateAvailable,
        newVersion,
        updateUrl,
        isLoading,
        lastChecked,
        checkVersion
    } = useAppVersion();

    const handleUpdate = () => {
        if (updateUrl) {
            window.open(updateUrl, '_blank');
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="font-headline flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    App Updates
                </CardTitle>
                <CardDescription>Check for the latest version</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Current Version</p>
                        <p className="text-2xl font-bold font-headline">{currentVersion}</p>
                    </div>

                    {updateAvailable ? (
                        <Button onClick={handleUpdate} className="gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Download {newVersion}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={checkVersion}
                            disabled={isLoading}
                            className="gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            {isLoading ? 'Checking...' : 'Check for Updates'}
                        </Button>
                    )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1">
                        • Last checked: {lastChecked ? format(lastChecked, 'd/M/yyyy, h:mm:ss a') : 'Never'}
                    </p>
                    <p className="flex items-center gap-1">
                        • Build: Production
                    </p>
                    {!isLoading && !updateAvailable && lastChecked && (
                        <p className="text-green-600 flex items-center gap-1 mt-2">
                            <CheckCircle className="h-3 w-3" /> You are on the latest version.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
