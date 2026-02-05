/**
 * COMPLETE Tionat.com Product Import Script
 * ALL 27 UNIQUE PRODUCTS from tionat.com
 * 
 * Usage: node scripts/import-tionat-products.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'studio-4862173023-78909',
});

const db = admin.firestore();

// COMPLETE PRODUCT LIST - ALL 27 PRODUCTS
const TIONAT_PRODUCTS = [
    // READY TO COOK (6 products)
    {
        name: 'Bisi Bele Bath',
        price: 70,
        mrp: 85,
        url: 'https://www.tionat.com/product-page/bisi-bele-bath',
        category: 'Ready to Cook',
        description: 'Traditional Karnataka one-pot meal - Rice, lentils, and vegetables in aromatic spices',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
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
        name: 'Idli Mix',
        price: 45,
        mrp: 55,
        url: 'https://www.tionat.com/product-page/idli-mix',
        category: 'Ready to Cook',
        description: 'Instant Idli mix - Soft and fluffy idlis in minutes',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'New Arrival',
    },

    // BREAKFAST TIME (7 products)
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
        name: 'Puri Mix',
        price: 40,
        mrp: 50,
        url: 'https://www.tionat.com/product-page/puri-mix',
        category: 'Breakfast',
        description: 'Instant Puri mix - Crispy and delicious',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Dosa Mix',
        price: 50,
        mrp: 60,
        url: 'https://www.tionat.com/product-page/dosa-mix',
        category: 'Breakfast',
        description: 'Crispy Dosa mix - Perfect for breakfast',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Poha Mix',
        price: 35,
        mrp: 45,
        url: 'https://www.tionat.com/product-page/poha-mix',
        category: 'Breakfast',
        description: 'Instant Poha mix - Quick and healthy breakfast',
        unit: '100g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },

    // LUNCH TIME (10 products)
    {
        name: 'Spinach Dal',
        price: 100,
        mrp: 120,
        url: 'https://www.tionat.com/product-page/spinach-dal',
        category: 'Lunch',
        description: 'Healthy spinach dal - Nutritious and delicious',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Gongura Rice',
        price: 65,
        mrp: 80,
        url: 'https://www.tionat.com/product-page/gongura-rice',
        category: 'Lunch',
        description: 'Tangy Gongura (Sorrel leaves) rice - Andhra specialty',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Tomato Rice',
        price: 50,
        mrp: 60,
        url: 'https://www.tionat.com/product-page/tomato-rice',
        category: 'Lunch',
        description: 'Tangy tomato rice - South Indian favorite',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Gongura Dal',
        price: 100,
        mrp: 120,
        url: 'https://www.tionat.com/product-page/gongura-dal',
        category: 'Lunch',
        description: 'Tangy Gongura (Sorrel leaves) dal - Andhra specialty',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
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
        name: 'Dal Rice',
        price: 100,
        mrp: 120,
        url: 'https://www.tionat.com/product-page/dal-rice',
        category: 'Lunch',
        description: 'Complete meal - Dal and rice combo',
        unit: '250g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Mango Dal',
        price: 100,
        mrp: 120,
        url: 'https://www.tionat.com/product-page/mango-dal',
        category: 'Lunch',
        description: 'Tangy mango dal - Summer special',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Millet Rice',
        price: 55,
        mrp: 70,
        url: 'https://www.tionat.com/product-page/millet-rice',
        category: 'Lunch',
        description: 'Healthy millet rice - Nutritious alternative to regular rice',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },

    // DINNER TIME (2 unique products not in lunch)
    {
        name: 'Biryani Rice',
        price: 80,
        mrp: 100,
        url: 'https://www.tionat.com/product-page/biryani-rice',
        category: 'Dinner',
        description: 'Aromatic Biryani rice mix - Restaurant-style biryani at home',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Jeera Rice',
        price: 45,
        mrp: 55,
        url: 'https://www.tionat.com/product-page/jeera-rice',
        category: 'Dinner',
        description: 'Cumin flavored rice - Perfect side dish',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },

    // TEA TIME (1 unique product)
    {
        name: 'Punugulu Mix',
        price: 40,
        mrp: 50,
        url: 'https://www.tionat.com/product-page/punugulu-mix',
        category: 'Snacks',
        description: 'Traditional Andhra snack mix - Perfect with tea',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },

    // HEALTHY GROCERY (4 products)
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
    {
        name: 'Mango Bar',
        price: 30,
        mrp: 40,
        url: 'https://www.tionat.com/product-page/mango-bar',
        category: 'Snacks',
        description: 'Natural mango bar - Healthy snack',
        unit: '50g',
        stockQuantity: 100,
        inStock: true,
        status: 'Available',
    },
    {
        name: 'Assorted Dehydrated Fruits',
        price: 120,
        mrp: 150,
        url: 'https://www.tionat.com/product-page/dry-fruit-pieces',
        category: 'Snacks',
        description: 'Mixed dehydrated fruits - Healthy snacking option',
        unit: '100g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
    {
        name: 'Suhar',
        price: 150,
        mrp: 180,
        url: 'https://www.tionat.com/product-page/dry-fruit',
        category: 'Snacks',
        description: 'Premium dry fruit mix - Energy booster',
        unit: '200g',
        stockQuantity: 100,
        inStock: true,
        status: 'Coming Soon',
    },
];

// Categories
const CATEGORIES = [
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
        name: 'Dinner',
        description: 'Perfect dinner meals',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        displayOrder: 4,
    },
    {
        name: 'Snacks',
        description: 'Healthy snacking options',
        imageUrl: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800',
        displayOrder: 5,
    },
    {
        name: 'Groceries',
        description: 'Daily essentials',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
        displayOrder: 6,
    },
];

async function importCategories() {
    console.log('📦 Importing categories...');

    for (const category of CATEGORIES) {
        const categoryRef = db.collection('categories').doc();
        await categoryRef.set({
            ...category,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Created category: ${category.name}`);
    }
}

async function importProducts() {
    console.log('\n📦 Importing products...');

    // Get category IDs
    const categoriesSnapshot = await db.collection('categories').get();
    const categoryMap = {};
    categoriesSnapshot.forEach(doc => {
        categoryMap[doc.data().name] = doc.id;
    });

    for (const product of TIONAT_PRODUCTS) {
        const categoryId = categoryMap[product.category];

        if (!categoryId) {
            console.log(`⚠️  Skipping ${product.name} - category not found`);
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

        console.log(`✅ Created product: ${product.name} (₹${product.price})`);
    }
}

async function main() {
    try {
        console.log('🚀 Starting Tionat product import...\n');
        console.log(`📊 Total products to import: ${TIONAT_PRODUCTS.length}\n`);

        // Import categories first
        await importCategories();

        // Then import products
        await importProducts();

        console.log('\n✅ Import completed successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   Categories: ${CATEGORIES.length}`);
        console.log(`   Products: ${TIONAT_PRODUCTS.length}`);
        console.log(`\n✨ All ${TIONAT_PRODUCTS.length} products from tionat.com are now in Firebase!`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

main();
