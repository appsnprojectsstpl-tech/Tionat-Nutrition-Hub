'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, CartItem, Coupon } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
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



  // Persist cart to Firestore for logged-in users
  useEffect(() => {
    if (!user || !firestore) return;

    // Debounce to avoid too many writes
    const timeoutId = setTimeout(async () => {
      try {
        const cartRef = doc(firestore, 'active_carts', user.uid);
        if (items.length > 0) {
          await setDoc(cartRef, {
            userId: user.uid,
            email: user.email,
            items: items,
            subtotal: subtotal, // Calculated from items
            lastUpdated: serverTimestamp(),
            status: 'active'
          }, { merge: true });
        } else {
          // Optional: Delete or mark empty. Let's mark empty? 
          // actually good to keep for analytics, but for "abandoned" we check items > 0
          await setDoc(cartRef, { items: [], lastUpdated: serverTimestamp(), status: 'empty' }, { merge: true });
        }
      } catch (e) {
        console.error("Failed to sync cart", e);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timeoutId);
  }, [items, user, firestore, subtotal]);

  // Persist coupon
  useEffect(() => {
    if (!isBrowser) return;
    try {
      if (coupon) {
        window.localStorage.setItem('coupon', JSON.stringify(coupon));
      } else {
        window.localStorage.removeItem('coupon');
      }
    } catch (error) { }
  }, [coupon]);

  // Clear cart on logout
  useEffect(() => {
    if (!isUserLoading && !user) {
      // Optional: Decide if cart should stick around for guest. 
      // Current logic cleared it, let's keep it consistent.
      // setItems([]); 
      // setCoupon(null);
    }
  }, [user, isUserLoading]);


  const addToCart = (product: Product, quantity = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
    toast({
      title: "Item removed",
      description: "The item has been removed from your cart.",
      variant: "destructive"
    })
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(null);
  };

  const applyCoupon = (newCoupon: Coupon) => {
    setCoupon(newCoupon);
    toast({
      title: "Coupon Applied",
      description: `You saved with code ${newCoupon.code}!`,
    });
  };

  const removeCoupon = () => {
    setCoupon(null);
    toast({
      title: "Coupon Removed",
      description: "The discount has been removed.",
    });
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const subtotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  // Calculate Discount
  let discountAmount = 0;
  if (coupon) {
    if (subtotal < coupon.minOrderValue) {
      // If subtotal drops below min, auto-remove or just 0 discount?
      // Let's just 0 it but keep coupon in state (user might add more items)
      discountAmount = 0;
    } else {
      if (coupon.type === 'percentage') {
        let eligibleAmount = subtotal;

        // Category Constraint Logic
        if (coupon.applicableCategoryId && coupon.applicableCategoryId !== 'all') {
          // Calculate total only for items in this category
          eligibleAmount = items
            .filter(item => item.product.category === coupon.applicableCategoryId)
            .reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        }

        const calculated = (eligibleAmount * coupon.value) / 100;
        discountAmount = coupon.maxDiscount ? Math.min(calculated, coupon.maxDiscount) : calculated;
      } else {
        discountAmount = coupon.value;
      }
    }
  }

  // Ensure total isn't negative
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <CartContext.Provider
      value={{
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
        total
      }}
    >
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
