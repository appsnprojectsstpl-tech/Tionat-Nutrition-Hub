
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

const OPTIMIZED_IMAGES = {
  rice: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=400&auto=format&fit=crop',
  mix: 'https://images.unsplash.com/photo-1630384060421-cbcb07505674?q=80&w=400&auto=format&fit=crop',
  dal: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400&auto=format&fit=crop',
  snack: 'https://images.unsplash.com/photo-1621939514649-28b12e81658b?q=80&w=400&auto=format&fit=crop',
  fruit: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=400&auto=format&fit=crop',
};

export const products: Omit<Product, 'id' | 'categoryId' | 'slug' | 'description'>[] = [
  { name: 'Assorted Dehydrated Fruits', price: 150, category: 'Nutritional Care', subcategoryId: 'sub-7', status: 'Available', imageUrl: OPTIMIZED_IMAGES.fruit },
  { name: 'Biryani Rice', price: 180, category: 'Nutritional Care', subcategoryId: 'sub-4', status: 'Available', imageUrl: OPTIMIZED_IMAGES.rice },
  { name: 'Bisi Bele Bath', price: 160, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'Available', imageUrl: OPTIMIZED_IMAGES.rice },
  { name: 'Dal Rice', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: OPTIMIZED_IMAGES.dal },
  { name: 'Dosa Mix', price: 125, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: OPTIMIZED_IMAGES.mix },
  { name: 'Gongura Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: OPTIMIZED_IMAGES.dal },
  { name: 'Gongura Rice', price: 120, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: OPTIMIZED_IMAGES.rice },
  { name: 'Idly Mix', price: 120, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'New Arrival', imageUrl: OPTIMIZED_IMAGES.mix },
  { name: 'Jeera Rice', price: 95, category: 'Nutritional Care', subcategoryId: 'sub-4', status: 'Available', imageUrl: OPTIMIZED_IMAGES.rice },
  { name: 'Mango Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: OPTIMIZED_IMAGES.dal },
  { name: 'Mango bar 2', price: 80, category: 'Nutritional Care', subcategoryId: 'sub-7', status: 'New Arrival', imageUrl: OPTIMIZED_IMAGES.snack },

  { name: 'Millet Rice', price: 115, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: OPTIMIZED_IMAGES.rice },
  { name: 'Neo salt bacl', price: 50, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: OPTIMIZED_IMAGES.snack },
  { name: 'Neo Salt front', price: 50, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: OPTIMIZED_IMAGES.snack },
  { name: 'poha mix pouch - 100g', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: OPTIMIZED_IMAGES.mix },
  { name: 'Punugulu Mix', price: 110, category: 'Nutritional Care', subcategoryId: 'sub-5', status: 'Available', imageUrl: OPTIMIZED_IMAGES.mix },
  { name: 'Puri Mix', price: 90, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: OPTIMIZED_IMAGES.mix },
  { name: 'Spinach Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: OPTIMIZED_IMAGES.dal },
  { name: 'Suhar', price: 100, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: OPTIMIZED_IMAGES.snack },
  { name: 'Tomato Mix', price: 105, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'Available', imageUrl: OPTIMIZED_IMAGES.mix },
  { name: 'Tomato Rice', price: 105, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: OPTIMIZED_IMAGES.rice },
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
