import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Product, Courier } from '../types';
import { MessageCircle, Truck, X, ShoppingCart } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCart } from '../contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const [showShipping, setShowShipping] = useState(false);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [distance, setDistance] = useState<number>(1);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);

  useEffect(() => {
    if (showShipping && couriers.length === 0) {
      const fetchCouriers = async () => {
        const snapshot = await getDocs(collection(db, 'couriers'));
        const data: Courier[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Courier);
        });
        setCouriers(data);
        if (data.length > 0) setSelectedCourier(data[0]);
      };
      fetchCouriers();
    }
  }, [showShipping, couriers.length]);

  const handleWhatsApp = () => {
    let phone = product.sellerWhatsapp;
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    
    let message = `Halo, saya tertarik dengan produk ${product.name} yang dijual dengan harga Rp${product.price.toLocaleString('id-ID')}. Apakah masih tersedia?`;
    
    if (selectedCourier && showShipping) {
      const shippingCost = selectedCourier.baseRate + (selectedCourier.perKmRate * distance);
      message += `\n\nSaya ingin menggunakan kurir ${selectedCourier.name} (Estimasi jarak: ${distance}km, Ongkir: Rp${shippingCost.toLocaleString('id-ID')}).`;
    }
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition duration-300 flex flex-col h-full">
      <div className="relative h-32 sm:h-48 w-full bg-gray-100 group">
        <Link to={`/products/${product.id}`}>
          <img 
            src={product.imageUrl || 'https://picsum.photos/seed/product/400/300'} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:opacity-90 transition"
            referrerPolicy="no-referrer"
          />
        </Link>
        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full pointer-events-none shadow-sm">
          {product.category}
        </div>
      </div>
      
      <div className="p-3 sm:p-4 flex flex-col flex-grow">
        <Link to={`/products/${product.id}`} className="hover:text-emerald-600 transition">
          <h3 className="text-sm sm:text-lg font-bold text-gray-800 line-clamp-2 mb-1 sm:mb-2 leading-tight">{product.name}</h3>
        </Link>
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <p className="text-emerald-600 font-bold text-base sm:text-xl leading-none">Rp {product.price.toLocaleString('id-ID')}</p>
          <span className="text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
            Stok: {product.stock !== undefined ? product.stock : '-'}
          </span>
        </div>
        
        <div className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 flex-grow line-clamp-2 leading-relaxed">
          {product.description}
        </div>
        
        {showShipping && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 text-sm relative">
            <button onClick={() => setShowShipping(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
            <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Truck className="h-4 w-4" /> Cek Ongkir
            </h4>
            {couriers.length === 0 ? (
              <p className="text-gray-500 italic">Belum ada kurir tersedia.</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Pilih Kurir</label>
                  <select 
                    className="w-full border-gray-300 rounded p-1 border text-xs"
                    value={selectedCourier?.id || ''}
                    onChange={(e) => setSelectedCourier(couriers.find(c => c.id === e.target.value) || null)}
                  >
                    {couriers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Jarak (KM)</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={distance} 
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full border-gray-300 rounded p-1 border text-xs"
                  />
                </div>
                {selectedCourier && (
                  <div className="pt-2 border-t border-gray-200 mt-2 font-medium text-emerald-700">
                    Ongkir: Rp {(selectedCourier.baseRate + (selectedCourier.perKmRate * distance)).toLocaleString('id-ID')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between mt-auto pt-3 sm:pt-4 border-t border-gray-50">
          <div className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[40%]">
            Penjual: <Link to={`/seller/${product.sellerId}`} className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline">{product.sellerName}</Link>
          </div>
          
          <div className="flex gap-1.5 sm:gap-2">
            <button 
              onClick={() => {
                addToCart(product);
                alert('Produk ditambahkan ke keranjang!');
              }}
              className="flex items-center justify-center border border-emerald-500 text-emerald-600 hover:bg-emerald-50 p-1 sm:p-1.5 rounded transition-colors"
              title="Tambah ke Keranjang"
            >
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <button 
              onClick={handleWhatsApp}
              className="flex items-center gap-1 sm:gap-1.5 bg-[#25D366] hover:bg-[#1DA851] text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded text-xs sm:text-sm font-medium transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pesan WA</span>
              <span className="sm:hidden">WA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
