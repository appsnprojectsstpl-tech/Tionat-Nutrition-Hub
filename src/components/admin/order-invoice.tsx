'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Order } from '@/lib/types';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface InvoiceProps {
    order: Order;
}

export function OrderInvoice({ order }: InvoiceProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        // Simple window print which triggers browser print dialog
        window.print();
    };

    if (!order) return null;

    return (
        <div className="max-w-3xl mx-auto my-8 bg-white p-8 border rounded-lg shadow-sm print:shadow-none print:border-none print:m-0 print:w-full">

            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">Tionat</h1>
                    <p className="text-sm text-muted-foreground mt-1">Nutrition Hub</p>
                    <div className="text-xs text-muted-foreground mt-2">
                        <p>123 Healthy Street</p>
                        <p>Wellness City, 560001</p>
                        <p>support@tionat.com</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-semibold">INVOICE</h2>
                    <p className="text-sm text-muted-foreground mt-1"># {order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                        Date: {order.orderDate && order.orderDate.toDate ? format(order.orderDate.toDate(), 'PPP') : 'N/A'}
                    </p>
                </div>
            </div>

            <Separator className="my-6" />

            {/* Bill To */}
            <div className="mb-8">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2">Bill To</h3>
                <div className="text-sm">
                    <p className="font-bold text-lg">{order.shippingAddress?.name}</p>
                    <p>{order.shippingAddress?.address}</p>
                    <p>{order.shippingAddress?.city}, {order.shippingAddress?.pincode}</p>
                    <p>Phone: {order.shippingAddress?.phone}</p>
                </div>
            </div>

            {/* Table */}
            <table className="w-full mb-8 text-sm">
                <thead>
                    <tr className="border-b-2 border-primary/10">
                        <th className="text-left py-3 font-semibold">Item</th>
                        <th className="text-center py-3 font-semibold">Qty</th>
                        <th className="text-right py-3 font-semibold">Price</th>
                        <th className="text-right py-3 font-semibold">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items?.map((item: any) => (
                        <tr key={item.productId} className="border-b">
                            <td className="py-3 pr-4">
                                <p className="font-medium">{item.name}</p>
                                {/* <p className="text-xs text-muted-foreground">{item.productId}</p> */}
                            </td>
                            <td className="text-center py-3">{item.quantity}</td>
                            <td className="text-right py-3">₹{item.price.toFixed(2)}</td>
                            <td className="text-right py-3">₹{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>₹{order.financials?.subtotal.toFixed(2)}</span>
                    </div>
                    {/* Discount */}
                    {order.financials?.discountApplied ? (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Discount:</span>
                            <span>- ₹{order.financials.discountApplied.toFixed(2)}</span>
                        </div>
                    ) : null}

                    {/* Loyalty */}
                    {order.financials?.loyaltyDiscount ? (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Points Redeemed:</span>
                            <span>- ₹{order.financials.loyaltyDiscount.toFixed(2)}</span>
                        </div>
                    ) : null}

                    {/* Delivery */}
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery:</span>
                        <span>{order.financials?.deliveryFee ? `₹${order.financials.deliveryFee}` : 'Free'}</span>
                    </div>

                    <Separator className="my-2" />

                    <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>₹{order.financials?.totalAmount.toFixed(2) || order.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-16 text-center text-xs text-muted-foreground pt-8 border-t">
                <p>Thank you for your business!</p>
                <p>For any queries, please contact support.</p>
            </div>


            {/* Print Button (Hidden in Print) */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <Button onClick={handlePrint} size="lg" className="shadow-xl">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Invoice
                </Button>
            </div>

            {/* Print CSS */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:border-none { border: none !important; }
                    .print\\:m-0 { margin: 0 !important; }
                    .print\\:w-full { width: 100% !important; max-width: none !important; }
                    /* Hide other UI elements like headers/sidebars if they exist on the page wrapper */
                    nav, header, footer, aside { display: none !important; }
                }
            `}</style>
        </div>
    );
}
