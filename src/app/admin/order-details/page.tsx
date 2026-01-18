'use client';

import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useFunctions, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Loader2, Package, Truck, CheckCircle, XCircle, AlertTriangle, Printer, Edit, Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Order } from '@/lib/types';
import { useMemo, Suspense } from 'react';

function OrderDetailsContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user } = useUser();

    // Memoize the doc ref to prevent infinite re-renders
    const orderRef = useMemo(() => {
        return firestore && user && id ? doc(firestore, 'orders', id) : null;
    }, [firestore, id, user]);

    const { data: order, isLoading } = useDoc<Order>(orderRef);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editedItems, setEditedItems] = useState<any[]>([]);

    const handleStatusUpdate = async (newStatus: Order['status']) => {
        if (!firestore || !id || !user) return;
        try {
            const orderDocRef = doc(firestore, 'orders', id);
            await (await import('firebase/firestore')).updateDoc(orderDocRef, {
                status: newStatus,
                updatedAt: (await import('firebase/firestore')).serverTimestamp(),
                timeline: (await import('firebase/firestore')).arrayUnion({
                    state: newStatus,
                    timestamp: new Date(),
                    actor: 'admin',
                    metadata: { adminId: user.uid }
                })
            });

            if (order?.userId) {
                const userOrderRef = doc(firestore, 'users', order.userId, 'orders', id);
                await (await import('firebase/firestore')).updateDoc(userOrderRef, {
                    status: newStatus,
                    updatedAt: (await import('firebase/firestore')).serverTimestamp(),
                }).catch(e => console.warn("Could not sync to user subcollection", e));
            }

            toast({ title: "Status Updated", description: `Order marked as ${newStatus}` });
        } catch (error: any) {
            console.error("Update failed", error);
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        }
    };

    const startEditing = () => {
        if (!order) return;
        // Normalize items
        const items = order.items || order.orderItems || [];
        setEditedItems(JSON.parse(JSON.stringify(items))); // Deep copy
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditedItems([]);
    };

    const updateItemQty = (index: number, newQty: number) => {
        if (newQty < 1) return;
        const newItems = [...editedItems];
        newItems[index].quantity = newQty;
        setEditedItems(newItems);
    };

    const removeItem = (index: number) => {
        if (confirm('Remove this item from the order?')) {
            const newItems = [...editedItems];
            newItems.splice(index, 1);
            setEditedItems(newItems);
        }
    };

    const saveOrderEdits = async () => {
        if (!firestore || !id) return;
        try {
            const newTotal = editedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

            const updates = {
                items: editedItems,
                orderItems: editedItems, // Keep sync
                totalAmount: newTotal,
                updatedAt: (await import('firebase/firestore')).serverTimestamp()
            };

            const orderDocRef = doc(firestore, 'orders', id);
            await (await import('firebase/firestore')).updateDoc(orderDocRef, updates);

            if (order?.userId && order.userId !== 'GUEST') {
                const userOrderRef = doc(firestore, 'users', order.userId, 'orders', id);
                await (await import('firebase/firestore')).updateDoc(userOrderRef, updates);
            }

            setIsEditing(false);
            toast({ title: "Order Updated", description: "Quantities and Total updated successfully." });
        } catch (e) {
            console.error(e);
            toast({ title: "Save Failed", description: "Could not save changes.", variant: "destructive" });
        }
    }

    if (!id) return <div className="p-10 text-center">No Order ID provided.</div>;
    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    if (!order) return <div className="p-10 text-center">Order not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Order #{order.id.slice(0, 8)}</h1>
                    <p className="text-muted-foreground text-sm">
                        Placed on {order.createdAt ? format(order.createdAt.toDate(), 'PPP p') : 'N/A'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!isEditing && (order.status === 'Pending' || order.status === 'Accepted' || order.status === 'Processing') && (
                        <Button variant="outline" onClick={startEditing}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Order
                        </Button>
                    )}
                    <Badge className="text-lg px-4 py-1" variant={order.status === 'Paid' ? 'default' : 'secondary'}>
                        {order.status}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Customer & Shipping */}
                <Card>
                    <CardHeader><CardTitle>Customer Details</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div className="font-semibold">{order.logistics?.addressSnapshot?.name || order.shippingAddress?.name}</div>
                        <div>{order.logistics?.addressSnapshot?.address || order.shippingAddress?.address}</div>
                        <div>
                            {order.logistics?.addressSnapshot?.city || order.shippingAddress?.city},
                            {order.logistics?.addressSnapshot?.pincode || order.shippingAddress?.pincode}
                        </div>
                        <div>{order.logistics?.addressSnapshot?.phone || order.shippingAddress?.phone}</div>
                        <div className="text-sm text-muted-foreground mt-2">User ID: {order.userId}</div>
                    </CardContent>
                </Card>

                {/* Financials & Payment */}
                <Card>
                    <CardHeader><CardTitle>Payment Info</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span>Method:</span>
                            <span className="font-medium">{order.payment?.method || order.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Status:</span>
                            <Badge variant={order.payment?.status === 'SUCCESS' ? 'default' : 'destructive'}>
                                {order.payment?.status || 'PENDING'}
                            </Badge>
                        </div>
                        {order.payment?.gatewayPaymentId && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Ref:</span>
                                <span>{order.payment.gatewayPaymentId}</span>
                            </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>₹{isEditing
                                ? editedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)
                                : (order.financials?.totalAmount || order.totalAmount)?.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Order Items */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Items</span>
                        {isEditing && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="ghost" onClick={cancelEditing}>Cancel</Button>
                                <Button size="sm" onClick={saveOrderEdits}>Save Changes</Button>
                            </div>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                {isEditing && <TableHead></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(isEditing ? editedItems : (order.items || order.orderItems || [])).map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                    <TableCell>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.variantId !== 'default' ? item.variantId : ''}</div>
                                    </TableCell>
                                    <TableCell>₹{item.priceAtBooking || item.price}</TableCell>
                                    <TableCell>
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItemQty(idx, item.quantity - 1)} disabled={item.quantity <= 1}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-4 text-center">{item.quantity}</span>
                                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItemQty(idx, item.quantity + 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            `x${item.quantity}`
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">₹{(((item.priceAtBooking || item.price || 0) * (item.quantity || 1)) || 0).toFixed(2)}</TableCell>
                                    {isEditing && (
                                        <TableCell>
                                            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => removeItem(idx)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Actions & Timeline */}
            <Card>
                <CardHeader><CardTitle>Management</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {order.status !== 'Accepted' && (
                            <Button onClick={() => handleStatusUpdate('Accepted')} disabled={order.status === 'Cancelled'}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Accept Order
                            </Button>
                        )}
                        {order.status === 'Accepted' && (
                            <Button onClick={() => handleStatusUpdate('Packed')}>
                                <Package className="mr-2 h-4 w-4" /> Mark Packed
                            </Button>
                        )}
                        {order.status === 'Packed' && (
                            <Button onClick={() => handleStatusUpdate('Shipped')}>
                                <Truck className="mr-2 h-4 w-4" /> Mark Shipped
                            </Button>
                        )}
                        {order.status === 'Shipped' && (
                            <Button onClick={() => handleStatusUpdate('Delivered')} variant="secondary">
                                <CheckCircle className="mr-2 h-4 w-4" /> Confirm Delivery
                            </Button>
                        )}
                        <Button variant="destructive" onClick={() => handleStatusUpdate('Cancelled')}>
                            <XCircle className="mr-2 h-4 w-4" /> Cancel Order
                        </Button>
                        <Button variant="outline" asChild>
                            <a href={`/admin/orders/invoice?id=${order.id}`} target="_blank" rel="noopener noreferrer">
                                <Printer className="mr-2 h-4 w-4" /> Invoice
                            </a>
                        </Button>
                        <Button variant="outline" asChild>
                            <a href={`/admin/orders/label?id=${order.id}`} target="_blank" rel="noopener noreferrer">
                                <Package className="mr-2 h-4 w-4" /> Label
                            </a>
                        </Button>
                    </div>

                    <h3 className="font-semibold mb-2">Timeline</h3>
                    <div className="space-y-4 border-l-2 border-muted pl-4 ml-2">
                        {(order.timeline || []).map((event: any, idx: number) => (
                            <div key={idx} className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary" />
                                <div className="text-sm font-medium">{event.state}</div>
                                <div className="text-xs text-muted-foreground">
                                    {event.timestamp?.toDate ? format(event.timestamp.toDate(), 'PP p') : 'Just now'} by {event.actor}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AdminOrderDetailPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>}>
            <OrderDetailsContent />
        </Suspense>
    );
}
