'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayoutsView } from "@/components/admin/finance/payouts-view";
import { InvoicesView } from "@/components/admin/finance/invoices-view";
import { ReportsView } from "@/components/admin/finance/reports-view";

export default function FinanceHubPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">Finance Management</h1>

            <Tabs defaultValue="payouts" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="payouts">Payouts & Ledger</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <TabsContent value="payouts">
                        <PayoutsView />
                    </TabsContent>

                    <TabsContent value="invoices">
                        <InvoicesView />
                    </TabsContent>

                    <TabsContent value="reports">
                        <ReportsView />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
