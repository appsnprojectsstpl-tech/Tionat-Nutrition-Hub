
import { Skeleton } from "@/components/ui/skeleton"

export function ProductCardSkeleton() {
    return (
        <div className="flex flex-col bg-card rounded-3xl shadow-sm border border-border/40 overflow-hidden h-full">
            {/* Image Skeleton */}
            <div className="aspect-[4/5] w-full bg-secondary/10 relative">
                <Skeleton className="absolute inset-0 w-full h-full" />
            </div>

            <div className="flex flex-col flex-1 p-3 gap-2">
                {/* Title Skeleton */}
                <div className="space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>

                {/* Weight Skeleton */}
                <Skeleton className="h-3 w-1/4" />

                {/* Price & Button Skeleton */}
                <div className="mt-auto pt-2">
                    <div className="flex items-baseline gap-2 mb-3">
                        <Skeleton className="h-6 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}
