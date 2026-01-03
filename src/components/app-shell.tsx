'use client';

import { MobileHeader } from './mobile-header';
import { BottomNav } from './bottom-nav';
import { DesktopHeader } from './desktop-header';
import { OfflineBanner } from './offline-banner';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Fix for Bug 4: Gesture Control / Back Button
        import('@capacitor/app').then(({ App }) => {
            App.addListener('backButton', ({ canGoBack }) => {
                if (canGoBack) {
                    window.history.back();
                } else {
                    App.exitApp();
                }
            });
        });

        return () => {
            import('@capacitor/app').then(({ App }) => {
                App.removeAllListeners();
            });
        }
    }, []);

    return (
        <>
            <div className="md:hidden">
                <MobileHeader />
            </div>

            <div className="hidden md:block">
                <DesktopHeader />
            </div>

            <main className={cn(
                "min-h-screen",
                "pb-24", // Mobile bottom nav spacing
                "md:pb-0 md:pt-6" // Desktop spacing
            )}>
                {children}
            </main>

            <OfflineBanner />

            <div className="md:hidden">
                <BottomNav />
            </div>
        </>
    );
}
