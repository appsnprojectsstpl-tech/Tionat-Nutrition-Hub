'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
            <h2 className="text-2xl font-bold font-headline">Something went wrong!</h2>
            <p className="text-muted-foreground">We apologize for the inconvenience.</p>
            <Button onClick={() => reset()}>Try again</Button>
        </div>
    );
}
