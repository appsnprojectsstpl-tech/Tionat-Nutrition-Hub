
import type { Product, Category, SubCategory, UserProfile, RewardHistory } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const categories: Omit<Category, 'id'>[] = [
  { name: 'Nutritional Care', status: 'Active' },
  { name: 'Health Care', status: 'Coming Soon' },
  { name: 'Personal Care', status: 'Coming Soon' },
].map((c, i) => ({ ...c, id: `cat-${i + 1}` }));


export const subCategories: SubCategory[] = [
  { id: 'sub-1', name: 'Ready to Cook', time: ['Breakfast', 'Lunch', 'Dinner'] },
  { id: 'sub-2', name: 'Breakfast Time', time: ['Breakfast'] },
  { id: 'sub-3', name: 'Lunch Time', time: ['Lunch'] },
  { id: 'sub-4', name: 'Dinner Time', time: ['Dinner'] },
  { id: 'sub-5', name: 'Tea Time', time: ['Tea Time'] },
  { id: 'sub-6', name: 'Dal Based', time: ['Lunch', 'Dinner'] },
  { id: 'sub-7', name: 'Fruit Based', time: [] },
  { id: 'sub-8', name: 'Nutri Based', time: ['Breakfast'] },
];

// Distinct, High-Quality Unsplash Images
const IMAGES = {
  rice_biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=400&auto=format&fit=crop', // Authentic Biryani
  rice_white: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=400&auto=format&fit=crop', // White Rice
  rice_tomato: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop', // Tomato Rice looking dish
  dal_yellow: 'https://images.unsplash.com/photo-1585937421612-70a008356f36?q=80&w=400&auto=format&fit=crop', // Yellow Dal
  dal_spinach: 'https://images.unsplash.com/photo-1626505779532-332921509a25?q=80&w=400&auto=format&fit=crop', // Green/Spinach Dal
  idly: 'https://images.unsplash.com/photo-1589301760576-415c6d9e3e38?q=80&w=400&auto=format&fit=crop', // Idly
  dosa: 'https://images.unsplash.com/photo-1668236543090-d2f896b8417c?q=80&w=400&auto=format&fit=crop', // Dosa
  puri: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=400&auto=format&fit=crop', // Puri
  fruit_mix: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=400&auto=format&fit=crop', // Dried Fruits
  snack_mix: 'https://images.unsplash.com/photo-1621939514649-28b12e81658b?q=80&w=400&auto=format&fit=crop', // Indian Snack Mix
  millet: 'https://images.unsplash.com/photo-1664993108960-9ba1dfaa9d11?q=80&w=400&auto=format&fit=crop', // Millets
  gongura: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=400&auto=format&fit=crop', // Green Leafy text (used Puri for placeholder visual variety)
};

export const products: Omit<Product, 'id' | 'categoryId' | 'slug' | 'description'>[] = [
  { name: 'Assorted Dehydrated Fruits', price: 150, category: 'Nutritional Care', subcategoryId: 'sub-7', status: 'Available', imageUrl: IMAGES.fruit_mix },
  { name: 'Biryani Rice', price: 180, category: 'Nutritional Care', subcategoryId: 'sub-4', status: 'Available', imageUrl: IMAGES.rice_biryani },
  { name: 'Bisi Bele Bath', price: 160, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'Available', imageUrl: IMAGES.rice_tomato },
  { name: 'Dal Rice', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: IMAGES.dal_yellow },
  { name: 'Dosa Mix', price: 125, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: IMAGES.dosa },
  { name: 'Gongura Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: IMAGES.dal_spinach },
  { name: 'Gongura Rice', price: 120, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: IMAGES.rice_white },
  { name: 'Idly Mix', price: 120, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'New Arrival', imageUrl: IMAGES.idly },
  { name: 'Jeera Rice', price: 95, category: 'Nutritional Care', subcategoryId: 'sub-4', status: 'Available', imageUrl: IMAGES.rice_white },
  { name: 'Mango Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: IMAGES.dal_yellow },
  { name: 'Mango bar 2', price: 80, category: 'Nutritional Care', subcategoryId: 'sub-7', status: 'New Arrival', imageUrl: IMAGES.fruit_mix },

  { name: 'Millet Rice', price: 115, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: IMAGES.millet },
  { name: 'Neo salt bacl', price: 50, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: IMAGES.snack_mix },
  { name: 'Neo Salt front', price: 50, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: IMAGES.snack_mix },
  { name: 'Poha Mix Pouch', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: IMAGES.snack_mix },
  { name: 'Punugulu Mix', price: 110, category: 'Nutritional Care', subcategoryId: 'sub-5', status: 'Available', imageUrl: IMAGES.snack_mix },
  { name: 'Puri Mix', price: 90, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: IMAGES.puri },
  { name: 'Spinach Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: IMAGES.dal_spinach },
  { name: 'Suhar', price: 100, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: IMAGES.snack_mix },
  { name: 'Tomato Mix', price: 105, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'Available', imageUrl: IMAGES.rice_tomato },
  { name: 'Tomato Rice', price: 105, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: IMAGES.rice_tomato },
].map((p, i) => ({ ...p, id: `prod-${i + 1}` }));


export const rewardHistory: RewardHistory[] = [
  { id: 'rh-1', date: '2023-10-26', description: 'Order #TN12345', points: 150, type: 'earned' },
  { id: 'rh-2', date: '2023-10-20', description: 'Redeemed for discount', points: -100, type: 'redeemed' },
  { id: 'rh-3', date: '2023-10-15', description: 'Order #TN12300', points: 80, type: 'earned' },
];

export const mockUser: UserProfile = {
  id: 'user-1',
  firstName: 'Alex',
  lastName: 'Doe',
  email: 'alex.doe@example.com',
  avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxwZXJzb258ZW58MHx8fHwxNzYxNjI2Mzg4fDA&ixlib=rb-4.1.0&q=80&w=1080',
  loyaltyTier: 'Gold',
  loyaltyPoints: 1250
};

// This is no longer used for the main cart, but can be kept for reference or other mockups
export const cartItems = [
  // This is now handled by the useCart hook and localStorage
].filter(item => item.product);
