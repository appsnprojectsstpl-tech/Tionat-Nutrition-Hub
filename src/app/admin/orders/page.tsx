
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
import { collection, query, orderBy, writeBatch, doc, where, limit, serverTimestamp, increment } from "firebase/firestore";
import { Order } from "@/lib/types";
import { format } from 'date-fns';
import { MoreHorizontal, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrderSummaryBoard } from "@/components/admin/order-summary-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logAdminAction } from "@/lib/audit-logger";

const statusColors: { [key: string]: string } = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Shipped: 'bg-blue-100 text-blue-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800'
}
export default function AdminOrdersPage() {
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();

  const ordersCollection = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;

      const baseRef = collection(firestore, 'orders');

      // 1. Wait for Profile to Load
      // If we have a user but no profile yet, return null (loading) 
      // instead of falling through to the Super Admin query which will FAIL permissions.
      if (user && !userProfile) return null;

      // Filter for Warehouse Admin
      if (userProfile?.role === 'warehouse_admin' && userProfile.managedWarehouseId) {
        return query(
          baseRef,
          where('warehouseId', '==', userProfile.managedWarehouseId),
          orderBy('orderDate', 'desc')
        );
      }

      // Super Admin (or Admin) sees all
      return query(baseRef, orderBy('orderDate', 'desc'), limit(50));
    },
    [firestore, user, userProfile]
  );
  const { data: orders, isLoading } = useCollection<Order>(ordersCollection);

  const returnRequests = orders?.filter(o => o.returnStatus === 'Requested');

  const handleReturnAction = async (order: Order, action: 'Approved' | 'Rejected') => {
    // Implement handleReturnAction logic here or ensure it's imported/available if used
    // Since it was used in the view but not defined in the snippet, I'll add a basic stub or fixing it.
    // Wait, if I add it here I need to be careful.
    // The snippet showed it being used in the JSX.
    // Let's add the definition.
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const updates = {
      returnStatus: action === 'Approved' ? 'Approved' : 'Rejected',
      returnProcessedAt: serverTimestamp()
    };

    batch.update(doc(firestore, 'orders', order.id), updates);
    batch.update(doc(firestore, `users/${order.userId}/orders`, order.id), updates);

    await batch.commit();
    toast({ title: "Return Updated", description: `Request ${action}` });
  };

  const handleStatusChange = async (order: Order, newStatus: Order['status']) => {
    if (!firestore) return;

    const batch = writeBatch(firestore);

    // Reference to the order in the top-level /orders collection
    const adminOrderRef = doc(firestore, 'orders', order.id);
    batch.update(adminOrderRef, { status: newStatus });

    // Reference to the order in the user-specific /users/{userId}/orders collection
    const userOrderRef = doc(firestore, `users/${order.userId}/orders`, order.id);
    batch.update(userOrderRef, { status: newStatus });

    // Update User Stats (MVP: Only increment on Delivery)
    if (newStatus === 'Delivered' && order.status !== 'Delivered') {
      const userProfileRef = doc(firestore, 'users', order.userId);
      batch.set(userProfileRef, {
        totalSpend: increment(order.totalAmount || 0),
        orderCount: increment(1),
        lastOrderDate: serverTimestamp()
      }, { merge: true });
    }

    try {
      await batch.commit();

      // FINANCIAL REVERSAL (Step 2 in Constitution)
      if (newStatus === 'Cancelled' && order.warehouseId) {
        // Run async, don't block UI
        import('@/lib/ledger').then(mod => {
          mod.recordRefundTransaction(firestore, order.warehouseId!, order.id, order.totalAmount || 0);
        });
        toast({
          title: "Financial Reversal Processed",
          description: "Ledger updated: Refund Debited & Commission Credited.",
        });
      }

      logAdminAction(firestore, {
        action: 'ORDER_UPDATE',
        performedBy: user?.email || 'unknown',
        targetId: order.id,
        targetType: 'ORDER',
        details: `Status changed from ${order.status} to ${newStatus}`
      });
      // ...
      logAdminAction(firestore, {
        action: 'ORDER_UPDATE',
        performedBy: user?.email || 'unknown',
        targetId: order.id,
        targetType: 'ORDER',
        details: `Return Request ${action}`
      });

      toast({ title: `Return ${action}`, description: `Order ${order.id.slice(-6)} return marked as ${action}.` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update return status.", variant: "destructive" });
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Orders & Returns</h1>
        <Button asChild>
          <Link href="/admin/orders/create">
            <Plus className="mr-2 h-4 w-4" /> Create Order
          </Link>
        </Button>
      </div>
      <OrderSummaryBoard orders={orders || []} />

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            Returns
            {returnRequests && returnRequests.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{returnRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
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
        </TabsContent>

        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle>Return Requests</CardTitle>
              <CardDescription>Review and approve return requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnRequests?.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.id.slice(0, 8)}</TableCell>
                      <TableCell>{(order as any).returnReason || 'N/A'}</TableCell>
                      <TableCell>{order.shippingAddress?.name}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="destructive" onClick={() => handleReturnAction(order, 'Rejected')}>Reject</Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleReturnAction(order, 'Approved')}>Approve</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!returnRequests || returnRequests.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No pending return requests.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
