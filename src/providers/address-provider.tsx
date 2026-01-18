'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useDoc } from '@/firebase'; // Assuming we have this or equivalent
import { UserProfile } from '@/lib/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface AddressContextType {
    currentAddress: string | null;
    setAddress: (address: string) => Promise<void>;
    isLoading: boolean;
    savedAddresses: string[];
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export function AddressProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [currentAddress, setCurrentAddress] = useState<string | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<string[]>([]);

    // We already use a generic useDoc/useUserProfile elsewhere, but 
    // strictly per Phase 1, "Address must be read from ONE provider only".
    // So we fetch it here or reuse logic.
    // Let's rely on the user profile doc.
    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    // Manual fetch or simple onSnapshot could be lighter, but let's consistency.
    // Using simple effect for now to decode profile data.
    // Actually, we can use the existing hook if available, but to be "The Provider",
    // we should own the state distribution.

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userProfileRef) {
            setSavedAddresses([]);
            setCurrentAddress(null);
            setIsLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(userProfileRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as UserProfile;
                setCurrentAddress(data.currentAddress || (data.addresses && data.addresses[0]) || null);
                setSavedAddresses(data.addresses || []);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("AddressProvider snapshot error:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userProfileRef]);


    const setAddress = async (address: string) => {
        if (!user || !userProfileRef) return;

        // Optimistic update
        setCurrentAddress(address);

        // Persist
        // We use non-blocking or direct set
        try {
            // Ensure unique in history
            const newAddresses = Array.from(new Set([address, ...savedAddresses])).slice(0, 5); // limit to 5

            await setDocumentNonBlocking(userProfileRef, {
                currentAddress: address,
                addresses: newAddresses
            }, { merge: true });

        } catch (error) {
            console.error("Failed to save address:", error);
            // Revert on critical failure? usually firestore offline works fine.
        }
    };

    return (
        <AddressContext.Provider value={{ currentAddress, setAddress, isLoading, savedAddresses }}>
            {children}
        </AddressContext.Provider>
    );
}

export const useAddress = () => {
    const context = useContext(AddressContext);
    if (context === undefined) {
        throw new Error('useAddress must be used within an AddressProvider');
    }
    return context;
};
