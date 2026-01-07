import { Zap, Leaf, Ban, Wheat } from "lucide-react";
import { Product } from "@/lib/types";

interface NutritionHighlightsProps {
    product: Product;
}

export function NutritionHighlights({ product }: NutritionHighlightsProps) {
    const text = (product.description || '' + product.name).toLowerCase();

    // Simple detection logic
    const isHighProtein = text.includes('protein') || text.includes('whey');
    const isVegan = text.includes('vegan') || text.includes('plant');
    const isGlutenFree = text.includes('gluten') || text.includes('millet'); // Millets are GF usually
    const isSugarFree = text.includes('sugar') || text.includes('healthy');

    const highlights = [
        { label: 'High Protein', icon: Zap, active: isHighProtein, color: 'text-yellow-600 bg-yellow-100' },
        { label: '100% Vegan', icon: Leaf, active: isVegan, color: 'text-green-600 bg-green-100' },
        { label: 'Gluten Free', icon: Wheat, active: isGlutenFree, color: 'text-amber-600 bg-amber-100' },
        { label: 'No Added Sugar', icon: Ban, active: isSugarFree, color: 'text-blue-600 bg-blue-100' },
    ].filter(h => h.active);

    if (highlights.length === 0) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            {highlights.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg ${item.color} bg-opacity-50`}>
                    <div className={`p-1 rounded-full bg-white/50`}>
                        <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold">{item.label}</span>
                </div>
            ))}
        </div>
    );
}
