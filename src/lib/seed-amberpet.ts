import { Firestore, collection, doc, writeBatch, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { Warehouse, WarehouseInventory } from './types';

export const AMBERPET_WAREHOUSES = [
    {
        id: 'wh-amberpet',
        name: 'Amberpet Central',
        address: '6-3-34, Amberpet Main Road, Hyderabad',
        city: 'Hyderabad',
        serviceablePincodes: ['500013'],
        contactNumber: '9988776655',
        isActive: true
    },
    {
        id: 'wh-nallakunta',
        name: 'Nallakunta Hub',
        address: 'H.No 2-1, Vidyanagar, Nallakunta',
        city: 'Hyderabad',
        serviceablePincodes: ['500044'],
        contactNumber: '9988776611',
        isActive: true
    },
    {
        id: 'wh-kachiguda',
        name: 'Kachiguda Express',
        address: 'Station Road, Kachiguda',
        city: 'Hyderabad',
        serviceablePincodes: ['500027', '500095'],
        contactNumber: '9988776622',
        isActive: true
    },
    {
        id: 'wh-malakpet',
        name: 'Malakpet Zone',
        address: 'Race Course Road, Malakpet',
        city: 'Hyderabad',
        serviceablePincodes: ['500036', '500024'],
        contactNumber: '9988776633',
        isActive: true
    },
    {
        id: 'wh-dilsukhnagar',
        name: 'Dilsukhnagar Depot',
        address: 'Metro Pillar 15, Dilsukhnagar',
        city: 'Hyderabad',
        serviceablePincodes: ['500060', '500035'],
        contactNumber: '9988776644',
        isActive: true
    }
];

export async function seedAmberpetWarehouses(db: Firestore) {
    const batch = writeBatch(db);
    const warehousesCollection = collection(db, 'warehouses');
    const warehouseInventoryCollection = collection(db, 'warehouse_inventory');

    console.log("Starting Amberpet Seeding...");

    // 1. Create Warehouses
    AMBERPET_WAREHOUSES.forEach(wh => {
        batch.set(doc(warehousesCollection, wh.id), wh, { merge: true });
    });

    // 2. Distribute Inventory for Existing Products
    // Get all products
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
        console.warn("No products found to seed inventory.");
        await batch.commit();
        return { success: true, message: "Warehouses created, but no products to stock." };
    }

    productsSnap.docs.forEach(productDoc => {
        const productId = productDoc.id;

        // Give each warehouse random stock for every product
        AMBERPET_WAREHOUSES.forEach(wh => {
            const inventoryDocId = `${wh.id}_${productId}`;
            // Random stock between 10 and 100
            const stock = Math.floor(Math.random() * 90) + 10;

            const invItem: WarehouseInventory = {
                warehouseId: wh.id,
                productId: productId,
                stock: stock,
                updatedAt: serverTimestamp()
            };

            batch.set(doc(warehouseInventoryCollection, inventoryDocId), invItem, { merge: true });
        });
    });

    try {
        await batch.commit();
        console.log("Amberpet Seeding Complete!");
        return { success: true, message: "Created 5 Amberpet Warehouses & Stocked Inventory." };
    } catch (error) {
        console.error("Amberpet Seeding Failed:", error);
        return { success: false, message: "Failed to seed data." };
    }
}
