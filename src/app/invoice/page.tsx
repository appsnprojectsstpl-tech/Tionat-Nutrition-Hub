'use client';

import { useEffect, useState, Suspense } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Order } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function InvoiceContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const firestore = useFirestore();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!firestore || !id) return;
            try {
                // Try fetching from main orders collection first
                const docRef = doc(firestore, 'orders', id as string);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setOrder({ id: snap.id, ...snap.data() } as Order);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [firestore, id]);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!order) return <div className="p-12 text-center">Invoice Not Found</div>;

    // Calculations for GST (Assuming 18% inclusive logic for now as placeholder)
    const totalAmount = order.totalAmount || 0;
    const baseAmount = totalAmount / 1.18;
    const taxAmount = totalAmount - baseAmount;

    return (
        <div className="min-h-screen bg-white text-black p-8 max-w-4xl mx-auto print:p-0">
            {/* Print Control Header - Hidden when printing */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <div className="text-sm text-gray-500">Preview Mode</div>
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Print Invoice
                </Button>
            </div>

            {/* Invoice Container */}
            <div className="border p-8 print:border-none print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-4xl font-bold font-headline mb-2 text-primary">TIONAT</h1>
                        <p className="text-sm text-gray-600">Nutrition Hub Pvt Ltd.</p>
                        <p className="text-sm text-gray-600">123, Wellness Street, Indiranagar</p>
                        <p className="text-sm text-gray-600">Bangalore, Karnataka - 560038</p>
                        <p className="text-sm text-gray-600">GSTIN: 29AAAAA0000A1Z5</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">TAX INVOICE</h2>
                        <div className="space-y-1 text-sm">
                            <p><span className="font-semibold">Invoice #:</span> {order.invoiceNumber || 'PENDING'}</p>
                            <p><span className="font-semibold">Date:</span> {order.orderDate?.toDate ? format(order.orderDate.toDate(), 'dd MMM yyyy') : '-'}</p>
                            <p><span className="font-semibold">Order ID:</span> {order.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                        <h3 className="font-bold text-gray-700 border-b pb-2 mb-2">Bill To:</h3>
                        <p className="font-semibold">{order.shippingAddress.name}</p>
                        <p className="text-sm text-gray-600">{order.shippingAddress.address}</p>
                        <p className="text-sm text-gray-600">{order.shippingAddress.city} - {order.shippingAddress.pincode}</p>
                        <p className="text-sm text-gray-600">Phone: {order.shippingAddress.phone}</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-700 border-b pb-2 mb-2">Ship To:</h3>
                        <p className="text-sm text-gray-600">Same as Billing Address</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="text-left py-2">Item</th>
                            <th className="text-right py-2">Qty</th>
                            <th className="text-right py-2">Price</th>
                            <th className="text-right py-2">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.orderItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-200">
                                <td className="py-3">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-xs text-gray-500">HSN: 2106</p>
                                </td>
                                <td className="text-right py-3">{item.quantity}</td>
                                <td className="text-right py-3">₹{item.price.toFixed(2)}</td>
                                <td className="text-right py-3">₹{(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal (Taxable):</span>
                            <span>₹{baseAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>CGST (9%):</span>
                            <span>₹{(taxAmount / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>SGST (9%):</span>
                            <span>₹{(taxAmount / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                            <span>Grand Total:</span>
                            <span>₹{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t pt-8 text-center text-xs text-gray-500">
                    <p>This is a computer-generated invoice and does not require a physical signature.</p>
                    <p className="mt-1">Thank you for choosing Tionat Nutrition Hub. For support, email support@tionat.com.</p>
                </div>
            </div>
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>}>
            <InvoiceContent />
        </Suspense>
    );
}
