'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

function SearchInputContent({ className, placeholder = "Search for products..." }: { className?: string, placeholder?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <form onSubmit={handleSearch} className={`relative ${className}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 rounded-full bg-secondary/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm"
            />
        </form>
    );
}

export function SearchInput(props: { className?: string, placeholder?: string }) {
    return (
        <Suspense fallback={
            <div className={`relative ${props.className}`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={props.placeholder || "Search for products..."}
                    className="w-full pl-10 pr-4 rounded-full bg-secondary/50 border-transparent text-sm"
                    disabled
                />
            </div>
        }>
            <SearchInputContent {...props} />
        </Suspense>
    );
}
