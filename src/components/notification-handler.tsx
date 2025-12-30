'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/hooks/use-notifications';

export function NotificationHandler() {
    // Always call the hook (React rule: hooks must be called unconditionally)
    // The hook itself will handle client-side initialization
    useNotifications();

    // This component has no UI - it just sets up notification listeners
    return null;
}
