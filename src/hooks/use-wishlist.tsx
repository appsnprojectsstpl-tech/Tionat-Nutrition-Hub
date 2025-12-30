'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';

export function useWishlist() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [wishlist, setWishlist] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Sync with user profile
    useEffect(() => {
        if (!user || !firestore) {
            setWishlist([]);
            setIsLoading(false);
            return;
        }

        const fetchWishlist = async () => {
            try {
                const userRef = doc(firestore, 'users', user.uid);
                const docSnap = await getDoc(userRef);

                if (docSnap.exists()) {
                    const userData = docSnap.data() as UserProfile;
                    setWishlist(userData.wishlist || []);
                } else {
                    // Initialize if user doc missing (edge case)
                    await setDoc(userRef, { email: user.email, wishlist: [] }, { merge: true });
                }
            } catch (error) {
                console.error("Error fetching wishlist:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWishlist();
    }, [user, firestore]);

    const toggleWishlist = useCallback(async (productId: string) => {
        if (!user || !firestore) {
            toast({
                title: "Sign in required",
                description: "Please sign in to add items to your wishlist.",
                variant: "destructive"
            });
            return;
        }

        const isInternalInWishlist = wishlist.includes(productId);

        // Optimistic Update
        const newWishlist = isInternalInWishlist
            ? wishlist.filter(id => id !== productId)
            : [...wishlist, productId];

        setWishlist(newWishlist);

        try {
            const userRef = doc(firestore, 'users', user.uid);
            if (isInternalInWishlist) {
                await updateDoc(userRef, {
                    wishlist: arrayRemove(productId)
                });
                toast({ title: "Removed from favorites" });
            } else {
                await updateDoc(userRef, {
                    wishlist: arrayUnion(productId)
                });
                toast({ title: "Added to favorites" });
            }
        } catch (error) {
            console.error("Error updating wishlist:", error);
            // Revert optimistic update
            setWishlist(wishlist);
            toast({
                title: "Error",
                description: "Failed to update wishlist.",
                variant: "destructive"
            });
        }
    }, [user, firestore, wishlist, toast]);

    return {
        wishlist,
        toggleWishlist,
        isInWishlist: (productId: string) => wishlist.includes(productId),
        isLoading
    };
}
