'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { logUserAction } from '@/lib/audit-logger';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/use-cart';
import { useCheckoutValidation } from '@/hooks/use-checkout-validation';
import { useReservation } from '@/hooks/use-reservation'; // Added import
import { useAuth, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, increment, runTransaction, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { UserProfile, Order } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Image from 'next/image';
import { useDoc, useMemoFirebase } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch'; // Added switch for points
import { Award, Tag } from 'lucide-react'; // Added icon for points

// Razorpay type definitions
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string | undefined;
  amount: string;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => Promise<void>;
  prefill: {
    name: string;
    email: string | null;
    contact: string;
  };
  theme: {
    color: string;
  };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

const shippingSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address is required." }),
  city: z.string().min(2, { message: "City is required." }),
  pincode: z.string().length(6, { message: "Pincode must be 6 digits." }),
  phone: z.string().length(10, { message: "Phone number must be 10 digits." }),
  paymentMethod: z.enum(['COD', 'RAZORPAY'], { required_error: "Please select a payment method." }),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

export default function CheckoutPage() {
  const { items, subtotal, clearCart, discountAmount, coupon, total, tip } = useCart();
  const { user, isUserLoading } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(false); // State for redeeming points

  const POINTS_PER_RUPEE = 0.01; // 1 point per 100 rupees (example logic adjusted? Task said 1 pt per 100rs)
  // Actually task said: "Earn 1 pt per ₹100". "Redeem 10 pts = ₹1".

  // Earning Calculation: Total / 100
  // Redemption Calculation: Points / 10 = Discount Rupees.

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      paymentMethod: 'COD'
    }
  });

  const paymentMethod = watch('paymentMethod');
  const { applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode || !firestore) return;
    setIsApplyingCoupon(true);
    try {
      const q = query(collection(firestore, 'coupons'), where('code', '==', couponCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast({ title: "Invalid Coupon", description: "This code does not exist.", variant: "destructive" });
        setIsApplyingCoupon(false);
        return;
      }

      const couponData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any; // Cast to Coupon type

      // Validations
      if (!couponData.isActive) throw new Error("This coupon is inactive.");
      if (couponData.expiryDate && new Date(couponData.expiryDate.toDate ? couponData.expiryDate.toDate() : couponData.expiryDate) < new Date()) throw new Error("This coupon has expired.");
      if (couponData.usageLimit && couponData.usageCount >= couponData.usageLimit) throw new Error("Coupon usage limit reached.");
      if (subtotal < couponData.minOrderValue) throw new Error(`Minimum order value of ₹${couponData.minOrderValue} required.`);

      applyCoupon(couponData);
      setCouponCode('');
    } catch (e) {
      toast({ title: "Coupon Failed", description: e instanceof Error ? e.message : 'Invalid coupon', variant: "destructive" });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    }
  }, []);

  useEffect(() => {
    if (userProfile) {
      setValue('name', `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim());
      if (userProfile.addresses && userProfile.addresses.length > 0) {
        const latestAddress = userProfile.addresses[0];
        const [address, city, pincode] = latestAddress.split(',').map(s => s.trim());
        setValue('address', address || '');
        if (city) setValue('city', city);
        if (pincode) setValue('pincode', pincode);
      }
      if (userProfile.phoneNumber) setValue('phone', userProfile.phoneNumber);
    }
  }, [userProfile, setValue])

  const handleAddressSelect = (selectedAddress: string) => {
    const [address, city, pincode] = selectedAddress.split(',').map(s => s.trim());
    setValue('address', address || '');
    if (city) setValue('city', city);
    if (pincode) setValue('pincode', pincode);
  }

  // ... inside component
  const { validateStock, isValidating: isValidatingStock } = useCheckoutValidation(firestore);
  const { createReservation } = useReservation(); // Import hook

  // Reserve stock on mount if possible
  useEffect(() => {
    if (items.length > 0 && userProfile?.addresses?.[0]) {
      // We need to resolve warehouse first. 
      // For MVP, skipping auto-reservation on mount to avoid complexity of resolving warehouse again.
      // We will reserve immediately on "Pay" click before processing.
    }
  }, [items, userProfile]);

  const handlePayment = async (formData: ShippingFormData) => {
    if (!user || !firestore) return;

    setIsSubmitting(true);

    try {
      // 0. Validate Stock
      // ... previous stock logic ...

      // -1. PRICE LOCK CHECK (New Security Layer)
      let priceMismatch = false;
      const latestPrices: Record<string, number> = {};

      for (const item of items) {
        const productDoc = await getDoc(doc(firestore, 'products', item.product.id)); // Direct fetch (bypassing cache if possible/needed)
        if (productDoc.exists()) {
          const liveData = productDoc.data();
          const livePrice = liveData?.price || 0;

          if (livePrice !== item.product.price) {
            priceMismatch = true;
            latestPrices[item.product.id] = livePrice;
            console.warn(`Price mismatch for ${item.product.name}: Cart ${item.product.price} vs Live ${livePrice}`);
          }
        }
      }

      if (priceMismatch) {
        // In a real app, update the cart automatically here. 
        // For now, we block and ask user to refresh/re-add.
        toast({
          title: "Price Update Detected",
          description: "One or more items in your cart have changed price. Please refresh the page and review your cart.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }


      const validation = await validateStock(items, formData.pincode);
      if (!validation.isValid) {
        console.warn("Validation Failed:", validation.errors);
        toast({
          title: "Stock Issue",
          description: validation.errors[0],
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const fulfillingWarehouseId = validation.warehouseId;

      // 0.5 RESERVE STOCK (New)

      await createReservation(items, fulfillingWarehouseId!);


      // PREPARE ID (Hoisted for scope access)
      const orderRef = doc(collection(firestore, 'orders'));
      const orderId = orderRef.id;
      let finalPayable = 0;

      // 1. Create Order ATOMICALLY (Transaction)
      await runTransaction(firestore, async (transaction) => {
        // A. READS
        const warehouseRef = doc(firestore, 'warehouses', fulfillingWarehouseId!);
        const warehouseDoc = await transaction.get(warehouseRef);

        if (!warehouseDoc.exists()) throw new Error("Warehouse not found");
        const whData = warehouseDoc.data();

        // STRICT GOVERNANCE: Kill Switch Check
        if (whData.isActive === false) {
          throw new Error("Store is currently halted for maintenance. No orders accepted.");
        }

        // STRICT GOVERNANCE: Operating Hours - REMOVED per user request (Manual control only)
        // const nowTime = new Date();
        // ... (removed time check logic)

        // STRICT GOVERNANCE: Capacity Check
        // 1. READ PHASE: Gather all necessary data upfront
        const now = new Date();
        const slotKey = `${fulfillingWarehouseId}_${now.toISOString().slice(0, 13)}`;
        const statsRef = doc(firestore, 'warehouse_stats', slotKey);

        const userRef = doc(firestore, 'users', user.uid);
        let couponRef = null;
        if (coupon && coupon.id) {
          couponRef = doc(firestore, 'coupons', coupon.id);
        }

        // Parallel Reads
        // A. Warehouse (Already fetched, preventing re-read for simplicity or strictly reading again if needed, but existing is fine as it was first)
        // Actually, we must read EVERYTHING inside the transaction for consistency.
        // We already read warehouseDoc at line 250. That's fine. It was the first read.

        const reads = [
          transaction.get(statsRef),
          transaction.get(userRef),
          ...(couponRef ? [transaction.get(couponRef)] : []),
          // Products
          ...items.map(item => transaction.get(doc(firestore, 'products', item.product.id))),
          // Inventory
          ...items.map(item => transaction.get(doc(firestore, 'warehouse_inventory', `${fulfillingWarehouseId}_${item.product.id}`)))
        ];

        const results = await Promise.all(reads);

        // Unpack Results
        let idx = 0;
        const statsDoc = results[idx++] as any;
        const userDoc = results[idx++] as any;
        const couponDocSnapshot = couponRef ? results[idx++] : null;

        const productDocs = results.slice(idx, idx + items.length);
        idx += items.length;
        const invDocs = results.slice(idx, idx + items.length);

        // 2. LOGIC & VALIDATION PHASE
        // A. Stats Check
        let currentSlotCount = 0;
        if (statsDoc.exists()) {
          currentSlotCount = statsDoc.data().count || 0;
        }
        if (currentSlotCount >= 20) throw new Error("High Traffic: This delivery slot is full. Please try again in the next hour.");

        // B. Item Validation
        let validatedSubtotal = 0;
        const validatedItems = [];
        const inventoryUpdates = []; // Queue inventory updates


        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const productDoc = productDocs[i];
          const invDoc = invDocs[i];

          if (!productDoc.exists()) throw new Error(`Product '${item.product.name}' is no longer available.`);

          const liveData = productDoc.data();
          const livePrice = liveData.price;
          if (livePrice !== item.product.price) throw new Error(`Price changed for '${item.product.name}'. Please refresh.`);

          validatedSubtotal += livePrice * item.quantity;
          validatedItems.push({ ...item, product: { ...item.product, price: livePrice } });

          if (!invDoc.exists()) throw new Error(`Inventory record missing for '${item.product.name}'.`);
          const currentStock = invDoc.data().stock || 0;
          if (currentStock < item.quantity) throw new Error(`Insufficient stock for '${item.product.name}'. Available: ${currentStock}`);

          // Queue the write
          inventoryUpdates.push({ ref: invDoc.ref, quantity: item.quantity });
        }

        // C. Totals & Logic
        const handlingCharge = 2.00;
        let newTotal = validatedSubtotal + handlingCharge + tip;
        const safeDiscount = Math.min(discountAmount, validatedSubtotal);
        newTotal -= safeDiscount;

        const prefix = whData.invoicePrefix || 'GEN';
        const nextSeq = (whData.currentInvoiceSequence || 0) + 1;
        const invoiceNumber = `${prefix}-${now.getFullYear()}-${String(nextSeq).padStart(6, '0')}`;

        if (couponRef && (!couponDocSnapshot || !couponDocSnapshot.exists())) throw new Error("Coupon invalid");

        let loyaltyDiscount = 0;
        let pointsToDeduct = 0;
        const currentPoints = userDoc.exists() ? (userDoc.data().loyaltyPoints || 0) : 0;
        if (redeemPoints && currentPoints > 0) {
          loyaltyDiscount = Math.min(currentPoints / 10, newTotal);
          pointsToDeduct = Math.ceil(loyaltyDiscount * 10);
        }

        finalPayable = Math.max(0, newTotal - loyaltyDiscount);
        const pointsEarned = Math.floor(finalPayable / 100);

        const orderPayload: Order = {
          id: orderId,
          userId: user.uid,
          orderDate: serverTimestamp(),
          totalAmount: finalPayable,
          status: 'Pending',
          shippingAddress: {
            name: formData.name,
            address: formData.address,
            city: formData.city,
            pincode: formData.pincode,
            phone: formData.phone
          },
          orderItems: validatedItems.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            image: item.product.imageUrl
          })),
          paymentMethod: formData.paymentMethod,
          discountApplied: safeDiscount + loyaltyDiscount,
          tipAmount: tip,
          couponCode: coupon ? coupon.code : null,
          warehouseId: fulfillingWarehouseId!,
          invoiceNumber: invoiceNumber
        };

        // 3. WRITE PHASE: Execute all writes atomically
        // Inventory
        inventoryUpdates.forEach(update => {
          transaction.update(update.ref, { stock: increment(-update.quantity) });
        });

        // Stats
        transaction.set(statsRef, { count: increment(1) }, { merge: true });

        // Orders
        transaction.set(orderRef, orderPayload);
        const userOrderRef = doc(firestore, `users/${user.uid}/orders`, orderId);
        transaction.set(userOrderRef, orderPayload);

        // Sequences & Coupons
        transaction.update(warehouseRef, { currentInvoiceSequence: nextSeq });
        if (couponRef) {
          transaction.update(couponRef, { usedCount: increment(1) });
        }

        // User Data: Notifications & Loyalty
        const notificationRef = doc(collection(firestore, `users/${user.uid}/notifications`));
        transaction.set(notificationRef, {
          title: "Order Placed",
          body: `Your order #${orderId.slice(0, 6)} has been placed. Invoice: ${invoiceNumber}`,
          type: 'order',
          isRead: false,
          createdAt: serverTimestamp(),
          link: `/order-confirmation?orderId=${orderId}`
        });

        if (userRef) { // Should always be true as we fetched it
          let pointChange = pointsEarned - pointsToDeduct;
          if (pointChange !== 0) {
            transaction.update(userRef, { loyaltyPoints: increment(pointChange) });
          }

          const historyCollectionRef = collection(firestore, `users/${user.uid}/loyalty_history`);
          if (pointsEarned > 0) {
            transaction.set(doc(historyCollectionRef), {
              type: 'EARN',
              points: pointsEarned,
              reason: `Order #${invoiceNumber}`,
              orderId: orderId,
              createdAt: serverTimestamp()
            });
          }
          if (pointsToDeduct > 0) {
            transaction.set(doc(historyCollectionRef), {
              type: 'REDEEM',
              points: -pointsToDeduct,
              reason: `Redeemed on #${invoiceNumber}`,
              orderId: orderId,
              createdAt: serverTimestamp()
            });
          }
        }
      });
      // Transaction implicitly committed here.

      // 5. Record Ledger Entry (Async - Independent of Order Success UI)
      if (fulfillingWarehouseId) {
        // We don't await this to block UI, but in a real finance app we might want to.
        // For now, let it run in background.
        import('@/lib/ledger').then(mod => {
          mod.recordSaleTransaction(firestore, fulfillingWarehouseId, orderId, finalPayable);
        });
      }

      // 2. Handle Payment Flow
      if (formData.paymentMethod === 'COD') {
        clearCart();
        router.push(`/order-confirmation?orderId=${orderId}`);
        return;
      }

      if (formData.paymentMethod === 'RAZORPAY') {
        const isTestMode = true; // Hardcoded for this demo phase

        if (isTestMode) {
          // SIMULATION MODE
          toast({
            title: "Processing Test Payment",
            description: "Simulating successful Razorpay transaction...",
          });

          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 2000));

          const dummyPaymentId = `pay_test_${Math.random().toString(36).substring(7)}`;

          // Update order as Paid
          if (firestore) {
            const orderDocRef = doc(firestore, 'orders', orderId);
            // We need to use valid ref. 'orderRef' var from line 170 is for 'orders' collection.
            // Re-using the references from the transaction scope is hard because they are inside runTransaction.
            // But we successfully created the order in transaction.

            // We need to update the status now.
            const updates = {
              status: 'Paid',
              'payment.status': 'SUCCESS',
              'payment.id': dummyPaymentId,
              'payment.method': 'razorpay'
            };

            await updateDocumentNonBlocking(orderRef, updates);
            const userOrderRef = doc(firestore, `users/${user.uid}/orders`, orderId);
            await updateDocumentNonBlocking(userOrderRef, updates);
          }

          clearCart();
          router.push(`/order-confirmation?orderId=${orderId}`);

          if (firestore) {
            logUserAction(firestore, {
              userId: user.uid,
              action: 'ORDER_PLACED',
              details: `Order #${orderId} placed successfully`,
              metadata: { amount: total, method: 'RAZORPAY' }
            });
          }

          return;
        }

        // Real production logic would go here (requires backend)
        toast({
          title: "Razorpay Configuration",
          description: "Online payment requires a backend. Enabled Test Mode above.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      /*
        // Legacy / Insecure Client-Side Only Flow (Not recommended but possible for simple testing):
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: (total * 100).toString(),
            currency: "INR",
            name: "Tionat Nutrition",
            handler: async (response) => {
                 // Verify manually or update order
                 await setDocumentNonBlocking(orderRef, { 
                     status: 'Paid', 
                     'payment.status': 'SUCCESS',
                     'payment.gatewayPaymentId': response.razorpay_payment_id 
                 }, { merge: true });
                  clearCart();
                  router.push(`/order-confirmation?orderId=${orderId}`);
            }
        }
      /*
        // Legacy / Insecure Client-Side Only Flow ...
      */

    } catch (error) {
      console.error("Checkout Error:", error);
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Could not place order.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };


  const onSubmit = async (data: ShippingFormData) => {
    if (items.length === 0) {
      toast({
        title: "Empty Cart",
        description: "You cannot place an order with an empty cart.",
        variant: "destructive"
      });
      router.push('/');
      return;
    }

    await handlePayment(data);
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 text-center">
          <p>Loading user information...</p>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold font-headline mb-6">Please Log In</h1>
          <p className="text-muted-foreground mb-8">You need to be logged in to proceed to checkout.</p>
          <Button asChild>
            <Link href="/login?redirect=/checkout">Login</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold font-headline mb-6">Checkout</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userProfile?.addresses && userProfile.addresses.length > 0 && (
                  <div>
                    <Label htmlFor="saved-address">Select Saved Address</Label>
                    <Select onValueChange={handleAddressSelect}>
                      <SelectTrigger id="saved-address">
                        <SelectValue placeholder="Choose a saved address" />
                      </SelectTrigger>
                      <SelectContent>
                        {userProfile.addresses.map((address, index) => (
                          <SelectItem key={index} value={address}>
                            {address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">Or fill in the details below.</p>
                  </div>
                )}
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...register("address")} />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register("city")} />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" {...register("pincode")} />
                    {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>}
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" {...register("phone")} />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  defaultValue="COD"
                  onValueChange={(value: 'COD' | 'RAZORPAY') => {
                    setValue('paymentMethod', value);
                    trigger('paymentMethod');
                  }}
                  className="grid gap-4"
                >
                  <Label htmlFor="COD" className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="COD" id="COD" />
                    <div className="grid gap-1">
                      <p className="font-semibold">Cash on Delivery</p>
                      <p className="text-sm text-muted-foreground">Pay with cash upon delivery.</p>
                    </div>
                  </Label>
                  <Label htmlFor="RAZORPAY" className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                    <RadioGroupItem value="RAZORPAY" id="RAZORPAY" />
                    <div className="flex-1 grid gap-1">
                      <p className="font-semibold">Pay Online</p>
                      <p className="text-sm text-muted-foreground">Pay with UPI, Cards, Netbanking etc.</p>
                    </div>
                    <Image src="https://api.razorpay.com/static/assets/logo/rzp-pr-bg.svg" alt="Razorpay" width={80} height={20} />
                  </Label>
                </RadioGroup>
                {errors.paymentMethod && <p className="text-red-500 text-sm mt-2">{errors.paymentMethod.message}</p>}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-headline">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map(item => (
                    <li key={item.product.id} className="flex justify-between text-sm">
                      <span className="flex-1 pr-2 truncate">{item.product.name} x {item.quantity}</span>
                      <span>{(item.product.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <Separator />

                {/* Coupon Input */}
                {!coupon ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Promo Code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <Button variant="outline" onClick={handleApplyCoupon} type="button" disabled={!couponCode || isApplyingCoupon}>
                      {isApplyingCoupon ? '...' : 'Apply'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-200">
                    <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                      <Tag className="h-3 w-3" /> {coupon.code} applied
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => { removeCoupon(); setCouponCode(''); }} type="button" className="h-6 text-red-500 hover:text-red-700 hover:bg-red-50">
                      Remove
                    </Button>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({coupon?.code})</span>
                    <span>- {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Free</span>
                </div>
                {tip > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Delivery Tip</span>
                    <span>₹{tip.toFixed(2)}</span>
                  </div>
                )}

                {/* Loyalty Section in Summary */}
                {userProfile?.loyaltyPoints && userProfile.loyaltyPoints > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="redeem-points"
                        checked={redeemPoints}
                        onCheckedChange={setRedeemPoints}
                      />
                      <Label htmlFor="redeem-points" className="text-sm cursor-pointer flex items-center">
                        <Award className="w-4 h-4 mr-1 text-yellow-500" />
                        Use {userProfile.loyaltyPoints} Points
                      </Label>
                    </div>
                    {redeemPoints && (
                      <span className="text-sm text-green-600">- {(Math.min(userProfile.loyaltyPoints / 10, total)).toFixed(2)}</span>
                    )}
                  </div>
                )}


                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>
                    {(redeemPoints && userProfile?.loyaltyPoints
                      ? Math.max(0, total - (userProfile.loyaltyPoints / 10))
                      : total).toFixed(2)
                    }
                  </span>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : (paymentMethod === 'COD' ? `Place Order (COD)` : `Proceed to Pay`)}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  By placing this order, you agree to our terms of service.
                </p>
              </CardContent>
            </Card>
          </div>
        </form>
      </main>
    </div>
  );
}
