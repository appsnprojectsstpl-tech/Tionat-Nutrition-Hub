'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Download } from "lucide-react";
import { format } from 'date-fns';

export default function InvoiceRegistryPage() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    // Query Logic: Search by Invoice Number if input, else Show Recent 50
    const invoicesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const ordersRef = collection(firestore, 'orders');

        if (searchTerm.length > 3) {
            // Firestore doesn't support substring search effortlessly.
            // We'll search by exact match or prefix if we had array-contains (not here).
            // For now, let's just assume exact match or strict prefix on 'invoiceNumber' field.
            return query(
                ordersRef,
                where('invoiceNumber', '>=', searchTerm),
                where('invoiceNumber', '<=', searchTerm + '\uf8ff'),
                limit(10)
            );
        }

        return query(ordersRef, orderBy('orderDate', 'desc'), limit(50));
    }, [firestore, searchTerm]);

    const { data: orders, isLoading } = useCollection<Order>(invoicesQuery);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Invoice Registry</h1>
                    <p className="text-muted-foreground">Official record of all tax invoices issued by the platform.</p>
                </div>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Issued Invoices</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Invoice Number..."
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
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead className="text-right">Taxable</TableHead>
                                <TableHead className="text-right">GST (Inc)</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading Registry...</TableCell></TableRow>
                            ) : orders?.map((order) => (
                                <TableRow key={order.id} className={!order.invoiceNumber ? "opacity-50" : ""}>
                                    <TableCell className="font-mono font-medium">
                                        {order.invoiceNumber || <span className="text-muted-foreground italic">Pending</span>}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {order.orderDate?.toDate ? format(order.orderDate.toDate(), 'PP') : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{order.id.slice(0, 8)}...</TableCell>
                                    <TableCell className="text-sm">{order.shippingAddress?.name}</TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                        ₹{((order.totalAmount || 0) / 1.18).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">
                                        ₹{((order.totalAmount || 0) - ((order.totalAmount || 0) / 1.18)).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        ₹{order.totalAmount?.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={order.status === 'Cancelled' ? 'destructive' : 'outline'}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {orders && orders.length === 0 && (
                                <TableRow><TableCell colSpan={8} className="text-center py-8">No invoices found matching criteria.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
