'use client';

import { memo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { ProductCard } from './product-card';
import { ProductCardSkeleton } from './product-card-skeleton';
import type { Product } from '@/lib/types';

interface VirtualizedProductGridProps {
    products: Product[];
    isLoading?: boolean;
    columnCount?: number;
    rowHeight?: number;
    gap?: number;
}

/**
 * Virtualized product grid using react-window
 * Only renders visible items, dramatically reducing DOM nodes
 * Improves performance for large product lists (100+ items)
 */
export const VirtualizedProductGrid = memo(function VirtualizedProductGrid({
    products,
    isLoading = false,
    columnCount = 2,
    rowHeight = 320,
    gap = 16,
}: VirtualizedProductGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (!products || products.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No products found
            </div>
        );
    }

    const rowCount = Math.ceil(products.length / columnCount);

    // Calculate grid width (responsive)
    const containerWidth = typeof window !== 'undefined' ? window.innerWidth - 32 : 375; // 32px padding
    const columnWidth = (containerWidth - (gap * (columnCount - 1))) / columnCount;

    const Cell = ({ columnIndex, rowIndex, style }: any) => {
        const index = rowIndex * columnCount + columnIndex;
        const product = products[index];

        if (!product) return null;

        return (
            <div
                style={{
                    ...style,
                    left: Number(style.left) + (columnIndex * gap),
                    top: Number(style.top) + (rowIndex * gap),
                    width: columnWidth,
                    height: rowHeight,
                }}
            >
                <ProductCard product={product} />
            </div>
        );
    };

    return (
        <Grid
            columnCount={columnCount}
            columnWidth={columnWidth + gap}
            height={600} // Viewport height
            rowCount={rowCount}
            rowHeight={rowHeight + gap}
            width={containerWidth}
            className="scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
        >
            {Cell}
        </Grid>
    );
});
