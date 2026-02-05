/**
 * Tionat.com Product Data Scraper
 * Extracts products from tionat.com website
 */

export interface TionatProduct {
    name: string;
    price: number;
    status: 'Coming Soon' | 'New Arrival' | 'Available';
    url: string;
    imageUrl?: string;
    category?: string;
}

/**
 * Scraped product data from tionat.com
 * Last updated: 2026-01-28
 */
export const TIONAT_PRODUCTS: TionatProduct[] = [
    // Ready to Cook Products
    {
        name: 'Chole Mix',
        price: 50,
        status: 'New Arrival',
        url: 'https://www.tionat.com/product-page/chole-mix',
        category: 'Ready to Cook',
    },
    {
        name: 'Rasam Mix',
        price: 40,
        status: 'New Arrival',
        url: 'https://www.tionat.com/product-page/rasam-mix',
        category: 'Ready to Cook',
    },
    {
        name: 'Sambar Mix',
        price: 60,
        status: 'New Arrival',
        url: 'https://www.tionat.com/product-page/sambar-mix',
        category: 'Ready to Cook',
    },
    {
        name: 'Idli Mix',
        price: 0,
        status: 'New Arrival',
        url: 'https://www.tionat.com/product-page/idli-mix',
        category: 'Breakfast Time',
    },
    {
        name: 'Punugulu Mix',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/punugulu-mix',
        category: 'Ready to Cook',
    },
    {
        name: 'Puri Mix',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/puri-mix',
        category: 'Breakfast Time',
    },
    {
        name: 'Dosa Mix',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/dosa-mix',
        category: 'Breakfast Time',
    },
    {
        name: 'Poha Mix',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/poha-mix',
        category: 'Breakfast Time',
    },

    // Rice Products
    {
        name: 'Biryani Rice',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/biryani-rice',
        category: 'Lunch Time',
    },
    {
        name: 'Jeera Rice',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/jeera-rice',
        category: 'Lunch Time',
    },
    {
        name: 'Bisi Bele Bath',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/bisi-bele-bath',
        category: 'Lunch Time',
    },
    {
        name: 'Gongura Rice',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/gongura-rice',
        category: 'Lunch Time',
    },
    {
        name: 'Tomato Rice',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/tomato-rice',
        category: 'Lunch Time',
    },
    {
        name: 'Millet Rice',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/millet-rice',
        category: 'Lunch Time',
    },
    {
        name: 'Dal Rice',
        price: 100,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/dal-rice',
        category: 'Lunch Time',
    },

    // Dal Products
    {
        name: 'Gongura Dal',
        price: 100,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/gongura-dal',
        category: 'Lunch Time',
    },
    {
        name: 'Spinach Dal',
        price: 100,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/spinach-dal',
        category: 'Lunch Time',
    },
    {
        name: 'Tomato Dal',
        price: 100,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/tomato-dal',
        category: 'Lunch Time',
    },
    {
        name: 'Mango Dal',
        price: 100,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/mango-dal',
        category: 'Lunch Time',
    },

    // Health Products
    {
        name: 'Neutri Vita (Strawberry)',
        price: 100,
        status: 'New Arrival',
        url: 'https://www.tionat.com/product-page/neutri-vita-strawberry',
        category: 'Health Care',
    },
    {
        name: 'Neo Healthy Salt',
        price: 0,
        status: 'Available',
        url: 'https://www.tionat.com/product-page/neo-healthy-salt',
        category: 'Healthy Grocery',
    },

    // Snacks
    {
        name: 'Mango Bar',
        price: 0,
        status: 'Available',
        url: 'https://www.tionat.com/product-page/mango-bar',
        category: 'Tea Time',
    },
    {
        name: 'Assorted Dehydrated Fruits',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/dry-fruit-pieces',
        category: 'Tea Time',
    },
    {
        name: 'Suhar',
        price: 0,
        status: 'Coming Soon',
        url: 'https://www.tionat.com/product-page/dry-fruit',
        category: 'Tea Time',
    },
];

/**
 * Category mapping from website to app
 */
export const CATEGORY_MAPPING: Record<string, string> = {
    'Ready to Cook': 'Ready to Cook',
    'Breakfast Time': 'Breakfast',
    'Lunch Time': 'Lunch',
    'Dinner Time': 'Dinner',
    'Tea Time': 'Snacks',
    'Health Care': 'Health & Wellness',
    'Healthy Grocery': 'Groceries',
};

/**
 * Get products by category
 */
export function getProductsByCategory(category: string): TionatProduct[] {
    return TIONAT_PRODUCTS.filter(p => p.category === category);
}

/**
 * Get available products only (price > 0)
 */
export function getAvailableProducts(): TionatProduct[] {
    return TIONAT_PRODUCTS.filter(p => p.price > 0);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
    const categories = new Set(TIONAT_PRODUCTS.map(p => p.category).filter(Boolean));
    return Array.from(categories) as string[];
}
