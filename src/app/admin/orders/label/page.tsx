'use client';

import { useSearchParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

// Barcode font is assumed to be loaded globally or we use a simple CSS trick/library
// For this demo, we will use a visual placeholder or same font if available

export default function ShippingLabelPage() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const firestore = useFirestore();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !id) return;
        const fetchOrder = async () => {
            try {
                const ref = doc(firestore, 'orders', id);
                const snap = await (await import('firebase/firestore')).getDoc(ref);
                if (snap.exists()) {
                    setOrder({ id: snap.id, ...snap.data() } as Order);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [firestore, id]);

    if (!id) return <div>Missing Order ID</div>;
    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    if (!order) return <div>Order not found</div>;

    const items = order.items || order.orderItems || [];
    const totalWeight = items.reduce((acc: number, item: any) => acc + (item.weight ? parseFloat(item.weight) : 0.5) * item.quantity, 0);

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
            <div className="mb-6 print:hidden">
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Print Label
                </Button>
            </div>

            {/* Standard 4x6 inch Label Format (approx 384x576 px at 96dpi, but using simpler responsive scaling) */}
            <div className="bg-white w-[100mm] h-[150mm] p-6 border shadow-lg flex flex-col justify-between print:shadow-none print:border-none">

                {/* Header: Carrier & Service */}
                <div className="flex justify-between border-b-2 border-black pb-4">
                    <div className="font-bold text-3xl uppercase">EXPEDITED</div>
                    <div className="text-right">
                        <div className="font-bold text-xl">TRACKING #</div>
                        <div className="font-mono text-sm">{order.id.toUpperCase()}</div>
                    </div>
                </div>

                {/* From Address */}
                <div className="text-xs space-y-1 mt-4">
                    <div className="font-bold text-sm">FROM:</div>
                    <div>TIONAT NUTRITION HUB</div>
                    <div>123 Wellness Blvd</div>
                    <div>Bangalore, KA 560001</div>
                </div>

                {/* To Address (Large) */}
                <div className="my-6 border-2 border-black p-4 rounded-lg">
                    <div className="font-bold text-sm mb-2">SHIP TO:</div>
                    <div className="text-xl font-bold uppercase">{order.shippingAddress?.name}</div>
                    <div className="text-lg">{order.shippingAddress?.address}</div>
                    <div className="text-lg">{order.shippingAddress?.city} - {order.shippingAddress?.pincode}</div>
                    <div className="text-sm mt-1">Ph: {order.shippingAddress?.phone}</div>
                </div>

                {/* Meta Data */}
                <div className="grid grid-cols-2 text-sm border-t-2 border-b-2 border-black py-2">
                    <div>
                        <span className="font-bold">Order #:</span> {order.invoiceNumber || order.id.slice(0, 8)}
                    </div>
                    <div>
                        <span className="font-bold">Weight:</span> {totalWeight.toFixed(1)} kg (Est)
                    </div>
                    <div>
                        <span className="font-bold">Date:</span> {format(new Date(), 'dd MMM yyyy')}
                    </div>
                </div>

                {/* Barcode Area */}
                <div className="flex-1 flex flex-col items-center justify-center space-y-2 mt-4">
                    {/* CSS Barcode Placeholder */}
                    <div className="h-16 w-full bg-black/10 flex items-center justify-center font-mono tracking-[0.5em] text-transparent bg-clip-text bg-gradient-to-r from-black to-black bg-[length:4px_100%]">
                        ||| || ||| || ||| || |||
                    </div>
                    <div style={{ fontFamily: '"Libre Barcode 39 Text", cursive' }} className="text-6xl">
                        *{order.id.slice(0, 12).toUpperCase()}*
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs mt-4">
                    Tionat Logistics Partner
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { size: 100mm 150mm; margin: 0; }
                    body { background: white; margin: 0; }
                    .print\\:hidden { display: none !important; }
                    .shadow-lg { box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
}
