
'use client';
import { AppHeader } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

import confetti from 'canvas-confetti';
import { useEffect } from 'react';


export default function OrderConfirmationPage() {
    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <Suspense fallback={<div>Loading...</div>}>
                <OrderConfirmationContent />
            </Suspense>
        </div>
    );
}
