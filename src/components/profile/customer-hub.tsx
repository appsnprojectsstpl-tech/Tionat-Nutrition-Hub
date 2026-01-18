'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Package, MapPin, Settings } from "lucide-react";
import { ProfileOverview } from "./profile-overview";
import { OrderHistoryTab } from "./order-history-tab";
import { AddressBookTab } from "./address-book-tab";
import { SettingsTab } from "./settings-tab";
import type { UserProfile, Order } from "@/lib/types";

interface CustomerHubProps {
    userProfile: UserProfile;
    orders: Order[] | null;
    isLoadingOrders: boolean;
}

export function CustomerHub({ userProfile, orders, isLoadingOrders }: CustomerHubProps) {
    return (
        <div className="space-y-6">
            <Tabs defaultValue="overview" className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold font-headline tracking-tight hidden md:block">My Account</h1>
                    <TabsList className="grid w-full md:w-auto grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl">
                        <TabsTrigger value="overview" className="flex flex-col gap-1 py-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
                            <User className="h-4 w-4 mb-1" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="orders" className="flex flex-col gap-1 py-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
                            <Package className="h-4 w-4 mb-1" />
                            Orders
                        </TabsTrigger>
                        <TabsTrigger value="addresses" className="flex flex-col gap-1 py-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
                            <MapPin className="h-4 w-4 mb-1" />
                            Addresses
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex flex-col gap-1 py-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
                            <Settings className="h-4 w-4 mb-1" />
                            Settings
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-4 focus-visible:outline-none focus:outline-none">
                    <ProfileOverview userProfile={userProfile} />
                </TabsContent>

                <TabsContent value="orders" className="space-y-4 focus-visible:outline-none focus:outline-none">
                    <OrderHistoryTab orders={orders} isLoading={isLoadingOrders} />
                </TabsContent>

                <TabsContent value="addresses" className="space-y-4 focus-visible:outline-none focus:outline-none">
                    <AddressBookTab />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 focus-visible:outline-none focus:outline-none">
                    <SettingsTab userProfile={userProfile} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
