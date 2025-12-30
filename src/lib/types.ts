import { Timestamp, FieldValue } from 'firebase/firestore';

export type ProductStatus = 'New Arrival' | 'Coming Soon' | 'Available';
export type CategoryStatus = 'Active' | 'Coming Soon';

export type Category = {
  id: string;
  name: 'Nutritional Care' | 'Health Care' | 'Personal Care';
  status: CategoryStatus;
};

export type SubCategory = {
  id: string;
  name: string;
  time: ('Breakfast' | 'Lunch' | 'Dinner' | 'Tea Time')[];
}

export type Product = {
  id: string;
  name: string;
  description: string;
  slug: string;
  price: number;
  categoryId: string;
  subcategoryId: string;
  status: ProductStatus;
  imageUrl: string;
};

export type Inventory = {
  productId: string;
  stock: number;
}

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  addresses?: string[];
  avatarUrl?: string;
  loyaltyTier?: 'Bronze' | 'Silver' | 'Gold';
  loyaltyPoints?: number;
  loyaltyPoints?: number;
  role?: 'superadmin' | 'admin' | 'user';
  wishlist?: string[]; // Array of Product IDs
}

export type RewardHistory = {
  id: string;
  date: string;
  description: string;
  points: number;
  type: 'earned' | 'redeemed';
};

export type CartItem = {
  product: Product;
  quantity: number;
};


export type Order = {
  id: string;
  userId: string;
  orderDate: Timestamp | FieldValue; // FieldValue when writing, Timestamp when reading
  totalAmount: number;
  status: 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    pincode: string;
    phone: string;
  };
  orderItems: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  paymentMethod?: 'COD' | 'RAZORPAY';
  paymentId?: string;
  discountApplied?: number;
  couponCode?: string;
  finalAmount?: number;
};

export type LoyaltyProgram = {
  id: string;
  pointsPerRupee: number;
  pointsToRupeeConversion: number;
  tierBronzeDiscount: number;
  tierSilverDiscount: number;
  tierGoldDiscount: number;
};

export type Coupon = {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number; // e.g., 10 for 10% or 100 for ₹100
  minOrderValue: number;
  maxDiscount?: number; // Cap for percentage discount
  expiryDate: Timestamp | FieldValue;
  isActive: boolean;
  description?: string;
};
