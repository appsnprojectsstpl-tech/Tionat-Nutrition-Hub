'use client';

import { useAuth, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, Coins, ArrowRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function WalletPage() {
    const { user } = useAuth();
    const firestore = useFirestore();

    // Fetch Wallet Transactions (Placeholder collection for now, would need backend logic to populate)
    // For MVP, we can mock or show "No transactions yet" if empty.
    const transactionsQuery = useMemoFirebase(
        () => (firestore && user ? query(collection(firestore, `users/${user.uid}/wallet_transactions`), orderBy('timestamp', 'desc'), limit(20)) : null),
        [firestore, user]
    );

    const { data: transactions, isLoading } = useCollection<any>(transactionsQuery);

    // Fetch User Profile for Balance
    const profileQuery = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc<any>(profileQuery);

    return (
        <div className="min-h-screen bg-background container mx-auto px-4 py-8">
            <div className="mb-6">
                <Button asChild variant="ghost" className="mb-4 pl-0">
                    <Link href="/profile"><ArrowUpRight className="mr-2 h-4 w-4 rotate-180" /> Back to Profile</Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
                <p className="text-muted-foreground">Manage your refunds, credits, and loyalty points.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary">TioCash Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold flex items-center gap-2">
                            ₹{(userProfile?.walletBalance || 0).toFixed(2)} <Wallet className="h-6 w-6 text-primary opacity-50" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Used for instant refunds and quick checkouts.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Reward Points</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold flex items-center gap-2">
                            {userProfile?.loyaltyPoints || 0} <Coins className="h-6 w-6 text-yellow-500" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Value: ₹{((userProfile?.loyaltyPoints || 0) / 10).toFixed(2)} (Redeemable on next order)
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Recent activity on your wallet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-4">Loading history...</TableCell></TableRow>
                            ) : transactions?.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {tx.timestamp?.toDate ? format(tx.timestamp.toDate(), 'PP p') : 'Just now'}
                                    </TableCell>
                                    <TableCell>{tx.description}</TableCell>
                                    <TableCell>
                                        <Badge variant={tx.amount > 0 ? 'default' : 'secondary'} className="text-[10px]">
                                            {tx.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={`text-right font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && (!transactions || transactions.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="bg-gray-100 p-3 rounded-full">
                                                <Wallet className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <p>No transactions yet.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
