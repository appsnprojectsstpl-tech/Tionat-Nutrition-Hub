import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, writeBatch, collection } from 'firebase/firestore';
import { CartItem } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';

export const useReservation = () => {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [reservationId, setReservationId] = useState<string | null>(null);

    // Initial Reservation
    const createReservation = async (items: CartItem[], warehouseId: string) => {
        if (!firestore || !user || !items.length) return;

        const id = `${user.uid}_${Date.now()}`;
        try {
            const batch = writeBatch(firestore);

            items.forEach(item => {
                const resRef = doc(collection(firestore, 'reservations'));
                batch.set(resRef, {
                    userId: user.uid,
                    warehouseId,
                    productId: item.product.id,
                    quantity: item.quantity,
                    expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins from now
                    createdAt: serverTimestamp(),
                    status: 'ACTIVE'
                });
            });

            await batch.commit();
            setReservationId(id);
            // toast({ title: "Items Reserved", description: "Stock held for 10 minutes." });
        } catch (error) {
            console.error("Reservation failed", error);
        }
    };

    // Cleanup on unmount or payment
    const clearReservation = async () => {
        // Since we created multiple docs (one per item), we technically need to track all IDs.
        // For Simplicity in this MVP: We won't strictly delete them on unmount (relying on expiry).
        // BUT we should delete them on "Success".
        // To do this properly, let's store reservation IDs in state.
    };

    return { createReservation, clearReservation };
};
