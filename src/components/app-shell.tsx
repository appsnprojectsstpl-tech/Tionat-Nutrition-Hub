'use client';

import { MobileHeader } from './mobile-header';
import { BottomNav } from './bottom-nav';
import { DesktopHeader } from './desktop-header';
import { OfflineBanner } from './offline-banner';
import { cn } from '@/lib/utils';
import { ShoppingCart, Home, Search, User, Menu } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFCM } from '@/hooks/use-fcm';
import { FlashSaleBanner } from './flash-sale-banner';
import { SupportWidget } from './support-widget';
import { ErrorBoundary } from './error-boundary';
// import { Footer } from './footer';

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter(); // Added router import
    useFCM(); // Initialize Push Notifications
    const capacitorInitialized = useRef(false);

    // Hide shell on specific routes (e.g. login, admin)
    const isAdminRoute = pathname?.startsWith('/admin');

    useEffect(() => {
        if (capacitorInitialized.current) return; // Prevent duplicate initialization

        // Fix for Bug 4: Gesture Control / Back Button
        import('@capacitor/app').then(({ App }) => {
            App.addListener('backButton', ({ canGoBack }) => {
                if (canGoBack) {
                    window.history.back();
                } else {
                    App.exitApp();
                }
            });
            capacitorInitialized.current = true;
        });

        return () => {
            import('@capacitor/app').then(({ App }) => {
                App.removeAllListeners();
                capacitorInitialized.current = false;
            });
        }
    }, []);

    if (isAdminRoute) {
        return (
            <>
                <main className="min-h-screen bg-muted/40">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
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
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </main>

            {/* Desktop Footer Removed per Mobile App requirements */}
            {/* <div className="hidden md:block">
                <Footer />
            </div> */}

            <OfflineBanner />

            <div className="md:hidden">
                <BottomNav />
            </div>

            <SupportWidget />
        </>
    );
}
