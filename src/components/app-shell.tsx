'use client';

import { MobileHeader } from './mobile-header';
import { BottomNav } from './bottom-nav';
import { DesktopHeader } from './desktop-header';
import { OfflineBanner } from './offline-banner';
import { cn } from '@/lib/utils';
import { ShoppingCart, Home, Search, User, Menu } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFCM } from '@/hooks/use-fcm';
import { FlashSaleBanner } from './flash-sale-banner';
import { SupportWidget } from './support-widget';

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter(); // Added router import
    useFCM(); // Initialize Push Notifications

    // Hide shell on specific routes (e.g. login, admin)
    const isAdminRoute = pathname?.startsWith('/admin');

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

    if (isAdminRoute) {
        return (
            <>
                <main className="min-h-screen bg-muted/40">
                    {children}
                </main>
                <OfflineBanner />
            </>
        );
    }

    return (
        <>
            <FlashSaleBanner />
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

            <SupportWidget />
        </>
    );
}
