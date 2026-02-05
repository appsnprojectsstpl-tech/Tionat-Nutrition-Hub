'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Utensils } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { createProfileIfNotExists } from '@/lib/user-profile';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { logUserAction } from '@/lib/audit-logger';
import { GoogleIcon } from '@/components/icons/google-icon';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phoneNumber: z.string().min(10, "Phone number is required").max(15, "Phone number is too long"),
});

export function AuthForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { auth } = useAuth();
    const firestore = useFirestore();

    // Initialize form with dynamic schema based on mode
    const form = useForm<z.infer<typeof loginSchema> | z.infer<typeof signupSchema>>({
        resolver: zodResolver(isSigningUp ? signupSchema : loginSchema),
        defaultValues: {
            email: '',
            password: '',
            ...(isSigningUp && { phoneNumber: '' }),
        },
    });

    const handleAuthSuccess = async (user: User, phoneNumber?: string) => {
        if (!firestore) return;
        await createProfileIfNotExists(firestore, user, phoneNumber);

        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);

        let finalRedirectUrl = '/'; // Default to homepage for all users

        if (userProfileSnap.exists()) {
            const userProfile = userProfileSnap.data() as UserProfile;
            // Admins get redirected to the admin dashboard
            if (userProfile.role === 'admin' || userProfile.role === 'superadmin' || userProfile.role === 'warehouse_admin') {
                finalRedirectUrl = '/admin';
            }
        } else {
            console.warn("User Profile does not exist yet.");
        }

        toast({ title: 'Login Successful', description: "Welcome!" });

        // Log Logic
        if (firestore) {
            logUserAction(firestore, {
                userId: user.uid,
                action: 'LOGIN',
                details: 'User logged in successfully',
                metadata: { role: userProfileSnap.exists() ? userProfileSnap.data().role : 'guest' }
            });
        }

        router.push(finalRedirectUrl);
        router.refresh();
    }

    const onSubmit = async (data: z.infer<typeof loginSchema> | z.infer<typeof signupSchema>) => {
        if (!auth || !firestore) return;
        setIsLoading(true);

        try {
            if (isSigningUp) {
                const signupData = data as z.infer<typeof signupSchema>;
                const userCredential = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
                const user = userCredential.user;

                await updateProfile(user, { displayName: signupData.email.split('@')[0] });

                // Create profile immediately with phone number
                await createProfileIfNotExists(firestore, user, signupData.phoneNumber);

                toast({
                    title: 'Account Created',
                    description: "You've been successfully signed up! Please log in.",
                });
                setIsSigningUp(false);
                form.reset();
            } else {
                const loginData = data as z.infer<typeof loginSchema>;
                const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
                await handleAuthSuccess(userCredential.user);
            }
        } catch (error) {
            const firebaseError = error as { code?: string; message?: string };
            toast({
                title: isSigningUp ? 'Signup Failed' : 'Login Failed',
                description: firebaseError.code === 'auth/email-already-in-use' ? 'This email is already registered.'
                    : firebaseError.code === 'auth/invalid-credential' ? 'Invalid email or password.'
                        : 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [pendingUser, setPendingUser] = useState<User | null>(null);

    const handleGoogleSignIn = async () => {
        if (!auth || !firestore) return;
        setIsLoading(true);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if profile exists and has phone
            const userProfileRef = doc(firestore, 'users', user.uid);
            const userProfileSnap = await getDoc(userProfileRef);

            if (userProfileSnap.exists()) {
                const data = userProfileSnap.data();
                if (data.phoneNumber) {
                    await handleAuthSuccess(user);
                    return;
                }
            }

            // If no profile OR no phone, require input
            setPendingUser(user);
            setShowPhoneInput(true);
            setIsLoading(false); // Stop loading to let user type

        } catch (error) {
            console.error(error);
            const firebaseError = error as { code?: string; message?: string };
            if (firebaseError.code !== 'auth/popup-closed-by-user') {
                toast({
                    title: 'Google Sign-In Failed',
                    description: 'Could not sign in with Google. Please try again.',
                    variant: 'destructive',
                });
            }
            setIsLoading(false);
        }
    }

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingUser || !firestore) return;

        // Get phone from form
        const formData = new FormData(e.target as HTMLFormElement);
        const phone = formData.get('phone') as string;

        if (!phone || phone.length < 10) {
            toast({ title: "Invalid Phone", description: "Please enter a valid phone number.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            // Update or Create Profile
            await createProfileIfNotExists(firestore, pendingUser, phone);

            // If profile existed but missed phone, update it specifically
            const userProfileRef = doc(firestore, 'users', pendingUser.uid);
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(userProfileRef, { phoneNumber: phone });

            await handleAuthSuccess(pendingUser, phone);
        } catch (err) {
            console.error("Failed to save phone", err);
            toast({ title: "Error", description: "Failed to save phone number.", variant: "destructive" });
            setIsLoading(false);
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background px-4">
            <Card className="mx-auto max-w-sm w-full">
                <CardHeader className="text-center">
                    <Link href="/" className="inline-block mb-4">
                        <Utensils className="h-10 w-10 text-primary mx-auto" />
                    </Link>
                    <CardTitle className="text-2xl font-headline">
                        {showPhoneInput ? 'Complete Profile' : (isSigningUp ? 'Create an Account' : 'Welcome Back!')}
                    </CardTitle>
                    <CardDescription>
                        {showPhoneInput
                            ? 'Please provide your phone number to continue.'
                            : (isSigningUp ? 'Enter your details to create an account.' : 'Enter your email to sign in to your account.')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {showPhoneInput ? (
                            <form onSubmit={handlePhoneSubmit} className="grid gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Phone Number
                                    </label>
                                    <Input name="phone" type="tel" placeholder="9876543210" required minLength={10} disabled={isLoading} />
                                    <p className="text-[0.8rem] text-muted-foreground">Required for order delivery updates.</p>
                                </div>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Saving...' : 'Continue'}
                                </Button>
                            </form>
                        ) : (
                            <>
                                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                                    {isLoading ? 'Please wait...' : <><GoogleIcon /> Continue with Google</>}
                                </Button>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">
                                            Or continue with
                                        </span>
                                    </div>
                                </div>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="email"
                                                            placeholder="m@example.com"
                                                            disabled={isLoading}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {isSigningUp && (
                                            <FormField
                                                control={form.control}
                                                name="phoneNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone Number</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="tel"
                                                                placeholder="e.g. 9876543210"
                                                                disabled={isLoading}
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                        <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center">
                                                        <FormLabel>Password</FormLabel>
                                                        {!isSigningUp && <Link
                                                            href="/forgot-password"
                                                            className="ml-auto inline-block text-sm underline"
                                                        >
                                                            Forgot your password?
                                                        </Link>}
                                                    </div>
                                                    <FormControl>
                                                        <Input type="password" disabled={isLoading} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading ? 'Please wait...' : (isSigningUp ? 'Create Account' : 'Login')}
                                        </Button>
                                    </form>
                                </Form>
                            </>
                        )}
                    </div>
                    <div className="mt-4 text-center text-sm">
                        {isSigningUp ? "Already have an account?" : "Don't have an account?"}{' '}
                        <Button variant="link" className="p-0 h-auto" onClick={() => { setIsSigningUp(!isSigningUp); form.reset(); }}>
                            {isSigningUp ? 'Sign In' : 'Sign Up'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
