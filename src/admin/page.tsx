
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
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import type { Order, Product, UserProfile } from "@/lib/types";
import { format } from 'date-fns';
import { useMemo } from "react";

export default function AdminDashboard() {
  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: products } = useCollection<Product>(productsQuery);
  
  const customersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users'), where('role', '==', 'user')) : null),
    [firestore]
  );
  const { data: customers } = useCollection<UserProfile>(customersQuery);

  const allOrdersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'orders'), orderBy('orderDate', 'desc')) : null),
    [firestore]
  );
  const { data: allOrders, isLoading: isLoadingOrders } = useCollection<Order>(allOrdersQuery);
  
  const recentOrders = useMemo(() => allOrders?.slice(0, 5) || [], [allOrders]);

  const totalRevenue = useMemo(() => {
    return allOrders?.reduce((acc, order) => acc + order.totalAmount, 0) || 0;
  }, [allOrders]);

  return (
    <div>
      <h1 className="text-3xl font-bold font-headline mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Calculated from all orders
            </p>
          </CardContent>
        </Card>
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
                <div className="text-2xl font-bold">{allOrders?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                Processed in total
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
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
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
                          <div className="font-medium">{order.shippingAddress.name}</div>
                          <div className="hidden text-sm text-muted-foreground md:inline">
                            user-email-placeholder@example.com
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {order.orderDate ? format(order.orderDate.toDate(), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className="text-xs" variant={order.status === 'Pending' ? 'secondary' : 'default'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{order.totalAmount.toFixed(2)}</TableCell>
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
    </div>
  );
}
