
'use client';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, writeBatch, doc } from "firebase/firestore";
import { Order } from "@/lib/types";
import { format } from 'date-fns';
import { MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrderSummaryBoard } from "@/components/admin/order-summary-board";

const statusColors: { [key: string]: string } = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Shipped: 'bg-blue-100 text-blue-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800'
}
export default function AdminOrdersPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const ordersCollection = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'orders'), orderBy('orderDate', 'desc')) : null),
    [firestore, user]
  );
  const { data: orders, isLoading } = useCollection<Order>(ordersCollection);

  const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
    if (!firestore) return;

    const batch = writeBatch(firestore);

    // Reference to the order in the top-level /orders collection
    const adminOrderRef = doc(firestore, 'orders', order.id);
    batch.update(adminOrderRef, { status: newStatus });

    // Reference to the order in the user-specific /users/{userId}/orders collection
    const userOrderRef = doc(firestore, `users/${order.userId}/orders`, order.id);
    batch.update(userOrderRef, { status: newStatus });

    try {
      await batch.commit();
      toast({
        title: "Order Updated",
        description: `Order ${order.id.slice(-6)} status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating order status: ", error);
      toast({
        title: "Update Failed",
        description: "Could not update the order status. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Orders</h1>
      <OrderSummaryBoard orders={orders || []} />
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            View and manage all customer orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="sticky right-0 bg-card"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-4">Loading orders...</TableCell></TableRow>}
              {orders && orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">
                      <span>{order.id.substring(0, 8)}...</span>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{order.shippingAddress?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {order.orderDate ? format(order.orderDate.toDate(), 'PPpp') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] sm:text-xs ${statusColors[order.status]}`}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs sm:text-sm">{(order.totalAmount || 0).toFixed(2)}</TableCell>
                    <TableCell className="sticky right-0 bg-card">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/order-details?id=${order.id}`}>View Details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleStatusChange(order, 'Pending')}>Pending</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusChange(order, 'Shipped')}>Shipped</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusChange(order, 'Delivered')}>Delivered</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleStatusChange(order, 'Cancelled')} className="text-red-600">Cancelled</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">No orders found.</TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
