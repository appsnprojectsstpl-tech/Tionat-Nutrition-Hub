
import { collection, writeBatch, doc, Firestore, serverTimestamp, getDocs } from 'firebase/firestore';
import { Warehouse, WarehouseInventory } from './types';

export async function initializeWarehouses(db: Firestore) {
    const batch = writeBatch(db);
    let operationCount = 0;

    console.log("Starting Warehouse Initialization...");

    // 1. Create Warehouses
    const warehousesCollection = collection(db, 'warehouses');
    const warehouses: Warehouse[] = [
        {
            id: "wh-1",
            name: "Tionat Indiranagar (Central)",
            address: "123, 100 Feet Rd, Indiranagar, Bangalore",
            city: "Bangalore",
            serviceablePincodes: ["560008", "560038", "560001"], // Indiranagar, HAL, MG Road
            contactNumber: "9988776655",
            isActive: true
        },
        {
            id: "wh-2",
            name: "Tionat Koramangala (South)",
            address: "456, 80 Feet Rd, Koramangala 4th Block, Bangalore",
            city: "Bangalore",
            serviceablePincodes: ["560034", "560095", "560047"], // Koramangala, HSR, Vivek Nagar
            contactNumber: "9988776644",
            isActive: true
        },
        {
            id: "wh-3",
            name: "Tionat Whitefield (East)",
            address: "789, ITPL Main Rd, Whitefield, Bangalore",
            city: "Bangalore",
            serviceablePincodes: ["560066", "560048", "560067"], // Whitefield, Mahadevapura
            contactNumber: "9988776633",
            isActive: true
        }
    ];

    warehouses.forEach(wh => {
        batch.set(doc(warehousesCollection, wh.id), wh, { merge: true });
        operationCount++;
    });

    // 2. Fetch Existing Products
    const productsSnap = await getDocs(collection(db, 'products'));
    console.log(`Found ${productsSnap.size} products to generate inventory for.`);

    // 3. Create Inventory for Existing Products
    const warehouseInventoryCollection = collection(db, 'warehouse_inventory');

    productsSnap.docs.forEach(productDoc => {
        const productId = productDoc.id;

        warehouses.forEach(wh => {
            // Random stock simulation: Some stores have more, some have 0 (Out of Stock)
            const isOutOfStock = Math.random() < 0.2;
            const stock = isOutOfStock ? 0 : Math.floor(Math.random() * 50) + 5;

            const inventoryDocId = `${wh.id}_${productId}`;
            const invItem: WarehouseInventory = {
                warehouseId: wh.id,
                productId: productId,
                stock: stock,
                updatedAt: serverTimestamp()
            };
            batch.set(doc(warehouseInventoryCollection, inventoryDocId), invItem, { merge: true });
            operationCount++;
        });
    });

    try {
        await batch.commit();
        console.log(`Migration Successful! Performed ${operationCount} writes.`);
        return { success: true, count: operationCount };
    } catch (error) {
        console.error('Error initializing warehouses:', error);
        return { success: false, error };
    }
}
