
'use client';
import { collection, writeBatch, doc, Firestore, serverTimestamp } from 'firebase/firestore';
import { products } from './data';
import { Order, UserProfile, Inventory, LoyaltyProgram, Warehouse, WarehouseInventory } from './types';

function createSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric characters except spaces and hyphens
    .trim()
    .replace(/[\s-]+/g, '-'); // replace spaces and hyphens with a single hyphen
}

export async function seedDatabase(db: Firestore) {
  const batch = writeBatch(db);

  // Seed Categories
  const categoriesCollection = collection(db, 'categories');
  const typedCategories: { id: string, name: 'Nutritional Care' | 'Health Care' | 'Personal Care', status: 'Active' | 'Coming Soon' }[] = [
    { id: 'cat-1', name: 'Nutritional Care', status: 'Active' },
    { id: 'cat-2', name: 'Health Care', status: 'Coming Soon' },
    { id: 'cat-3', name: 'Personal Care', status: 'Coming Soon' },
  ];
  typedCategories.forEach((category) => {
    const docRef = doc(categoriesCollection, category.id);
    batch.set(docRef, category);
  });

  // Seed Products and Inventory
  const productsCollection = collection(db, 'products');
  const inventoryCollection = collection(db, 'inventory');
  products.forEach((product: any) => {
    const { ...rest } = product;
    const docRef = doc(productsCollection, product.id);
    const categoryId = typedCategories.find(c => c.name === product.category)?.id || typedCategories[0].id;
    const slug = createSlug(product.name);
    const description = `Discover the authentic taste and convenience of our ${product.name}. Perfect for a quick, healthy, and delicious meal. Made with high-quality ingredients.`;

    batch.set(docRef, { ...rest, categoryId, slug, description });

    // Seed inventory for each product
    const inventoryRef = doc(inventoryCollection, product.id);
    const stock: Inventory = {
      productId: product.id!, // Force TS to accept id since it's added by map in data.ts
      stock: Math.floor(Math.random() * 91) + 10,
    };
    batch.set(inventoryRef, stock);
  });

  // Seed Mock Users
  const usersCollection = collection(db, 'users');
  const user1: UserProfile = {
    id: 'user-1-seeded',
    firstName: 'Alex',
    lastName: 'Doe',
    email: 'alex.doe@example.com',
    loyaltyTier: 'Gold',
    loyaltyPoints: 1250,
    role: 'admin',
  };
  const user2: UserProfile = {
    id: 'user-2-seeded',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    loyaltyTier: 'Silver',
    loyaltyPoints: 550,
    role: 'user',
  };
  batch.set(doc(usersCollection, user1.id), user1);
  batch.set(doc(usersCollection, user2.id), user2);


  // Seed Mock Orders
  const ordersCollection = collection(db, 'orders');
  const user1OrdersCollection = collection(db, `users/${user1.id}/orders`);
  const user2OrdersCollection = collection(db, `users/${user2.id}/orders`);

  const order1: Order = {
    id: 'order-1-seeded',
    userId: user1.id,
    orderDate: serverTimestamp(),
    totalAmount: 250,
    status: 'Delivered',
    shippingAddress: { name: 'Alex Doe', address: '123 Main St', city: 'Anytown', pincode: '123456', phone: '5551234567' },
    orderItems: [
      { productId: 'prod-1', name: 'Idli Mix', price: 120, quantity: 1 },
      { productId: 'prod-2', name: 'Vada Mix', price: 130, quantity: 1 }
    ],
    paymentMethod: 'Cash on Delivery'
  };
  const order2: Order = {
    id: 'order-2-seeded',
    userId: user2.id,
    orderDate: serverTimestamp(),
    totalAmount: 290,
    status: 'Pending',
    shippingAddress: { name: 'Jane Smith', address: '456 Oak Ave', city: 'Otherville', pincode: '654321', phone: '5557654321' },
    orderItems: [
      { productId: 'prod-3', name: 'Chole Mix', price: 150, quantity: 1 },
      { productId: 'prod-5', name: 'Sambar Mix', price: 140, quantity: 1 }
    ],
    paymentMethod: 'Cash on Delivery'
  };

  // Set order in both collections
  batch.set(doc(ordersCollection, order1.id), order1);
  batch.set(doc(user1OrdersCollection, order1.id), order1);

  batch.set(doc(ordersCollection, order2.id), order2);
  batch.set(doc(user2OrdersCollection, order2.id), order2);


  // Seed Loyalty Program Configuration
  const loyaltyCollection = collection(db, 'loyaltyProgram');
  const loyaltyConfig: Omit<LoyaltyProgram, 'id'> = {
    pointsPerRupee: 1,
    pointsToRupeeConversion: 0.25, // i.e., 100 points = 25 Rupees
    tierBronzeDiscount: 5,
    tierSilverDiscount: 10,
    tierGoldDiscount: 15,
  };
  batch.set(doc(loyaltyCollection, 'config'), loyaltyConfig);

  // Seed Warehouses
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
    batch.set(doc(warehousesCollection, wh.id), wh);
  });

  // Seed Warehouse Inventory (Distributed Stock)
  const warehouseInventoryCollection = collection(db, 'warehouse_inventory');
  products.forEach((product: any) => {
    warehouses.forEach(wh => {
      // Random stock simulation: Some stores have more, some have 0 (Out of Stock)
      // 20% chance of being out of stock
      const isOutOfStock = Math.random() < 0.2;
      const stock = isOutOfStock ? 0 : Math.floor(Math.random() * 50) + 5;

      const inventoryDocId = `${wh.id}_${product.id}`;
      const invItem: WarehouseInventory = {
        warehouseId: wh.id,
        productId: product.id,
        stock: stock,
        updatedAt: serverTimestamp()
      };
      batch.set(doc(warehouseInventoryCollection, inventoryDocId), invItem);
    });
  });

  // Seed Metadata (Timestamp)
  const metadataCollection = collection(db, 'system_metadata');
  batch.set(doc(metadataCollection, 'seed_info'), { lastSeededAt: serverTimestamp() });


  try {
    await batch.commit();
    console.log('Database seeded successfully with Warehouses, inventory, products, categories, users, orders!');
    return { success: true };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, error };
  }
}

export async function undoSeedDatabase(db: Firestore) {
  const batch = writeBatch(db);

  // 1. Delete Categories
  const categoriesCollection = collection(db, 'categories');
  const catIds = ['cat-1', 'cat-2', 'cat-3'];
  catIds.forEach(id => batch.delete(doc(categoriesCollection, id)));

  // 2. Delete Products and Inventory (Global & Warehouse)
  const productsCollection = collection(db, 'products');
  const inventoryCollection = collection(db, 'inventory');
  const warehouseInventoryCollection = collection(db, 'warehouse_inventory');
  const warehouseIds = ["wh-1", "wh-2", "wh-3"];

  products.forEach((_, index) => {
    const id = `prod-${index + 1}`;
    batch.delete(doc(productsCollection, id));
    batch.delete(doc(inventoryCollection, id)); // Legacy global inventory

    // Delete Warehouse Inventory
    warehouseIds.forEach(whId => {
      batch.delete(doc(warehouseInventoryCollection, `${whId}_${id}`));
    });
  });

  // 3. Delete Warehouses
  const warehousesCollection = collection(db, 'warehouses');
  warehouseIds.forEach(id => batch.delete(doc(warehousesCollection, id)));

  // 4. Delete Users
  const usersCollection = collection(db, 'users');
  const userIds = ['user-1-seeded', 'user-2-seeded'];
  userIds.forEach(id => batch.delete(doc(usersCollection, id)));

  // 5. Delete Orders (Main Collection and User Subcollections)
  const ordersCollection = collection(db, 'orders');
  const orderIds = ['order-1-seeded', 'order-2-seeded'];

  // Note: We need to know which user owns which order to delete from subcollection properly
  // Hardcoded based on seed logic
  const orderUserMap: Record<string, string> = {
    'order-1-seeded': 'user-1-seeded',
    'order-2-seeded': 'user-2-seeded'
  };

  orderIds.forEach(orderId => {
    batch.delete(doc(ordersCollection, orderId));
    const userId = orderUserMap[orderId];
    if (userId) {
      batch.delete(doc(db, `users/${userId}/orders`, orderId));
    }
  });

  // 6. Delete Loyalty Config
  batch.delete(doc(collection(db, 'loyaltyProgram'), 'config'));

  // 7. Delete Seed Metadata
  batch.delete(doc(collection(db, 'system_metadata'), 'seed_info'));

  try {
    await batch.commit();
    console.log('Database seeded data reverted successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error undoing seed:', error);
    return { success: false, error };
  }
}
