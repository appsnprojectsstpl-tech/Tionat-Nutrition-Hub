'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Utensils } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { auth } = useAuth();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        if (!email) {
            toast({
                title: "Email Required",
                description: "Please enter your email address.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setIsSuccess(true);
            toast({
                title: "Email Sent",
                description: "Check your inbox for password reset instructions.",
            });
        } catch (error) {
            console.error(error);
            const firebaseError = error as { code?: string };
            toast({
                title: "Error",
                description: firebaseError.code === 'auth/user-not-found'
                    ? "No account found with this email."
                    : "Could not send reset email. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background px-4">
            <Card className="mx-auto max-w-sm w-full">
                <CardHeader className="text-center">
                    <Link href="/" className="inline-block mb-4">
                        <Utensils className="h-10 w-10 text-primary mx-auto" />
                    </Link>
                    <CardTitle className="text-2xl font-headline">Reset Password</CardTitle>
                    <CardDescription>
                        Enter your email to receive reset instructions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isSuccess ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg text-green-700 text-sm">
                                ✅ Reset link sent to <strong>{email}</strong>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Please check your email (and spam folder) for the link to create a new password.
                            </p>
                            <Button asChild className="w-full">
                                <Link href="/login">Back to Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                            <Button variant="ghost" asChild className="w-full">
                                <Link href="/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                                </Link>
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
