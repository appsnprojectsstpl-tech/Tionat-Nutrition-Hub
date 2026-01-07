'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function DeleteAccountPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("Are you sure? This action is permanent and cannot be undone.")) return;

        // In a real app, we'd trigger a cloud function to clean up user data.
        // For now, we simulate the request or sign out.
        toast({ title: "Request Received", description: "Your account deletion request is being processed." });
        // await auth.signOut();
        router.push('/');
    };

    if (!user) return <div className="p-10">Please log in.</div>;

    return (
        <div className="container mx-auto p-8 max-w-xl">
            <h1 className="text-3xl font-bold text-destructive mb-6">Delete Account</h1>
            <p className="mb-6">
                Deleting your account will remove all your personal data, order history, and saved addresses from our systems.
                This action is irreversible.
            </p>
            <Button variant="destructive" onClick={handleDelete}>
                Permanently Delete My Account
            </Button>
        </div>
    );
}
