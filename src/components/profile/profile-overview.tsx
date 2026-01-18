'use client';

import { Progress } from "@/components/ui/progress";

// ... inside component ...
<div className="flex flex-col gap-2 w-full max-w-[200px]">
    <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        <span>Profile Completion</span>
        <span>{completionPercent}%</span>
    </div>
    <Progress value={completionPercent} className="h-2" />
</div>
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ChevronRight, Heart, Gift, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

interface ProfileOverviewProps {
    userProfile: UserProfile;
}

const tierColors: { [key: string]: string } = {
    Bronze: "bg-orange-200 text-orange-800",
    Silver: "bg-slate-200 text-slate-800",
    Gold: "bg-yellow-200 text-yellow-800",
};

export function ProfileOverview({ userProfile }: ProfileOverviewProps) {
    const isAdmin = userProfile.role === 'admin' || userProfile.role === 'superadmin' || userProfile.role === 'warehouse_admin';

    // Calculate Profile Completion (Simple gamification)
    const fields = [userProfile.firstName, userProfile.lastName, userProfile.email, userProfile.phoneNumber, userProfile.avatarUrl];
    const completedFields = fields.filter(f => !!f).length;
    const completionPercent = Math.round((completedFields / fields.length) * 100);

    return (
        <div className="space-y-6">
            {/* Identity Card */}
            <Card className="bg-gradient-to-br from-card to-secondary/20 border-primary/10">
                <CardHeader className="flex flex-col sm:flex-row items-center gap-6">
                    <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                        {userProfile.avatarUrl && <AvatarImage src={userProfile.avatarUrl} alt={userProfile.firstName} />}
                        <AvatarFallback className="text-2xl">{userProfile.firstName?.charAt(0)}{userProfile.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left space-y-2 flex-1">
                        <div>
                            <CardTitle className="font-headline text-2xl">{userProfile.firstName} {userProfile.lastName}</CardTitle>
                            <CardDescription className="text-base">{userProfile.email}</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            {userProfile.role && userProfile.role !== 'customer' && (
                                <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">
                                    {userProfile.role.replace('_', ' ')}
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                                {completionPercent}% Profile Complete
                            </Badge>
                        </div>
                    </div>
                    {isAdmin && (
                        <Button asChild variant="default" className="w-full sm:w-auto shadow-md">
                            <Link href="/admin">
                                <Shield className="mr-2 h-4 w-4" />
                                Admin Dashboard
                            </Link>
                        </Button>
                    )}
                </CardHeader>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Loyalty Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            Loyalty Status
                        </CardTitle>
                        <Button variant="ghost" size="icon" asChild className="h-6 w-6">
                            <Link href="/profile/loyalty"><ChevronRight className="h-4 w-4" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">{userProfile.loyaltyPoints || 0}</span>
                            <span className="text-xs text-muted-foreground">Points</span>
                        </div>
                        {userProfile.loyaltyTier ? (
                            <Badge className={cn("mt-2", tierColors[userProfile.loyaltyTier])}>
                                {userProfile.loyaltyTier} Tier
                            </Badge>
                        ) : (
                            <p className="text-xs text-muted-foreground mt-2">No tier yet</p>
                        )}
                    </CardContent>
                </Card>

                {/* Wishlist Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-500" />
                            Wishlist
                        </CardTitle>
                        <Button variant="ghost" size="icon" asChild className="h-6 w-6">
                            <Link href="/wishlist"><ChevronRight className="h-4 w-4" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">{userProfile.wishlist?.length || 0}</span>
                            <span className="text-xs text-muted-foreground">Items Saved</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Save items for later
                        </p>
                    </CardContent>
                </Card>

                {/* Referrals Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Gift className="w-4 h-4 text-indigo-500" />
                            Referrals
                        </CardTitle>
                        <Button variant="ghost" size="icon" asChild className="h-6 w-6">
                            <Link href="/profile/referrals"><ChevronRight className="h-4 w-4" /></Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">--</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Invite friends, earn points
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
