import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ProfileSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <Skeleton className="h-10 w-48 hidden md:block" />
                <div className="grid w-full md:w-auto grid-cols-4 gap-2">
                    <Skeleton className="h-14 w-full md:w-20 rounded-lg" />
                    <Skeleton className="h-14 w-full md:w-20 rounded-lg" />
                    <Skeleton className="h-14 w-full md:w-20 rounded-lg" />
                    <Skeleton className="h-14 w-full md:w-20 rounded-lg" />
                </div>
            </div>

            {/* Profile Overview Identity Card */}
            <Card className="border-primary/5">
                <CardHeader className="flex flex-col sm:flex-row items-center gap-6">
                    <Skeleton className="w-24 h-24 rounded-full" />
                    <div className="space-y-2 flex-1 w-full flex flex-col items-center sm:items-start">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <div className="flex gap-2 mt-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-8 w-16" /></CardHeader></Card>
            </div>
        </div>
    );
}
