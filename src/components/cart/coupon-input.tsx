'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/hooks/use-cart';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Tag, X } from 'lucide-react';
import type { Coupon } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export function CouponInput() {
    const { subtotal, applyCoupon, removeCoupon, coupon } = useCart();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleApply = async () => {
        if (!code.trim() || !firestore) return;
        setIsLoading(true);

        try {
            // 1. Query Coupon
            const q = query(
                collection(firestore, 'coupons'),
                where('code', '==', code.toUpperCase().trim()),
                where('isActive', '==', true)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                toast({
                    title: "Invalid Coupon",
                    description: "This code does not exist or is inactive.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            const couponData = snapshot.docs[0].data() as Coupon;
            // Add ID since it's not in data usually
            const couponWithId = { ...couponData, id: snapshot.docs[0].id };

            // 2. Validate Expiry
            const now = new Date();
            // @ts-ignore
            const expiry = couponData.expiryDate.toDate ? couponData.expiryDate.toDate() : new Date(couponData.expiryDate);

            if (expiry < now) {
                toast({
                    title: "Expired Coupon",
                    description: "This coupon code has expired.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            // 3. Validate Usage Limit
            if (couponData.usageLimit && (couponData.usedCount || 0) >= couponData.usageLimit) {
                toast({
                    title: "Limit Reached",
                    description: "This coupon has reached its maximum usage limit.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            // 3. Validate Min Order
            if (subtotal < couponData.minOrderValue) {
                toast({
                    title: "Condition Not Met",
                    description: `Minimum order value of ₹${couponData.minOrderValue} required.`,
                    variant: "destructive"
                });
                setIsLoading(false);
                return;
            }

            // 4. Apply
            applyCoupon(couponWithId);
            setCode('');

        } catch (error) {
            console.error("Error applying coupon:", error);
            toast({
                title: "Error",
                description: "Failed to validate coupon.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (coupon) {
        return (
            <div className="flex items-center justify-between p-3 bg-secondary/30 border border-green-200/50 rounded-lg">
                <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-500" />
                    <div>
                        <p className="text-sm font-medium text-green-600">
                            Code <strong>{coupon.code}</strong> applied!
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {coupon.discountType === 'PERCENTAGE'
                                ? `${coupon.discountValue}% OFF`
                                : `₹${coupon.discountValue} OFF`}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={removeCoupon} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Enter promo code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="pl-9 h-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
            </div>
            <Button
                onClick={handleApply}
                disabled={!code || isLoading || subtotal === 0}
                variant="outline"
                size="sm"
                className="h-9"
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
        </div>
    );
}
