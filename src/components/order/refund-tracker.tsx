'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, Truck, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

interface RefundTrackerProps {
    status?: 'Requested' | 'Approved' | 'Rejected' | 'Refunded';
    requestedAt?: any;
    processedAt?: any;
}

export function RefundTracker({ status, requestedAt, processedAt }: RefundTrackerProps) {
    if (!status) return null;

    const steps = [
        {
            id: 'Requested',
            label: 'Return Requested',
            description: requestedAt ? format(new Date(requestedAt), 'PPP p') : 'Under Review',
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-100'
        },
        {
            id: 'Approved',
            label: 'Approved & Pickup',
            description: 'Pickup scheduled within 24h',
            icon: Truck,
            color: 'text-orange-600',
            bg: 'bg-orange-100'
        },
        {
            id: 'Refunded',
            label: 'Refund Processed',
            description: processedAt ? `Completed on ${format(new Date(processedAt), 'PPP')}` : 'Amount credited to source',
            icon: RefreshCcw,
            color: 'text-green-600',
            bg: 'bg-green-100'
        }
    ];

    // Determine current step index
    // If Rejected, special case
    if (status === 'Rejected') {
        return (
            <div className="w-full bg-red-50 p-4 rounded-lg border border-red-100">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-100 rounded-full">
                        <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-red-900">Return Request Rejected</h4>
                        {processedAt && <p className="text-xs text-red-800 mt-1">Updated on {format(new Date(processedAt), 'PPP')}</p>}
                        <p className="text-sm text-red-700 mt-2">
                            Your return request could not be approved. Please contact support for more details.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    let currentStepIndex = 0;
    if (status === 'Approved') currentStepIndex = 1;
    if (status === 'Refunded') currentStepIndex = 2;

    return (
        <div className="w-full bg-white p-4 rounded-lg border">
            <h3 className="font-semibold mb-4">Return Status</h3>
            <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gray-200" />

                <div className="space-y-6">
                    {steps.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;

                        return (
                            <div key={step.id} className="relative flex items-start gap-4">
                                {/* Icon Bubble */}
                                <div className={cn(
                                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition-colors duration-300",
                                    isCompleted ? `border-transparent ${step.bg}` : "border-gray-200"
                                )}>
                                    {isCompleted ? (
                                        <step.icon className={cn("h-5 w-5", step.color)} />
                                    ) : (
                                        <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                                    )}
                                </div>

                                {/* Text Content */}
                                <div className={cn("pt-1", isCompleted ? "opacity-100" : "opacity-40")}>
                                    <p className="font-medium text-sm leading-none">{step.label}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
