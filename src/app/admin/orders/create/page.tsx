'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Product, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Trash2, User, ShoppingCart, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { logAdminAction } from '@/lib/audit-logger';

// --- Types & Schemas ---

const guestSchema = z.object({
    name: z.string().min(2, "Name required"),
    phone: z.string().min(10, "Valid phone required"),
    address: z.string().min(5, "Address required"),
    city: z.string().min(2, "City required"),
    pincode: z.string().min(6, "Pincode required"),
});

type GuestForm = z.infer<typeof guestSchema>;

type CartItem = {
    product: Product;
    quantity: number;
};

// --- Main Component ---

export default function CreateOrderPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    // Steps: 1=User, 2=Cart, 3=Review
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: User
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isGuest, setIsGuest] = useState(false);
    const guestForm = useForm<GuestForm>({ resolver: zodResolver(guestSchema) });

    // Step 2: Product
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);

    // Step 3: Payment
    const [paymentMethod, setPaymentMethod] = useState<'COD' | 'PAID'>('COD');

    // --- Handlers: User ---

    const handleUserSearch = async () => {
        if (!firestore || !userSearch) return;
        setIsLoading(true);
        try {
            // Search by Phone or Email
            const usersRef = collection(firestore, 'users');
            // Firestore doesn't support OR queries nicely for this, so we do two simple ones or just one if it looks like a phone
            let q;
            if (userSearch.includes('@')) {
                q = query(usersRef, where('email', '>=', userSearch), where('email', '<=', userSearch + '\uf8ff'), limit(5));
            } else {
                q = query(usersRef, where('phoneNumber', '==', userSearch), limit(5));
            }

            const snap = await getDocs(q);
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
            setSearchResults(users);
            if (users.length === 0) toast({ description: "No users found. Try searching by exact phone number or email start." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Search failed.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const selectUser = (u: UserProfile) => {
        setSelectedUser(u);
        setIsGuest(false);
        setStep(2);
    };

    const confirmGuest = (data: GuestForm) => {
        setIsGuest(true);
        setStep(2);
    };

    // --- Handlers: Product ---

    const handleProductSearch = async () => {
        if (!firestore || !productSearch) return;
        setIsLoading(true);
        try {
            // Simple prefix search on 'name' relies on casing match usually, unless we have a specific lowercase field.
            // Assuming direct match for now for MVP
            const productsRef = collection(firestore, 'products');
            // Improve: Search by name requires a specific index pattern or Algolia. 
            // Fallback: Fetch latest 20 and filter in memory if string is short, or use exact name?
            // Let's use standard >= query
            const q = query(productsRef, where('name', '>=', productSearch), where('name', '<=', productSearch + '\uf8ff'), limit(10));
            const snap = await getDocs(q);
            const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
            setProductResults(products);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    const addToCart = (p: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === p.id);
            if (existing) {
                return prev.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product: p, quantity: 1 }];
        });
        toast({ title: "Added", description: `${p.name} added to order.` });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.product.id !== id));
    };

    const totalAmount = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    // --- Final Submission ---

    const handleCreateOrder = async () => {
        if (!firestore) return;
        setIsLoading(true);

        try {
            await runTransaction(firestore, async (transaction) => {
                // 1. Validate Stock (Optional for Admin Override, but safer to check)
                for (const item of cart) {
                    const productRef = doc(firestore, 'products', item.product.id);
                    const sfDoc = await transaction.get(productRef);
                    if (!sfDoc.exists()) throw new Error(`Product ${item.product.name} does not exist!`);
                    // We can choose to deduct stock here if we want strictly consistent inventory
                }

                // 2. Create Order Data
                const orderId = `MAN-${Date.now().toString().slice(-6)}`;
                const orderRef = doc(firestore, 'orders', orderId);

                // Prepare Address
                let shippingAddress;
                if (isGuest) {
                    const data = guestForm.getValues();
                    shippingAddress = { name: data.name, phone: data.phone, address: data.address, city: data.city, pincode: data.pincode };
                } else {
                    // Use user's first address or defaults
                    shippingAddress = {
                        name: selectedUser?.firstName || 'Customer',
                        phone: selectedUser?.phoneNumber || 'N/A',
                        address: selectedUser?.addresses?.[0] || 'Store Pickup / Manual Entry',
                        city: 'N/A',
                        pincode: '000000'
                    };
                }

                const newOrder = {
                    id: orderId,
                    userId: isGuest ? 'GUEST' : selectedUser!.id,
                    orderDate: serverTimestamp(),
                    status: 'Pending',
                    items: cart.map(c => ({
                        productId: c.product.id,
                        name: c.product.name,
                        price: c.product.price,
                        quantity: c.quantity,
                        image: c.product.imageUrl
                    })),
                    // Support both structures for now
                    orderItems: cart.map(c => ({
                        productId: c.product.id,
                        name: c.product.name,
                        price: c.product.price,
                        quantity: c.quantity,
                        image: c.product.imageUrl
                    })),
                    totalAmount: totalAmount,
                    shippingAddress,
                    paymentMethod: paymentMethod === 'COD' ? 'COD' : 'MANUAL_PAID',
                    paymentStatus: paymentMethod === 'PAID' ? 'Paid' : 'Pending',
                    createdBy: user?.email || 'Admin',
                    source: 'Manual Console'
                };

                transaction.set(orderRef, newOrder);

                // If registered user, add to their collection
                if (!isGuest && selectedUser) {
                    const userOrderRef = doc(firestore, `users/${selectedUser.id}/orders`, orderId);
                    transaction.set(userOrderRef, newOrder);
                }
            });

            // Log Action
            logAdminAction(firestore, {
                action: 'ORDER_CREATE',
                targetType: 'ORDER',
                targetId: 'new',
                details: `Created manual order for ${isGuest ? guestForm.getValues().name : selectedUser?.firstName} - Amount: ${totalAmount}`
            });

            toast({ title: "Order Created", description: "Manual order has been placed successfully." });
            router.push('/admin/orders');

        } catch (error) {
            console.error("Order creation failed", error);
            toast({ title: "Failed", description: "Could not create order.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-8">
            <h1 className="text-3xl font-bold font-headline">Create Manual Order</h1>

            {/* Progress Stepper */}
            <div className="flex items-center gap-4 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-primary' : 'bg-gray-200'}`} />
                ))}
            </div>

            {/* STEP 1: CUSTOMER */}
            {step === 1 && (
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Search User */}
                    <Card>
                        <CardHeader><CardTitle>Search Existing Customer</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Phone number or starting Email..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />
                                <Button onClick={handleUserSearch} disabled={isLoading}>
                                    <Search className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {searchResults.map(u => (
                                    <div key={u.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => selectUser(u)}>
                                        <div>
                                            <p className="font-bold">{u.firstName} {u.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{u.email} | {u.phoneNumber}</p>
                                        </div>
                                        <Button size="sm" variant="outline">Select</Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Guest Form */}
                    <Card>
                        <CardHeader><CardTitle>Or Checkout as Guest</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={guestForm.handleSubmit(confirmGuest)} className="space-y-4">
                                <Input placeholder="Full Name" {...guestForm.register('name')} />
                                <Input placeholder="Phone Number" {...guestForm.register('phone')} />
                                <Input placeholder="Full Address" {...guestForm.register('address')} />
                                <div className="flex gap-2">
                                    <Input placeholder="City" {...guestForm.register('city')} />
                                    <Input placeholder="Pincode" {...guestForm.register('pincode')} />
                                </div>
                                <Button type="submit" className="w-full">Continue as Guest</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* STEP 2: BUILD CART */}
            {step === 2 && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold">Building Cart for: <span className="text-primary">{isGuest ? 'Guest' : selectedUser?.firstName}</span></h2>
                            <Button variant="link" onClick={() => setStep(1)} className="p-0 h-auto text-xs text-muted-foreground">Change Customer</Button>
                        </div>
                        <Button onClick={() => cart.length > 0 && setStep(3)} disabled={cart.length === 0}>
                            Review & Payment <CheckCircle className="ml-2 w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Product Search - span 1 */}
                        <Card className="md:col-span-1 h-fit">
                            <CardHeader><CardTitle>Find Products</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Product Name..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleProductSearch()}
                                    />
                                    <Button size="icon" onClick={handleProductSearch} disabled={isLoading}>
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {productResults.map(p => (
                                        <div key={p.id} className="flex gap-2 p-2 border rounded-lg hover:bg-gray-50">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm truncate">{p.name}</p>
                                                <p className="text-xs">₹{p.price}</p>
                                            </div>
                                            <Button size="icon" className="h-8 w-8" onClick={() => addToCart(p)}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Cart Table - span 2 */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex justify-between">
                                    <span>Current Order</span>
                                    <span>Total: ₹{totalAmount.toFixed(2)}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {cart.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">Cart is empty. Search products to add.</div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Price</TableHead>
                                                <TableHead>Qty</TableHead>
                                                <TableHead>Total</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cart.map(item => (
                                                <TableRow key={item.product.id}>
                                                    <TableCell className="font-medium">{item.product.name}</TableCell>
                                                    <TableCell>₹{item.product.price}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>₹{(item.product.price * item.quantity).toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeFromCart(item.product.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 3 && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Finalize Order</CardTitle></CardHeader>
                        <CardContent className="space-y-6">

                            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span className="font-bold">{isGuest ? guestForm.getValues().name : `${selectedUser?.firstName} ${selectedUser?.lastName}`}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Phone:</span>
                                    <span>{isGuest ? guestForm.getValues().phone : selectedUser?.phoneNumber}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t">
                                    <span className="text-lg font-bold">Total Payable:</span>
                                    <span className="text-lg font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Payment Status</Label>
                                <RadioGroup defaultValue="COD" onValueChange={(v) => setPaymentMethod(v as any)}>
                                    <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-gray-50">
                                        <RadioGroupItem value="COD" id="cod" />
                                        <Label htmlFor="cod" className="cursor-pointer flex-1">
                                            Cash on Delivery (Pending Payment)
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-gray-50 bg-green-50 border-green-200">
                                        <RadioGroupItem value="PAID" id="paid" />
                                        <Label htmlFor="paid" className="cursor-pointer flex-1">
                                            Already Paid (Mark as Paid)
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back to Cart</Button>
                                <Button className="flex-1" size="lg" onClick={handleCreateOrder} disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Order
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                </div>
            )}

        </div>
    );
}
