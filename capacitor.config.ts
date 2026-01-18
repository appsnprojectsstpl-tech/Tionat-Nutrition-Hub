import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.tionat.nutritionhub',
    appName: 'Tionat Nutrition Hub',
    webDir: 'out',
    server: {
        androidScheme: 'https',
        cleartext: true,
        // Force WebView to reload content
        hostname: 'localhost'
    },
    android: {
        // Clear WebView cache on app start
        webContentsDebuggingEnabled: true
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: "#ffffff",
            showSpinner: false
        },
        StatusBar: {
            style: "DARK",
            backgroundColor: "#4c1d95", // Matches brand
            overlay: false,
        },
        Keyboard: {
            resize: "body",
            style: "DARK",
            resizeOnFullScreen: true,
        },
    }
};

export default config;
