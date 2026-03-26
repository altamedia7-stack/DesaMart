import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Plus, Minus, ArrowLeft, MessageCircle, ShoppingBag, Download } from 'lucide-react';

const Cart: React.FC = () => {
  const { cartItems, updateQuantity, removeFromCart, totalItems, totalPrice, clearCart } = useCart();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Group items by seller
  const itemsBySeller = cartItems.reduce((acc, item) => {
    const sellerId = item.product.sellerId;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        sellerName: item.product.sellerName,
        sellerWhatsapp: item.product.sellerWhatsapp,
        items: []
      };
    }
    acc[sellerId].items.push(item);
    return acc;
  }, {} as Record<string, { sellerName: string; sellerWhatsapp: string; items: typeof cartItems }>);

  const handleCheckoutSeller = (sellerId: string) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate(`/checkout/${sellerId}`);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 py-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Keranjang Kosong</h2>
          <p className="text-gray-500 mb-8">Anda belum menambahkan produk apa pun ke keranjang belanja.</p>
          <button 
            onClick={() => navigate('/')} 
            className="w-full bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition"
          >
            Mulai Belanja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Keranjang Belanja</h1>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded-full">
            {totalItems} Produk
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(itemsBySeller).map(([sellerId, group]: [string, any]) => (
              <div key={sellerId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500">Penjual:</span>
                    <h3 className="font-bold text-gray-900">{group.sellerName}</h3>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {group.items.map((item) => (
                    <div key={`${item.product.id}-${item.selectedVariant?.id || 'default'}`} className="p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                      <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img 
                          src={item.product.imageUrl || 'https://picsum.photos/seed/product/200/200'} 
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      <div className="flex-grow">
                        <Link to={`/products/${item.product.id}`} className="font-bold text-lg text-gray-900 hover:text-emerald-600 transition line-clamp-2 mb-1">
                          {item.product.name}
                        </Link>
                        {item.product.isDigital && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                              <Download className="h-3 w-3" /> Digital
                            </span>
                          </div>
                        )}
                        {item.selectedVariant && (
                          <div className="text-xs text-emerald-600 font-bold mb-2 flex items-center gap-1">
                            <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              Varian: {item.selectedVariant.name}
                            </span>
                          </div>
                        )}
                        <div className="mb-4">
                          {item.selectedVariant ? (
                            <div className="flex flex-col">
                              {item.selectedVariant.discountPercentage && item.selectedVariant.discountPercentage > 0 ? (
                                <>
                                  <span className="text-xs text-gray-400 line-through">Rp {item.selectedVariant.price.toLocaleString('id-ID')}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-emerald-600">
                                      Rp {(item.selectedVariant.price * (1 - item.selectedVariant.discountPercentage / 100)).toLocaleString('id-ID')}
                                    </span>
                                    <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold">-{item.selectedVariant.discountPercentage}%</span>
                                  </div>
                                </>
                              ) : (
                                <p className="font-bold text-emerald-600">
                                  Rp {item.selectedVariant.price.toLocaleString('id-ID')}
                                </p>
                              )}
                            </div>
                          ) : item.product.discountPercentage && item.product.discountPercentage > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-400 line-through">Rp {item.product.price.toLocaleString('id-ID')}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-600">
                                  Rp {(item.product.price * (1 - item.product.discountPercentage / 100)).toLocaleString('id-ID')}
                                </span>
                                <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold">-{item.product.discountPercentage}%</span>
                              </div>
                            </div>
                          ) : (
                            <p className="font-bold text-emerald-600">
                              Rp {item.product.price.toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                            <button 
                              onClick={() => updateQuantity(item.product.id, item.selectedVariant?.id, item.quantity - 1)}
                              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-l-lg transition"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center font-medium text-gray-900">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.product.id, item.selectedVariant?.id, item.quantity + 1)}
                              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-r-lg transition"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => removeFromCart(item.product.id, item.selectedVariant?.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Hapus produk"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Ringkasan Belanja</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Total Harga ({totalItems} barang)</span>
                  <span className="font-medium text-gray-900">Rp {totalPrice.toLocaleString('id-ID')}</span>
                </div>
              </div>
              
              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Estimasi</span>
                  <span className="text-xl font-extrabold text-emerald-600">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  const sellerIds = Object.keys(itemsBySeller);
                  if (sellerIds.length > 0) {
                    handleCheckoutSeller(sellerIds[0]);
                  }
                }}
                className="w-full py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <ShoppingBag className="h-5 w-5" />
                Pesan Sekarang
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
