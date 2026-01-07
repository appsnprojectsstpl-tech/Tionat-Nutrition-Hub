'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import type { Coupon } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { Trash2, Plus, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const couponSchema = z.object({
    code: z.string().min(3, 'Code must be at least 3 characters').toUpperCase(),
    discountType: z.enum(['PERCENTAGE', 'FLAT']),
    discountValue: z.preprocess((val) => Number(val), z.number().min(1, 'Value must be positive')),
    minOrderValue: z.preprocess((val) => Number(val), z.number().min(0)),
    maxDiscount: z.preprocess((val) => (val ? Number(val) : undefined), z.number().optional()),
    usageLimit: z.preprocess((val) => (val ? Number(val) : undefined), z.number().optional()),
    expiryDate: z.string().refine((val) => new Date(val) > new Date(), 'Expiry must be in the future'),
    isActive: z.boolean().default(true),
    description: z.string().optional(),
});

type CouponFormData = z.infer<typeof couponSchema>;

export default function CouponsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const couponsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'coupons'), orderBy('expiryDate', 'desc')) : null),
        [firestore]
    );
    const { data: coupons, isLoading } = useCollection<Coupon>(couponsQuery);

    const form = useForm<CouponFormData>({
        resolver: zodResolver(couponSchema),
        defaultValues: {
            code: '',
            discountType: 'PERCENTAGE',
            discountValue: 0,
            minOrderValue: 0,
            isActive: true,
            description: '',
        },
    });

    const onSubmit = async (data: CouponFormData) => {
        if (!firestore) return;

        try {
            await addDocumentNonBlocking(collection(firestore, 'coupons'), {
                ...data,
                expiryDate: Timestamp.fromDate(new Date(data.expiryDate)), // Convert string to Timestamp
                usedCount: 0,
            });

            toast({ title: 'Coupon Created', description: `Coupon ${data.code} added successfully.` });
            setIsDialogOpen(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to create coupon.', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!firestore) return;
        if (confirm('Are you sure you want to delete this coupon?')) {
            await deleteDocumentNonBlocking(doc(firestore, 'coupons', id));
            toast({ title: 'Coupon Deleted', description: 'Coupon removed successfully.' });
        }
    };

    const toggleStatus = async (coupon: Coupon) => {
        if (!firestore) return;
        await setDocumentNonBlocking(doc(firestore, 'coupons', coupon.id), { isActive: !coupon.isActive }, { merge: true });
        toast({ title: 'Status Updated', description: `Coupon is now ${!coupon.isActive ? 'Active' : 'Inactive'}.` });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Coupons</h2>
                    <p className="text-muted-foreground">Manage discount codes and promotions.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Coupon
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Create New Coupon</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Code</FormLabel>
                                                <FormControl><Input placeholder="SAVE20" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="discountType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                                        <SelectItem value="FLAT">Flat Amount (₹)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="discountValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Value</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="minOrderValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Min Order (₹)</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="expiryDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Expiry Date</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="usageLimit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Usage Limit (Opt)</FormLabel>
                                                <FormControl><Input type="number" placeholder="Unlimited" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl><Input placeholder="Summer Sale Discount" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="submit">Create Coupon</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                            ) : coupons?.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8">No coupons found.</TableCell></TableRow>
                            ) : (
                                coupons?.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        <TableCell className="font-bold flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-primary" /> {coupon.code}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue} Off`}
                                            {coupon.minOrderValue > 0 && <span className="text-xs text-muted-foreground block">Min: ₹{coupon.minOrderValue}</span>}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.expiryDate ? format((coupon.expiryDate as Timestamp).toDate(), 'PP') : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {coupon.usedCount || 0} / {coupon.usageLimit ? coupon.usageLimit : '∞'}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={coupon.isActive}
                                                onCheckedChange={() => toggleStatus(coupon)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(coupon.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
