'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
            <FileQuestion className="h-24 w-24 text-muted-foreground mb-6" />
            <h1 className="text-4xl font-headline font-bold mb-2">404</h1>
            <h2 className="text-xl font-semibold mb-6">Page Not Found</h2>
            <p className="max-w-md text-muted-foreground mb-8">
                The page you are looking for doesn't exist or has been moved.
            </p>
            <Button asChild>
                <Link href="/">
                    Go Back Home
                </Link>
            </Button>
        </div>
    );
}
