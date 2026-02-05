'use client';

import { useEffect, useState, useRef } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useFCM() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [token, setToken] = useState<string | null>(null);
    const initializingRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !user || !firestore) return;
        if (initializingRef.current) return; // Prevent duplicate initialization

        // Defer FCM initialization to avoid blocking UI
        const timer = setTimeout(async () => {
            initializingRef.current = true;

            try {
                // Check if permission already granted
                if (Notification.permission === 'granted') {
                    const messaging = getMessaging();
                    const currentToken = await getToken(messaging);

                    if (currentToken) {
                        setToken(currentToken);
                        // Save to Firestore (non-blocking)
                        updateDoc(doc(firestore, 'users', user.uid), {
                            fcmToken: currentToken
                        }).catch(err => console.log('FCM token save failed', err));
                    }
                }
                // Don't request permission automatically - let user trigger it
            } catch (error) {
                console.log('FCM initialization error', error);
            }
        }, 3000); // Delay 3 seconds to let app load first

        return () => {
            clearTimeout(timer);
            initializingRef.current = false;
        };
    }, [user, firestore]);

    // Foreground Listener
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const messaging = getMessaging();
            const unsubscribe = onMessage(messaging, (payload) => {
                toast({
                    title: payload.notification?.title || 'New Message',
                    description: payload.notification?.body,
                });
            });
            return () => unsubscribe();
        } catch (e) {
            // Messaging maybe not supported
        }
    }, [toast]);

    return token;
}
