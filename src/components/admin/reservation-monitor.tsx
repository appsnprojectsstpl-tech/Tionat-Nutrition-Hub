'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Loader2, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function ReservationMonitor() {
    const firestore = useFirestore();

    // Fetch Active Reservations (Limit 50 latest)
    // Filter logic: In a real app, you might want only 'active' status.
    // Here we show all to monitor lifecycle.
    // Memoize the query to prevent infinite loops/warnings
    const reservationsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'inventory_reservations'), orderBy('timestamp', 'desc'), limit(50)) : null,
        [firestore]
    );

    const { data: reservations, isLoading } = useCollection<any>(reservationsQuery);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Live Reservations
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead className="text-xs text-muted-foreground">Expires At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reservations?.map((res) => (
                            <TableRow key={res.id}>
                                <TableCell className="whitespace-nowrap text-xs">
                                    {res.timestamp?.toDate ? format(res.timestamp.toDate(), 'HH:mm:ss') : 'Just now'}
                                </TableCell>
                                <TableCell className="text-xs font-mono">
                                    {res.warehouseId}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {/* Ideally we join product name, but SKU/ProductId is fine for monitor */}
                                    {res.items?.[0]?.productId.slice(0, 8)}... (x{res.items?.length})
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {res.items?.reduce((acc: number, item: any) => acc + item.quantity, 0)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={res.status === 'committed' ? 'default' : 'secondary'} className="text-[10px]">
                                        {res.status || 'Held'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {res.expiresAt?.toDate ? format(res.expiresAt.toDate(), 'HH:mm:ss') : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && reservations?.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-center py-4">No active reservations.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
