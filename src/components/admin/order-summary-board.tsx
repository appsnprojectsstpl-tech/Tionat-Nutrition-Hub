import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Order } from "@/lib/types";
import { CheckCircle, Clock, Package, Truck, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { isToday } from "date-fns";

interface OrderSummaryBoardProps {
    orders: Order[];
}

export function OrderSummaryBoard({ orders }: OrderSummaryBoardProps) {
    if (!orders) return null;

    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    const packedCount = orders.filter(o => o.status === 'Packed').length; // Assuming 'Packed' status exists or mapped
    const shippedCount = orders.filter(o => o.status === 'Shipped').length;
    const deliveredCount = orders.filter(o => o.status === 'Delivered').length;

    // Daily Goal Logic
    const ordersToday = orders.filter(o => {
        return o.orderDate && o.orderDate.toDate && isToday(o.orderDate.toDate());
    }).length;

    const dailyGoal = 20;
    const progress = Math.min((ordersToday / dailyGoal) * 100, 100);

    return (
        <div className="space-y-4">
            {/* Status Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-yellow-50 border-yellow-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-900">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-700">{pendingCount}</div>
                        <p className="text-xs text-yellow-600/80">Needs attention</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">Shipped</CardTitle>
                        <Truck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{shippedCount}</div>
                        <p className="text-xs text-blue-600/80">On the way</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-900">Delivered</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{deliveredCount}</div>
                        <p className="text-xs text-green-600/80">Completed orders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ordersToday} <span className="text-sm font-normal text-muted-foreground">/ {dailyGoal} Goal</span></div>
                        <Progress value={progress} className="h-2 mt-2" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
