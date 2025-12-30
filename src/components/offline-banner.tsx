'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // Initial check
        setIsOffline(!navigator.onLine);

        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold text-sm">
                <WifiOff className="h-4 w-4" />
                <span>No Internet Connection. Trying to reconnect...</span>
            </div>
        </div>
    );
}
