
'use client';

import { useState, Suspense, useEffect } from 'react';
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

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phoneNumber: z.string().min(10, "Phone number is required").max(15, "Phone number is too long"),
});

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.021,35.591,44,30.134,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { auth } = useAuth();
  const firestore = useFirestore();
  const defaultRedirectUrl = searchParams.get('redirect') || '/';

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

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user);
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      if (firebaseError.code !== 'auth/popup-closed-by-user') {
        toast({
          title: 'Google Sign-In Failed',
          description: 'Could not sign in with Google. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
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
          <CardTitle className="text-2xl font-headline">{isSigningUp ? 'Create an Account' : 'Welcome Back!'}</CardTitle>
          <CardDescription>
            {isSigningUp ? 'Enter your details to create an account.' : 'Enter your email to sign in to your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
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


function LoginPageInternal() {
  // This is a client component, so we can use useEffect
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render a loader on the server and initial client render
  if (!isClient) {
    return <div>Loading...</div>;
  }

  // After mount, render the actual content
  return <LoginContent />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageInternal />
    </Suspense>
  )
}
