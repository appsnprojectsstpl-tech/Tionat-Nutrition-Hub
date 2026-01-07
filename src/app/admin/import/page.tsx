'use client';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function createSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

export default function AdminImportPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const { user, isUserLoading } = useUser();

  const productsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'products') : null),
    [firestore, user]
  );
  const { data: products } = useCollection<Product>(productsCollection);

  const handleBulkUpdate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore || !products) return;

    setIsBulkUpdating(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as { name: string; price: string; imageUrl: string, stock: string, categoryId: string, subcategoryId: string, status: Product['status'] }[];
        const requiredColumns = ['name', 'price', 'imageUrl', 'stock', 'categoryId', 'subcategoryId', 'status'];

        if (!results.meta.fields || !requiredColumns.every(col => results.meta.fields?.includes(col))) {
          toast({
            title: 'Invalid CSV format',
            description: `CSV must have the following columns: ${requiredColumns.join(', ')}.`,
            variant: 'destructive',
          });
          setIsBulkUpdating(false);
          return;
        }

        const batch = writeBatch(firestore);
        let updatedCount = 0;
        let createdCount = 0;

        const productsByName = new Map(products.map(p => [(p.name || '').toLowerCase(), p.id]));

        for (const row of data) {
          const name = row.name?.trim();
          if (!name) continue;

          const stock = parseInt(row.stock, 10);
          const price = parseFloat(row.price);

          const existingProductId = productsByName.get(name.toLowerCase());

          const productData: Omit<Product, 'id'> = {
            name: name,
            slug: createSlug(name),
            price: !isNaN(price) ? price : 0,
            imageUrl: row.imageUrl,
            categoryId: row.categoryId,
            subcategoryId: row.subcategoryId,
            status: row.status || 'Available',
            description: `Discover the authentic taste and convenience of our ${name}. Perfect for a quick, healthy, and delicious meal. Made with high-quality ingredients.`
          }

          if (existingProductId) {
            // Update existing product
            const productRef = doc(firestore, 'products', existingProductId);
            batch.set(productRef, productData, { merge: true });

            if (!isNaN(stock)) {
              const inventoryRef = doc(firestore, 'inventory', existingProductId);
              batch.set(inventoryRef, { productId: existingProductId, stock: stock }, { merge: true });
            }
            updatedCount++;
          } else {
            // Create new product
            const newProductRef = doc(collection(firestore, 'products'));
            batch.set(newProductRef, { ...productData, id: newProductRef.id });

            if (!isNaN(stock)) {
              const inventoryRef = doc(firestore, 'inventory', newProductRef.id);
              batch.set(inventoryRef, { productId: newProductRef.id, stock: stock }, { merge: true });
            }
            createdCount++;
          }
        }

        try {
          await batch.commit();
          toast({
            title: 'Bulk Upload Successful',
            description: `${createdCount} products created. ${updatedCount} products updated.`,
          });
        } catch (error) {
          console.error("Bulk upload failed: ", error);
          toast({
            title: 'Bulk Upload Failed',
            description: 'An error occurred while uploading the products.',
            variant: 'destructive',
          });
        } finally {
          setIsBulkUpdating(false);
        }
      },
      error: (error) => {
        console.error("CSV parsing error: ", error);
        toast({
          title: 'CSV Parsing Error',
          description: 'Failed to parse the CSV file.',
          variant: 'destructive',
        });
        setIsBulkUpdating(false);
      }
    });
    event.target.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold md:text-2xl font-headline">Bulk Product Import</h1>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How to Bulk Import Products</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 mt-2">
          <p>1. All product images have been added to the project. You can find them in the `public/tionat/` folder.</p>
          <p>2. Create a CSV file. The `imageUrl` column in your CSV should contain the path to the image (e.g., `/tionat/product-name.png`).</p>
          <p>3. Use the uploader below to import your product data. This will create new products or update existing ones based on the product name.</p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload Product Data CSV</CardTitle>
          <CardDescription>
            Upload a CSV file with your product information. If a product name exists, it will be updated. If it's new, it will be created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="csv-upload" className="text-sm font-medium">Product Data CSV</Label>
          <p className="text-xs text-muted-foreground mb-2">Required columns: name, price, imageUrl, stock, categoryId, subcategoryId, status.</p>
          <Input id="csv-upload" type="file" accept=".csv" onChange={handleBulkUpdate} disabled={isBulkUpdating} className="text-xs" />
          {isBulkUpdating && <p className="text-xs text-muted-foreground mt-2">Processing file... This may take a moment.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
