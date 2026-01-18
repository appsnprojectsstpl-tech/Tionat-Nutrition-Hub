'use client';

import { useCollection, useFirestore } from '@/firebase';
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
import { Loader2 } from "lucide-react";

export function AuditLogViewer() {
    const firestore = useFirestore();

    const { data: logs, isLoading } = useCollection<any>(
        firestore ? query(collection(firestore, 'inventory_logs'), orderBy('timestamp', 'desc'), limit(50)) : null
    );

    if (isLoading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>Reason</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {logs?.map((log) => (
                    <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, HH:mm') : 'Pending'}
                        </TableCell>
                        <TableCell className="text-xs">
                            <div className="font-medium">{log.userName || 'System'}</div>
                            <div className="text-[10px] text-muted-foreground">{log.warehouseId}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline">{log.type || 'STOCK_UPDATE'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                            {log.productName}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            <span className={log.change > 0 ? "text-green-600" : "text-red-600"}>
                                {log.change > 0 ? '+' : ''}{log.change}
                            </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {log.reason}
                        </TableCell>
                    </TableRow>
                ))}
                {!isLoading && logs?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center">No audit logs found.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    );
}
