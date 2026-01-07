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
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/use-cart';
import { useAuth, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { UserProfile, Order } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Image from 'next/image';
import { useDoc, useMemoFirebase } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch'; // Added switch for points
import { Award } from 'lucide-react'; // Added icon for points

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
  const { items, subtotal, clearCart, discountAmount, coupon, total } = useCart();
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
      setValue('name', `${userProfile.firstName} ${userProfile.lastName}`);
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

  const handlePayment = async (formData: ShippingFormData) => {
    if (!user || !firestore) return;
    setIsSubmitting(true);

    try {
      // 1. Create Order Client-Side (No Backend Function)
      // NOTE: Logic moved here as per user request to avoid backend functions

      const orderRef = doc(collection(firestore, 'orders'));
      const orderId = orderRef.id;

      // Fees
      const deliveryFee = 0; // Hardcoded free for now or from settings
      const tax = 0; // Simplified

      // Loyalty Calculation
      let loyaltyDiscount = 0;
      let pointsToDeduct = 0;
      if (redeemPoints && userProfile?.loyaltyPoints) {
        // Redemption: 10 pts = 1 Rupee
        // Max redeemable: min(UserPoints, Total * 10) logic? 
        // Let's keep it simple: Redeem all available or up to total value

        const potentialDiscount = userProfile.loyaltyPoints / 10;
        // Discount cannot exceed total (after coupon)
        loyaltyDiscount = Math.min(potentialDiscount, total);
        pointsToDeduct = Math.ceil(loyaltyDiscount * 10);
      }

      // Final Total Logic
      // "total" from useCart already has coupon discount.
      // We need to apply loyalty discount on top of that.
      const finalPayable = total - loyaltyDiscount;

      // Points Earned: 1 pt per 100 Rs spent (on final amount)
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
        orderItems: items.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          image: item.product.imageUrl
        })),
        paymentMethod: formData.paymentMethod,
        discountApplied: discountAmount + loyaltyDiscount,
        couponCode: coupon ? coupon.code : null,
      };

      // Batch Write
      const batch = writeBatch(firestore);
      batch.set(orderRef, orderPayload);

      const userOrderRef = doc(firestore, `users/${user.uid}/orders`, orderId);
      batch.set(userOrderRef, orderPayload);

      // Increment Coupon Usage (Client Side - Optimistic)
      if (coupon && coupon.id) {
        const couponRef = doc(firestore, 'coupons', coupon.id);
        batch.update(couponRef, { usedCount: increment(1) });
      }

      // 3. Create Notification
      const notificationRef = doc(collection(firestore, `users/${user.uid}/notifications`));
      batch.set(notificationRef, {
        title: "Order Placed",
        body: `Your order #${orderId.slice(0, 6)} has been successfully placed.`,
        type: 'order',
        isRead: false,
        createdAt: serverTimestamp(),
        link: `/order-confirmation?orderId=${orderId}`
      });

      // 4. Update Loyalty Points (Deduct used, Add earned)
      if (userProfileRef) {
        let pointChange = pointsEarned;
        if (pointsToDeduct > 0) {
          pointChange -= pointsToDeduct;
        }
        // Using increment with negative or positive value
        batch.update(userProfileRef, {
          loyaltyPoints: increment(pointChange)
        });
      }

      await batch.commit();

      // 2. Handle Payment Flow
      if (formData.paymentMethod === 'COD') {
        clearCart();
        router.push(`/order-confirmation?orderId=${orderId}`);
        return;
      }

      if (formData.paymentMethod === 'RAZORPAY') {
        // IMPORTANT: Razorpay Order Creation normally requires Secret Key (Server Side).
        // Client-side only implementation cannot create a Razorpay Order ID securely.
        // We will use a dummy order ID or skip this step if strictly client-side.
        // Ideally, we need a lightweight API route just for Razorpay Order creation if not Cloud Functions.
        // IF the user insisted on "No function", they might mean "No complex business logic function".
        // BUT Razorpay standard integration REQUIRES server for Order ID generation.
        // Assuming we simply fallback to Test Mode or basic integration without Order ID (Legacy) or user has an API route?
        // Since I cannot create easy API routes without deploying, I will alert user.

        toast({
          title: "Razorpay Configuration",
          description: "Online payment requires a backend to generate Order ID. Please use COD for client-only mode.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;

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
        */
      }

    } catch (error: any) {
      console.error("Checkout Error:", error);
      toast({
        title: "Order Failed",
        description: error.message || "Could not place order.",
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
                  <span>Shipping</span>
                  <span>Free</span>
                </div>

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
