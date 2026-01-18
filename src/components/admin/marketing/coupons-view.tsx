'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Coupon } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Tag, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { logAdminAction } from '@/lib/audit-logger';

const couponSchema = z.object({
    code: z.string().min(3, "Code must be at least 3 characters").regex(/^[A-Z0-9]+$/, "Code must be uppercase alphanumeric"),
    type: z.enum(['percentage', 'fixed_amount']),
    value: z.coerce.number().min(1, "Value must be positive"),
    minOrderValue: z.coerce.number().min(0),
    maxDiscount: z.coerce.number().optional(),
    expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid Date"),
    usageLimit: z.coerce.number().optional(),
    isActive: z.boolean().default(true),
    applicableCategoryId: z.string().optional(),
});

type CouponFormData = z.infer<typeof couponSchema>;

export function CouponsView() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const couponsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'coupons'), orderBy('expiryDate', 'desc'));
    }, [firestore]);

    const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);

    const form = useForm<CouponFormData>({
        resolver: zodResolver(couponSchema),
        defaultValues: {
            code: '',
            type: 'percentage',
            value: 0,
            minOrderValue: 0,
            maxDiscount: 0,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
            usageLimit: 100,
            isActive: true,
            applicableCategoryId: 'all'
        }
    });

    const onSubmit = async (data: CouponFormData) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'coupons'), {
                ...data,
                expiryDate: new Date(data.expiryDate), // Convert string to Date
                usageCount: 0,
                createdAt: serverTimestamp()
            });

            logAdminAction({
                action: 'COUPON_CREATE',
                performedBy: user?.email || 'unknown',
                targetId: data.code,
                targetType: 'COUPON',
                details: `Created coupon ${data.code}`
            });

            toast({ title: "Coupon Created", description: `Code ${data.code} added successfully.` });
            setIsDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create coupon.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, code: string) => {
        if (!confirm(`Are you sure you want to delete coupon ${code}?`)) return;
        if (!firestore) return;

        try {
            await deleteDoc(doc(firestore, 'coupons', id));
            toast({ title: "Deleted", description: "Coupon removed." });
        } catch (e) {
            toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
        }
    };

    const toggleStatus = async (coupon: Coupon) => {
        if (!firestore) return;
        try {
            await setDoc(doc(firestore, 'coupons', coupon.id), { isActive: !coupon.isActive }, { merge: true });
        } catch (e) {
            toast({ title: "Error", description: "Status update failed", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-muted-foreground">Manage discount codes.</p>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Create Coupon</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Coupon</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="code" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Coupon Code (Uppercase)</FormLabel>
                                        <FormControl><Input {...field} placeholder="WELCOME50" className="uppercase" onChange={e => field.onChange(e.target.value.toUpperCase())} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="flex gap-4">
                                    <FormField control={form.control} name="type" render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                    <SelectItem value="fixed_amount">Fixed Amount (₹)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="value" render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Value</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="flex gap-4">
                                    <FormField control={form.control} name="minOrderValue" render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Min Spend (₹)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="maxDiscount" render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Max Discount (₹)</FormLabel>
                                            <FormControl><Input type="number" {...field} placeholder="Optional" /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="flex gap-4">
                                    <FormField control={form.control} name="expiryDate" render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Expiry Date</FormLabel>
                                            <FormControl><Input type="date" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="usageLimit" render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Usage Limit</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                        </FormItem>
                                    )} />
                                </div>

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Create Coupon'}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Constraints</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead>Expiry</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={7} className="text-center h-24">Loading...</TableCell></TableRow> :
                            coupons?.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No coupons found.</TableCell></TableRow> :
                                coupons?.map(coupon => (
                                    <TableRow key={coupon.id}>
                                        <TableCell className="font-mono font-bold text-primary">{coupon.code}</TableCell>
                                        <TableCell>
                                            {coupon.type === 'percentage' ? `${coupon.value}% Off` : `₹${coupon.value} Off`}
                                            {coupon.maxDiscount && coupon.type === 'percentage' && <span className="text-xs text-muted-foreground block">Max ₹{coupon.maxDiscount}</span>}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {coupon.minOrderValue > 0 && <div>Min: ₹{coupon.minOrderValue}</div>}
                                            {coupon.applicableCategoryId && coupon.applicableCategoryId !== 'all' && (
                                                <Badge variant="outline" className="mt-1 text-[10px]">{coupon.applicableCategoryId}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.usageCount} / {coupon.usageLimit || '∞'}
                                        </TableCell>
                                        <TableCell>
                                            {format(coupon.expiryDate instanceof Date ? coupon.expiryDate : (coupon.expiryDate as any).toDate(), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <Switch checked={coupon.isActive} onCheckedChange={() => toggleStatus(coupon)} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id, coupon.code)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
