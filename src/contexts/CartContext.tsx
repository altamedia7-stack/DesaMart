import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product, CartItem, ProductVariant } from '../types';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant, quantity?: number) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('desamart_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const { addNotification } = useNotification();
  const { currentUser } = useAuth();
  const notifiedProducts = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('desamart_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    const checkStock = async () => {
      if (!currentUser) return;
      
      for (const item of cartItems) {
        if (!notifiedProducts.current.has(item.product.id)) {
          try {
            const productDoc = await getDoc(doc(db, 'products', item.product.id));
            if (productDoc.exists()) {
              const productData = productDoc.data() as Product;
              if (productData.stock < 5 && productData.stock > 0) {
                await addNotification(
                  'Stok Hampir Habis!',
                  `Produk "${productData.name}" di keranjang Anda sisa ${productData.stock}. Segera checkout sebelum kehabisan!`
                );
                notifiedProducts.current.add(item.product.id);
              } else if (productData.stock === 0) {
                await addNotification(
                  'Produk Habis!',
                  `Maaf, produk "${productData.name}" di keranjang Anda sudah habis.`
                );
                notifiedProducts.current.add(item.product.id);
              }
            }
          } catch (error) {
            console.error("Error checking stock:", error);
          }
        }
      }
    };

    if (cartItems.length > 0) {
      checkStock();
    }
  }, [cartItems, addNotification, currentUser]);

  const addToCart = (product: Product, variant?: ProductVariant, quantity: number = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => 
        item.product.id === product.id && 
        (variant ? item.selectedVariant?.id === variant.id : !item.selectedVariant)
      );
      
      if (existingItem) {
        return prev.map(item =>
          (item.product.id === product.id && (variant ? item.selectedVariant?.id === variant.id : !item.selectedVariant))
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedVariant: variant }];
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCartItems(prev => prev.filter(item => 
      !(item.product.id === productId && (variantId ? item.selectedVariant?.id === variantId : !item.selectedVariant))
    ));
  };

  const updateQuantity = (productId: string, variantId: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        (item.product.id === productId && (variantId ? item.selectedVariant?.id === variantId : !item.selectedVariant)) 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
    const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
    const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
    return sum + (price * item.quantity);
  }, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
