'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AppHeader } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/hooks/use-cart';
import { useAuth, useFirestore, useFunctions } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { UserProfile } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Image from 'next/image';
import { useDoc, useMemoFirebase } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const functions = useFunctions();

  const handleAddressSelect = (selectedAddress: string) => {
    const [address, city, pincode] = selectedAddress.split(',').map(s => s.trim());
    setValue('address', address || '');
    if (city) setValue('city', city);
    if (pincode) setValue('pincode', pincode);
  }

  const handlePayment = async (formData: ShippingFormData) => {
    if (!user || !functions) return;
    setIsSubmitting(true);

    try {
      // 1. Create Order Server-Side
      const createOrderFn = httpsCallable(functions, 'createOrder');
      const { data: orderResponse } = await createOrderFn({
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          variantId: 'default' // Add if supported
        })),
        shippingAddress: {
          name: formData.name,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          phone: formData.phone
        },
        paymentMethod: formData.paymentMethod
      }) as any;

      const { success, orderId, gatewayOrderId, totalAmount } = orderResponse;

      if (!success) throw new Error("Order creation failed on server.");

      // 2. Handle Payment Flow
      if (formData.paymentMethod === 'COD') {
        clearCart();
        router.push(`/order-confirmation?orderId=${orderId}`);
        return;
      }

      if (formData.paymentMethod === 'RAZORPAY') {
        const options: RazorpayOptions = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Ensure this env var is set
          amount: (totalAmount * 100).toString(),
          currency: 'INR',
          name: 'Tionat Nutrition Hub',
          description: 'Order Payment',
          order_id: gatewayOrderId,
          handler: async function (response: RazorpayResponse) {
            try {
              const verifyPaymentFn = httpsCallable(functions, 'verifyRazorpayPayment');
              await verifyPaymentFn({
                orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              });

              clearCart();
              router.push(`/order-confirmation?orderId=${orderId}`);
            } catch (verifyError: any) {
              console.error("Verification failed", verifyError);
              toast({
                title: "Payment Verification Failed",
                description: "Contact support if money was deducted.",
                variant: "destructive"
              });
            }
          },
          prefill: {
            name: formData.name,
            email: user.email || '',
            contact: formData.phone,
          },
          theme: {
            color: '#FF7849',
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              toast({
                title: "Payment Cancelled",
                description: "You cancelled the payment process.",
              });
            }
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response: any) {
          setIsSubmitting(false);
          console.error("Payment Failed", response.error);
          toast({
            title: "Payment Failed",
            description: response.error.description || "Payment could not be completed.",
            variant: "destructive"
          });
        });
        paymentObject.open();
      }

    } catch (error: any) {
      console.error("Checkout Error:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'functions/not-found') {
        description = "One of the items in your cart is no longer available. Please review your cart and try again.";
      } else if (error.code === 'functions/failed-precondition') {
        description = "There was an issue with an item in your cart, it might be out of stock or the price has changed. Please review your cart and try again.";
      } else if (error.message) {
        description = error.message;
      }
      toast({
        title: "Order Failed",
        description: description,
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
        <AppHeader />
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
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{total.toFixed(2)}</span>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : (paymentMethod === 'COD' ? `Place Order (COD) - ₹${total.toFixed(2)}` : `Proceed to Pay - ₹${total.toFixed(2)}`)}
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
