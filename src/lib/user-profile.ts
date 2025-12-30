import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { User } from 'firebase/auth';
import type { UserProfile } from '@/lib/types';

const SUPER_ADMIN_EMAIL = 'suriraja@gmail.com';

export const createProfileIfNotExists = async (firestore: Firestore, user: User, phoneNumber?: string) => {
    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = user;
      const nameParts = displayName?.split(' ') || [];
      const firstName = nameParts[0] || 'New';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const isSuperAdmin = email === SUPER_ADMIN_EMAIL;

      const userProfile: UserProfile = {
        id: user.uid,
        firstName: firstName,
        lastName: lastName,
        email: email || '',
        phoneNumber: phoneNumber || user.phoneNumber || '',
        addresses: [],
        avatarUrl: photoURL || '',
        loyaltyTier: isSuperAdmin ? 'Gold' : 'Bronze',
        loyaltyPoints: isSuperAdmin ? 9999 : 0,
        role: isSuperAdmin ? 'superadmin' : 'user',
      };
      await setDoc(userRef, userProfile);
      console.log(`New user profile created for ${isSuperAdmin ? 'SUPER ADMIN' : 'user'}:`, user.uid);
    }
  };
    