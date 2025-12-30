
'use client';
import { useState, useMemo, useEffect } from 'react';
import Image from "next/image";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, Minus, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Product, Inventory } from "@/lib/types";
import { subCategories, categories } from "@/lib/data";
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';


const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  price: z.coerce.number().positive('Price must be a positive number'),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().min(1, 'Subcategory is required'),
  status: z.enum(['New Arrival', 'Coming Soon', 'Available']),
  imageUrl: z.string().url('Please enter a valid image URL'),
  stock: z.coerce.number().min(0, 'Stock cannot be negative'),
  description: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

function createSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') 
      .trim()
      .replace(/[\s-]+/g, '-');
}

export default function AdminProductsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product & { stock?: number } | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const [stockUpdates, setStockUpdates] = useState<{ [productId: string]: number | string }>({});
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      price: 0,
      status: 'Available',
      imageUrl: '',
      stock: 0,
      description: '',
    },
  });

   useEffect(() => {
    if (editingProduct && isDialogOpen) {
      form.reset({
        ...editingProduct,
        price: editingProduct.price,
        stock: editingProduct.stock ?? 0,
        description: editingProduct.description || `Discover the authentic taste and convenience of our ${editingProduct.name}. Perfect for a quick, healthy, and delicious meal. Made with high-quality ingredients.`,
      });
    } else {
      form.reset({
        name: '',
        price: 0,
        categoryId: '',
        subcategoryId: '',
        status: 'Available',
        imageUrl: '',
        stock: 0,
        description: '',
      });
    }
  }, [editingProduct, isDialogOpen, form]);


  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const inventoryCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'inventory') : null),
    [firestore]
  );

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection);
  const { data: inventory, isLoading: isLoadingInventory } = useCollection<Inventory>(inventoryCollection);

  const handleStockChange = (productId: string, newStock: string) => {
    const stockAsNumber = parseInt(newStock, 10);
    if (newStock === '' || (!isNaN(stockAsNumber) && stockAsNumber >= 0)) {
        setStockUpdates(prev => ({ ...prev, [productId]: newStock === '' ? '' : stockAsNumber }));
    }
  };
  
  const handleAdjustStock = (productId: string, amount: number) => {
      const currentStock = stockUpdates[productId];
      const currentStockNumber = typeof currentStock === 'number' ? currentStock : parseInt(currentStock as string, 10);
      if (isNaN(currentStockNumber)) return;

      const newStock = Math.max(0, currentStockNumber + amount);
      setStockUpdates(prev => ({ ...prev, [productId]: newStock }));
  };

  const handleUpdateStock = (productId: string) => {
    if (!firestore || stockUpdates[productId] === undefined) return;
    
    const stockValue = parseInt(stockUpdates[productId] as string, 10);
    if (isNaN(stockValue) || stockValue < 0) {
        toast({
            title: "Invalid Stock Value",
            description: "Please enter a valid non-negative number for stock.",
            variant: "destructive"
        });
        return;
    }

    const docRef = doc(firestore, 'inventory', productId);
    const dataToUpdate = { productId, stock: stockValue };

    setDocumentNonBlocking(docRef, dataToUpdate, { merge: true });
    
    const productName = products?.find(p => p.id === productId)?.name || 'Product';
    toast({
      title: "Stock Updated",
      description: `Stock for ${productName} has been updated to ${stockValue}.`,
    });
    setOpenPopoverId(null);
  };
  
  const handleBulkUpdate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !firestore || !products) return;

    setIsBulkUpdating(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as { productName: string, stock: string }[];
        if (!data.every(row => 'productName' in row && 'stock' in row)) {
            toast({
                title: 'Invalid CSV format',
                description: 'CSV must have "productName" and "stock" columns.',
                variant: 'destructive',
            });
            setIsBulkUpdating(false);
            return;
        }

        const batch = writeBatch(firestore);
        let updatedCount = 0;
        let notFoundCount = 0;
        
        const productsByName = new Map(products.map(p => [p.name.toLowerCase(), p.id]));

        data.forEach(row => {
            const stock = parseInt(row.stock, 10);
            const productName = row.productName?.trim().toLowerCase();
            const productId = productsByName.get(productName);

            if (productId && !isNaN(stock)) {
                const docRef = doc(firestore, 'inventory', productId);
                batch.set(docRef, { productId, stock }, { merge: true });
                updatedCount++;
            } else if (productName) {
                notFoundCount++;
            }
        });

        try {
            await batch.commit();
            toast({
                title: 'Bulk Update Successful',
                description: `${updatedCount} inventory records updated. ${notFoundCount > 0 ? `${notFoundCount} product names not found.` : ''}`,
            });
        } catch (error) {
            console.error("Bulk update failed: ", error);
            toast({
                title: 'Bulk Update Failed',
                description: 'An error occurred while updating the inventory.',
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

  const productData = useMemo(() => {
    if (!products || !inventory) return [];
    
    return products.map(product => {
      const inventoryItem = inventory.find(inv => inv.productId === product.id);
      const stock = inventoryItem?.stock ?? 0;
      const stockStatus = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
      return {
        ...product,
        stock,
        stockStatus,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, inventory]);

  const isLoading = isLoadingProducts || isLoadingInventory;

  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    if (!firestore) return;
    
    const { stock, ...productData } = data;
    const slug = createSlug(productData.name);
    const description = productData.description || `Discover the authentic taste and convenience of our ${productData.name}. Perfect for a quick, healthy, and delicious meal. Made with high-quality ingredients.`;

    if (editingProduct) {
        // Update existing product
        const productRef = doc(firestore, 'products', editingProduct.id);
        setDocumentNonBlocking(productRef, { ...productData, slug, description }, { merge: true });
        
        const inventoryRef = doc(firestore, 'inventory', editingProduct.id);
        setDocumentNonBlocking(inventoryRef, { productId: editingProduct.id, stock }, { merge: true });

        toast({
            title: "Product Updated",
            description: `${data.name} has been successfully updated.`,
        });
    } else {
        // Add new product
        const newProductRef = doc(collection(firestore, 'products'));
        setDocumentNonBlocking(newProductRef, { ...productData, slug, id: newProductRef.id, description });
        
        const inventoryRef = doc(firestore, 'inventory', newProductRef.id);
        setDocumentNonBlocking(inventoryRef, { productId: newProductRef.id, stock }, { merge: true });

        toast({
            title: "Product Added",
            description: `${data.name} has been successfully added.`,
        });
    }

    form.reset();
    setIsDialogOpen(false);
    setEditingProduct(null);
  };
  
  const handleDelete = (productId: string, productName: string) => {
    if (!firestore) return;
    if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      const docRef = doc(firestore, 'products', productId);
      deleteDocumentNonBlocking(docRef);
      
      const invDocRef = doc(firestore, 'inventory', productId);
      deleteDocumentNonBlocking(invDocRef);

      toast({
        title: "Product Deleted",
        description: `${productName} has been removed.`,
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (product: (Product & { stock?: number }) | null) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">Products</h1>
        <div className="flex items-center gap-2 ml-auto">
             <Dialog open={isDialogOpen} onOpenChange={(open) => {
                 setIsDialogOpen(open);
                 if (!open) setEditingProduct(null);
             }}>
                <DialogTrigger asChild>
                    <Button size="sm" className="gap-1" onClick={() => handleOpenDialog(null)}>
                        <PlusCircle className="h-4 w-4" />
                        Add Product
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    <DialogDescription>
                        {editingProduct ? 'Update the details for this product.' : 'Fill in the details for the new product.'}
                    </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Idli Mix" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="120" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="stock"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Initial Stock</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="50" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subcategoryId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Subcategory</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a subcategory" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {subCategories.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Available">Available</SelectItem>
                                    <SelectItem value="New Arrival">New Arrival</SelectItem>
                                    <SelectItem value="Coming Soon">Coming Soon</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="imageUrl"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Image URL</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://example.com/image.jpg" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="sticky bottom-0 bg-background pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save product</Button>
                        </DialogFooter>
                    </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
      </div>
       <Card className="p-4">
            <Label htmlFor="csv-upload" className="text-sm font-medium">Bulk Update via CSV</Label>
            <p className="text-xs text-muted-foreground mb-2">Upload a CSV with 'productName' and 'stock' columns.</p>
            <Input id="csv-upload" type="file" accept=".csv" onChange={handleBulkUpdate} disabled={isBulkUpdating} className="text-xs"/>
             {isBulkUpdating && <p className="text-xs text-muted-foreground mt-2">Processing file...</p>}
        </Card>
      <Card>
        <CardHeader>
          <CardTitle>Product Catalog & Inventory</CardTitle>
          <CardDescription>
            Manage your products and their stock levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  Image
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Price</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-4">Loading products...</TableCell></TableRow>}
              {productData?.map((product) => {
                const productWithStock = { ...product, stock: product.stock ?? 0 };
                return (
                  <TableRow key={product.id}>
                    <TableCell className="hidden sm:table-cell">
                      {product.imageUrl && (
                         <Image
                          alt={product.name}
                          className="aspect-square rounded-md object-cover"
                          height="64"
                          src={product.imageUrl}
                          width="64"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'New Arrival' ? 'default' : 'secondary'} className={cn(product.status === 'Coming Soon' && 'bg-muted text-muted-foreground')}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {product.price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                       <Badge variant={product.stockStatus === 'Out of Stock' ? 'destructive' : product.stockStatus === 'Low Stock' ? 'secondary' : 'default'} className={cn(product.stockStatus === 'Low Stock' && 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200/80')}>
                        {product.stockStatus}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Popover open={openPopoverId === product.id} onOpenChange={(isOpen) => {
                         if (isOpen) {
                            setOpenPopoverId(product.id);
                            setStockUpdates(prev => ({...prev, [product.id]: product.stock}));
                         } else {
                            setOpenPopoverId(null);
                         }
                       }}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-20 justify-center">{product.stock}</Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4 mr-4">
                            <div className="grid gap-4">
                              <div className="space-y-2">
                                <h4 className="font-medium leading-none">Update Stock</h4>
                                <p className="text-sm text-muted-foreground">
                                  Set new quantity for {product.name}.
                                </p>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor={`stock-${product.id}`} className="sr-only">Stock</Label>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAdjustStock(product.id, -1)} disabled={(stockUpdates[product.id] ?? 0) <= 0}>
                                      <Minus className="h-4 w-4" />
                                  </Button>
                                    <Input
                                    id={`stock-${product.id}`}
                                    type="text"
                                    value={stockUpdates[product.id] ?? ''}
                                    onChange={(e) => handleStockChange(product.id, e.target.value)}
                                    className="col-span-2 h-8 text-center"
                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateStock(product.id)}
                                    />
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAdjustStock(product.id, 1)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button size="sm" onClick={() => handleUpdateStock(product.id)}>Save</Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleOpenDialog(productWithStock)}>Edit Product</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(product.id, product.name)} className="text-red-500 focus:text-red-500">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
               {!isLoading && productData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">No products found. Add one to get started.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
