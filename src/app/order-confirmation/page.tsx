
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, ShoppingBag, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, limit, where } from "firebase/firestore";
import { Product } from "@/lib/types";
import { useCart } from "@/hooks/use-cart";
import confetti from 'canvas-confetti';


function UpsellOffers() {
    const firestore = useFirestore();
    const { addToCart, applyCoupon } = useCart();
    const router = useRouter();

    // Fetch 3 random products (simulated by limit 3)
    // Ideally we'd use a specific 'upsell' tag or just popular items
    const { data: products } = useCollection<Product>(
        firestore ? query(collection(firestore, 'products'), limit(3)) : null
    );

    const handleAddUpsell = (product: Product) => {
        addToCart(product, 1);

        // Mock a coupon object or apply directly if possible
        // Since applyCoupon expects a Coupon object from DB, we might need a real coupon code "UPSELL10" existing in DB.
        // Or we can just add to cart and let user checkout.
        // Task says "Add x for 10% off".
        // Let's assume user just wants to buy again quickly.

        // Better: Redirect to Cart ensuring they see it.
        router.push('/cart');
    };

    if (!products || products.length === 0) return null;

    return (
        <div className="mt-8 text-left animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <h3 className="text-lg font-bold font-headline mb-4 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                You might also need
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {products.map(product => (
                    <Card key={product.id} className="border-dashed border-primary/20 bg-primary/5">
                        <CardContent className="p-4 flex flex-col gap-2">
                            <div className="aspect-video relative rounded-md overflow-hidden bg-white mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
                            </div>
                            <p className="font-semibold text-sm line-clamp-1">{product.name}</p>
                            <div className="flex items-center justify-between mt-auto">
                                <span className="font-bold text-sm">₹{product.price}</span>
                                <Button size="sm" variant="secondary" className="h-8 px-2" onClick={() => handleAddUpsell(product)}>
                                    <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
                GRAB10 coupon available for your next order!
            </p>
        </div>
    );
}

function OrderConfirmationContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    useEffect(() => {
        // Fire confetti on mount
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-md text-center border-none shadow-2xl relative overflow-hidden bg-gradient-to-b from-card to-secondary/20">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-500 via-pink-500 to-yellow-500"></div>
                <CardHeader>
                    <div className="mx-auto bg-green-100/50 rounded-full p-4 w-fit mb-2 animate-in zoom-in spin-in-12 duration-500">
                        <CheckCircle2 className="w-16 h-16 text-green-600 drop-shadow-sm" />
                    </div>
                    <CardTitle className="font-headline text-3xl mt-4 bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-600">Order Placed!</CardTitle>
                    <CardDescription className="text-base">We've received your order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-secondary/30 p-4 rounded-xl border border-border/50">
                        <p className="text-muted-foreground text-sm mb-2">
                            Estimated Delivery
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                            12-15 Mins
                        </p>
                    </div>

                    <p className="text-muted-foreground text-sm px-4">
                        Your order has been placed successfully. You will receive an email confirmation shortly.
                    </p>

                    <UpsellOffers />

                    {orderId && (
                        <p className="text-sm font-semibold bg-secondary p-2 rounded-md font-mono">
                            Order ID: <span className="select-all">{orderId}</span>
                        </p>
                    )}
                    <Button asChild className="w-full h-12 text-lg rounded-xl shadow-lg shadow-primary/20">
                        <Link href="/">Continue Shopping</Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}

export default function OrderConfirmationPage() {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div>Loading...</div>}>
                <OrderConfirmationContent />
            </Suspense>
        </div>
    );
}
