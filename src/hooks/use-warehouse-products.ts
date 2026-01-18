import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId } from 'firebase/firestore';
import { Product, WarehouseInventory } from '@/lib/types';
import { useWarehouse } from '@/context/warehouse-context';

export function useWarehouseProducts(searchQuery?: string, category?: string) {
    const firestore = useFirestore();
    const { selectedWarehouse } = useWarehouse();

    // 1. Fetch Base Products
    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'products'));
    }, [firestore]);

    const { data: rawProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

    // 2. Fetch Warehouse Inventory (only if we have a warehouse and products)
    const inventoryQuery = useMemoFirebase(() => {
        if (!firestore || !selectedWarehouse) return null;
        return query(
            collection(firestore, 'warehouse_inventory'),
            where('warehouseId', '==', selectedWarehouse.id)
        );
    }, [firestore, selectedWarehouse]);

    const { data: inventory, isLoading: isLoadingInventory } = useCollection<WarehouseInventory>(inventoryQuery);

    // 3. Merge Data
    const products = useMemo(() => {
        if (!rawProducts) return [];

        let processedProducts = rawProducts.map(p => {
            // Default to global stock if no warehouse selected (or if specific logic requires it)
            // But usually, if warehouse IS selected, we override.

            let localStock = p.stock; // Fallback to global? Or 0?

            if (selectedWarehouse && inventory) {
                // Find inventory record for this product
                // ID format: {warehouseId}_{productId}
                // We can also match by productId field if available, or construct ID
                // The inventory collection has 'productId' field.

                const invItem = inventory.find(i => i.productId === p.id);
                localStock = invItem ? invItem.stock : 0; // If not in inventory, it's 0 for this warehouse
            }

            return {
                ...p,
                stock: localStock
            };
        });

        // Apply Filters (Search & Category) - Client Side for now as per original code
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            processedProducts = processedProducts.filter(p =>
                p.name.toLowerCase().includes(lowerQuery)
            );
        }

        if (category && category !== 'All') {
            // Mapping category names to IDs/logic from original page
            if (category === 'Ready to Cook') processedProducts = processedProducts.filter(p => p.subcategoryId === 'sub-1');
            else if (category === 'Breakfast') processedProducts = processedProducts.filter(p => p.subcategoryId === 'sub-2');
            else if (category === 'Lunch') processedProducts = processedProducts.filter(p => p.subcategoryId === 'sub-3');
            else if (category === 'Dinner') processedProducts = processedProducts.filter(p => p.subcategoryId === 'sub-4');
        }

        return processedProducts;

    }, [rawProducts, inventory, selectedWarehouse, searchQuery, category]);

    return {
        products,
        isLoading: isLoadingProducts || (!!selectedWarehouse && isLoadingInventory)
    };
}
