'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignsView } from "@/components/admin/marketing/campaigns-view";
import { BannersView } from "@/components/admin/marketing/banners-view";
import { CouponsView } from "@/components/admin/marketing/coupons-view";
import { AbandonedCartsView } from "@/components/admin/marketing/abandoned-carts-view";
import { LoyaltyView } from "@/components/admin/marketing/loyalty-view";
import { EmailCampaignsView } from "@/components/admin/marketing/email-view";

export default function MarketingHubPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">Marketing Tools</h1>

            <Tabs defaultValue="campaigns" className="w-full">
                <TabsList className="grid w-full grid-cols-6 lg:w-[900px]">
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                    <TabsTrigger value="banners">Banners</TabsTrigger>
                    <TabsTrigger value="coupons">Coupons</TabsTrigger>
                    <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
                    <TabsTrigger value="emails">Emails</TabsTrigger>
                    <TabsTrigger value="recovery">Recovery</TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <TabsContent value="campaigns">
                        <CampaignsView />
                    </TabsContent>

                    <TabsContent value="banners">
                        <BannersView />
                    </TabsContent>

                    <TabsContent value="coupons">
                        <CouponsView />
                    </TabsContent>

                    <TabsContent value="loyalty">
                        <LoyaltyView />
                    </TabsContent>

                    <TabsContent value="emails">
                        <EmailCampaignsView />
                    </TabsContent>

                    <TabsContent value="recovery">
                        <AbandonedCartsView />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
