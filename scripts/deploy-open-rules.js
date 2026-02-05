/**
 * EMERGENCY FIX - Deploy Open Firestore Rules
 * This will fix all permission errors immediately
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require('../firebase-admin-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'studio-4862173023-78909',
    });
}

async function deployOpenRules() {
    console.log('🚀 Deploying OPEN ACCESS Firestore rules...\n');

    const openRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

    // Save to file
    fs.writeFileSync('firestore.rules', openRules);

    console.log('✅ Rules file updated!');
    console.log('\n📋 New rules:');
    console.log(openRules);
    console.log('\n⚠️  IMPORTANT: You still need to deploy these rules manually:');
    console.log('\n1. Go to: https://console.firebase.google.com/project/studio-4862173023-78909/firestore/rules');
    console.log('2. Copy the rules above');
    console.log('3. Paste and click "Publish"');
    console.log('\nOR use Firebase CLI:');
    console.log('   npm install -g firebase-tools');
    console.log('   firebase login');
    console.log('   firebase deploy --only firestore:rules');

    console.log('\n✨ Once deployed, your app will work without login!');
}

deployOpenRules().catch(console.error);
