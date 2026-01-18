'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Warehouse } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAddress } from '@/providers/address-provider';

interface WarehouseContextType {
    selectedWarehouse: Warehouse | null;
    setSelectedWarehouse: (warehouse: Warehouse | null) => void;
    checkPincode: (pincode: string) => Promise<Warehouse | null>;
    isLoading: boolean;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

export function WarehouseProvider({ children }: { children: ReactNode }) {
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const firestore = useFirestore();
    const { currentAddress } = useAddress();

    // Load from local storage on mount (Fallback if address fails or user manually selects?)
    // Actually, user requested "Address Wise", so Address should override local storage generally.
    // But we keep local storage for persistence on refresh if address isn't loaded yet.
    useEffect(() => {
        const stored = localStorage.getItem('selected_warehouse_id');
        if (stored && firestore && !selectedWarehouse) {
            fetchWarehouseById(stored);
        } else {
            // If we have selectedWarehouse already, we are good.
            // If not stored, we finish loading.
            if (!stored) setIsLoading(false);
        }
    }, [firestore]);

    // Auto-detect from Address
    useEffect(() => {
        if (currentAddress) {
            const match = currentAddress.match(/\b\d{6}\b/);
            if (match) {
                const pincode = match[0];
                // Check if current warehouse (if any) already serves this pincode?
                if (selectedWarehouse && selectedWarehouse.serviceablePincodes.includes(pincode)) {
                    // Do nothing, current warehouse is valid
                } else {
                    // Switch warehouse
                    checkPincode(pincode);
                }
            }
        }
    }, [currentAddress, selectedWarehouse]);


    const fetchWarehouseById = async (id: string) => {
        if (!firestore) return;
        try {
            const q = query(collection(firestore, 'warehouses'), where('id', '==', id));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const wh = snap.docs[0].data() as Warehouse;
                setSelectedWarehouse(wh);
            }
        } catch (e) {
            console.error("Failed to restore warehouse session", e);
        } finally {
            setIsLoading(false);
        }
    };

    const checkPincode = async (pincode: string): Promise<Warehouse | null> => {
        if (!firestore) return null;

        setIsLoading(true);
        // Query for a warehouse that contains this pincode
        const q = query(
            collection(firestore, 'warehouses'),
            where('serviceablePincodes', 'array-contains', pincode)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
            const wh = snap.docs[0].data() as Warehouse;
            setSelectedWarehouse(wh);
            localStorage.setItem('selected_warehouse_id', wh.id);
            setIsLoading(false);
            return wh;
        }

        setIsLoading(false);
        return null;
    };

    return (
        <WarehouseContext.Provider value={{ selectedWarehouse, setSelectedWarehouse, checkPincode, isLoading }}>
            {children}
        </WarehouseContext.Provider>
    );
}

export function useWarehouse() {
    const context = useContext(WarehouseContext);
    if (context === undefined) {
        throw new Error('useWarehouse must be used within a WarehouseProvider');
    }
    return context;
}
