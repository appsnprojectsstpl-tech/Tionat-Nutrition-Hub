import { Suspense } from 'react';
import { ProductClient } from './product-client';
import { Metadata } from 'next';

// Static Export Page for Product View


export const metadata: Metadata = {
    title: 'Product Details | Tionat Nutrition',
    description: 'View product details and add to cart.',
};

export default function ProductViewPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Suspense fallback={<div className="p-8 text-center">Loading Product...</div>}>
                <ProductClient initialProduct={null} />
            </Suspense>
        </div>
    );
}
