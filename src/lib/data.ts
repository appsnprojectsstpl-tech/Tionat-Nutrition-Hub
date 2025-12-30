
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

const getImageUrl = (imageId: string) => PlaceHolderImages.find(img => img.id === imageId)?.imageUrl || '';

export const products: Omit<Product, 'id' | 'categoryId' | 'slug' | 'description'>[] = [
  { name: 'Assorted Dehydrated Fruits', price: 150, category: 'Nutritional Care', subcategoryId: 'sub-7', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017300-obvjkeaiqab-1764927012675_w4l89e_assorted_dehydrated_.jpeg' },
  { name: 'Biryani Rice', price: 180, category: 'Nutritional Care', subcategoryId: 'sub-4', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017677-cduaxsxtz9u-1764927012677_jeovy4_biryani_rice.jpeg' },
  { name: 'Bisi Bele Bath', price: 160, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018046-pn2yud7mjj8-1764927012679_h0894p_bisi_bele_bath.jpeg' },
  { name: 'Dal Rice', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018215-gijje6p2qae-1764927012684_b6wavh_dal_rice.jpeg' },
  { name: 'Dosa Mix', price: 125, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018317-hli29ubvbrw-1764927012686_djwa1g_dosa_mix.jpeg' },
  { name: 'Gongura Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018088-i4i8umisyl9-1764927012690_ybc63m_gongura_dal.jpeg' },
  { name: 'Gongura Rice', price: 120, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018292-6nw43ch15h-1764927012691_wqe9e4_gongura_rice.jpeg' },
  { name: 'Idly Mix', price: 120, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'New Arrival', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017862-r1x2ypl6yyr-1764927012692_f5q3zt_idly_mix.jpeg' },
  { name: 'Jeera Rice', price: 95, category: 'Nutritional Care', subcategoryId: 'sub-4', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018228-mk8gux54qaf-1764927012694_i2fs60_jeera_rice.jpeg' },
  { name: 'Mango Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017520-32c54csq7a-1764927012695_u2scl8_mago_dal.jpeg' },
  { name: 'Mango bar 2', price: 80, category: 'Nutritional Care', subcategoryId: 'sub-7', status: 'New Arrival', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017345-f4unagxqcq8-1764927012697_4zeupb_mango_bar.jpeg' },

  { name: 'Millet Rice', price: 115, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017945-tfcussz8f1m-1764927012698_fxakdn_millet_rice.jpeg' },
  { name: 'Neo salt bacl', price: 50, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018225-upk5awg3ubj-1764927012700_ofxpfe_neo_salt_bacl.jpeg' },
  { name: 'Neo Salt front', price: 50, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017882-qq7spo15axb-1764927012701_7zapbu_neo_salt_front.jpeg' },
  { name: 'poha mix pouch - 100g', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018842-c30b6fvym6b-1764927012702_mn2p9b_poha_mix_pouch_-_100.png' },
  { name: 'Punugulu Mix', price: 110, category: 'Nutritional Care', subcategoryId: 'sub-5', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017538-a1azkmomce-1764927012703_qsifvv_punugulu_mix.jpeg' },
  { name: 'Puri Mix', price: 90, category: 'Nutritional Care', subcategoryId: 'sub-2', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017635-3m2mrri24pt-1764927012706_qw61bn_puri_mix.jpeg' },
  { name: 'Spinach Dal', price: 100, category: 'Nutritional Care', subcategoryId: 'sub-6', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017663-nji51isb11-1764927012708_sxksgn_spinach_dal.jpeg' },
  { name: 'Suhar', price: 100, category: 'Health Care', subcategoryId: 'sub-1', status: 'Coming Soon', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017428-c08cthbznyw-1764927012709_ocolg3_suhar.jpeg' },
  { name: 'Tomato Mix', price: 105, category: 'Nutritional Care', subcategoryId: 'sub-1', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927017574-e0bf1efyfbb-1764927012710_nme701_tomato_mix.jpeg' },
  { name: 'Tomato Rice', price: 105, category: 'Nutritional Care', subcategoryId: 'sub-3', status: 'Available', imageUrl: 'https://pub-141831e61e69445289222976a15b6fb3.r2.dev/1764927018265-9bs2j5nulpc-1764927012711_91bbdn_tomato_rice.jpeg' },
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
