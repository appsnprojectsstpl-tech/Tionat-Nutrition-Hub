'use client';

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import type { Order } from '@/lib/types';

interface AnalyticsChartsProps {
    orders: Order[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function AnalyticsCharts({ orders }: AnalyticsChartsProps) {
    // 1. Revenue Details (Last 7 Days)
    const revenueData = useMemo(() => {
        if (!orders) return [];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), 6 - i); // Go back 6 days + today
            return startOfDay(date);
        });

        return last7Days.map(date => {
            const dayOrders = orders.filter(order => {
                if (!order.orderDate) return false;
                // Handle Firestore Timestamp or Date object
                const orderDate = order.orderDate.hasOwnProperty('toDate')
                    // @ts-ignore
                    ? order.orderDate.toDate()
                    : new Date(order.orderDate as string);

                return isSameDay(orderDate, date);
            });

            const dailyRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

            return {
                name: format(date, 'MMM dd'),
                revenue: dailyRevenue,
                orders: dayOrders.length
            };
        });
    }, [orders]);


    // 2. Order Status Distribution
    const statusData = useMemo(() => {
        if (!orders) return [];
        const statusCounts: Record<string, number> = {};

        orders.forEach(order => {
            const status = order.status || 'Unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        return Object.entries(statusCounts).map(([name, value]) => ({
            name,
            value
        }));
    }, [orders]);

    // 3. Top Selling Products
    const topProductsData = useMemo(() => {
        if (!orders) return [];
        const productSales: Record<string, number> = {};

        orders.forEach(order => {
            order.orderItems.forEach(item => {
                const productName = item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name;
                productSales[productName] = (productSales[productName] || 0) + item.quantity;
            });
        });

        return Object.entries(productSales)
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5); // Top 5
    }, [orders]);

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Revenue Chart - Spans 4 columns */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>Daily revenue for the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `₹${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`₹${value}`, 'Revenue']}
                                        labelStyle={{ color: 'black' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#8b5cf6" // Violet
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#8b5cf6' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Chart - Spans 3 columns */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Order Status</CardTitle>
                        <CardDescription>Distribution of current orders</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>Highest quantity of items sold</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProductsData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 12 }}
                                    interval={0}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="sales" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
