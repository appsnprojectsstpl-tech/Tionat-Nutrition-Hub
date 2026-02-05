import type { Metadata, Viewport } from 'next';
import './globals.css';

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

import { Outfit } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

import { AppProviders } from '@/providers/app-providers';
import { AppShell } from "@/components/app-shell";
import { MaintenanceGuard } from "@/components/maintenance-guard";
import { GlobalErrorGuard } from "@/components/global-error-guard";
import { PincodeGuard } from "@/components/pincode-guard";
import { UpdateChecker } from "@/components/update-checker";
import { NotificationHandler } from "@/components/notification-handler";

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
      <body className="font-body antialiased bg-background" suppressHydrationWarning>
        <AppProviders>
          <GlobalErrorGuard>
            <PincodeGuard />
            <MaintenanceGuard>
              <AppShell>
                {children}
              </AppShell>
            </MaintenanceGuard>
          </GlobalErrorGuard>
          <UpdateChecker />
          <NotificationHandler />
        </AppProviders>
      </body>
    </html>
  );
}
