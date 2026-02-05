/**
 * Add Unsplash Images to New Products
 * Updates the 7 newly added products with high-quality food images
 * 
 * Usage: node scripts/add-product-images.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (reuse existing app or create new)
if (!admin.apps.length) {
    const serviceAccount = require('../firebase-admin-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'studio-4862173023-78909',
    });
}

const db = admin.firestore();

// High-quality Unsplash images for each product
const PRODUCT_IMAGES = {
    'Rasam Mix': {
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=800&q=80',
        images: [
            'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=800&q=80',
            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
        ]
    },
    'Sambar Mix': {
        imageUrl: 'https://images.unsplash.com/photo-1626505779532-332921509a25?w=800&q=80',
        images: [
            'https://images.unsplash.com/photo-1626505779532-332921509a25?w=800&q=80',
            'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=800&q=80',
        ]
    },
    'Upma Mix': {
        imageUrl: 'https://images.unsplash.com/photo-1589301760576-415c6d9e3e38?w=800&q=80',
        images: [
            'https://images.unsplash.com/photo-1589301760576-415c6d9e3e38?w=800&q=80',
            'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80',
        ]
    },
    'Vada Mix': {
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',
        images: [
            'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',
            'https://images.unsplash.com/photo-1626505779532-332921509a25?w=800&q=80',
        ]
    },
    'Chole Mix': {
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=800&q=80',
        images: [
            'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=800&q=80',
            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
        ]
    },
    'Tomato Dal': {
        imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
        images: [
            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
            'https://images.unsplash.com/photo-1585937421612-70a008356f36?w=800&q=80',
        ]
    },
    'Neo Healthy Salt': {
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
        images: [
            'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
            'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&q=80',
        ]
    },
};

async function updateProductImages() {
    console.log('🖼️  Starting image update for 7 new products...\n');

    let updatedCount = 0;
    let notFoundCount = 0;

    // Get all products
    const productsSnapshot = await db.collection('products').get();

    for (const doc of productsSnapshot.docs) {
        const product = doc.data();
        const productName = product.name;

        // Check if this product needs image update
        if (PRODUCT_IMAGES[productName]) {
            const imageData = PRODUCT_IMAGES[productName];

            // Update product with new images
            await doc.ref.update({
                imageUrl: imageData.imageUrl,
                images: imageData.images,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ UPDATED: ${productName}`);
            console.log(`   📸 Image: ${imageData.imageUrl.substring(0, 60)}...`);
            updatedCount++;
        }
    }

    // Check for products that weren't found
    const foundProducts = new Set();
    productsSnapshot.forEach(doc => foundProducts.add(doc.data().name));

    Object.keys(PRODUCT_IMAGES).forEach(productName => {
        if (!foundProducts.has(productName)) {
            console.log(`⚠️  NOT FOUND: ${productName}`);
            notFoundCount++;
        }
    });

    return { updatedCount, notFoundCount };
}

async function main() {
    try {
        console.log('🎨 Adding Unsplash images to new products...\n');

        const { updatedCount, notFoundCount } = await updateProductImages();

        console.log('\n✅ Image update completed!');
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Products UPDATED: ${updatedCount}`);
        console.log(`   ⚠️  Products NOT FOUND: ${notFoundCount}`);

        if (updatedCount > 0) {
            console.log(`\n🎉 ${updatedCount} products now have beautiful images!`);
            console.log(`💰 Cost: $0 (using free Unsplash CDN)`);
        }

        console.log(`\n📱 Check your app to see the new images!`);
        console.log(`🔗 https://studio-4862173023-78909.web.app`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Image update failed:', error);
        process.exit(1);
    }
}

main();
