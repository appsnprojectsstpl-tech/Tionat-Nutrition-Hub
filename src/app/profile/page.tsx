'use client';

import dynamic from 'next/dynamic';
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";

// Dynamically import the main content with SSR disabled
const ProfileContent = dynamic(() => import('@/components/profile-content'), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
            <main className="max-w-6xl mx-auto">
                <ProfileSkeleton />
            </main>
        </div>
    )
});

export default function ProfilePage() {
    return <ProfileContent />;
}
