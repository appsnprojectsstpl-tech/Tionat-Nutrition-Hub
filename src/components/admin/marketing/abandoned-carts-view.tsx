'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Clock, ShoppingCart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CartItem } from '@/lib/types';

interface ActiveCart {
    id: string; // userId
    email: string;
    items: CartItem[];
    subtotal: number;
    lastUpdated: any; // Timestamp
    status: 'active' | 'empty';
}

export function AbandonedCartsView() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [recoveringId, setRecoveringId] = useState<string | null>(null);

    // Query for active carts
    const cartsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // In a real app we'd filter by time > 24h. 
        // For demo, we just show all non-empty active carts.
        return query(collection(firestore, 'active_carts'), where('status', '==', 'active'));
    }, [firestore]);

    const { data: carts, isLoading } = useCollection<ActiveCart>(cartsQuery);

    const handleRecover = async (cart: ActiveCart) => {
        if (!firestore) return;
        setRecoveringId(cart.id);

        try {
            // 1. Log Recovery Attempt / Queue Email
            await addDoc(collection(firestore, 'email_campaigns'), {
                subject: 'Did you forget something?',
                body: `Hi! You left ${cart.items.length} items in your cart. Complete your purchase now!`,
                audience: 'single_user',
                targetEmail: cart.email,
                targetUserId: cart.id,
                status: 'SCHEDULED',
                type: 'ABANDONED_CART_RECOVERY',
                createdAt: serverTimestamp()
            });

            toast({
                title: "Recovery Email Queued",
                description: `Sent reminder to ${cart.email}`
            });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to send recovery email", variant: "destructive" });
        } finally {
            setRecoveringId(null);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-destructive" />
                        <CardTitle>Abandoned Carts</CardTitle>
                    </div>
                    <CardDescription>
                        Users with items in their cart who haven't checked out recently.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Last Active</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
                            ) : carts?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No active carts found.</TableCell></TableRow>
                            ) : (
                                carts?.map((cart) => (
                                    <TableRow key={cart.id}>
                                        <TableCell>
                                            <div className="font-medium">{cart.email}</div>
                                            <div className="text-xs text-muted-foreground">ID: {cart.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold">{cart.items.length} Items</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {cart.items.map(i => i.product.name).join(', ')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            ₹{cart.subtotal.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                {cart.lastUpdated?.toDate ? formatDistanceToNow(cart.lastUpdated.toDate(), { addSuffix: true }) : 'Just now'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleRecover(cart)}
                                                disabled={recoveringId === cart.id}
                                            >
                                                {recoveringId === cart.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                                                Send Recovery
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
