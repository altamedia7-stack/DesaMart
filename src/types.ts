export type Role = 'admin' | 'seller' | 'buyer';
export type OrderStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  whatsapp?: string;
  address?: string;
  createdAt: any; // Firestore Timestamp
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Size: L", "Color: Red"
  price: number;
  stock: number;
  discountPercentage?: number;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerWhatsapp: string;
  name: string;
  description: string;
  price: number;
  stock?: number;
  category: string;
  imageUrl: string;
  discountPercentage?: number;
  variants?: ProductVariant[];
  createdAt: any; // Firestore Timestamp
}

export interface Courier {
  id: string;
  name: string;
  baseRate: number;
  perKmRate: number;
  createdAt: any; // Firestore Timestamp
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: any; // Firestore Timestamp
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: any; // Firestore Timestamp
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}
