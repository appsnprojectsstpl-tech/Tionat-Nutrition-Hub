'use client';

import { Check, Package, Truck, Home, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingTimelineProps {
    status: 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';
}

export function TrackingTimeline({ status }: TrackingTimelineProps) {
    if (status === 'Cancelled') {
        return (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-2 rounded-lg mt-3">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-bold">Order Cancelled</span>
            </div>
        );
    }

    const steps = [
        { label: 'Confirmed', icon: Check, status: 'Pending' },
        { label: 'Processing', icon: Package, status: 'Paid' },
        { label: 'Shipped', icon: Truck, status: 'Shipped' },
        { label: 'Delivered', icon: Home, status: 'Delivered' },
    ];

    // Map status to a progress index (0 to 3)
    const statusMap: Record<string, number> = {
        'Pending': 0,
        'Paid': 1,
        'Shipped': 2,
        'Delivered': 3,
    };

    const currentStepIndex = statusMap[status] ?? 0;

    return (
        <div className="w-full mt-4">
            <div className="relative flex items-center justify-between">

                {/* Progress Bar Background */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full -z-10" />

                {/* Active Progress Bar */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full -z-10 transition-all duration-500 ease-out"
                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                        <div key={step.label} className="flex flex-col items-center gap-2">
                            <div
                                className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-background",
                                    isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground",
                                    isCurrent && "ring-4 ring-primary/20 scale-110"
                                )}
                            >
                                <step.icon className="h-4 w-4" />
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium transition-colors duration-300",
                                isCompleted ? "text-foreground font-bold" : "text-muted-foreground"
                            )}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
