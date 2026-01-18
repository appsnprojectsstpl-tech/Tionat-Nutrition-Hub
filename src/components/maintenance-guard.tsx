'use client';

import { useFirestore, useUser } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const firestore = useFirestore();
    const { userProfile, isUserLoading } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const unsub = onSnapshot(doc(firestore, 'system/settings'), (doc) => {
            setIsMaintenance(doc.data()?.maintenanceMode);
            setIsLoading(false);
        });
        return () => unsub();
    }, [firestore]);

    useEffect(() => {
        if (isLoading) return;

        // If Maintenance Mode is ON
        if (isMaintenance) {
            // Allow Admins
            if (userProfile?.role === 'admin' || userProfile?.role === 'superadmin' || userProfile?.role === 'warehouse_admin') {
                return;
            }

            // Allow Login Page
            if (pathname === '/login' || pathname === '/admin/login' || pathname === '/maintenance') {
                return;
            }

            // Redirect to Maintenance
            router.push('/maintenance');
        } else {
            // If Maintenance Mode is OFF, and we are on /maintenance, go home
            if (pathname === '/maintenance') {
                router.push('/');
            }
        }
    }, [isMaintenance, userProfile, pathname, router, isLoading]);

    if (isMaintenance && !userProfile && pathname !== '/maintenance') {
        return null; // Don't render content while redirecting
    }

    return <>{children}</>;
}
