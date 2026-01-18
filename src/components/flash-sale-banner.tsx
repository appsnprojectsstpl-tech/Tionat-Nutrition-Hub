'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowRight, Timer } from 'lucide-react';

export function FlashSaleBanner() {
    const firestore = useFirestore();
    // Use realtime listener for instant updates
    const { data: config } = useDoc(firestore ? doc(firestore, 'marketing', 'flash_sale') : null);

    const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);

    useEffect(() => {
        if (!config || !config.isActive || !config.endTime) {
            setTimeLeft(null);
            return;
        }

        const calculateTime = () => {
            const end = config.endTime.toDate ? config.endTime.toDate() : new Date(config.endTime);
            const now = new Date();
            const diff = end.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft(null); // Expired
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ h, m, s });
        };

        calculateTime();
        const timer = setInterval(calculateTime, 1000);
        return () => clearInterval(timer);
    }, [config]);

    if (!config || !config.isActive || !timeLeft) return null;

    return (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm font-medium animate-in slide-in-from-top-full duration-500">
            <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 animate-pulse" />
                <span className="uppercase tracking-wide font-bold">{config.title}</span>
            </div>

            <div className="flex items-center gap-1 font-mono bg-black/10 px-2 py-0.5 rounded">
                <span>{String(timeLeft.h).padStart(2, '0')}</span>:
                <span>{String(timeLeft.m).padStart(2, '0')}</span>:
                <span>{String(timeLeft.s).padStart(2, '0')}</span>
            </div>

            {config.targetLink && (
                <Link href={config.targetLink} className="flex items-center hover:underline bg-white/10 px-3 py-1 rounded-full transition-colors hover:bg-white/20">
                    Shop Now <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
            )}
        </div>
    );
}
