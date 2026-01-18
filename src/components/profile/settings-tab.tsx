'use client';

import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LogOut, Download, ShieldAlert, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { jsPDF } from "jspdf";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { signOut } from 'firebase/auth';
import type { UserProfile } from "@/lib/types";
import { logUserAction } from '@/lib/audit-logger';

const profileSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phoneNumber: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface SettingsTabProps {
    userProfile: UserProfile;
}

export function SettingsTab({ userProfile }: SettingsTabProps) {
    const { user, auth } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { setTheme, theme } = useTheme();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: userProfile?.firstName || '',
            lastName: userProfile?.lastName || '',
            phoneNumber: userProfile?.phoneNumber || '',
            avatarUrl: userProfile?.avatarUrl || '',
        }
    });

    // Update form when userProfile changes
    useEffect(() => {
        if (userProfile) {
            form.reset({
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                phoneNumber: userProfile.phoneNumber || '',
                avatarUrl: userProfile.avatarUrl || '',
            });
        }
    }, [userProfile, form]);

    const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
        if (!user || !firestore) return;
        const userProfileRef = doc(firestore, 'users', user.uid);

        await setDocumentNonBlocking(userProfileRef, data, { merge: true });

        toast({
            title: "Profile Updated",
            description: "Your information has been successfully saved.",
        });

        logUserAction(firestore, {
            userId: user.uid,
            action: 'PROFILE_UPDATE',
            details: 'Updated personal profile details'
        });
    };

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            toast({
                title: "Logged Out",
                description: "You have been successfully logged out.",
            });
            router.push('/');
        } catch (error) {
            console.error("Error signing out: ", error);
            toast({
                title: "Logout Failed",
                description: "An error occurred. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDownloadData = async () => {
        if (!user || !firestore) return;
        toast({ title: "Generating PDF", description: "Preparing your data export..." });

        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(20);
            doc.text("Tionat Nutrition Hub", 10, 20);
            doc.setFontSize(12);
            doc.text("User Data Export", 10, 30);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 38);

            // User Details
            doc.setLineWidth(0.5);
            doc.line(10, 45, 200, 45);
            doc.setFontSize(14);
            doc.text("Profile Information", 10, 55);

            doc.setFontSize(10);
            let y = 65;
            doc.text(`Name: ${userProfile.firstName} ${userProfile.lastName}`, 10, y); y += 8;
            doc.text(`Email: ${userProfile.email}`, 10, y); y += 8;
            doc.text(`Phone: ${userProfile.phoneNumber || 'N/A'}`, 10, y); y += 8;
            doc.text(`UID: ${user.uid}`, 10, y); y += 8;
            doc.text(`Loyalty Tier: ${userProfile.loyaltyTier || 'None'}`, 10, y); y += 8;
            doc.text(`Points: ${userProfile.loyaltyPoints || 0}`, 10, y); y += 8;

            // Footer
            doc.setFontSize(8);
            doc.text("Generated by Tionat Platform. Compliance: GDPR Art. 15", 10, 280);

            doc.save(`tionat-userdata-${user.uid.slice(0, 8)}.pdf`);
            toast({ title: "Download Ready", description: "Your PDF has been downloaded." });
        } catch (e) {
            console.error(e);
            toast({ title: "Export Failed", description: "Could not generate PDF.", variant: "destructive" });
        }
    };

    const handleDeleteAccount = async () => {
        if (!auth?.currentUser || !firestore || !user) return;
        const userProfileRef = doc(firestore, 'users', user.uid);

        try {
            await setDocumentNonBlocking(userProfileRef, {
                isDeleted: true,
                deletedAt: new Date().toISOString()
            }, { merge: true });

            import('firebase/auth').then(async ({ deleteUser }) => {
                await deleteUser(auth.currentUser!);
                router.push('/');
                toast({ title: "Account Deleted", description: "Your account has been deleted." });
            });
        } catch (e) {
            toast({ title: "Error", description: "Login again and try.", variant: "destructive" });
        }
    };

    // App Version (Mock build info)
    const appVersion = "v1.2.0";
    const buildNumber = "45";

    return (
        <div className="space-y-6">
            {/* Edit Profile Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Personal Information</CardTitle>
                    <CardDescription>Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>First Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Last Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 9876543210" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="avatarUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Avatar URL (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end">
                                <Button type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">App Settings</CardTitle>
                    <CardDescription>Manage your preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Theme</Label>
                            <p className="text-sm text-muted-foreground">Select your interface color scheme.</p>
                        </div>
                        <div className="flex bg-secondary p-1 rounded-lg">
                            <Button
                                variant={theme === 'light' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setTheme('light')}
                                className="h-8 px-2"
                            >
                                <Sun className="h-4 w-4 mr-1" /> Light
                            </Button>
                            <Button
                                variant={theme === 'dark' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setTheme('dark')}
                                className="h-8 px-2"
                            >
                                <Moon className="h-4 w-4 mr-1" /> Dark
                            </Button>
                            <Button
                                variant={theme === 'system' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setTheme('system')}
                                className="h-8 px-2"
                            >
                                <Monitor className="h-4 w-4 mr-1" /> System
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Notifications</CardTitle>
                    <CardDescription>Manage how we communicate with you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Order Updates</Label>
                            <p className="text-sm text-muted-foreground">Receive updates about your order status.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Promotional Emails</Label>
                            <p className="text-sm text-muted-foreground">Receive offers and discounts.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* Active Session */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Active Session</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="bg-green-100 p-3 rounded-full">
                            <Monitor className="h-6 w-6 text-green-700" />
                        </div>
                        <div>
                            <p className="font-medium">Current Device</p>
                            <p className="text-sm text-muted-foreground">Active Now • Bangalore, IN</p>
                            <p className="text-xs text-muted-foreground mt-1 text-green-600 font-semibold">Secure Connection</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data & Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Account Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start" onClick={handleDownloadData}>
                        <Download className="mr-2 h-4 w-4" />
                        Download My Data (PDF)
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log Out
                    </Button>
                </CardContent>
                <CardFooter className="bg-muted/30 py-3">
                    <p className="text-xs text-muted-foreground w-full text-center">
                        App Version: {appVersion} (Build {buildNumber})
                    </p>
                </CardFooter>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2 text-base">
                        <ShieldAlert className="h-5 w-5" /> Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="w-full sm:w-auto">
                                Delete Account
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Account</DialogTitle>
                                <DialogDescription>
                                    Are you sure? This action cannot be undone. All your data will be permanently deleted in accordance with GDPR.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteAccount}>Confirm Delete</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    );
}
