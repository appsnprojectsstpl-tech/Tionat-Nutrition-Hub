'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Functions } from 'firebase/functions';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import type { UserProfile } from '@/lib/types';

// Re-export types from context for backward compatibility if needed, 
// but best to just rely on the hook return types.
import {
  FirebaseContext,
  FirebaseContextState,
  FirebaseServicesAndUser,
  UserHookResult
} from './context';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  functions: Functions;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  functions,
}) => {
  const [userAuthState, setUserAuthState] = useState<{
    user: User | null;
    userProfile: UserProfile | null;
    isUserLoading: boolean;
    userError: Error | null;
  }>({
    user: null,
    userProfile: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState(prev => ({ ...prev, isUserLoading: false }));
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          // User is signed in, fetch profile
          // We set user state immediately, but keep loading true if we want to wait for profile?
          // Actually, better to show UI with user info ASAP.
          // Let's set loading false for auth, but we might want a separate profile loading state?
          // For now, simpler:

          // Subscribe to profile
          // This structure with inner subscription needs care.
          // But we can't easily return it from here.
          // For stability in this rapid fix, I will just set user and let the profile update async.
          // But if I want `unsubscribeAuth` to clean up `unsubscribeProfile`, I need to store it.
          // Since this useEffect runs once (deps=[auth]), it's tricky.

          // SIMPLER APPROACH: use separate useEffect for profile.
          setUserAuthState(prev => ({ ...prev, user, isUserLoading: false })); // Set User first
          return;
        }

        setUserAuthState({
          user: null,
          userProfile: null,
          isUserLoading: false,
          userError: null,
        });
      },
      (error) => {
        setUserAuthState({
          user: null,
          userProfile: null,
          isUserLoading: false,
          userError: error,
        });
      }
    );

    return () => unsubscribeAuth();
  }, [auth]);

  // Secondary effect for Profile
  useEffect(() => {
    if (userAuthState.user && firestore) {
      const profileRef = doc(firestore, 'users', userAuthState.user.uid);
      const unsub = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
          setUserAuthState(prev => ({ ...prev, userProfile: snap.data() as UserProfile }));
        } else {
          // Profile doesn't exist yet (maybe being created)
          setUserAuthState(prev => ({ ...prev, userProfile: null }));
        }
      }, (error) => {
        console.error("Error fetching user profile", error);
        // Keep user, but error on profile?
        // For now, just log and keep existing profile state or set to null
        setUserAuthState(prev => ({ ...prev, userProfile: null }));
      });
      return () => unsub();
    } else {
      // Clear profile if no user
      setUserAuthState(prev => ({ ...prev, userProfile: null }));
    }
  }, [userAuthState.user, firestore]);


  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && functions);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      functions: servicesAvailable ? functions : null,
      user: userAuthState.user,
      userProfile: userAuthState.userProfile,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, functions, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (typeof window === 'undefined') {
    // Return mock implementation for SSR/Build
    return {
      firebaseApp: null as any,
      firestore: null as any,
      auth: null as any,
      functions: null as any,
      user: null,
      userProfile: null,
      isUserLoading: true,
      userError: null
    };
  }

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.functions) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    functions: context.functions,
    user: context.user,
    userProfile: context.userProfile,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useFunctions = (): Functions => {
  const { functions } = useFirebase();
  return functions;
};

/** Hook to access Firebase Auth instance and user state. */
export const useAuth = (): FirebaseServicesAndUser => {
  const { auth, user, userProfile, isUserLoading, userError } = useFirebase();
  return { ...useFirebase(), auth, user, userProfile, isUserLoading, userError };
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);

  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;

  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, userProfile, isUserLoading, userError } = useFirebase();
  return { user, userProfile, isUserLoading, userError };
};
