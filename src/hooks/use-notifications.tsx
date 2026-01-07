'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, onSnapshot, doc, limit } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

export type Notification = {
    id: string;
    title: string;
    body: string;
    type: 'info' | 'order' | 'promo';
    isRead: boolean;
    createdAt: Timestamp;
    link?: string;
};

export function useNotifications() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Firestore Listener for In-App Notifications
    useEffect(() => {
        if (!user || !firestore) {
            setNotifications([]);
            setUnreadCount(0);
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(firestore, `users/${user.uid}/notifications`),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(msgs);
            setUnreadCount(msgs.filter(n => !n.isRead).length);
            setIsLoading(false);
        }, (error) => {
            console.error("Notifications error", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, firestore]);

    const markAsRead = async (id: string) => {
        if (!user || !firestore) return;
        try {
            await setDocumentNonBlocking(doc(firestore, `users/${user.uid}/notifications`, id), { isRead: true }, { merge: true });
        } catch (e) {
            console.error("Failed to mark read", e);
        }
    };

    const markAllRead = async () => {
        if (!user || !firestore) return;
        notifications.filter(n => !n.isRead).forEach(n => {
            markAsRead(n.id);
        });
    };

    const addNotification = async (title: string, body: string, type: 'info' | 'order' | 'promo' = 'info') => {
        if (!user || !firestore) return;
        try {
            await addDocumentNonBlocking(collection(firestore, `users/${user.uid}/notifications`), {
                title,
                body,
                type,
                isRead: false,
                createdAt: Timestamp.now()
            });
        } catch (e) {
            console.error("Failed to add notification", e);
        }
    }

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllRead,
        addNotification
    };
}
