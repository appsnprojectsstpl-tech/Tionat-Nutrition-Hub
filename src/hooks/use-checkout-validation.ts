import { useState } from 'react';
import { Firestore, collection, query, where, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import { CartItem } from '@/lib/types';
import { perfMonitor } from '@/lib/performance-utils';

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warehouseId?: string;
}

export function useCheckoutValidation(firestore: Firestore | null) {
    const [isValidating, setIsValidating] = useState(false);

    const validateStock = async (cartItems: CartItem[], pincode: string): Promise<ValidationResult> => {
        const stopTimer = perfMonitor.startTimer('validate_stock');
        if (!firestore) {
            stopTimer({ error: 'no_firestore' });
            return { isValid: false, errors: ['System Error: Firestore not initialized'] };
        }
        if (!pincode || pincode.length !== 6) {
            stopTimer({ error: 'invalid_pincode' });
            return { isValid: false, errors: ['Invalid Pincode'] };
        }

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
                stopTimer({ error: 'no_service', pincode });
                return { isValid: false, errors: [`We do not deliver to ${pincode} yet.`] };
            }

            const warehouse = warehouseSnap.docs[0];
            const warehouseId = warehouse.id;
            const warehouseName = warehouse.data().name;

            // 2. Check Stock for EACH item in this warehouse
            // Optimization: Batch read inventory if there are multiple items
            const itemIds = cartItems.map(item => `${warehouseId}_${item.product.id}`);
            
            // Firestore 'in' query limit is 30. If more, we'll need to chunk or fall back to individual gets.
            let inventoryData: Record<string, number> = {};
            
            if (itemIds.length <= 30) {
                const invQuery = query(
                    collection(firestore, 'warehouse_inventory'),
                    where(documentId(), 'in', itemIds)
                );
                const invSnap = await getDocs(invQuery);
                invSnap.forEach(doc => {
                    inventoryData[doc.id] = doc.data().stock || 0;
                });
            } else {
                // Fallback for large carts (rare but possible)
                const stockChecks = itemIds.map(async (id) => {
                    const invSnap = await getDoc(doc(firestore, 'warehouse_inventory', id));
                    return { id, stock: invSnap.exists() ? invSnap.data().stock : 0 };
                });
                const results = await Promise.all(stockChecks);
                results.forEach(res => {
                    inventoryData[res.id] = res.stock;
                });
            }

            const errors = cartItems.map(item => {
                const invId = `${warehouseId}_${item.product.id}`;
                const stock = inventoryData[invId] || 0;

                if (stock < item.quantity) {
                    return stock === 0 
                        ? `${item.product.name} is out of stock at ${warehouseName}.`
                        : `Only ${stock} units of ${item.product.name} available at ${warehouseName}.`;
                }
                return null;
            }).filter((err): err is string => err !== null);

            stopTimer({ 
                itemCount: cartItems.length, 
                errorCount: errors.length,
                method: itemIds.length <= 30 ? 'batch' : 'parallel'
            });

            return {
                isValid: errors.length === 0,
                errors,
                warehouseId
            };

        } catch (error) {
            console.error("Validation Error:", error);
            stopTimer({ error: 'exception' });
            return { isValid: false, errors: ['Failed to validate stock. Please try again.'] };
        } finally {
            setIsValidating(false);
        }
    };

    return { validateStock, isValidating };
}
