'use client';

import { useEffect, useState } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useFirestore, useAuth } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        if (!user || !firestore) return;

        const setupNotifications = async () => {
            // Only run on native platforms (Android/iOS)
            if (!Capacitor.isNativePlatform()) {
                console.log('Push notifications not supported on web (yet).');
                return;
            }

            try {
                // Request permissions
                const permission = await PushNotifications.requestPermissions();

                if (permission.receive !== 'granted') {
                    console.log('Push notification permission denied');
                    return;
                }

                // Register with FCM
                await PushNotifications.register();

                // Listen for registration success
                PushNotifications.addListener('registration', async (token: Token) => {
                    console.log('FCM Token:', token.value);

                    // Save token to Firestore user profile
                    try {
                        const userRef = doc(firestore, 'users', user.uid);
                        await setDoc(userRef, {
                            fcmToken: token.value,
                            fcmTokenUpdatedAt: new Date().toISOString()
                        }, { merge: true });

                        setIsRegistered(true);
                        console.log('FCM token saved to Firestore');
                    } catch (error) {
                        console.error('Error saving FCM token:', error);
                    }
                });

                // Listen for registration errors
                PushNotifications.addListener('registrationError', (error: any) => {
                    console.error('FCM registration error:', error);
                });

                // Handle incoming notifications (when app is in foreground)
                PushNotifications.addListener(
                    'pushNotificationReceived',
                    (notification: PushNotificationSchema) => {
                        console.log('Notification received:', notification);

                        // Show toast notification
                        toast({
                            title: notification.title || 'New Notification',
                            description: notification.body || '',
                        });
                    }
                );

                // Handle notification tap (when user clicks notification)
                PushNotifications.addListener(
                    'pushNotificationActionPerformed',
                    (action: ActionPerformed) => {
                        console.log('Notification action performed:', action);

                        const data = action.notification.data;

                        // Navigate based on notification type
                        if (data.type === 'order_confirmation' && data.orderId) {
                            // Navigate to order details
                            window.location.href = `/profile/orders/${data.orderId}`;
                        } else if (data.type === 'promotion') {
                            // Navigate to home or specific category
                            window.location.href = '/';
                        }
                    }
                );

            } catch (error) {
                console.error('Error setting up notifications:', error);
            }
        };

        setupNotifications();

        // Cleanup listeners on unmount
        return () => {
            PushNotifications.removeAllListeners();
        };
    }, [user, firestore, toast]);

    return { isRegistered };
}
