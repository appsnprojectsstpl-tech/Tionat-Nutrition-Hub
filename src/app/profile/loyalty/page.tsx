'use client';

import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, ArrowLeft, History, Coins } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function LoyaltyHistoryPage() {
    const { user, userProfile } = useUser();
    const firestore = useFirestore();

    const historyQuery = user && firestore
        ? query(collection(firestore, `users/${user.uid}/loyalty_history`), orderBy('createdAt', 'desc'), limit(50))
        : null;

    const { data: history, isLoading } = useCollection(historyQuery);

    if (!user) return <div className="p-8 text-center">Please login to view points.</div>;

    const points = userProfile?.loyaltyPoints || 0;
    // Calculate worth (10 pts = ₹1)
    const worth = (points / 10).toFixed(2);

    return (
        <div className="container max-w-4xl py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/profile"><ArrowLeft className="w-5 h-5" /></Link>
                </Button>
                <h1 className="text-2xl font-bold font-headline">Loyalty Points</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-800">
                            <Award className="w-6 h-6" /> Total Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-yellow-900 mb-2">{points} pts</div>
                        <p className="text-yellow-700">Worth roughly ₹{worth}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Coins className="w-5 h-5" /> How it works
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>• Earn <strong>1 Point</strong> for every ₹100 spend.</p>
                        <p>• Redeem <strong>10 Points</strong> = ₹1 discount.</p>
                        <p>• Use points during checkout for instant savings.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" /> Transaction History
                    </CardTitle>
                    <CardDescription>Recent point activity.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Activity</TableHead>
                                <TableHead className="text-right">Points</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24">Loading history...</TableCell></TableRow>
                            ) : history?.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No history yet.</TableCell></TableRow>
                            ) : (
                                history?.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {item.createdAt ? format(item.createdAt.toDate(), 'MMM d, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.type === 'EARN' ? 'Earned' : 'Redeemed'}</div>
                                            <div className="text-xs text-muted-foreground">{item.reason}</div>
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {item.points > 0 ? '+' : ''}{item.points}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
