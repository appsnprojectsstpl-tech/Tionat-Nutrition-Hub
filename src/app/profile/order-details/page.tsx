'use client';


import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { Order } from '@/lib/types';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, XCircle } from 'lucide-react';
import React, { Suspense, useState } from 'react';
import { TrackingTimeline } from '@/components/tracking-timeline';
import { useToast } from '@/hooks/use-toast';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

function OrderDetailsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('id');
    const { user, isUserLoading } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isCancelling, setIsCancelling] = useState(false);

    const orderRef = useMemoFirebase(
        () => (firestore && user && orderId ? doc(firestore, `users/${user.uid}/orders`, orderId) : null),
        [firestore, user, orderId]
    );

    const rootOrderRef = useMemoFirebase(
        () => (firestore && orderId ? doc(firestore, 'orders', orderId) : null),
        [firestore, orderId]
    );

    const { data: order, isLoading } = useDoc<Order>(orderRef);

    // Initial loading or auth loading
    if (!orderId) {
        // Handle missing ID gracefully
        return (
            <div className="min-h-screen bg-background">
                <main className="container mx-auto px-4 py-8 text-center pt-20">
                    <p className="text-muted-foreground">Order ID not found.</p>
                    <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
                </main>
            </div>
        );
    }

    if (isUserLoading || isLoading) {
        return (
            <div className="min-h-screen bg-background pt-20">
                <main className="container mx-auto px-4 py-8 text-center">
                    <p>Loading order details...</p>
                </main>
            </div>
        );
    }

    if (!user) {
        // Should ideally redirect, but safe fallback
        router.push('/login?redirect=/profile');
        return null;
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-background pt-20">
                <main className="container mx-auto px-4 py-8 text-center">
                    <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
                    <p className="text-muted-foreground mb-6">We couldn't find the order you are looking for.</p>
                    <Button onClick={() => router.back()}>Back to Profile</Button>
                </main>
            </div>
        );
    }

    const handleCancelOrder = async () => {
        if (!confirm('Are you sure you want to cancel this order? It cannot be undone.')) return;

        setIsCancelling(true);
        try {
            if (orderRef) {
                await updateDocumentNonBlocking(orderRef, { status: 'Cancelled' });
            }
            if (rootOrderRef) {
                // Best effort to update root order
                await updateDocumentNonBlocking(rootOrderRef, { status: 'Cancelled' });
            }

            toast({
                title: "Order Cancelled",
                description: "Your order has been successfully cancelled.",
            });
        } catch (error) {
            console.error("Cancellation error", error);
            toast({
                title: "Cancellation Failed",
                description: "There was an error cancelling your order. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Profile
                    </Button>
                    <h1 className="text-2xl md:text-3xl font-bold font-headline">Order Details</h1>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Tracking</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TrackingTimeline status={order.status as any} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Summary</CardTitle>
                                <CardDescription>
                                    Order ID: {order.id}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {(order.orderItems && Array.isArray(order.orderItems)) ? order.orderItems.map((item) => (
                                        <li key={item.productId} className="flex justify-between items-center text-sm">
                                            <div>
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-muted-foreground">
                                                    {item.quantity} x {item.price.toFixed(2)}
                                                </p>
                                            </div>
                                            <p>{(item.quantity * item.price).toFixed(2)}</p>
                                        </li>
                                    )) : (
                                        <li className="text-sm text-muted-foreground">No items in this order.</li>
                                    )}
                                </ul>
                                <Separator className="my-4" />
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{(order.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Shipping</span>
                                        <span>Free</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between font-bold text-base">
                                        <span>Total</span>
                                        <span>{(order.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Order Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Status</span>
                                    <Badge variant={order.status === 'Pending' ? 'secondary' : 'default'}>{order.status}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Date</span>
                                    <span>{order.orderDate && (order.orderDate as any).toDate ? format((order.orderDate as any).toDate(), 'PP') : 'N/A'}</span>
                                </div>
                            </CardContent>
                            {(order.status === 'Pending') && (
                                <CardFooter>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={handleCancelOrder}
                                        disabled={isCancelling}
                                    >
                                        {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                        Cancel Order
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Shipping Address</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                {order.shippingAddress ? (
                                    <>
                                        <p className="font-semibold">{order.shippingAddress.name}</p>
                                        <p className="text-muted-foreground">{order.shippingAddress.address}</p>
                                        <p className="text-muted-foreground">{order.shippingAddress.city}, {order.shippingAddress.pincode}</p>
                                        <p className="text-muted-foreground">Phone: {order.shippingAddress.phone}</p>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">Address details not available for this order.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function OrderDetailsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <OrderDetailsContent />
        </Suspense>
    );
}
