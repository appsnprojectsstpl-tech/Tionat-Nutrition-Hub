'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Coupon } from '@/lib/types';

export default function CouponsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Coupon>>({
        code: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        minOrderValue: 0,
        isActive: true,
    });
    const [expiryDate, setExpiryDate] = useState('');

    const { user, isUserLoading } = useUser();

    // Fetch Coupons
    const couponsQuery = useMemoFirebase(
        () => (firestore && user ? collection(firestore, 'coupons') : null),
        [firestore, user]
    );
    const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        setIsSubmitting(true);

        try {
            await addDoc(collection(firestore, 'coupons'), {
                ...formData,
                code: formData.code?.toUpperCase(), // Ensure uppercase
                expiryDate: Timestamp.fromDate(new Date(expiryDate)),
                createdAt: Timestamp.now(),
            });

            toast({ title: "Success", description: "Coupon created successfully!" });
            setIsOpen(false);
            // Reset form
            setFormData({
                code: '',
                discountType: 'PERCENTAGE',
                discountValue: 0,
                minOrderValue: 0,
                isActive: true,
            });
            setExpiryDate('');
        } catch (error) {
            console.error("Error adding coupon:", error);
            toast({ title: "Error", description: "Failed to create coupon.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        if (!confirm("Are you sure you want to delete this coupon?")) return;

        try {
            await deleteDoc(doc(firestore, 'coupons', id));
            toast({ title: "Deleted", description: "Coupon removed." });
        } catch (error) {
            console.error("Error deleting coupon:", error);
            toast({ title: "Error", description: "Failed to delete coupon.", variant: "destructive" });
        }
    };

    const toggleStatus = async (coupon: Coupon) => {
        if (!firestore) return;
        try {
            await updateDoc(doc(firestore, 'coupons', coupon.id), {
                isActive: !coupon.isActive
            });
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ title: "Error", description: "Failed to update status." });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Coupons & Offers</h1>
                    <p className="text-muted-foreground">Manage promo codes and discounts.</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Add Coupon
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Coupon</DialogTitle>
                            <DialogDescription>
                                Add a new promo code for customers to use at checkout.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="code">Coupon Code</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. SAVE20"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Discount Type</Label>
                                    <Select
                                        value={formData.discountType}
                                        onValueChange={(val: any) => setFormData({ ...formData, discountType: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                            <SelectItem value="FLAT">Flat Amount (₹)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="value">Value</Label>
                                    <Input
                                        id="value"
                                        type="number"
                                        placeholder="10"
                                        value={formData.discountValue || ''}
                                        onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="minOrder">Min Order Value (₹)</Label>
                                    <Input
                                        id="minOrder"
                                        type="number"
                                        placeholder="0"
                                        value={formData.minOrderValue || ''}
                                        onChange={(e) => setFormData({ ...formData, minOrderValue: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="expiry">Expiry Date</Label>
                                    <Input
                                        id="expiry"
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="active"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                />
                                <Label htmlFor="active">Active immediately</Label>
                            </div>

                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Coupon'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Min Order</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">Loading coupons...</TableCell>
                            </TableRow>
                        ) : coupons?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No coupons found. Create your first one!
                                </TableCell>
                            </TableRow>
                        ) : (
                            coupons?.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell className="font-bold flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-primary" />
                                        {coupon.code}
                                    </TableCell>
                                    <TableCell>
                                        {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                                    </TableCell>
                                    <TableCell>₹{coupon.minOrderValue}</TableCell>
                                    <TableCell>
                                        {coupon.expiryDate ? format(
                                            // @ts-ignore
                                            coupon.expiryDate.toDate ? coupon.expiryDate.toDate() : new Date(coupon.expiryDate),
                                            'MMM dd, yyyy'
                                        ) : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className="cursor-pointer"
                                            variant={coupon.isActive ? "default" : "secondary"}
                                            onClick={() => toggleStatus(coupon)}
                                        >
                                            {coupon.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(coupon.id)}
                                            className="text-destructive hover:text-destructive/90"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
