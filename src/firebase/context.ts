'use client';

import { createContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { Auth, User } from 'firebase/auth';

// Combined state for the Firebase context
export interface FirebaseContextState {
    areServicesAvailable: boolean;
    firebaseApp: FirebaseApp | null;
    firestore: Firestore | null;
    auth: Auth | null;
    functions: Functions | null;
    // User authentication state
    user: User | null;
    isUserLoading: boolean;
    userError: Error | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
    functions: Functions;
    user: User | null;
    isUserLoading: boolean;
    userError: Error | null;
}

export interface UserHookResult {
    user: User | null;
    isUserLoading: boolean;
    userError: Error | null;
}

// Create the context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);
