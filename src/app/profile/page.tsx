

'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Star, ChevronRight, LogOut, Shield, Edit, Home, Trash2, PlusCircle, ShoppingBag, RefreshCw, Download, Wallet, Heart, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, orderBy, arrayUnion, arrayRemove, getDoc, getDocs } from "firebase/firestore";
import type { UserProfile, Order, Product } from "@/lib/types";
import { useRouter } from "next/navigation";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { signOut } from 'firebase/auth';
import { AddressDialog } from '@/components/address-dialog';
import { useAddress } from '@/providers/address-provider';
import { useCart } from '@/hooks/use-cart';
import { logUserAction } from '@/lib/audit-logger';

// Component to display address list using AddressProvider
function AddressListComponent({ onDelete, onRefetch }: { onDelete: (address: string) => void, onRefetch: () => void }) {
    const { savedAddresses } = useAddress();

    // Remove duplicates by using a Set
    const uniqueAddresses = Array.from(new Set(savedAddresses));

    if (!uniqueAddresses || uniqueAddresses.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">No addresses saved yet. Add your first delivery address.</p>;
    }

    return (
        <>
            {uniqueAddresses.map((address, index) => (
                <div key={`${address}-${index}`} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-4">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm">{address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AddressDialog address={address} onSave={onRefetch}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </AddressDialog>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(address)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </>
    );
}



const profileSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phoneNumber: z.string().optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const tierColors: { [key: string]: string } = {
    Bronze: "bg-orange-200 text-orange-800",
    Silver: "bg-slate-200 text-slate-800",
    Gold: "bg-yellow-200 text-yellow-800",
};

export default function ProfilePage() {
    const { user, auth, isUserLoading } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { addToCart } = useCart();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    const ordersQuery = useMemoFirebase(
        () => (firestore && user ? query(collection(firestore, `users/${user.uid}/orders`), orderBy('orderDate', 'desc')) : null),
        [firestore, user]
    );
    const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);


    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            phoneNumber: '',
            avatarUrl: '',
        }
    });

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

    const onSubmit: SubmitHandler<ProfileFormData> = (data) => {
        if (!userProfileRef) return;

        setDocumentNonBlocking(userProfileRef, data, { merge: true });

        toast({
            title: "Profile Updated",
            description: "Your information has been successfully saved.",
        });

        if (userProfileRef && user?.uid && firestore) {
            logUserAction(firestore, {
                userId: user.uid,
                action: 'PROFILE_UPDATE',
                details: 'Updated personal profile details'
            });
        }

        setIsDialogOpen(false);
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
                description: "An error occurred while logging out. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteAddress = (addressToDelete: string) => {
        if (!userProfileRef) return;
        if (confirm('Are you sure you want to delete this address?')) {
            updateDocumentNonBlocking(userProfileRef, {
                addresses: arrayRemove(addressToDelete)
            });

            if (firestore) {
                logUserAction(firestore, {
                    userId: user.uid,
                    action: 'PROFILE_UPDATE',
                    details: `Deleted address: ${addressToDelete}`
                });
            }

            toast({
                title: 'Address Removed',
                description: 'The selected address has been deleted.',
                variant: 'destructive'
            });
            // Refetch not available on hook, but updateDocumentNonBlocking should trigger listener update
        }
    };

    const handleDownloadData = async () => {
        if (!user || !firestore) return;
        toast({ title: "Preparing Data", description: "Collecting all your information..." });

        try {
            // 1. Fetch all orders
            const ordersRef = collection(firestore, `users/${user.uid}/orders`);
            const ordersSnap = await getDocs(query(ordersRef)); // imports needed
            const ordersData = ordersSnap.docs.map(d => d.data());

            // 2. Compile Data
            const exportData = {
                userProfile: userProfile,
                orders: ordersData,
                exportedAt: new Date().toISOString(),
                compliance: "GDPR Art. 15 / DPDP Act"
            };

            // 3. Download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tionat-data-${user.uid}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({ title: "Download Ready", description: "Your data has been downloaded." });
        } catch (e) {
            console.error("Export failed", e);
            toast({ title: "Export Failed", description: "Could not download data.", variant: "destructive" });
        }
    };

    const handleReorder = async (e: React.MouseEvent, order: Order) => {
        e.stopPropagation(); // Prevent row click
        if (!firestore) return;

        toast({
            title: "Reordering...",
            description: "Adding items to your cart.",
        });

        let addedCount = 0;
        for (const item of order.orderItems) {
            try {
                const productDoc = await getDoc(doc(firestore, 'products', item.productId));
                if (productDoc.exists()) {
                    const productData = { id: productDoc.id, ...productDoc.data() } as Product;
                    addToCart(productData, item.quantity);
                    addedCount++;
                }
            } catch (e) {
                console.error("Failed to fetch product for reorder", e);
            }
        }

        if (addedCount > 0) {
            router.push('/cart');
        } else {
            toast({
                title: "Reorder Failed",
                description: "Could not find products to reorder.",
                variant: "destructive"
            });
        }
    };

    const isLoading = isUserLoading || isProfileLoading;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">

                <main className="container mx-auto px-4 py-8 text-center">
                    <p>Loading profile...</p>
                </main>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background">

                <main className="container mx-auto px-4 py-8 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline mb-6">Please Log In</h1>
                    <p className="text-muted-foreground mb-8">You need to be logged in to view your profile.</p>
                    <Button asChild>
                        <Link href="/login?redirect=/profile">Login</Link>
                    </Button>
                </main>
            </div>
        )
    }

    if (!userProfile && !isProfileLoading) {
        return (
            <div className="min-h-screen bg-background">

                <main className="container mx-auto px-4 py-8 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline mb-6">Profile Not Found</h1>
                    <p className="text-muted-foreground mb-8">We couldn't find a profile for your account. This can sometimes happen after a new sign-up. Please try refreshing the page or contact support if the issue persists.</p>
                    <Button onClick={() => window.location.reload()}>Refresh Page</Button>
                </main>
            </div>
        )
    }

    if (!userProfile && isProfileLoading) {
        return (
            <div className="min-h-screen bg-background">

                <main className="container mx-auto px-4 py-8 text-center">
                    <p>Loading profile...</p>
                </main>
            </div>
        )
    }

    if (!userProfile) return null;

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'superadmin' || userProfile.role === 'warehouse_admin';

    return (
        <div className="min-h-screen bg-background">

            <main className="container mx-auto px-4 py-8">
                <div className="grid gap-8 md:grid-cols-3">
                    <div className="md:col-span-1">
                        <Card>
                            <CardHeader className="flex flex-col items-center text-center">
                                <Avatar className="w-24 h-24 mb-4">
                                    {userProfile.avatarUrl && <AvatarImage src={userProfile.avatarUrl} alt={userProfile.firstName} />}
                                    <AvatarFallback>{userProfile.firstName?.charAt(0)}{userProfile.lastName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <CardTitle className="font-headline text-2xl">{userProfile.firstName} {userProfile.lastName}</CardTitle>
                                <CardDescription>{userProfile.email}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-2">
                                {isAdmin && (
                                    <Button asChild className="w-full">
                                        <Link href="/admin">
                                            <Shield className="mr-2 h-4 w-4" />
                                            Admin Dashboard
                                        </Link>
                                    </Button>
                                )}
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full">Edit Profile</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Edit Profile</DialogTitle>
                                            <DialogDescription>
                                                Update your personal information.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <Form {...form}>
                                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                                <FormField
                                                    control={form.control}
                                                    name="avatarUrl"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Avatar URL</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="https://example.com/avatar.png" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
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
                                                <DialogFooter>
                                                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                                    <Button type="submit">Save Changes</Button>
                                                </DialogFooter>
                                            </form>
                                        </Form>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </Button>
                                <Button variant="link" size="sm" onClick={handleDownloadData} className="text-muted-foreground text-xs mt-2">
                                    <Download className="mr-2 h-3 w-3" />
                                    Download My Data
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-2 space-y-8">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="font-headline">Manage Addresses</CardTitle>
                                    <CardDescription>Add or remove your delivery addresses.</CardDescription>
                                </div>
                                <AddressDialog onSave={() => { }}>
                                    <Button variant="outline" size="sm">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add New
                                    </Button>
                                </AddressDialog>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AddressListComponent onDelete={handleDeleteAddress} onRefetch={() => { }} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="flex items-center font-headline text-base">
                                    <Star className="w-6 h-6 mr-2 text-yellow-500" />
                                    TioRewards Status
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/profile/loyalty">View History <ChevronRight className="ml-1 h-3 w-3" /></Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="grid gap-6 sm:grid-cols-2">
                                <div className="flex flex-col items-center justify-center p-6 bg-secondary rounded-lg">
                                    {userProfile.loyaltyTier ? (
                                        <>
                                            <Badge className={cn("text-sm font-bold px-4 py-1", tierColors[userProfile.loyaltyTier])}>
                                                {userProfile.loyaltyTier} Tier
                                            </Badge>
                                            <p className="text-muted-foreground mt-2 text-sm">
                                                {
                                                    userProfile.loyaltyTier === "Gold" ? "15% off + early access" :
                                                        userProfile.loyaltyTier === "Silver" ? "10% off + free shipping" : "5% off basic perks"
                                                }
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground">No tier yet.</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-center justify-center p-6 bg-secondary rounded-lg">
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-bold">{userProfile.loyaltyPoints || 0}</span>
                                        <span className="ml-2 text-muted-foreground">Points</span>
                                    </div>
                                    <p className="text-muted-foreground mt-2 text-sm">100 points = 25 discount</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-r from-gray-50 to-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-headline flex items-center gap-2">
                                    <Wallet className="h-5 w-5 text-green-600" />
                                    Wallet & Refunds
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/profile/wallet">View History <ChevronRight className="ml-1 h-3 w-3" /></Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold">₹{(userProfile.walletBalance || 0).toFixed(2)}</span>
                                    <span className="text-xs text-muted-foreground">Available Balance</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-r from-pink-50 to-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-headline flex items-center gap-2">
                                    <Heart className="h-5 w-5 text-red-500" />
                                    My Wishlist
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/wishlist">View All <ChevronRight className="ml-1 h-3 w-3" /></Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold">{userProfile.wishlist?.length || 0}</span>
                                    <span className="text-xs text-muted-foreground">Saved Items</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-r from-violet-100 to-indigo-50 border-indigo-200">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-headline flex items-center gap-2 text-indigo-900">
                                    <Gift className="h-5 w-5 text-indigo-600" />
                                    Refer & Earn
                                </CardTitle>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href="/profile/referrals">Invite <ChevronRight className="ml-1 h-3 w-3" /></Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-medium text-indigo-700">Get 100 pts per friend</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Order History</CardTitle>
                                <CardDescription>View your past orders and their status.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order ID</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead><span className="sr-only">View</span></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingOrders && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center">Loading orders...</TableCell>
                                            </TableRow>
                                        )}
                                        {orders && orders.length > 0 ? (
                                            orders.map(order => (
                                                <TableRow key={order.id} className="cursor-pointer" onClick={() => router.push(`/profile/order-details?id=${order.id}`)}>
                                                    <TableCell className="font-medium">...{order.id.slice(-6)}</TableCell>
                                                    <TableCell>{order.orderDate && (order.orderDate as any).toDate ? format((order.orderDate as any).toDate(), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={order.status === 'Pending' ? 'secondary' : 'default'}>{order.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{(order.totalAmount || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => handleReorder(e, order)}
                                                            title="Buy Again"
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                        </Button>
                                                        <ChevronRight className="h-4 w-4 ml-2 inline-block" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            !isLoadingOrders && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-48 text-center">
                                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                                            <div className="bg-secondary/30 p-4 rounded-full mb-3">
                                                                <ShoppingBag className="h-8 w-8 text-muted-foreground opacity-50" />
                                                            </div>
                                                            <h3 className="font-semibold text-lg mb-1">No orders yet</h3>
                                                            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                                                                Start ordering your favorite healthy snacks and meals today!
                                                            </p>
                                                            <Button asChild variant="outline" size="sm">
                                                                <Link href="/">Browse Products</Link>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main >
        </div >
    );
}
