/**
 * FINAL CORRECT Import - Add ONLY 7 NEW Products
 * Based on actual products visible in the app
 * 
 * Usage: node scripts/import-missing-products.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'studio-4862173023-78909',
});

const db = admin.firestore();

// ONLY THE 7 MISSING PRODUCTS (not in your current 20)
const MISSING_PRODUCTS = [
    {
        name: 'Rasam Mix',
        price: 40,
        mrp: 50,
        url: 'https://www.tionat.com/product-page/rasam-mix',
        category: 'Nutritional Care',
        subcategory: 'Ready to Cook',
        description: 'Traditional South Indian Rasam mix - Perfect for a tangy soup. Just add water, tomatoes, and enjoy!',
        unit: '100g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
        featured: true,
    },
    {
        name: 'Sambar Mix',
        price: 60,
        mrp: 75,
        url: 'https://www.tionat.com/product-page/sambar-mix',
        category: 'Nutritional Care',
        subcategory: 'Ready to Cook',
        description: 'Authentic Sambar mix - Add vegetables and dal for a complete South Indian meal',
        unit: '100g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
        featured: true,
    },
    {
        name: 'Upma Mix',
        price: 35,
        mrp: 45,
        url: 'https://www.tionat.com/product-page/upma-mix',
        category: 'Nutritional Care',
        subcategory: 'Breakfast Time',
        description: 'Instant Upma mix - Quick, healthy, and delicious breakfast in minutes',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
        featured: true,
    },
    {
        name: 'Vada Mix',
        price: 45,
        mrp: 55,
        url: 'https://www.tionat.com/product-page/vada-mix',
        category: 'Nutritional Care',
        subcategory: 'Tea Time',
        description: 'Crispy Vada mix - Perfect South Indian snack for tea time',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
        featured: true,
    },
    {
        name: 'Chole Mix',
        price: 50,
        mrp: 60,
        url: 'https://www.tionat.com/product-page/chole-mix',
        category: 'Nutritional Care',
        subcategory: 'Breakfast Time',
        description: 'Authentic Chole (Chickpea Curry) mix - Just add water and cook! Perfect with Puri or Bhatura',
        unit: '100g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
        featured: true,
    },
    {
        name: 'Tomato Dal',
        price: 100,
        mrp: 120,
        url: 'https://www.tionat.com/product-page/tomato-dal',
        category: 'Nutritional Care',
        subcategory: 'Lunch Time',
        description: 'Tangy tomato dal - Comfort food that pairs perfectly with rice or roti',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Available',
        featured: false,
    },
    {
        name: 'Neo Healthy Salt',
        price: 40,
        mrp: 50,
        url: 'https://www.tionat.com/product-page/neo-healthy-salt',
        category: 'Health Care',
        subcategory: 'Healthy Grocery',
        description: 'Low sodium healthy salt - Better for your heart. Fortified with essential minerals',
        unit: '1kg',
        stockQuantity: 100,
        inStock: true,
        status: 'Available',
        featured: false,
    },
];

async function getCategoryId(categoryName) {
    const categoriesSnapshot = await db.collection('categories').get();
    let categoryId = null;

    categoriesSnapshot.forEach(doc => {
        if (doc.data().name === categoryName) {
            categoryId = doc.id;
        }
    });

    return categoryId;
}

async function checkIfProductExists(productName) {
    const productsSnapshot = await db.collection('products').get();
    let exists = false;

    productsSnapshot.forEach(doc => {
        const name = doc.data().name.toLowerCase().trim();
        if (name === productName.toLowerCase().trim()) {
            exists = true;
        }
    });

    return exists;
}

async function importMissingProducts() {
    console.log('🚀 Starting import of 7 MISSING products...\n');

    let addedCount = 0;
    let skippedCount = 0;

    for (const product of MISSING_PRODUCTS) {
        // Check if product already exists
        const exists = await checkIfProductExists(product.name);

        if (exists) {
            console.log(`⏭️  SKIPPED (already exists): ${product.name}`);
            skippedCount++;
            continue;
        }

        // Get category ID
        const categoryId = await getCategoryId(product.category);

        if (!categoryId) {
            console.log(`⚠️  SKIPPED (category not found): ${product.name}`);
            skippedCount++;
            continue;
        }

        // Create product
        const productRef = db.collection('products').doc();
        await productRef.set({
            name: product.name,
            description: product.description,
            price: product.price,
            mrp: product.mrp,
            discount: Math.round(((product.mrp - product.price) / product.mrp) * 100),
            categoryId: categoryId,
            category: product.category,
            subcategoryId: product.subcategory,
            imageUrl: product.url,
            images: [product.url],
            unit: product.unit,
            stockQuantity: product.stockQuantity,
            inStock: product.inStock,
            featured: product.featured,
            status: product.status,
            tags: [product.status, product.subcategory],
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
        console.log('📊 Current products in app: 20');
        console.log('📊 Products to add: 7\n');

        const { addedCount, skippedCount } = await importMissingProducts();

        console.log('\n✅ Import completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Products ADDED: ${addedCount}`);
        console.log(`   ⏭️  Products SKIPPED: ${skippedCount}`);
        console.log(`   📦 Total attempted: ${MISSING_PRODUCTS.length}`);

        if (addedCount > 0) {
            console.log(`\n🎉 ${addedCount} new products added!`);
            console.log(`📊 New total: ${20 + addedCount} products`);
        } else {
            console.log(`\n✨ All products already exist!`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

main();
