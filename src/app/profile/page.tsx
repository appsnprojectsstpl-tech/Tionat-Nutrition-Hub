

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
import { Star, ChevronRight, LogOut, Shield, Edit, Home, Trash2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, orderBy, arrayUnion, arrayRemove } from "firebase/firestore";
import type { UserProfile, Order } from "@/lib/types";
import { useRouter } from "next/navigation";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { signOut } from 'firebase/auth';
import { AddressDialog } from '@/components/address-dialog';
import { useAddress } from '@/providers/address-provider';

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
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading, refetch } = useDoc<UserProfile>(userProfileRef);

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
            toast({
                title: 'Address Removed',
                description: 'The selected address has been deleted.',
                variant: 'destructive'
            });
            refetch();
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

    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'superadmin';

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
                                <AddressDialog onSave={refetch}>
                                    <Button variant="outline" size="sm">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add New
                                    </Button>
                                </AddressDialog>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <AddressListComponent onDelete={handleDeleteAddress} onRefetch={refetch} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center font-headline">
                                    <Star className="w-6 h-6 mr-2 text-yellow-500" />
                                    TioRewards Status
                                </CardTitle>
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
                                                    <TableCell>{order.orderDate ? format(order.orderDate.toDate(), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={order.status === 'Pending' ? 'secondary' : 'default'}>{order.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{order.totalAmount.toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <ChevronRight className="h-4 w-4" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            !isLoadingOrders && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                        You haven't placed any orders yet.
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
            </main>
        </div>
    );
}
