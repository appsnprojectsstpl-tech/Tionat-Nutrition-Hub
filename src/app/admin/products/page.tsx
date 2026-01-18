'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCatalogView } from "@/components/admin/products/product-catalog-view";
import { ProductImportView } from "@/components/admin/products/product-import-view";

export default function ProductHubPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline tracking-tight">Product Hub</h1>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="catalog">Product Catalog</TabsTrigger>
          <TabsTrigger value="import">Bulk Import</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="catalog">
            <ProductCatalogView />
          </TabsContent>

          <TabsContent value="import">
            <ProductImportView />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
