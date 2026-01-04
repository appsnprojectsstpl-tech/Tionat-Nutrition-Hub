'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to config object (normal for development and static builds)
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const functions = getFunctions(firebaseApp, 'us-central1');

  // Connect to emulators in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    const { connectFunctionsEmulator } = require('firebase/functions');
    const { connectFirestoreEmulator } = require('firebase/firestore');
    const { connectAuthEmulator } = require('firebase/auth');

    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('✅ Connected to Functions Emulator');
    } catch (e) {
      // Already connected
    }

    try {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      console.log('✅ Connected to Firestore Emulator');
    } catch (e) {
      // Already connected
    }

    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('✅ Connected to Auth Emulator');
    } catch (e) {
      // Already connected
    }
  }

  return {
    firebaseApp,
    auth,
    firestore,
    functions
  };
}

export * from './provider';
export * from './client-provider';
export * from './context'; // Check for duplicates
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
