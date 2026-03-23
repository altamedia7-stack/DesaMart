export type Role = 'admin' | 'seller' | 'buyer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  whatsapp?: string;
  address?: string;
  createdAt: any; // Firestore Timestamp
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerWhatsapp: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  createdAt: any; // Firestore Timestamp
}

export interface Courier {
  id: string;
  name: string;
  baseRate: number;
  perKmRate: number;
  createdAt: any; // Firestore Timestamp
}
