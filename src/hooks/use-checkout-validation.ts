import { useState } from 'react';
import { Firestore, collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { CartItem } from '@/lib/types';

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warehouseId?: string;
}

export function useCheckoutValidation(firestore: Firestore | null) {
    const [isValidating, setIsValidating] = useState(false);

    const validateStock = async (cartItems: CartItem[], pincode: string): Promise<ValidationResult> => {
        if (!firestore) return { isValid: false, errors: ['System Error: Firestore not initialized'] };
        if (!pincode || pincode.length !== 6) return { isValid: false, errors: ['Invalid Pincode'] };

        setIsValidating(true);
        try {
            // 1. Find Warehouse for Pincode
            const warehouseQuery = query(
                collection(firestore, 'warehouses'),
                where('serviceablePincodes', 'array-contains', pincode),
                where('isActive', '==', true)
            );
            const warehouseSnap = await getDocs(warehouseQuery);

            if (warehouseSnap.empty) {
                return { isValid: false, errors: [`We do not deliver to ${pincode} yet.`] };
            }

            const warehouse = warehouseSnap.docs[0];
            const warehouseId = warehouse.id;
            const warehouseName = warehouse.data().name;

            // 2. Check Stock for EACH item in this warehouse
            const errors: string[] = [];

            // We have to check one by one or in batches.
            // ID format: {warehouseId}_{productId}

            for (const item of cartItems) {
                const invId = `${warehouseId}_${item.product.id}`;
                // We can't use getDoc easily without doc ref import, easier to query or just fetch all inventory for this warehouse if small?
                // Or better, query specific IDs.
                // Let's query 'warehouse_inventory' where documentId matches

                // Constructing logic to fetch inventory document
                const invRef = collection(firestore, 'warehouse_inventory');
                const q = query(invRef, where('warehouseId', '==', warehouseId), where('productId', '==', item.product.id));
                const invSnap = await getDocs(q);

                let stock = 0;
                if (!invSnap.empty) {
                    stock = invSnap.docs[0].data().stock;
                }

                if (stock < item.quantity) {
                    if (stock === 0) {
                        errors.push(`${item.product.name} is out of stock at ${warehouseName}.`);
                    } else {
                        errors.push(`Only ${stock} units of ${item.product.name} available at ${warehouseName}.`);
                    }
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warehouseId
            };

        } catch (error) {
            console.error("Validation Error:", error);
            return { isValid: false, errors: ['Failed to validate stock. Please try again.'] };
        } finally {
            setIsValidating(false);
        }
    };

    return { validateStock, isValidating };
}
