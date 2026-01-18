'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

function SearchInputContent({ className, placeholder = "Search for products..." }: { className?: string, placeholder?: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [showRecents, setShowRecents] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
    }, [showRecents]);

    const addToRecents = (term: string) => {
        const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    };

    const handleSearch = (e: React.FormEvent, term?: string) => {
        e.preventDefault();
        const finalQuery = term || query;
        if (finalQuery.trim()) {
            addToRecents(finalQuery.trim());
            setShowRecents(false);
            router.push(`/search?q=${encodeURIComponent(finalQuery.trim())}`);
        }
    };

    const clearRecents = () => {
        setRecentSearches([]);
        localStorage.removeItem('recentSearches');
    };

    return (
        <div className={`relative ${className}`}>
            <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowRecents(true)}
                    // Delay hiding to allow click on items
                    onBlur={() => setTimeout(() => setShowRecents(false), 200)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 rounded-full bg-secondary/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm"
                />
            </form>

            {showRecents && recentSearches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground rounded-lg shadow-lg border p-2 z-50">
                    <div className="flex justify-between items-center px-2 py-1 text-xs text-muted-foreground">
                        <span>Recent Searches</span>
                        <button type="button" onClick={clearRecents} className="hover:text-foreground">Clear</button>
                    </div>
                    <ul className="space-y-1 mt-1">
                        {recentSearches.map((s, i) => (
                            <li key={i}>
                                <button
                                    type="button"
                                    className="w-full text-left px-2 py-1.5 hover:bg-muted rounded text-sm flex items-center gap-2"
                                    onClick={(e) => {
                                        setQuery(s);
                                        handleSearch(e, s);
                                    }}
                                >
                                    <Search className="h-3 w-3 text-muted-foreground" />
                                    {s}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
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
