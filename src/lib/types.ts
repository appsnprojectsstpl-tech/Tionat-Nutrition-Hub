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
  images?: string[]; // Array of additional image URLs (e.g. front, back, side)
  isFeatured?: boolean;
  rating?: number;
  reviewCount?: number;
  weight?: string; // e.g., "500"
  unit?: string; // e.g., "g", "kg", "ml"
};

export type Inventory = {
  productId: string;
  stock: number;
}

export type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  serviceablePincodes: string[];
  contactNumber: string;
  isActive: boolean;
  openingTime?: string; // HH:mm format
  closingTime?: string; // HH:mm format
  ledgerBalance?: number; // Current amount owed to the warehouse
  invoicePrefix?: string; // e.g. "BLR"
  currentInvoiceSequence?: number; // e.g. 100
};

export type WarehouseInventory = {
  warehouseId: string;
  productId: string;
  stock: number;
  updatedAt: Timestamp | FieldValue;
};

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
  role?: 'superadmin' | 'warehouse_admin' | 'admin' | 'user';
  managedWarehouseId?: string; // For warehouse admins
  wishlist?: string[]; // Array of Product IDs
}

export type RewardHistory = {
  id: string;
  date: string;
  description: string;
  points: number;
  type: 'earned' | 'redeemed';
};




export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
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
  orderItems: OrderItem[];
  paymentMethod?: 'COD' | 'RAZORPAY';
  paymentId?: string;
  discountApplied?: number;
  couponCode?: string | null;
  warehouseId?: string; // New field for Franchise Model
  invoiceNumber?: string; // Unique Invoice ID (e.g. BLR-2024-001)
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
  usageLimit?: number;
  usedCount?: number;
};

export type Review = {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  date: Timestamp | FieldValue;
  productId: string;
};

export type StockAdjustmentReason = 'RESTOCK' | 'CORRECTION' | 'DAMAGE' | 'SHRINKAGE' | 'OTHER';

export type InventoryLog = {
  id: string;
  warehouseId: string;
  productId: string;
  productName: string;
  oldStock: number;
  newStock: number;
  change: number;
  reason: StockAdjustmentReason;
  note?: string;
  userId: string;
  userName: string;
  timestamp: Timestamp | FieldValue;
};

export interface LedgerEntry {
  id: string;
  transactionId: string; // Order ID or Payout ID
  warehouseId: string;
  type: 'CREDIT' | 'DEBIT';
  category: 'SALE' | 'COMMISSION' | 'REFUND' | 'PAYOUT';
  amount: number;
  balanceBefore: number; // Snapshot of balance at that time
  balanceAfter: number;
  description: string;
  timestamp: Timestamp | FieldValue;
}

export type WalletTransaction = {
  id: string;
  userId: string;
  amount: number; // Positive for Credit, Negative for Debit
  type: 'REFUND' | 'DEPOSIT' | 'PURCHASE' | 'CASHBACK';
  description: string;
  timestamp: Timestamp | FieldValue;
  orderId?: string;
};

