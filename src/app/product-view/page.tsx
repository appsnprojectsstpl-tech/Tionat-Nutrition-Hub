'use client';

import { Suspense } from 'react';
import { ProductClient } from './product-client';
import { useSearchParams } from 'next/navigation';

function ProductViewContent() {
    return <ProductClient initialProduct={null} />;
}

export default function ProductViewPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Suspense fallback={<div className="p-8 text-center">Loading Product...</div>}>
                <ProductViewContent />
            </Suspense>
        </div>
    );
}
