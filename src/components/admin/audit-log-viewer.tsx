'use client';

import { useCollection, useFirestore } from "@/firebase";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import { AuditLogEntry } from "@/lib/audit-logger";
import { useMemoFirebase } from "@/firebase";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toDate } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function AuditLogViewer() {
    const firestore = useFirestore();
    const [filterType, setFilterType] = useState<string>('ALL');

    const logsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const baseRef = collection(firestore, 'admin_audit_logs');

        if (filterType !== 'ALL') {
            return query(baseRef, where('targetType', '==', filterType), orderBy('timestamp', 'desc'), limit(50));
        }

        return query(baseRef, orderBy('timestamp', 'desc'), limit(50));
    }, [firestore, filterType]);

    const { data: logs, isLoading } = useCollection<AuditLogEntry & { id: string; timestamp: any }>(logsQuery);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>System Audit Logs</CardTitle>
                    <CardDescription>Recent sensitive actions performed by admins.</CardDescription>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Actions</SelectItem>
                        <SelectItem value="ORDER">Orders</SelectItem>
                        <SelectItem value="PRODUCT">Products</SelectItem>
                        <SelectItem value="WAREHOUSE">Warehouses</SelectItem>
                        <SelectItem value="SYSTEM">System Config</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Loading logs...</TableCell></TableRow>}
                        {logs && logs.length > 0 ? (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {log.timestamp ? format(toDate(log.timestamp), 'MMM d, HH:mm:ss') : '-'}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs">{log.performedBy}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{log.action}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{log.targetType} / {log.targetId}</TableCell>
                                    <TableCell className="text-xs max-w-xs truncate" title={log.details}>
                                        {log.details}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            !isLoading && <TableRow><TableCell colSpan={5} className="text-center">No logs found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
