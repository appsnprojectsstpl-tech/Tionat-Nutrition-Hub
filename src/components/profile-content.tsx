'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth, useFirestore, useMemoFirebase, useCollection, useDoc } from "@/firebase";
import { doc, collection, query, orderBy, where, limit } from "firebase/firestore";
import type { UserProfile, Order } from "@/lib/types";
import { CustomerHub } from "@/components/profile/customer-hub";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";

export default function ProfileContent() {
    const { user, isUserLoading } = useAuth();
    const firestore = useFirestore();

    // 1. Fetch User Profile
    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    // 2. Fetch Orders
    const ordersQuery = useMemoFirebase(
        () => (firestore && user ? query(collection(firestore, `users/${user.uid}/orders`), orderBy('orderDate', 'desc')) : null),
        [firestore, user]
    );
    const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

    const isLoading = isUserLoading || isProfileLoading;

    // Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
                <main className="max-w-6xl mx-auto">
                    <ProfileSkeleton />
                </main>
            </div>
        )
    }

    // Not Logged In State
    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center max-w-md w-full p-8 border rounded-2xl bg-card shadow-sm">
                    <h1 className="text-2xl font-bold font-headline mb-4">Please Log In</h1>
                    <p className="text-muted-foreground mb-8">Access your orders, favorites, and account settings.</p>
                    <div className="grid gap-3">
                        <Button asChild className="w-full">
                            <Link href="/login?redirect=/profile">Log In</Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/signup">Create Account</Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Profile Not Found State (Rare edge case)
    if (!userProfile && !isProfileLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold font-headline mb-4">Profile Not Found</h1>
                    <p className="text-muted-foreground mb-8">We couldn't load your profile data. Please try refreshing.</p>
                    <Button onClick={() => window.location.reload()}>Refresh Page</Button>
                </div>
            </div>
        )
    }

    // Success State - Render Hub
    return (
        <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
            <main className="max-w-6xl mx-auto">
                {userProfile && (
                    <CustomerHub
                        userProfile={userProfile}
                        orders={orders || []}
                        isLoadingOrders={isLoadingOrders}
                    />
                )}
            </main>
        </div>
    );
}
