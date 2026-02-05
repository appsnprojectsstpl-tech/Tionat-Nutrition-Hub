'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import { AddressProvider } from '@/providers/address-provider';
import { CartProvider } from '@/hooks/use-cart';
import { WarehouseProvider } from '@/context/warehouse-context';
import { Toaster } from '@/components/ui/toaster';

interface AppProvidersProps {
    children: ReactNode;
}

/**
 * Consolidated providers component to reduce nesting and improve readability
 * All app-level context providers are combined here
 */
export function AppProviders({ children }: AppProvidersProps) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <FirebaseClientProvider>
                <AddressProvider>
                    <CartProvider>
                        <WarehouseProvider>
                            {children}
                        </WarehouseProvider>
                    </CartProvider>
                </AddressProvider>
            </FirebaseClientProvider>
            <Toaster />
        </ThemeProvider>
    );
}
