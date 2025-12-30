'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { MobileHeader } from './mobile-header';
import { BottomNav } from './bottom-nav';
import { DesktopHeader } from './desktop-header';
import { OfflineBanner } from './offline-banner';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    // Hydration fix: Default to desktop or loading state if unsure, but for CSS responsive usually fine to just render both and hide via CSS?
    // User wants "Mobile-first".
    // Ideally we use CSS media queries to hide/show to avoid hydration mismatch.
    // However, useIsMobile is a hook.
    // Let's use CSS hidden/block for the headers to ensure SSR correctness.

    // Actually, standard practice for different layouts is often CSS media queries.
    // MobileHeader -> hidden md:block (wait, reverse, block md:hidden)
    // DesktopHeader -> hidden md:block
    // BottomNav -> hidden md:hidden (block only on small)

    // Let's do that to avoid complex hydration logic if possible.
    // But BottomNav is fixed.

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
