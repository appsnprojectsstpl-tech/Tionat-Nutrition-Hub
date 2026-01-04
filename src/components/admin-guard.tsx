"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useAuth();
    const router = useRouter();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const isLoading = isUserLoading || isProfileLoading;
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                // Not logged in
                router.push('/login?redirect=/admin');
                return;
            }

            if (userProfile) {
                const isAdmin = userProfile.role === 'admin' || userProfile.role === 'superadmin';
                if (isAdmin) {
                    setIsAuthorized(true);
                } else {
                    // Logged in but not admin
                    router.push('/');
                }
            } else if (!isProfileLoading) {
                 // User exists but no profile yet (should rare), redirect to home
                 router.push('/');
            }
        }
    }, [user, userProfile, isLoading, router, isProfileLoading]);

    if (isLoading || !isAuthorized) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <>{children}</>;
}
