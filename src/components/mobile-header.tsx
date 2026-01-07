'use client';

import Link from 'next/link';
import { Search, MapPin, ChevronDown, Utensils } from 'lucide-react';
import { AddressDialog } from './address-dialog';
import { useAddress } from '@/providers/address-provider';
import { NotificationsSheet } from './notifications-sheet';
import { SearchInput } from './search-input';

export function MobileHeader() {
    const { currentAddress } = useAddress();

    return (
        <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 transition-all duration-300">
            <div className="container flex flex-col py-2 gap-3">
                {/* Top Row: Brand & Address */}
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="p-1.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Utensils className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-headline font-bold text-xl tracking-tight text-foreground">
                            Tionat
                        </span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <NotificationsSheet />

                        <AddressDialog>
                            <button className="flex items-center max-w-[160px] gap-1.5 bg-secondary/50 hover:bg-secondary/70 transition-colors px-3 py-1.5 rounded-full">
                                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                <div className="flex flex-col items-start truncate">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Delivering to</span>
                                    <span className="text-xs font-semibold truncate w-full text-left">
                                        {currentAddress || "Set Location"}
                                    </span>
                                </div>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </button>
                        </AddressDialog>
                    </div>
                </div>

                {/* Bottom Row: Search Pill */}
                <div className="relative">
                    <SearchInput className="w-full" placeholder="Search 'protein bars'..." />
                </div>
            </div>
        </header>
    );
}
