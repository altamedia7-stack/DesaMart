export type Role = 'admin' | 'seller' | 'buyer' | 'courier';
export type OrderStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled' | 'unpaid' | 'paid' | 'confirmed';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  whatsapp?: string;
  address?: string;
  shippingAddress?: {
    city: string;
    district: string;
    village: string;
    detail?: string;
  };
  location?: { lat: number, lng: number };
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
  isDigital?: boolean;
  createdAt: any; // Firestore Timestamp
}

export interface Courier {
  id: string;
  userId?: string;
  name: string;
  baseRate: number;
  perKmRate?: number;
  rates?: { [district: string]: number };
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
  paymentMethod: string;
  tripay_reference?: string;
  checkout_url?: string;
  merchant_ref?: string;
  shippingAddress?: {
    city: string;
    district: string;
    village: string;
    detail?: string;
  };
  shippingMethod?: string;
  shippingCost?: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface TravelListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerWhatsapp: string;
  operatorName: string;
  origin: string;
  destination: string;
  departureTime: string;
  price: number;
  totalSeats: number;
  availableSeats: number;
  imageUrl: string;
  createdAt: any; // Firestore Timestamp
}

export interface Passenger {
  name: string;
  idNumber: string;
  phone: string;
  seatNumber: string;
}

export interface TravelBooking {
  id: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName?: string;
  sellerWhatsapp?: string;
  listingId: string;
  operatorName: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  passengers: Passenger[];
  totalPrice: number;
  status: OrderStatus;
  paymentMethod: string;
  merchant_ref?: string;
  payment_name?: string;
  pay_code?: string;
  qr_url?: string;
  instructions?: any[];
  expired_time?: number;
  tripay_reference?: string;
  checkout_url?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}
