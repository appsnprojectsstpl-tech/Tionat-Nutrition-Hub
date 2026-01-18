
'use client';
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Package, Users, ShoppingCart, ArrowUpRight } from "lucide-react";
import { useCollection, useFirebase, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { format } from 'date-fns';
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { AdminAlerts } from "@/components/admin/admin-alerts";
import type { Order, Product, UserProfile, Warehouse } from "@/lib/types";

export default function AdminDashboard() {
  const { firestore } = useFirebase();
  const { user, isUserLoading, userProfile } = useUser();

  const productsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'products') : null),
    [firestore, user]
  );
  const { data: products } = useCollection<Product>(productsQuery);

  const customersQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'users'), where('role', '==', 'user')) : null),
    [firestore, user]
  );
  const { data: customers } = useCollection<UserProfile>(customersQuery);

  const warehousesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'warehouses') : null),
    [firestore, user]
  );
  const { data: warehouses, isLoading: isLoadingWarehouses } = useCollection<Warehouse>(warehousesQuery);


  const allOrdersQuery = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;

      const baseRef = collection(firestore, 'orders');

      // Filter for Warehouse Admin
      if (userProfile?.role === 'warehouse_admin' && userProfile.managedWarehouseId) {
        return query(
          baseRef,
          where('warehouseId', '==', userProfile.managedWarehouseId),
          orderBy('orderDate', 'desc')
        );
      }

      return query(baseRef, orderBy('orderDate', 'desc'))
    },
    [firestore, user, userProfile]
  );
  const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(allOrdersQuery);

  // Show loading state if auth is initializing
  if (isUserLoading) return <div className="p-8 text-center">Loading Admin Panel...</div>;

  // Dashboard filter state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('All');

  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    if (selectedWarehouseId === 'All') return allOrders;
    return allOrders.filter(o => o.warehouseId === selectedWarehouseId);
  }, [allOrders, selectedWarehouseId]);

  const recentOrders = useMemo(() => filteredOrders?.slice(0, 5) || [], [filteredOrders]);

  const totalRevenue = useMemo(() => {
    return filteredOrders?.reduce((acc, order) => acc + order.totalAmount, 0) || 0;
  }, [filteredOrders]);

  const activeWarehouseName = useMemo(() => {
    if (selectedWarehouseId === 'All') return 'All Warehouses';
    return warehouses?.find(w => w.id === selectedWarehouseId)?.name || selectedWarehouseId;
  }, [selectedWarehouseId, warehouses]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>

        {/* Warehouse Filter (Only for Super Admin) */}
        {userProfile?.role !== 'warehouse_admin' && (
          <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1 shadow-sm">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">View Store:</span>
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger className="w-[180px] h-8 border-0 focus:ring-0">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Warehouses</SelectItem>
                {warehouses?.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Analytic Charts Section */}
      <div className="mb-8">
        <AdminAlerts
          orders={filteredOrders || []}
          warehouses={warehouses || []}
          products={products || []}
          isLoading={isLoadingOrders || isLoadingWarehouses}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {selectedWarehouseId === 'All' ? 'Across all stores' : `For ${activeWarehouseName}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(filteredOrders && filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>

        <Link href="/admin/orders?status=Pending">
          <Card className="hover:bg-muted transition-colors border-orange-200 bg-orange-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Pending Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {filteredOrders?.filter(o => o.status === 'Pending').length ?? 0}
              </div>
              <p className="text-xs text-orange-600/80">
                Requires processing
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">


      <Link href="/admin/products">
        <Card className="hover:bg-muted transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              In your catalog
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/orders">
        <Card className="hover:bg-muted transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredOrders?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Processed in {selectedWarehouseId !== 'All' ? 'selected store' : 'total'}
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/users">
        <Card className="hover:bg-muted transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered in the system
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>

      {/* Analytics Charts Section */ }
      <div className="mt-8">
        <AnalyticsCharts orders={filteredOrders || []} />
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders ({activeWarehouseName})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingOrders && <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>}
                {recentOrders && recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.shippingAddress?.name || 'Unknown User'}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          user-email-placeholder@example.com
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {order.orderDate && typeof (order.orderDate as any).toDate === 'function' ? format((order.orderDate as any).toDate(), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className="text-xs" variant={order.status === 'Pending' ? 'secondary' : 'default'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{(order.totalAmount || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  !isLoadingOrders && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No recent orders found.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>{recentOrders?.length || 0} of the latest</strong> orders.
              <Button asChild size="sm" variant="link" className="gap-1 ml-2">
                <Link href="/admin/orders">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div >
  );
}
