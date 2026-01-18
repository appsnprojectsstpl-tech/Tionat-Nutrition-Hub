'use client';

import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useUser, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useFCM() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !user || !firestore) return;

        const requestPermission = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    const messaging = getMessaging(); // Assumes initialized
                    const currentToken = await getToken(messaging, {
                        vapidKey: 'YOUR_VAPID_KEY_HERE_IF_NEEDED' // Optional if using default config
                    });

                    if (currentToken) {
                        setToken(currentToken);
                        // Save to Firestore
                        await updateDoc(doc(firestore, 'users', user.uid), {
                            fcmToken: currentToken
                        });
                    }
                }
            } catch (error) {
                console.log('FCM Permission denied or error', error);
            }
        };

        requestPermission();
    }, [user, firestore]);

    // Foreground Listener
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const messaging = getMessaging();
            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Foreground Message:', payload);
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
