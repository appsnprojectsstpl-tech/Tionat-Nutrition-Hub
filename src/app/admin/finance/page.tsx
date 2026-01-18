'use client';

import { useState } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { Warehouse, LedgerEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, IndianRupee, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { format } from 'date-fns';
import { recordPayoutTransaction } from '@/lib/ledger';

export default function AdminFinancePage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    // Fetch Warehouses
    const { data: warehouses, isLoading: isLoadingWarehouses } = useCollection<Warehouse>(
        firestore ? collection(firestore, 'warehouses') : null
    );

    // Fetch Recent Ledger Entries (Global View or Filtered?)
    // Let's show last 50 entries globally for now.
    const { data: ledgerEntries, isLoading: isLoadingLedger } = useCollection<LedgerEntry>(
        firestore ? query(collection(firestore, 'ledger_entries'), orderBy('timestamp', 'desc'), limit(50)) : null
    );

    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutRef, setPayoutRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayoutClick = (wh: Warehouse) => {
        setSelectedWarehouse(wh);
        setPayoutAmount('');
        setPayoutRef('');
    };

    const confirmPayout = async () => {
        if (!firestore || !selectedWarehouse) return;
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Invalid Amount", description: "Please enter a valid positive number", variant: "destructive" });
            return;
        }

        if (amount > (selectedWarehouse.ledgerBalance || 0)) {
            toast({ title: "Insufficient Balance", description: "Cannot pay out more than the current balance.", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            const result = await recordPayoutTransaction(firestore, selectedWarehouse.id, amount, payoutRef || 'Manual Payout');
            if (result?.success) {
                toast({ title: "Payout Successful", description: `Recorded payout of ₹${amount}` });
                setSelectedWarehouse(null);
            } else {
                toast({ title: "Payout Failed", description: result?.error || "Unknown error", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "System error during payout", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold font-headline">Finance & Payouts</h1>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Franchise Balances</CardTitle>
                        <CardDescription>Current net payable amount to each warehouse.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead className="text-right">Net Payable</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingWarehouses ? (
                                    <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                                ) : warehouses?.map(wh => (
                                    <TableRow key={wh.id}>
                                        <TableCell className="font-medium">{wh.name}</TableCell>
                                        <TableCell>{wh.city}</TableCell>
                                        <TableCell className="text-right font-bold text-lg">
                                            ₹{(wh.ledgerBalance || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => handlePayoutClick(wh)}
                                                disabled={!wh.ledgerBalance || wh.ledgerBalance <= 0}
                                            >
                                                Pay Out
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {warehouses && warehouses.length === 0 && (
                                    <TableRow><TableCell colSpan={4} className="text-center">No warehouses found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Latest credit and debit entries across the network.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingLedger ? (
                                    <TableRow><TableCell colSpan={4} className="text-center">Loading entries...</TableCell></TableRow>
                                ) : ledgerEntries?.map(entry => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-xs">
                                            {entry.timestamp && typeof (entry.timestamp as any).toDate === 'function'
                                                ? format((entry.timestamp as any).toDate(), 'PP p')
                                                : 'Pending'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={entry.type === 'CREDIT' ? 'default' : 'secondary'} className={entry.type === 'DEBIT' ? 'bg-orange-100 text-orange-800 hover:bg-orange-100' : 'bg-green-100 text-green-800 hover:bg-green-100'}>
                                                {entry.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{entry.description} ({entry.warehouseId})</TableCell>
                                        <TableCell className="text-right font-mono">
                                            <span className={entry.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                                                {entry.type === 'CREDIT' ? '+' : '-'} ₹{entry.amount.toFixed(2)}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!selectedWarehouse} onOpenChange={(open) => !open && setSelectedWarehouse(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Process Payout</DialogTitle>
                        <DialogDescription>
                            Initiate a payout for <strong>{selectedWarehouse?.name}</strong>.
                            Current Balance: ₹{(selectedWarehouse?.ledgerBalance || 0).toLocaleString()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                className="col-span-3"
                                value={payoutAmount}
                                onChange={(e) => setPayoutAmount(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ref" className="text-right">Ref ID</Label>
                            <Input
                                id="ref"
                                placeholder="e.g. UPI-998877"
                                className="col-span-3"
                                value={payoutRef}
                                onChange={(e) => setPayoutRef(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedWarehouse(null)}>Cancel</Button>
                        <Button onClick={confirmPayout} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Transfer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
