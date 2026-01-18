'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CustomerSegmentsView() {
    const firestore = useFirestore();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), limit(100)); // Fetch 100 users for MVP analysis
    }, [firestore]);

    const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

    if (isLoading) return <div>Loading customer insights...</div>;

    const customers = users?.filter(u => u.role === 'user' || !u.role) || [];

    // Segments
    const whales = customers.filter(u => (u.totalSpend || 0) > 10000); // 10k threshold
    const loyalists = customers.filter(u => (u.orderCount || 0) >= 5);
    const lapsed = customers.filter(u => {
        if (!u.lastOrderDate) return true; // Never ordered
        const date = (u.lastOrderDate as any).toDate ? (u.lastOrderDate as any).toDate() : new Date(u.lastOrderDate as string);
        const diffDays = (new Date().getTime() - date.getTime()) / (1000 * 3600 * 24);
        return diffDays > 90;
    });

    const renderUserTable = (userList: UserProfile[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Last Active</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {userList.map(user => (
                    <TableRow key={user.id}>
                        <TableCell className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback>{user.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium">{user.firstName} {user.lastName}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                        </TableCell>
                        <TableCell>₹{user.totalSpend?.toLocaleString() || 0}</TableCell>
                        <TableCell>{user.orderCount || 0}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                            {user.lastOrderDate
                                ? formatDistanceToNow((user.lastOrderDate as any).toDate ? (user.lastOrderDate as any).toDate() : new Date(user.lastOrderDate as string), { addSuffix: true })
                                : 'Never'}
                        </TableCell>
                    </TableRow>
                ))}
                {userList.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No customers found in this segment.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-indigo-900">Whales (High Value)</CardTitle>
                        <CardDescription className="text-indigo-700">{whales.length} Customers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-indigo-600">Spent &gt; ₹10,000</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-900">Loyalists (Frequent)</CardTitle>
                        <CardDescription className="text-amber-700">{loyalists.length} Customers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-amber-600">5+ Orders</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-900">At Risk / Lapsed</CardTitle>
                        <CardDescription className="text-slate-700">{lapsed.length} Customers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-slate-600">Inactive &gt; 90 Days</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="whales" className="w-full">
                <TabsList>
                    <TabsTrigger value="whales">Whales</TabsTrigger>
                    <TabsTrigger value="loyalists">Loyalists</TabsTrigger>
                    <TabsTrigger value="lapsed">Lapsed</TabsTrigger>
                </TabsList>
                <TabsContent value="whales">
                    <Card>
                        <CardHeader><CardTitle>High Value Customers</CardTitle></CardHeader>
                        <CardContent>{renderUserTable(whales)}</CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="loyalists">
                    <Card>
                        <CardHeader><CardTitle>Frequent Buyers</CardTitle></CardHeader>
                        <CardContent>{renderUserTable(loyalists)}</CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="lapsed">
                    <Card>
                        <CardHeader><CardTitle>Inactive Customers</CardTitle></CardHeader>
                        <CardContent>{renderUserTable(lapsed)}</CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
