import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { CartProvider } from '@/hooks/use-cart';
import { AddressProvider } from '@/providers/address-provider';
import { WarehouseProvider } from '@/context/warehouse-context';
import { PincodeGuard } from '@/components/pincode-guard';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#4c1d95' }, // violet-900
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://tionat.com'),
  title: {
    default: 'Tionat Nutrition Hub | 10 Min Grocery Delivery',
    template: '%s | Tionat'
  },
  description: 'Order fresh groceries, healthy snacks, and daily essentials. Delivered in 10 minutes or less. Experience the speed of Tionat.',
  keywords: ['grocery', 'delivery', '10 minutes', 'instant', 'snacks', 'tionat', 'bangalore'],
  authors: [{ name: 'Tionat Team' }],
  creator: 'Tionat',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://tionat.com',
    title: 'Tionat | Groceries in 10 Mins',
    description: 'Fresh groceries delivered instantly. No minimum order.',
    siteName: 'Tionat Nutrition Hub',
    images: [
      {
        url: '/og-image.jpg', // We should ensure this exists later
        width: 1200,
        height: 630,
        alt: 'Tionat Delivery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tionat | 10 Min Grocery Delivery',
    description: 'Order fresh groceries, healthy snacks, and daily essentials.',
    creator: '@tionat',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

import { ThemeProvider } from "@/components/theme-provider";
import { UpdateChecker } from "@/components/update-checker";
import { NotificationHandler } from "@/components/notification-handler";


import { Outfit } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-geist-sans', // Mapping to the variable name we set in tailwind.config
  display: 'swap',
});

import { AppShell } from "@/components/app-shell";
import { MaintenanceGuard } from "@/components/maintenance-guard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`tionat ${outfit.variable}`}>
      <head>
        {/* Optimized for Production */}
      </head>
      <body className="font-body antialiased bg-background">
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
                  <PincodeGuard />
                  <MaintenanceGuard>
                    <AppShell>
                      {children}
                    </AppShell>
                  </MaintenanceGuard>

                </WarehouseProvider>
              </CartProvider>
            </AddressProvider>
          </FirebaseClientProvider>
          {/* Temporarily disabled due to static export issues */}
          {/* <UpdateChecker /> */}
          {/* <NotificationHandler /> */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
