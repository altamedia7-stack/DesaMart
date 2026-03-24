import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, MapPin, ChevronRight, Ticket, Coins, CheckCircle2, Circle } from 'lucide-react';

const Checkout: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { cartItems, removeFromCart } = useCart();
  const { currentUser, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter items by seller
  const sellerItems = cartItems.filter(item => item.product.sellerId === sellerId);
  const sellerName = sellerItems.length > 0 ? sellerItems[0].product.sellerName : '';
  const sellerWhatsapp = sellerItems.length > 0 ? sellerItems[0].product.sellerWhatsapp : '';

  // Calculate totals
  const subtotalPesanan = sellerItems.reduce((total, item) => {
    const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
    const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
    const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
    return total + (price * item.quantity);
  }, 0);

  const subtotalPengiriman = 8000;
  const biayaLayanan = 2000;
  const totalDiskonPengiriman = 8000;
  const voucherDiskon = 24896;

  const totalPembayaran = subtotalPesanan + subtotalPengiriman + biayaLayanan - totalDiskonPengiriman - voucherDiskon;

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else if (sellerItems.length === 0) {
      navigate('/cart');
    }
  }, [currentUser, sellerItems, navigate]);

  const handlePlaceOrder = async () => {
    if (!currentUser || !sellerId) return;
    setIsSubmitting(true);

    try {
      const path = 'orders';
      await addDoc(collection(db, path), {
        buyerId: currentUser.uid,
        buyerName: userProfile?.name || currentUser.email,
        sellerId: sellerId,
        sellerName: sellerName,
        items: sellerItems,
        totalPrice: totalPembayaran,
        status: 'pending',
        paymentMethod: 'COD',
        shippingMethod: 'Reguler',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // WhatsApp logic
      let phone = sellerWhatsapp;
      if (phone.startsWith('0')) {
        phone = '62' + phone.substring(1);
      }

      let message = `Halo ${sellerName}, saya ingin memesan produk berikut dari DesaMart:\n\n`;
      
      sellerItems.forEach((item, index) => {
        const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
        const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
        const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
        const itemTotal = price * item.quantity;
        message += `${index + 1}. ${item.product.name}${item.selectedVariant ? ` (${item.selectedVariant.name})` : ''}\n`;
        message += `   Jumlah: ${item.quantity}\n`;
        message += `   Harga: Rp ${itemTotal.toLocaleString('id-ID')}\n\n`;
      });

      message += `*Subtotal Pesanan: Rp ${subtotalPesanan.toLocaleString('id-ID')}*\n`;
      message += `*Total Pembayaran: Rp ${totalPembayaran.toLocaleString('id-ID')}*\n\n`;
      message += `Metode Pembayaran: COD (Bayar di Tempat)\n`;
      message += `Mohon segera diproses. Terima kasih!`;

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      
      // Remove items from cart
      sellerItems.forEach(item => removeFromCart(item.product.id, item.selectedVariant?.id));
      
      navigate('/orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
      alert("Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sellerItems.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center p-4">
          <button onClick={() => navigate(-1)} className="mr-4 text-emerald-600">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-medium text-gray-900">Checkout</h1>
        </div>
      </div>

      {/* Alamat Pengiriman */}
      <div className="bg-white mt-2 p-4 flex items-start gap-3">
        <MapPin className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div className="flex-grow">
          <div className="text-sm text-gray-900">
            <span className="font-bold">{userProfile?.name || 'Nama Pembeli'}</span> | {userProfile?.phone || '081234567890'}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {userProfile?.address || 'Alamat belum diatur. Silakan atur alamat pengiriman Anda.'}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
      </div>

      {/* Produk */}
      <div className="bg-white mt-2">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <span className="font-bold text-gray-900">{sellerName}</span>
        </div>
        {sellerItems.map((item, index) => {
          const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
          const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
          const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;

          return (
            <div key={index} className="p-4 flex gap-3 border-b border-gray-100 bg-[#fafafa]">
              <img 
                src={item.product.imageUrl || 'https://picsum.photos/seed/product/100/100'} 
                alt={item.product.name}
                className="w-20 h-20 object-cover border border-gray-200"
                referrerPolicy="no-referrer"
              />
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <div className="text-sm text-gray-900 line-clamp-2">{item.product.name}</div>
                  {item.selectedVariant && (
                    <div className="text-xs text-gray-500 mt-1">Variasi: {item.selectedVariant.name}</div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-sm font-medium text-gray-900">Rp{price.toLocaleString('id-ID')}</div>
                  <div className="text-sm text-gray-600">x{item.quantity}</div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Opsi Pengiriman */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-900">Opsi Pengiriman</span>
            <div className="flex items-center text-sm text-gray-500">
              Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
            </div>
          </div>
          <div className="bg-[#f6fbf9] border border-[#a5d6c1] rounded p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium text-gray-900">Reguler</div>
                <div className="text-xs text-[#00bfa5] mt-1 flex items-center gap-1">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current"><path d="M11.5 2h-7a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5Zm-7-1h7A1.5 1.5 0 0 1 13 2.5v8A1.5 1.5 0 0 1 11.5 12h-7A1.5 1.5 0 0 1 3 10.5v-8A1.5 1.5 0 0 1 4.5 1Zm5.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"></path></svg>
                  Garansi tiba 28 - 31 Mar
                </div>
                <div className="text-xs text-gray-600 mt-1">Voucher s.d. Rp10.000 jika pesanan belum tiba 31 Mar 2026.</div>
              </div>
              <div className="text-sm">
                <span className="text-gray-400 line-through mr-1">Rp8.000</span>
                <span className="font-medium text-gray-900">Rp0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pesan */}
        <div className="p-4 border-b border-gray-100 flex items-center">
          <span className="text-sm text-gray-900 w-24">Pesan:</span>
          <input 
            type="text" 
            placeholder="Silakan tinggalkan pesan..." 
            className="flex-grow text-sm text-gray-900 outline-none placeholder-gray-400 text-right"
          />
        </div>

        {/* Total Produk */}
        <div className="p-4 flex justify-between items-center">
          <span className="text-sm text-gray-900">Total {sellerItems.reduce((acc, item) => acc + item.quantity, 0)} Produk</span>
          <span className="text-sm font-medium text-emerald-600">Rp{subtotalPesanan.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Voucher & Koin */}
      <div className="bg-white mt-2">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-orange-500" />
            <span className="text-sm text-gray-900">Voucher</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-orange-500 border border-orange-500 px-1 rounded">-Rp11,123RB</span>
            <span className="text-xs text-emerald-600 border border-emerald-600 px-1 rounded">Gratis Ongkir</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div className="p-4 border-b border-gray-100">
          <div className="bg-[#fff5e6] rounded p-3 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-1">
                <span className="bg-orange-500 text-white text-[10px] font-bold px-1 rounded">VIP</span>
                <span className="text-sm font-medium text-orange-800">Tambah Diskon s/d <span className="text-orange-600">30RB</span> Sekarang!</span>
              </div>
              <div className="text-xs text-orange-700 mt-1">Langganan mulai dari 5RB per bulan</div>
            </div>
            <button className="bg-orange-500 text-white text-xs font-medium px-3 py-1.5 rounded">Langganan</button>
          </div>
        </div>

        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-gray-900">Tukarkan 5 Koin Shopee</span>
          </div>
          <div className="w-10 h-6 bg-gray-200 rounded-full relative">
            <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
          </div>
        </div>
      </div>

      {/* Metode Pembayaran */}
      <div className="bg-white mt-2">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Metode Pembayaran</span>
          <div className="flex items-center text-sm text-gray-500">
            Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
          </div>
        </div>
        <div className="p-4 border-b border-gray-100">
          <div className="bg-[#fff5f5] text-[#ee4d2d] text-xs p-2 rounded mb-3 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Kamu dapat diskon terbaik dengan COD!
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1 border border-orange-200 rounded">COD</span>
              <span className="text-sm text-gray-900">COD - Cek Dulu</span>
            </div>
            <CheckCircle2 className="h-5 w-5 text-[#ee4d2d]" />
          </div>
        </div>
      </div>

      {/* Rincian Pembayaran */}
      <div className="bg-white mt-2 p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Rincian Pembayaran</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal Pesanan</span>
            <span>Rp{subtotalPesanan.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal Pengiriman</span>
            <span>Rp{subtotalPengiriman.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span className="flex items-center gap-1">Biaya Layanan <Circle className="h-3 w-3 text-gray-400" /></span>
            <span>Rp{biayaLayanan.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Total Diskon Pengiriman</span>
            <span className="text-[#ee4d2d]">-Rp{totalDiskonPengiriman.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Voucher Diskon</span>
            <span className="text-[#ee4d2d]">-Rp{voucherDiskon.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-2 mt-2 border-t border-gray-100">
            <span>Total Pembayaran</span>
            <span>Rp{totalPembayaran.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-end z-20">
        <div className="flex flex-col items-end pr-4 py-2">
          <span className="text-xs text-gray-900">Total Pembayaran</span>
          <span className="text-lg font-bold text-[#ee4d2d]">Rp{totalPembayaran.toLocaleString('id-ID')}</span>
        </div>
        <button 
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className="bg-[#ee4d2d] text-white px-8 py-4 font-medium h-full disabled:opacity-70"
        >
          {isSubmitting ? 'Memproses...' : 'Buat Pesanan'}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
