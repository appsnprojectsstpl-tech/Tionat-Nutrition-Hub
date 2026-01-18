'use client';

import { Suspense } from 'react';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, AlertTriangle } from "lucide-react";
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    action: string;
    targetId: string; // Order ID, Product ID, etc.
    targetType: 'ORDER' | 'PRODUCT' | 'WAREHOUSE' | 'USER';
    performedBy: string; // Admin Email/ID
    timestamp: any;
    details?: string;
    status: 'SUCCESS' | 'FAILURE';
}

function AdminAuditContent() {
    const firestore = useFirestore();

    const logsQuery = firestore
        ? query(collection(firestore, 'admin_audit_logs'), orderBy('timestamp', 'desc'), limit(50))
        : null;

    const { data: logs, isLoading } = useCollection<AuditLog>(logsQuery);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">System Audit Log</h2>
                    <p className="text-muted-foreground">Track all administrative actions for governance and compliance.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                        <Shield className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">Low</div>
                        <p className="text-xs text-muted-foreground">No anomalous admin patterns detected.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Actions</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logs?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Recorded in last 24h window.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Action History</CardTitle>
                    <CardDescription>Chronological list of all admin operations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Admin</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Loading logs...</TableCell></TableRow>}

                            {logs?.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-sm">
                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'PP p') : 'Just now'}
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">{log.performedBy}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{log.action}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{log.targetType}: {log.targetId.slice(0, 8)}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs">{log.details || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'} className="text-[10px]">
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {!isLoading && (!logs || logs.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        No audit logs found. Ensure logging is enabled.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AuditPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminAuditContent />
        </Suspense>
    );
}
