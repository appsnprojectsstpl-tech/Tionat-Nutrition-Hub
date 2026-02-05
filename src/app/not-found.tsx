'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-background text-foreground text-center p-8">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <FileQuestion className="h-32 w-32 text-primary relative z-10 animate-pulse" />
            </div>

            <h1 className="text-6xl font-headline font-black mb-2 tracking-tight text-primary">404</h1>
            <h2 className="text-2xl font-bold mb-4 font-headline">Lost in the Aisle?</h2>

            <p className="max-w-md text-muted-foreground mb-8 text-lg">
                We couldn't find the page you're looking for. It might have expired or been moved to another shelf.
            </p>

            <div className="flex gap-4">
                <Button asChild size="lg" className="rounded-full px-8 font-bold shadow-lg shadow-primary/25">
                    <Link href="/">
                        Return Home
                    </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                    <Link href="/categories">
                        Browse Catalogue
                    </Link>
                </Button>
            </div>
        </div>
    );
}
