
'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ChevronRight } from "lucide-react";
import { useAuth, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { Order } from "@/lib/types";
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { AppHeader } from '@/components/header';

export default function OrdersPage() {
    const { user, isUserLoading } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();

    const ordersQuery = useMemoFirebase(
        () => (firestore && user ? query(collection(firestore, `users/${user.uid}/orders`), orderBy('createdAt', 'desc')) : null),
        [firestore, user]
    );
    const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

    if (isUserLoading) {
        return (
            <div className="min-h-screen bg-background">
                <AppHeader />
                <main className="container mx-auto px-4 py-8 text-center">
                    <p>Loading your orders...</p>
                </main>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <AppHeader />
                <main className="container mx-auto px-4 py-8 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline mb-6">Please Log In</h1>
                    <p className="text-muted-foreground mb-8">You need to be logged in to view your orders.</p>
                    <Button asChild>
                        <Link href="/login?redirect=/orders">Login</Link>
                    </Button>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-2xl md:text-3xl font-bold font-headline mb-6">My Orders</h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Order History</CardTitle>
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
                                            <TableCell>{order.createdAt ? format(order.createdAt.toDate(), 'MMM d, yyyy') : 'N/A'}</TableCell>
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
            </main>
        </div>
    );
}
