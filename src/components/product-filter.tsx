'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';

const CATEGORIES = [
    'Nutritional Care',
    'Health Care',
    'Personal Care',
];

export function ProductFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initial States from URL
    const [priceRange, setPriceRange] = useState([0, 2000]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Sync with URL on Mount
    useEffect(() => {
        const minParam = searchParams.get('minPrice');
        const maxParam = searchParams.get('maxPrice');
        if (minParam && maxParam) {
            setPriceRange([Number(minParam), Number(maxParam)]);
        }

        const catParam = searchParams.getAll('category');
        if (catParam) {
            setSelectedCategories(catParam);
        }
    }, [searchParams]);


    const handlePriceChange = (value: number[]) => {
        setPriceRange(value);
    };

    const handleCategoryChange = (category: string, checked: boolean) => {
        if (checked) {
            setSelectedCategories([...selectedCategories, category]);
        } else {
            setSelectedCategories(selectedCategories.filter(c => c !== category));
        }
    };

    const applyFilters = () => {
        const params = new URLSearchParams(searchParams.toString());

        // Update Price
        params.set('minPrice', priceRange[0].toString());
        params.set('maxPrice', priceRange[1].toString());

        // Update Categories
        params.delete('category');
        selectedCategories.forEach(cat => params.append('category', cat));

        // Keep Query
        const query = searchParams.get('q');
        if (query) params.set('q', query);

        router.push(`/search?${params.toString()}`);
    };

    const clearFilters = () => {
        setPriceRange([0, 2000]);
        setSelectedCategories([]);
        router.push('/search');
    };

    const firestore = useFirestore();
    // Fetch Categories dynamically
    const { data: categoryDocs } = useCollection(
        firestore ? collection(firestore, 'categories') : null
    );

    // If categories fail to load, fallback to hardcoded (or empty)
    const availableCategories = categoryDocs?.map((c) => c.name) || CATEGORIES;

    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Price Range */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Price Range</h3>
                    <Slider
                        defaultValue={[0, 2000]}
                        value={priceRange}
                        max={10000}
                        step={100}
                        onValueChange={handlePriceChange}
                        className="my-4"
                    />
                    <div className="flex items-center justify-between text-sm">
                        <div className="border px-2 py-1 rounded">₹{priceRange[0]}</div>
                        <div className="text-muted-foreground">-</div>
                        <div className="border px-2 py-1 rounded">₹{priceRange[1]}</div>
                    </div>
                </div>

                <Separator />

                {/* Categories */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Categories</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {availableCategories.map((category: string) => (
                            <div key={category} className="flex items-center space-x-2">
                                <Checkbox
                                    id={category}
                                    checked={selectedCategories.includes(category)}
                                    onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                                />
                                <Label htmlFor={category} className="text-sm cursor-pointer">{category}</Label>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                    <Button onClick={applyFilters} className="w-full">Apply Filters</Button>
                    <Button onClick={clearFilters} variant="outline" className="w-full">Clear All</Button>
                </div>
            </CardContent>
        </Card>
    );
}
