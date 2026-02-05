import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, documentId, limit, orderBy } from 'firebase/firestore';
import { Product, WarehouseInventory } from '@/lib/types';
import { useWarehouse } from '@/context/warehouse-context';

export function useWarehouseProducts(searchQuery?: string, category?: string) {
    const firestore = useFirestore();
    const { selectedWarehouse } = useWarehouse();

    // 1. Fetch Products (Optimized with Server-Side Filtering)
    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;

        const baseRef = collection(firestore, 'products');

        // Map UI Categories to DB IDs (Logic lifted from original client filter)
        // Ideally this map should come from a 'categories' collection in a real app
        // 1. Search Logic
        if (searchQuery && searchQuery.trim().length > 0) {
            const term = searchQuery.trim();
            return query(
                baseRef,
                where('name', '>=', term),
                where('name', '<=', term + '\uf8ff'),
                limit(100)
            );
        }

        // 2. Category Logic
        if (category && category !== 'All') {
            return query(baseRef, where('categoryName', '==', category), limit(100));
        }

        // 3. Fallback (All)
        return query(baseRef, limit(100));
    }, [firestore, category, searchQuery]);

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

        let processedProducts = rawProducts.map((p: Product) => {
            // Default to global stock if no warehouse selected (or if specific logic requires it)
            // But usually, if warehouse IS selected, we override.

            let localStock = p.stock; // Fallback to global? Or 0?

            if (selectedWarehouse && inventory) {
                // Find inventory record for this product
                // ID format: {warehouseId}_{productId}
                // We can also match by productId field if available, or construct ID
                // The inventory collection has 'productId' field.

                const invItem = inventory.find((i: WarehouseInventory) => i.productId === p.id);
                localStock = invItem ? invItem.stock : 0; // If not in inventory, it's 0 for this warehouse
            }

            return {
                ...p,
                stock: localStock
            };
        });

        // Apply Filters (Search & Category)
        // Note: Category is now filtered on Server (Firestore Query) for performance.
        // We only keep Search here because full-text search is not native to Firestore Client SDK.
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            processedProducts = processedProducts.filter((p: Product & { stock: number }) =>
                p.name.toLowerCase().includes(lowerQuery)
            );
        }

        return processedProducts;

    }, [rawProducts, inventory, selectedWarehouse, searchQuery]);

    return {
        products,
        isLoading: isLoadingProducts || (!!selectedWarehouse && isLoadingInventory)
    };
}
