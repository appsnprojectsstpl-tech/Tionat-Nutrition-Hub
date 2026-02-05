import { Package } from "lucide-react";

export function PlaceholderImage({ className }: { className?: string }) {
    return (
        <div className={`w-full h-full flex flex-col items-center justify-center bg-secondary/30 text-muted-foreground ${className}`}>
            <Package className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-60">No Image</span>
        </div>
    );
}
