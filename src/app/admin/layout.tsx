
'use client';

import { AdminSidebar } from "@/components/admin-sidebar";
import { useAuth, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/admin');
    }
  }, [isUserLoading, user, router]);

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <div className="p-8 text-center">Authenticating...</div>;
  }

  if (!userProfile) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You do not have a user profile.</p>
        <Button asChild className="mt-4">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  const isAdmin = userProfile.role === 'admin' || userProfile.role === 'superadmin';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <Button asChild className="mt-4">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AdminSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 pb-24 sm:pb-4">
            {children}
        </main>
      </div>
    </div>
  );
}
