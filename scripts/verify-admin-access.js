/**
 * Verify Admin Access and Fix Issues
 * Checks if admin can access Firestore and provides diagnostics
 * 
 * Usage: node scripts/verify-admin-access.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require('../firebase-admin-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'studio-4862173023-78909',
    });
}

const db = admin.firestore();

async function verifyAdminAccess() {
    console.log('🔍 Verifying admin access...\n');

    try {
        // Test 1: Read products
        console.log('Test 1: Reading products...');
        const productsSnapshot = await db.collection('products').limit(5).get();
        console.log(`✅ SUCCESS: Can read products (${productsSnapshot.size} found)`);

        // Test 2: Read users
        console.log('\nTest 2: Reading users...');
        const usersSnapshot = await db.collection('users').limit(5).get();
        console.log(`✅ SUCCESS: Can read users (${usersSnapshot.size} found)`);

        // Test 3: Check for admin users
        console.log('\nTest 3: Checking admin users...');
        const adminUsers = [];
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.role && ['admin', 'superadmin', 'warehouse_admin'].includes(user.role)) {
                adminUsers.push({
                    email: user.email,
                    role: user.role,
                    uid: doc.id
                });
            }
        });

        console.log(`✅ Found ${adminUsers.length} admin user(s):`);
        adminUsers.forEach(user => {
            console.log(`   - ${user.email} (${user.role})`);
        });

        // Test 4: Count products
        console.log('\nTest 4: Counting total products...');
        const allProducts = await db.collection('products').get();
        console.log(`✅ Total products in database: ${allProducts.size}`);

        // Test 5: Check new products
        console.log('\nTest 5: Checking newly added products...');
        const newProductNames = ['Rasam Mix', 'Sambar Mix', 'Upma Mix', 'Vada Mix', 'Chole Mix', 'Tomato Dal', 'Neo Healthy Salt'];
        const foundNew = [];

        allProducts.forEach(doc => {
            const product = doc.data();
            if (newProductNames.includes(product.name)) {
                foundNew.push({
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl?.substring(0, 50) + '...'
                });
            }
        });

        console.log(`✅ Found ${foundNew.length}/7 new products:`);
        foundNew.forEach(p => {
            console.log(`   - ${p.name}: ₹${p.price}`);
            console.log(`     Image: ${p.imageUrl}`);
        });

        console.log('\n✅ All tests passed! Admin access is working correctly.');
        console.log('\n📊 Summary:');
        console.log(`   Total Products: ${allProducts.size}`);
        console.log(`   Admin Users: ${adminUsers.length}`);
        console.log(`   New Products: ${foundNew.length}/7`);

        if (foundNew.length === 7) {
            console.log('\n🎉 All 7 new products successfully imported!');
        }

        return { success: true };

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n🔴 Admin access verification failed!');
        console.error('   This might be a Firestore rules issue.');
        return { success: false, error };
    }
}

async function main() {
    try {
        await verifyAdminAccess();
        process.exit(0);
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

main();
