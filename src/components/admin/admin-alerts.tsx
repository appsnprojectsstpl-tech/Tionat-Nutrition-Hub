'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Order, Warehouse } from "@/lib/types";
import { useMemo } from "react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

interface AdminAlertsProps {
    orders: Order[];
    warehouses: Warehouse[];
    isLoading: boolean;
}

export function AdminAlerts({ orders, warehouses, isLoading }: AdminAlertsProps) {

    // 1. High Value Orders Alert
    const highValueOrders = useMemo(() => {
        return orders.filter(o => o.totalAmount > 10000 && o.status === 'Pending');
    }, [orders]);

    // 2. Zero Order Alert (Quiet Week Detection)
    // We check if an active warehouse has had NO orders in the passed list.
    // Assuming 'orders' passed to this component is "Recent Orders" or "All Orders" (fetched in dashboard).
    // Ideally we need orders from the last 24h. 
    // If the passed 'orders' list is comprehensive (which it is in the current dashboard implementation), we can use it.
    const quietWarehouses = useMemo(() => {
        if (!warehouses || !orders) return [];

        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        // Get IDs of warehouses that HAVE orders in last 24h
        const activeWarehouseIds = new Set(
            orders
                .filter(o => o.orderDate && (o.orderDate as any).toDate() > oneDayAgo)
                .map(o => o.warehouseId)
        );

        // Find Active Warehouses NOT in that set
        return warehouses.filter(w => w.isActive && !activeWarehouseIds.has(w.id));
    }, [orders, warehouses]);


    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>System Health</CardTitle></CardHeader>
                <CardContent>Checking system status...</CardContent>
            </Card>
        )
    }

    const hasAlerts = highValueOrders.length > 0 || quietWarehouses.length > 0;

    return (
        <Card className="border-red-100 bg-red-50/10">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        {hasAlerts ? <AlertTriangle className="text-orange-500 h-5 w-5" /> : <CheckCircle2 className="text-green-500 h-5 w-5" />}
                        Operational Alerts
                    </CardTitle>
                    {!hasAlerts && <span className="text-sm text-muted-foreground text-green-600 font-medium">All Systems Normal</span>}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* High Value Orders */}
                {highValueOrders.length > 0 && (
                    <Alert variant="destructive" className="bg-white border-red-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>High Value Orders Pending ({highValueOrders.length})</AlertTitle>
                        <AlertDescription className="mt-2">
                            <p className="text-sm mb-2">The following orders exceed ₹10,000 and need review:</p>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                {highValueOrders.slice(0, 3).map(order => (
                                    <li key={order.id}>
                                        <span className="font-mono">#{order.invoiceNumber || order.id.slice(0, 6)}</span>
                                        — ₹{order.totalAmount.toLocaleString()}
                                        <Link href={`/admin/orders/${order.id}`} className="ml-2 underline text-blue-600">View</Link>
                                    </li>
                                ))}
                                {highValueOrders.length > 3 && <li>...and {highValueOrders.length - 3} more.</li>}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Quiet Warehouses */}
                {quietWarehouses.length > 0 && (
                    <Alert className="bg-white border-orange-200">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertTitle className="text-orange-800">Idle Warehouses (24h)</AlertTitle>
                        <AlertDescription className="mt-2 text-orange-700">
                            <p className="text-sm mb-2">These active warehouses have received 0 orders in the last 24 hours:</p>
                            <div className="flex flex-wrap gap-2">
                                {quietWarehouses.map(wh => (
                                    <div key={wh.id} className="px-2 py-1 bg-orange-100 rounded text-xs border border-orange-200 font-medium">
                                        {wh.name}
                                    </div>
                                ))}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {!hasAlerts && (
                    <div className="text-sm text-muted-foreground">
                        No operational anomalies detected.
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
