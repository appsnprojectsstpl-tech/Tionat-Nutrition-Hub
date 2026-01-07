const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testCreateOrder() {
    try {
        // Simulate what the function does
        const items = [{ productId: 'test-id', quantity: 1 }];

        console.log('Fetching products...');
        const productRefs = items.map(item => db.collection('products').doc(item.productId));
        const productSnaps = await db.getAll(...productRefs);

        console.log('Product exists:', productSnaps[0].exists);

        if (!productSnaps[0].exists) {
            console.error('Product not found!');
            return;
        }

        const productData = productSnaps[0].data();
        console.log('Product data:', productData);

        // Check settings
        console.log('Fetching settings...');
        const settingsSnap = await db.collection('settings').doc('financials').get();
        console.log('Settings exists:', settingsSnap.exists);
        console.log('Settings data:', settingsSnap.data());

        console.log('✅ All checks passed!');
    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

testCreateOrder();
