
'use client';
import { collection, writeBatch, doc, Firestore, serverTimestamp } from 'firebase/firestore';
import { products } from './data';
import { Order, UserProfile, Inventory, LoyaltyProgram } from './types';

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
  const typedCategories: {id: string, name: 'Nutritional Care' | 'Health Care' | 'Personal Care', status: 'Active' | 'Coming Soon'}[]  = [
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
  products.forEach((product) => {
    const { ...rest } = product;
    const docRef = doc(productsCollection, product.id);
    const categoryId = typedCategories.find(c => c.name === 'Nutritional Care')?.id; // All seeded products are in this category
    const slug = createSlug(product.name);
    const description = `Discover the authentic taste and convenience of our ${product.name}. Perfect for a quick, healthy, and delicious meal. Made with high-quality ingredients.`;
    
    batch.set(docRef, { ...rest, categoryId, slug, description });

    // Seed inventory for each product
    const inventoryRef = doc(inventoryCollection, product.id);
    const stock: Inventory = {
        productId: product.id,
        stock: Math.floor(Math.random() * 91) + 10, // Random stock between 10 and 100
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
      shippingAddress: { name: 'Alex Doe', address: '123 Main St', city: 'Anytown', pincode: '123456', phone: '5551234567'},
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
      shippingAddress: { name: 'Jane Smith', address: '456 Oak Ave', city: 'Otherville', pincode: '654321', phone: '5557654321'},
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


  try {
    await batch.commit();
    console.log('Database seeded successfully with products, categories, users, orders, inventory and loyalty config!');
    return { success: true };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { success: false, error };
  }
}
