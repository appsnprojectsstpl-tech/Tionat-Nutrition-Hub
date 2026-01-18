"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast";
import {
    useCollection,
    useFirestore,
    useMemoFirebase,
    addDocumentNonBlocking
} from "@/firebase";
import {
    collection,
    getDocs,
    query,
    where,
    serverTimestamp,
    doc,
    runTransaction,
    increment
} from "firebase/firestore";
import { Loader2, Plus, Trash2, Search, User as UserIcon } from "lucide-react";
import type { Product, UserProfile, Order } from "@/lib/types";
import { format } from "date-fns";

// Validation Schema
const manualOrderSchema = z.object({
    customerName: z.string().min(2, "Name is required"),
    customerPhone: z.string().length(10, "Phone must be 10 digits"),
    customerAddress: z.string().min(5, "Address is required"),
    customerCity: z.string().min(2, "City is required"),
    customerPincode: z.string().length(6, "Pincode is required"),
    paymentMethod: z.enum(["COD", "CASH", "UPI"]),
    notes: z.string().optional(),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().min(1)
    })).min(1, "Add at least one product")
});

type ManualOrderFormValues = z.infer<typeof manualOrderSchema>;

export function ManualOrderForm() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch Products
    const productsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'products') : null),
        [firestore]
    );
    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

    const activeProducts = useMemo(() =>
        products?.filter(p => !p.status?.includes('Coming Soon')) || [],
        [products]);

    // Form Init
    const form = useForm<ManualOrderFormValues>({
        resolver: zodResolver(manualOrderSchema),
        defaultValues: {
            paymentMethod: "CASH",
            items: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const watchedItems = form.watch("items");

    // Calculate Total
    const totalAmount = useMemo(() => {
        if (!products) return 0;
        return watchedItems.reduce((acc, item) => {
            const product = products.find(p => p.id === item.productId);
            return acc + (product?.price || 0) * item.quantity;
        }, 0);
    }, [watchedItems, products]);

    const handleProductAdd = (productId: string) => {
        const product = products?.find(p => p.id === productId);
        if (!product) return;

        // Check if already added
        const exists = watchedItems.some(i => i.productId === productId);
        if (exists) {
            toast({ title: "Item exists", description: "Increase quantity instead.", variant: "secondary" });
            return;
        }

        append({ productId, quantity: 1 });
    };

    const onSubmit = async (data: ManualOrderFormValues) => {
        if (!firestore) return;
        setIsSubmitting(true);

        try {
            // 1. Create Order ID
            const orderRef = doc(collection(firestore, 'orders'));
            const orderId = orderRef.id;

            // 2. Resolve Items
            const orderItems = data.items.map(item => {
                const product = products?.find(p => p.id === item.productId);
                if (!product) throw new Error("Invalid Product");
                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    price: product.price,
                    name: product.name,
                    image: product.imageUrl
                };
            });

            // 3. Create Placeholder User (Optional: Ideally strict check, but for manual orders we might skip auth user creation)
            // For this implementation, we will use a dedicated "guest_user" or create a user on fly?
            // To keep it simple: We assign to a generic "Walk-in Customer" ID or create a partial profile.
            // BETTER: Search if user exists by phone, else create ONE.

            const usersRef = collection(firestore, 'users');
            const userQuery = query(usersRef, where('phoneNumber', '==', data.customerPhone));
            const userSnap = await getDocs(userQuery);

            let userId = 'manual_guest';

            if (!userSnap.empty) {
                userId = userSnap.docs[0].id; // Associate with existing user
            } else {
                // Future: Create new user doc implicitly?
                // For now, let's use a special flag in Order
            }

            const invoiceNumber = `OFF-${Date.now().toString().slice(-6)}`;

            const orderPayload: any = {
                id: orderId,
                userId: userId,
                orderDate: serverTimestamp(),
                totalAmount: totalAmount,
                status: 'Delivered', // Assume immediate handover for CASH/UPI
                paymentMethod: data.paymentMethod,
                shippingAddress: {
                    name: data.customerName,
                    phone: data.customerPhone,
                    address: data.customerAddress,
                    city: data.customerCity,
                    pincode: data.customerPincode
                },
                orderItems: orderItems,
                invoiceNumber: invoiceNumber,
                isManualOrder: true,
                notes: data.notes
            };

            if (data.paymentMethod === 'COD') {
                orderPayload.status = 'Pending';
            }

            await addDocumentNonBlocking(collection(firestore, 'orders'), orderPayload, orderId);

            // Sync to user subcollection if real user
            if (userId !== 'manual_guest') {
                await addDocumentNonBlocking(collection(firestore, `users/${userId}/orders`), orderPayload, orderId);
            }

            toast({
                title: "Order Created Successfully",
                description: `Invoice #${invoiceNumber} generated.`
            });

            router.push('/admin/orders');

        } catch (error) {
            console.error(error);
            toast({
                title: "Failed to create order",
                description: "Check console for details",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter Products for Search
    const filteredProducts = activeProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // Limit limit for performance

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Left: Customer & Details */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Details</CardTitle>
                        <CardDescription>Enter customer information for billing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="customerPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="9876543210" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="customerName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="paymentMethod"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Payment</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Method" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="CASH">Cash (Paid)</SelectItem>
                                                        <SelectItem value="UPI">UPI (Paid)</SelectItem>
                                                        <SelectItem value="COD">Cash on Delivery (Pending)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="customerAddress"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Address</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="No. 123, Street Name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="customerCity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Bangalore" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="customerPincode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pincode</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="560001" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Internal Notes</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Discount given manually" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>

            {/* Right: Cart Builder */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Order Items</CardTitle>
                        <CardDescription>Search and add products to the order.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <div className="absolute top-10 w-full bg-background border rounded-md shadow-lg z-10 max-h-[200px] overflow-auto">
                                    {filteredProducts.map(product => (
                                        <Button
                                            key={product.id}
                                            variant="ghost"
                                            className="w-full justify-between font-normal h-auto py-2"
                                            onClick={() => {
                                                handleProductAdd(product.id);
                                                setSearchTerm("");
                                            }}
                                        >
                                            <span>{product.name}</span>
                                            <span className="font-bold">₹{product.price}</span>
                                        </Button>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <div className="p-2 text-sm text-center text-muted-foreground">No products found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Items Table */}
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="w-[100px]">Qty</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => {
                                        const product = products?.find(p => p.id === field.productId);
                                        return (
                                            <TableRow key={field.id}>
                                                <TableCell className="text-sm font-medium">
                                                    {product?.name || 'Unknown'}
                                                    <div className="text-xs text-muted-foreground">₹{product?.price}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="h-8"
                                                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    ₹{((product?.price || 0) * (form.watch(`items.${index}.quantity`) || 0)).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {fields.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No items added.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t pt-6">
                        <div className="flex justify-between w-full text-lg font-bold">
                            <span>Total Payable</span>
                            <span>₹{totalAmount.toFixed(2)}</span>
                        </div>
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={isSubmitting || fields.length === 0}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Create Order
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
