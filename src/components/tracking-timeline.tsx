'use client';

import { Check, Package, Truck, Home, Clock, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingTimelineProps {
    status: 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';
    orderDate?: any; // Firestore Timestamp
}

export function TrackingTimeline({ status, orderDate }: TrackingTimelineProps) {
    if (status === 'Cancelled') {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-destructive bg-destructive/5 rounded-lg border border-destructive/10">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="font-bold text-lg">Order Cancelled</h3>
                <p className="text-sm text-muted-foreground mt-1">This order has been cancelled.</p>
            </div>
        );
    }

    const steps = [
        { label: 'Order Placed', description: 'We have received your order.', icon: CheckCircle2, status: 'Pending' },
        { label: 'Processing', description: 'We are packing your items.', icon: Package, status: 'Paid' },
        { label: 'Out for Delivery', description: 'Your order is on the way.', icon: Truck, status: 'Shipped' },
        { label: 'Delivered', description: 'Enjoy your healthy meal!', icon: Home, status: 'Delivered' },
    ];

    const statusMap: Record<string, number> = {
        'Pending': 0,
        'Paid': 1,
        'Shipped': 2,
        'Delivered': 3,
    };

    const currentStepIndex = statusMap[status] ?? 0;

    return (
        <div className="space-y-6 relative ml-2">
            <div className="absolute left-[11px] top-2 bottom-4 w-px bg-muted -z-10" />

            {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                let dateDisplay = null;
                if (index === 0 && orderDate?.toDate) {
                    dateDisplay = orderDate.toDate().toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
                    });
                }

                return (
                    <div key={step.label} className="flex gap-4">
                        <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-background border-2 z-10",
                            isCompleted ? "border-primary text-primary" : "border-muted text-muted-foreground",
                            isCurrent && "ring-4 ring-primary/20"
                        )}>
                            {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                        </div>
                        <div className="pb-2">
                            <h4 className={cn("text-sm font-semibold leading-none", isCompleted ? "text-foreground" : "text-muted-foreground")}>
                                {step.label}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                            {dateDisplay && <p className="text-[10px] text-gray-500 mt-1 font-mono">{dateDisplay}</p>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
