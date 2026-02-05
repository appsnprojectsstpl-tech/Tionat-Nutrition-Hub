'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Product, CartItem, Coupon } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, warehouseId: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  // Coupon Support
  coupon: Coupon | null;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  discountAmount: number;
  total: number;
  tip: number;
  setTip: (amount: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const isBrowser = typeof window !== 'undefined';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { user, isUserLoading } = useAuth();
  const firestore = useFirestore();

  const [items, setItems] = useState<CartItem[]>(() => {
    if (!isBrowser) return [];
    try {
      const item = window.localStorage.getItem('cart');
      return item ? JSON.parse(item) : [];
    } catch (error) {
      return [];
    }
  });

  const [coupon, setCoupon] = useState<Coupon | null>(() => {
    if (!isBrowser) return null;
    try {
      const stored = window.localStorage.getItem('coupon');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Persist cart
  useEffect(() => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem('cart', JSON.stringify(items));
    } catch (error) { }
  }, [items]);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const subtotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  // Calculate Discount
  let discountAmount = 0;
  if (coupon) {
    if (subtotal < coupon.minOrderValue) {
      discountAmount = 0;
    } else {
      if (coupon.discountType === 'PERCENTAGE') {
        let eligibleAmount = subtotal;
        if (coupon.applicableCategoryId && coupon.applicableCategoryId !== 'all') {
          eligibleAmount = items
            // @ts-ignore - categoryId check
            .filter(item => item.product.categoryId === coupon.applicableCategoryId || item.product.category === coupon.applicableCategoryId)
            .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        }
        const calculated = (eligibleAmount * coupon.discountValue) / 100;
        discountAmount = coupon.maxDiscount ? Math.min(calculated, coupon.maxDiscount) : calculated;
      } else {
        discountAmount = coupon.discountValue;
      }
    }
  }

  // Tip Support
  const [tip, setTip] = useState<number>(0);

  // Persist tip to local storage (optional but good for UX)
  useEffect(() => {
    if (!isBrowser) return;
    try {
      // Reset tip if cart is cleared is handled in clearCart
    } catch { }
  }, [tip]);

  const total = Math.max(0, subtotal - discountAmount + tip);

  // --- MISSING FUNCTIONS REDEFINED ---

  // Stabilize functions with useCallback
  const addToCart = useCallback((product: Product, quantity: number = 1, warehouseId: string) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.product.id === product.id);
      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...currentItems, { product, quantity, warehouseId, productName: product.name }];
    });
  }, []); // No dependencies needed due to functional updates

  const removeFromCart = useCallback((productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const applyCoupon = useCallback((newCoupon: Coupon) => {
    setCoupon(newCoupon);
    if (isBrowser) window.localStorage.setItem('coupon', JSON.stringify(newCoupon));
    toast({
      title: "Coupon Applied",
      description: `${newCoupon.code} applied successfully!`
    });
  }, [toast]);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    if (isBrowser) window.localStorage.removeItem('coupon');
    toast({ title: "Coupon Removed" });
  }, [toast]);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setTip(0);
    if (isBrowser) {
      window.localStorage.removeItem('cart');
      window.localStorage.removeItem('coupon');
    }
  }, []);

  const contextValue = useMemo(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
    coupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    total,
    tip,
    setTip
  }), [
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
    coupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    total,
    tip,
    setTip
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
