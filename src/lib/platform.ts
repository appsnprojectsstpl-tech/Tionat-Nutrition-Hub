/**
 * Utility to detect if the app is running in a Capacitor mobile environment
 */

export const isMobileApp = (): boolean => {
    if (typeof window === 'undefined') return false;

    // Check if Capacitor is available
    return !!(window as Window & { Capacitor?: unknown }).Capacitor;
};

export const isWebApp = (): boolean => {
    return !isMobileApp();
};
