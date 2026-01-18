'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { Order, Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReportsPage() {
    const firestore = useFirestore();

    // 1. Fetch Paid/Delivered Orders
    // Simplified: Fetch all non-cancelled for now to see volume? Or just Paid/Delivered.
    // Financials usually only count Paid/Delivered.
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

    // 2. Fetch Products for Cost Price
    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'products');
    }, [firestore]);

    const { data: products } = useCollection<Product>(productsQuery);

    // Compute Financials
    const validOrders = orders?.filter(o => ['Paid', 'Shipped', 'Delivered'].includes(o.status)) || [];

    // Create Product Map for fast lookup
    const productCostMap = new Map<string, number>();
    products?.forEach(p => {
        productCostMap.set(p.id, p.costPrice || 0); // Default to 0 if not set
    });

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalTax = 0;

    const reportData = validOrders.map(order => {
        const orderId = order.id;
        const date = order.createdAt ? format(order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt), 'yyyy-MM-dd') : 'N/A';
        const revenue = order.finalAmount || order.totalAmount || 0;

        let orderCost = 0;
        order.orderItems.forEach(item => {
            const cost = productCostMap.get(item.productId) || 0;
            orderCost += cost * item.quantity;
        });

        // Tax Logic: Assume Revenue is Inclusive of 18% GST => Revenue = Base * 1.18
        const baseAmount = revenue / 1.18;
        const tax = revenue - baseAmount;

        const profit = revenue - orderCost - tax; // Net Profit after Tax and COGS? 
        // Gross Profit = Revenue - COGS. Tax is separate liability.
        // Let's report Gross Profit (Revenue - COGS) and estimated Tax liability.

        const grossProfit = revenue - orderCost; // Pre-tax profit? 
        // Usually Profit Report => Sales - COGS = Gross Profit.

        totalRevenue += revenue;
        totalCOGS += orderCost;
        totalTax += tax;

        return {
            orderId: order.poNumber || order.id,
            date,
            status: order.status,
            revenue: revenue.toFixed(2),
            cogs: orderCost.toFixed(2),
            grossProfit: grossProfit.toFixed(2),
            taxLiability: tax.toFixed(2)
        };
    });

    const netProfit = totalRevenue - totalCOGS; // Gross Profit
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const handleExport = () => {
        const csv = Papa.unparse(reportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `financial_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (ordersLoading) return <div className="p-8">Loading Financial Data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Financial Reports</h1>
                    <p className="text-muted-foreground">Profit & Loss Analysis</p>
                </div>
                <Button onClick={handleExport} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Export CSV
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-800">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-green-600">Gross Sales (Paid)</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-800">Total COGS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-900">₹{totalCOGS.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-red-600">Cost of Goods Sold</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Gross Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">₹{netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-blue-600">{profitMargin.toFixed(1)}% Margin</p>
                    </CardContent>
                </Card>

                <Card className="bg-secondary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Est. GST (18%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Inclusive Liability</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Breakdown of recent paid orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Order ID</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">COGS</TableHead>
                                <TableHead className="text-right">Profit</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.slice(0, 10).map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell>{row.date}</TableCell>
                                    <TableCell className="font-mono text-xs">{row.orderId.slice(0, 8)}...</TableCell>
                                    <TableCell className="text-right">₹{row.revenue}</TableCell>
                                    <TableCell className="text-right">₹{row.cogs}</TableCell>
                                    <TableCell className="text-right font-medium text-green-600">₹{row.grossProfit}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
