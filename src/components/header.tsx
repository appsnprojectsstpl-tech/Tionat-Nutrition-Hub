'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingCart, User, Utensils, Zap, Percent, Building2, Coffee, ChevronDown, Package, Search, ShoppingBag, Bot, Award, Menu, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useEffect, useState } from 'react';
import { useAuth, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { AddressDialog } from './address-dialog';
import { ModeToggle } from './mode-toggle';


const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: Package },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/profile", label: "Profile", icon: User },
];

import { useAddress } from '@/providers/address-provider';

function AddressDisplay() {
  const { currentAddress } = useAddress();
  return (
    <div className="flex items-center text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors bg-secondary/50 px-3 py-1.5 rounded-full">
      <span className="truncate max-w-[150px] sm:max-w-xs font-medium">
        {currentAddress || "Set Location"}
      </span>
      <ChevronDown className="h-4 w-4 ml-1" />
    </div>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);
  const { user } = useAuth();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder or null on the server to prevent hydration mismatch
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-auto flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary mr-4">
              <Utensils className="h-6 w-6" />
              <span className="font-headline">Tionat</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }



  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-auto flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary mr-4">
              <Utensils className="h-6 w-6" />
              <span className="font-headline">Tionat</span>
            </Link>
            {/* Address Bar - Now Interactive with Toast if no Dialog */}
            <AddressDialog>
              <AddressDisplay />
            </AddressDialog>
          </div>

          <div className="flex flex-1 items-center justify-end space-x-2">
            <ModeToggle />
            {/* Hide Cart/Profile icons on desktop if needed, or keep them. Keeping them hidden on mobile to avoid clutter since they are in bottom bar. */}
            {/* Wishlist Button (Hidden on Mobile) */}
            <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex">
              <Link href="/wishlist">
                <Heart className="h-5 w-5" />
                <span className="sr-only">Wishlist</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="relative hidden md:inline-flex">
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {isClient && itemCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-1 text-xs">
                    {itemCount}
                  </Badge>
                )}
                <span className="sr-only">Shopping Cart</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex">
              <Link href="/profile">
                <User className="h-5 w-5" />
                <span className="sr-only">User Profile</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {isMobile && (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t pb-safe">
          <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
            {navLinks.map(link => {
              const isActive = (link.href === "/" && pathname === "/") || (link.href !== "/" && pathname.startsWith(link.href) && link.href !== "/profile");
              const Icon = link.icon;

              let finalIsActive = isActive;
              if (link.href === '/cart') finalIsActive = pathname === '/cart';
              if (link.href === '/profile') finalIsActive = pathname === '/profile';

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "inline-flex flex-col items-center justify-center px-1 hover:bg-gray-50 dark:hover:bg-gray-800 group relative",
                    finalIsActive ? "text-primary" : "text-muted-foreground"
                  )}>
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] text-center">{link.label}</span>
                  {link.label === 'Cart' && isClient && itemCount > 0 && (
                    <span className="absolute top-1 right-1/2 -translate-y-1/2 translate-x-4 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-red-100 bg-red-600 rounded-full">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
