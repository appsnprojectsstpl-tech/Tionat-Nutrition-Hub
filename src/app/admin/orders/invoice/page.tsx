'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Order } from '@/lib/types';
import { OrderInvoice } from '@/components/admin/order-invoice';
import { Loader2 } from 'lucide-react';

function InvoiceContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const firestore = useFirestore();

    const { data: order, isLoading } = useDoc<Order>(
        firestore && id ? doc(firestore, 'orders', id) : null
    );

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <h1 className="text-xl font-bold">Order Not Found</h1>
                <p className="text-muted-foreground">Could not load invoice for ID: {id}</p>
            </div>
        );
    }

    return <OrderInvoice order={order} />;
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InvoiceContent />
        </Suspense>
    );
}
