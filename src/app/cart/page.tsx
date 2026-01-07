'use client';

import Image from "next/image";
import Link from "next/link";
// AppHeader removed - using AppShell global header
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFirestore } from "@/firebase";
import { useEffect, useMemo, useState } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import type { Product } from "@/lib/types";
import { ProductCarousel } from "@/components/product-carousel";
import { CouponInput } from "@/components/cart/coupon-input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function RelatedProducts() {
  const { items } = useCart();
  const firestore = useFirestore();
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const cartProductIds = useMemo(() => items.map(item => item.product.id), [items]);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!firestore || items.length === 0) {
        setRelatedProducts([]);
        return;
      }

      setIsLoading(true);
      try {
        const categoryIds = [...new Set(items.map(item => item.product.categoryId))];
        if (categoryIds.length === 0) {
          setRelatedProducts([]);
          setIsLoading(false);
          return;
        }

        const q = query(
          collection(firestore, 'products'),
          where('categoryId', 'in', categoryIds),
          limit(6) // Fetch a bit more to filter out cart items
        );

        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Product))
          .filter(product => !cartProductIds.includes(product.id))
          .slice(0, 3); // Take the first 3

        setRelatedProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching related products:", error);
        setRelatedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [firestore, items, cartProductIds]);

  if (isLoading || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-xl md:text-2xl font-headline font-semibold mb-6">You might also like</h2>
      <ProductCarousel products={relatedProducts} />
    </div>
  );
}


export default function CartPage() {
  const { items, updateQuantity, removeFromCart, subtotal, clearCart, discountAmount, total } = useCart();
  const router = useRouter();

  const handleCheckout = () => {
    router.push('/checkout');
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* AppHeader removed - using AppShell global header */}
        <main className="container mx-auto px-4 py-16 flex-1 flex flex-col items-center justify-center text-center">
          <div className="bg-secondary/30 p-8 rounded-full mb-6">
            <div className="relative w-40 h-40">
              <Image
                src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png"
                alt="Empty Cart"
                fill
                className="object-contain opacity-80"
              />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline mb-3">Your Cart is Empty</h1>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Looks like you haven't added anything to your cart yet. Explore our fresh products and start ordering!
          </p>
          <Button asChild size="lg" className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20">
            <Link href="/">Start Shopping</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* AppHeader removed - using AppShell global header */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold font-headline">Your Cart</h1>
          <Button variant="outline" size="sm" onClick={clearCart}>Clear Cart</Button>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {items.map(({ product, quantity }) => {
              return (
                <Card key={product.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden shrink-0">
                      {product.imageUrl && (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 grid gap-1">
                      <h3 className="font-semibold text-sm md:text-base leading-tight">{product.name}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {product.price.toFixed(2)}
                      </p>
                      <div className="flex md:hidden items-center gap-2 mt-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(product.id, quantity - 1)} disabled={quantity <= 1}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-bold w-4 text-center">{quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(product.id, quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="items-center gap-2 mx-4 hidden md:flex">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(product.id, quantity - 1)} disabled={quantity <= 1}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold w-4 text-center">{quantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(product.id, quantity + 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-semibold text-base">
                        {(product.price * quantity).toFixed(2)}
                      </p>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => removeFromCart(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <RelatedProducts />

          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="bg-secondary/30 pb-4">
                <CardTitle className="font-headline text-lg">Bill Details</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/50 p-2 rounded-lg border border-border/50">
                  <div className="h-4 w-4 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">₹</div>
                  You are saving ₹{(subtotal * 0.2 + discountAmount).toFixed(0)} on this order
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">

                {/* Free Shipping Meter */}
                <div className="mb-4 space-y-2">
                  {subtotal >= 500 ? (
                    <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                      <span className="bg-green-100 p-1 rounded-full">🎉</span>
                      You've unlocked FREE Shipping!
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Add <span className="text-primary font-bold">₹{(500 - subtotal).toFixed(0)}</span> more for <span className="text-green-600 font-bold">FREE Shipping</span>
                    </p>
                  )}
                  <Progress value={Math.min((subtotal / 500) * 100, 100)} className="h-2" />
                </div>

                <div className="mb-4">
                  <CouponInput />
                </div>

                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Item Total</span>
                  <span className="text-foreground">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 decoration-dotted underline">Delivery Fee</span>
                  <span className="text-green-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Handling Charge</span>
                  <span className="text-foreground">₹2.00</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm font-medium text-green-600">
                    <span>Coupon Discount</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <Separator />

                {/* Tip Section */}
                <div className="bg-background border border-border/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">Tip your delivery partner</span>
                    <span className="text-[10px] text-muted-foreground">100% goes to them</span>
                  </div>
                  <div className="flex gap-2">
                    {[10, 20, 30].map(amt => (
                      <Button key={amt} variant="outline" size="sm" className="h-7 text-xs rounded-full border-dashed">
                        ₹{amt}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">To Pay</span>
                  <div className="text-right">
                    <span className="font-bold text-xl">₹{(total + 2).toFixed(2)}</span>
                    <p className="text-[10px] text-muted-foreground">Incl. all taxes</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2 pt-0 pb-6 px-6">
                <Button className="w-full h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/20" size="lg" onClick={handleCheckout}>
                  Click to Pay
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
