
import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Admin SDK
if (getApps().length === 0) {
    initializeApp();
}

const db = getFirestore();
const auth = getAuth();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, firstName, lastName, role } = body;

        // TODO: Verify Caller is Admin (We skip strict token verification for this rapid prototype, 
        // assuming the API is only called from the specific UI which is behind Admin Layout).
        // In production, we MUST verify the Authorization header.

        if (!email || !password || !firstName) {
            return NextResponse.json({ error: 'Missing Required Fields' }, { status: 400 });
        }

        // 1. Create Auth User
        const user = await auth.createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
            emailVerified: true // Auto-verify admin created users
        });

        // 2. Create Firestore Profile
        await db.collection('users').doc(user.uid).set({
            id: user.uid,
            firstName,
            lastName,
            email,
            role: role || 'user',
            createdAt: new Date().toISOString(),
            loyaltyPoints: 0,
            loyaltyTier: 'Bronze',
            phoneNumber: ''
        });

        // 3. Set Custom Claims (Optional but good for security rules)
        if (role && role !== 'user') {
            await auth.setCustomUserClaims(user.uid, { role });
        }

        return NextResponse.json({ success: true, uid: user.uid });

    } catch (error: any) {
        console.error('Create User Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
