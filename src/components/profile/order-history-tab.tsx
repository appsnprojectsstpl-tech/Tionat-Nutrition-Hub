'use client';

import { useState } from 'react';
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { RefreshCw, ChevronRight, ShoppingBag, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { Order, Product } from "@/lib/types";

interface OrderHistoryTabProps {
    orders: Order[] | null;
    isLoading: boolean;
}

export function OrderHistoryTab({ orders, isLoading }: OrderHistoryTabProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { addToCart } = useCart();
    const firestore = useFirestore();

    const [searchTerm, setSearchTerm] = useState("");

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

    // Filter orders based on search
    const filteredOrders = orders?.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        // Add more search fields if needed, e.g. products inside
        order.orderItems.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="font-headline">Order History</CardTitle>
                        <CardDescription>View your past orders and their status.</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search orders..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <div className="flex flex-col items-center">
                                        {/* Simple spinner or skeleton could go here */}
                                        <span className="text-muted-foreground">Loading orders...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading && filteredOrders && filteredOrders.length > 0 ? (
                            filteredOrders.map(order => (
                                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/profile/order-details?id=${order.id}`)}>
                                    <TableCell className="font-medium font-mono text-xs sm:text-sm">
                                        ...{order.id.slice(-6)}
                                    </TableCell>
                                    <TableCell>
                                        {order.orderDate && (order.orderDate as any).toDate ? format((order.orderDate as any).toDate(), 'MMM d, yyyy') : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={order.status === 'Pending' ? 'secondary' : order.status === 'Cancelled' ? 'destructive' : 'default'}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ₹{(order.totalAmount || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleReorder(e, order)}
                                                title="Buy Again"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center py-8 text-center">
                                            <div className="bg-secondary/30 p-6 rounded-full mb-4">
                                                <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-50" />
                                            </div>
                                            <h3 className="font-semibold text-xl mb-2">No orders found</h3>
                                            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                                                {searchTerm ? "Try adjusting your search terms." : "Start ordering your favorite healthy snacks and meals today!"}
                                            </p>
                                            {!searchTerm && (
                                                <Button asChild variant="outline">
                                                    <Link href="/">Browse Products</Link>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
