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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RefundTracker } from "@/components/order/refund-tracker";

// Helper Component for Returns
function ReturnDialog({ order, orderRef, rootOrderRef }: { order: Order, orderRef: any, rootOrderRef: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleReturn = async () => {
        if (!reason) {
            toast({ title: "Reason Required", description: "Please select a reason for return.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const updateData = {
                returnStatus: 'Requested',
                returnReason: reason,
                returnDate: new Date().toISOString()
            };

            if (orderRef) await updateDocumentNonBlocking(orderRef, updateData);
            if (rootOrderRef) await updateDocumentNonBlocking(rootOrderRef, updateData);

            toast({ title: "Return Requested", description: "We have received your return request." });
            setIsOpen(false);
        } catch (e) {
            toast({ title: "Error", description: "Failed to submit return request.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full text-blue-600 hover:text-blue-700 border-blue-200 bg-blue-50">
                    Return Items
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Return Items</DialogTitle>
                    <DialogDescription>
                        Which items would you like to return and why?
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Reason</Label>
                        <Select onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue placeholder="Reason for return" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="damaged">Damaged / Expired</SelectItem>
                                <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
                                <SelectItem value="quality">Quality Issues</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        * Our support team will review your request and schedule a pickup within 24 hours.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleReturn} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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

    // Helper function moved up
    const getCancelTimeLeft = (orderDate: any) => {
        if (!orderDate?.toDate) return 0;
        const now = new Date().getTime();
        const created = orderDate.toDate().getTime();
        const diff = now - created;
        const thirtyMins = 30 * 60 * 1000;
        return Math.max(0, thirtyMins - diff);
    };

    const [timeLeftMs, setTimeLeftMs] = useState<number>(0);

    React.useEffect(() => {
        if (order?.status === 'Pending' && order?.orderDate) {
            // Initial check
            setTimeLeftMs(getCancelTimeLeft(order.orderDate));

            const interval = setInterval(() => {
                const left = getCancelTimeLeft(order.orderDate);
                setTimeLeftMs(left);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [order]);

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
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl md:text-3xl font-bold font-headline">Order Details</h1>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => toast({ title: "Support Ticket", description: "This feature is coming soon!" })}>
                                Need Help?
                            </Button>
                            {order.invoiceNumber && (
                                <Button variant="outline" onClick={() => window.open(`/invoice/${order.id}`, '_blank')}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Invoice
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        {order.status === 'Cancelled' && (
                            <Card className="bg-red-50 border-red-200">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2 text-red-700">
                                        <XCircle className="h-5 w-5" />
                                        <CardTitle className="text-lg">Order Cancelled & Refunded</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-red-600 mb-2">
                                        We have processed a refund of <strong>₹{(order.totalAmount || 0).toFixed(2)}</strong> to your original payment method / wallet.
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                        <div className="flex items-center gap-1">
                                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                            <span>Refund Initiated</span>
                                        </div>
                                        <div className="h-px bg-gray-300 w-8"></div>
                                        <div className="flex items-center gap-1 opacity-70">
                                            <div className="h-2 w-2 rounded-full bg-gray-300"></div>
                                            <span>Credited (2-5 Days)</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Order Tracking</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TrackingTimeline status={order.status as any} orderDate={order.orderDate} />
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
                                    <div className="text-xs text-muted-foreground text-right mt-1">
                                        (Includes GST of ₹{((order.totalAmount || 0) - ((order.totalAmount || 0) / 1.18)).toFixed(2)})
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
                                {order.invoiceNumber && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-muted-foreground text-xs">Invoice #</span>
                                        <span className="font-mono text-xs">{order.invoiceNumber}</span>
                                    </div>
                                )}
                            </CardContent>
                            {(order.status === 'Pending') && (
                                <CardFooter className="flex-col gap-2">
                                    {timeLeftMs > 0 ? (
                                        <p className="text-xs text-center text-muted-foreground mb-1">
                                            Cancel available for {Math.floor(timeLeftMs / 60000)}m {Math.floor((timeLeftMs % 60000) / 1000)}s
                                        </p>
                                    ) : (
                                        <p className="text-xs text-center text-destructive mb-1 font-bold">Cancellation Window Closed</p>
                                    )}
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={handleCancelOrder}
                                        disabled={isCancelling || timeLeftMs <= 0}
                                    >
                                        {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                        Cancel Order
                                    </Button>
                                </CardFooter>
                            )}

                            {/* Return Button for Delivered Orders */}
                            {(order.status === 'Delivered' && !order.returnStatus) && (
                                <CardFooter className="flex-col gap-2">
                                    <p className="text-xs text-center text-muted-foreground mb-1">
                                        Return window open for 48 hours
                                    </p>
                                    <ReturnDialog order={order} orderRef={orderRef} rootOrderRef={rootOrderRef} />
                                </CardFooter>
                            )}

                            {/* Return Status Tracking */}
                            {order.returnStatus && (
                                <CardFooter className="pt-0">
                                    <RefundTracker
                                        status={order.returnStatus as any}
                                        requestedAt={(order as any).returnDate}
                                        processedAt={(order as any).returnProcessedAt}
                                    />
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
