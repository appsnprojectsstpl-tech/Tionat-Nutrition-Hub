"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useAuth();
    const router = useRouter();
    const firestore = useFirestore();



    const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

    useEffect(() => {
        if (isUserLoading) return;

        if (!user) {
            router.push('/login?redirect=/admin');
            return;
        }

        if (!firestore) return;

        // Manual subscription to avoid useDoc race condition
        setStatus('loading');
        const unsub = onSnapshot(doc(firestore, 'users', user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data() as UserProfile;
                const isAdmin = data.role === 'admin' || data.role === 'superadmin';
                setStatus(isAdmin ? 'authorized' : 'unauthorized');
                if (!isAdmin) {
                    // Optional: Redirect after a delay or let them see the 403 screen
                    // router.push('/'); 
                }
            } else {
                // Profile missing
                setStatus('unauthorized');
            }
        }, (err) => {
            console.error(err);
            setStatus('unauthorized');
        });

        return () => unsub();
    }, [user, isUserLoading, firestore, router]);

    if (status === 'loading') {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (status === 'unauthorized') {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
                <button
                    onClick={() => router.push('/')}
                    className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
                >
                    Go Home
                </button>
            </div>
        );
    }


    return <>{children}</>;
}
