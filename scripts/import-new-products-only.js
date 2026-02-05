/**
 * SMART Import - Add ONLY NEW Products (No Duplicates)
 * 
 * This script:
 * 1. Checks existing products in Firebase
 * 2. Only adds NEW products from website
 * 3. Skips duplicates
 * 
 * Usage: node scripts/import-new-products-only.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'studio-4862173023-78909',
});

const db = admin.firestore();

// NEW PRODUCTS ONLY (Not in existing database)
const NEW_PRODUCTS = [
    {
        name: 'Rasam Mix',
        price: 40,
        mrp: 50,
        url: 'https://www.tionat.com/product-page/rasam-mix',
        category: 'Ready to Cook',
        description: 'Traditional South Indian Rasam mix - Perfect for a tangy soup',
        unit: '100g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
    },
    {
        name: 'Sambar Mix',
        price: 60,
        mrp: 75,
        url: 'https://www.tionat.com/product-page/sambar-mix',
        category: 'Ready to Cook',
        description: 'Authentic Sambar mix - Add vegetables and enjoy!',
        unit: '100g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
    },
    {
        name: 'Upma Mix',
        price: 35,
        mrp: 45,
        url: 'https://www.tionat.com/product-page/upma-mix',
        category: 'Ready to Cook',
        description: 'Instant Upma mix - Quick and healthy breakfast',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
    },
    {
        name: 'Vada Mix',
        price: 45,
        mrp: 55,
        url: 'https://www.tionat.com/product-page/vada-mix',
        category: 'Ready to Cook',
        description: 'Crispy Vada mix - Perfect South Indian snack',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
    },
    {
        name: 'Chole Mix',
        price: 50,
        mrp: 60,
        url: 'https://www.tionat.com/product-page/chole-mix',
        category: 'Breakfast',
        description: 'Authentic Chole (Chickpea Curry) mix - Just add water and cook!',
        unit: '100g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
    },
    {
        name: 'Tomato Dal',
        price: 100,
        mrp: 120,
        url: 'https://www.tionat.com/product-page/tomato-dal',
        category: 'Lunch',
        description: 'Tangy tomato dal - Comfort food',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Neo Healthy Salt',
        price: 40,
        mrp: 50,
        url: 'https://www.tionat.com/product-page/neo-healthy-salt',
        category: 'Groceries',
        description: 'Low sodium healthy salt - Better for your heart',
        unit: '1kg',
        stockQuantity: 100,
        inStock: true,
        status: 'Available',
    },
];

// Categories to add if they don't exist
const NEW_CATEGORIES = [
    {
        name: 'Ready to Cook',
        description: 'Quick and easy meal solutions',
        imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
        displayOrder: 1,
    },
    {
        name: 'Breakfast',
        description: 'Start your day right',
        imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800',
        displayOrder: 2,
    },
    {
        name: 'Lunch',
        description: 'Delicious lunch options',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
        displayOrder: 3,
    },
    {
        name: 'Groceries',
        description: 'Daily essentials',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
        displayOrder: 6,
    },
];

async function checkExistingProducts() {
    console.log('🔍 Checking existing products...');
    const productsSnapshot = await db.collection('products').get();
    const existingNames = new Set();

    productsSnapshot.forEach(doc => {
        const name = doc.data().name;
        existingNames.add(name.toLowerCase().trim());
    });

    console.log(`📊 Found ${existingNames.size} existing products`);
    return existingNames;
}

async function ensureCategories() {
    console.log('\n📦 Checking categories...');

    const categoriesSnapshot = await db.collection('categories').get();
    const existingCategories = new Set();
    const categoryMap = {};

    categoriesSnapshot.forEach(doc => {
        const name = doc.data().name;
        existingCategories.add(name);
        categoryMap[name] = doc.id;
    });

    // Add missing categories
    for (const category of NEW_CATEGORIES) {
        if (!existingCategories.has(category.name)) {
            const categoryRef = db.collection('categories').doc();
            await categoryRef.set({
                ...category,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            categoryMap[category.name] = categoryRef.id;
            console.log(`✅ Created category: ${category.name}`);
        } else {
            console.log(`⏭️  Category already exists: ${category.name}`);
        }
    }

    // Refresh category map
    const updatedSnapshot = await db.collection('categories').get();
    const finalCategoryMap = {};
    updatedSnapshot.forEach(doc => {
        finalCategoryMap[doc.data().name] = doc.id;
    });

    return finalCategoryMap;
}

async function importNewProducts(existingNames, categoryMap) {
    console.log('\n📦 Importing NEW products only...\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const product of NEW_PRODUCTS) {
        const productNameLower = product.name.toLowerCase().trim();

        // Check for duplicates
        if (existingNames.has(productNameLower)) {
            console.log(`⏭️  SKIPPED (duplicate): ${product.name}`);
            skippedCount++;
            continue;
        }

        const categoryId = categoryMap[product.category];

        if (!categoryId) {
            console.log(`⚠️  SKIPPED (category not found): ${product.name}`);
            skippedCount++;
            continue;
        }

        const productRef = db.collection('products').doc();
        await productRef.set({
            name: product.name,
            description: product.description,
            price: product.price,
            mrp: product.mrp,
            discount: Math.round(((product.mrp - product.price) / product.mrp) * 100),
            categoryId: categoryId,
            categoryName: product.category,
            imageUrl: product.url,
            images: [product.url],
            unit: product.unit,
            stockQuantity: product.stockQuantity,
            inStock: product.inStock,
            featured: product.status === 'New Arrival',
            tags: [product.status, product.category],
            rating: 4.5,
            reviewCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ ADDED: ${product.name} (₹${product.price})`);
        addedCount++;
    }

    return { addedCount, skippedCount };
}

async function main() {
    try {
        console.log('🚀 Starting SMART product import (No Duplicates)...\n');

        // Step 1: Check existing products
        const existingNames = await checkExistingProducts();

        // Step 2: Ensure categories exist
        const categoryMap = await ensureCategories();

        // Step 3: Import only NEW products
        const { addedCount, skippedCount } = await importNewProducts(existingNames, categoryMap);

        console.log('\n✅ Import completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Products ADDED: ${addedCount}`);
        console.log(`   ⏭️  Products SKIPPED (duplicates): ${skippedCount}`);
        console.log(`   📦 Total NEW products attempted: ${NEW_PRODUCTS.length}`);

        if (addedCount > 0) {
            console.log(`\n🎉 ${addedCount} new products added to your database!`);
        } else {
            console.log(`\n✨ All products already exist - no new products to add!`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

main();
