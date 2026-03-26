import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle2, MapPin, Package, CreditCard, Truck, ChevronRight, ArrowRight, Clock, Download } from 'lucide-react';

const OrderConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const docRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error("Order not found");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Memuat detail pesanan...</div>;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pesanan Tidak Ditemukan</h2>
        <p className="text-gray-600 mb-6">Maaf, kami tidak dapat menemukan detail pesanan Anda.</p>
        <button onClick={() => navigate('/')} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto flex items-center justify-center p-4">
          <h1 className="text-xl font-bold text-gray-900">Konfirmasi Pesanan</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 mt-6 space-y-6">
        {/* Success Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-2">Pesanan Berhasil Dibuat!</h2>
          <p className="text-emerald-600">Terima kasih telah berbelanja. Pesanan Anda sedang diproses.</p>
          <p className="text-sm text-emerald-500 mt-2 font-mono">ID Pesanan: {order.id}</p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Ringkasan Pesanan</h3>
          </div>
          <div className="p-4 space-y-4">
            {order.items?.map((item: any, index: number) => {
              const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
              const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
              const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
              
              return (
                <div key={index} className="flex gap-4">
                  <img 
                    src={item.product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'} 
                    alt={item.product.name} 
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 line-clamp-1">{item.product.name}</h4>
                    {item.product.isDigital && (
                      <div className="mt-0.5 mb-1">
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                          <Download className="h-2.5 w-2.5" /> Digital
                        </span>
                      </div>
                    )}
                    {item.selectedVariant && (
                      <p className="text-sm text-gray-500">Varian: {item.selectedVariant.name}</p>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-gray-600">{item.quantity} x Rp {price.toLocaleString('id-ID')}</p>
                      <p className="font-medium text-gray-900">
                        Rp {(price * item.quantity).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal Produk</span>
                <span>Rp {(order.totalPrice - (order.shippingCost || 0)).toLocaleString('id-ID')}</span>
              </div>
              {order.shippingMethod !== 'Digital Delivery' && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Ongkos Kirim</span>
                  <span>Rp {(order.shippingCost || 0).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total Pembayaran</span>
                <span className="text-emerald-600">Rp {order.totalPrice?.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipping Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Alamat Pengiriman</h3>
            </div>
            <div className="p-4">
              <p className="font-medium text-gray-900">{order.buyerName}</p>
              {order.shippingMethod === 'Digital Delivery' ? (
                <p className="text-emerald-600 text-sm mt-1 font-medium bg-emerald-50 inline-block px-2 py-1 rounded">
                  Pengiriman Digital
                </p>
              ) : (
                <p className="text-gray-600 text-sm mt-1">
                  {order.shippingAddress?.village}, Kec. {order.shippingAddress?.district}, {order.shippingAddress?.city}
                </p>
              )}
            </div>
          </div>

          {/* Payment & Delivery Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Pembayaran & Pengiriman</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Metode Pembayaran</p>
                  <p className="text-sm text-gray-600">{order.paymentMethod === 'COD' ? 'Bayar di Tempat (COD)' : order.payment_name || order.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Kurir Pengiriman</p>
                  <p className="text-sm text-gray-600">{order.shippingMethod}</p>
                  {order.shippingMethod !== 'Digital Delivery' && (
                    <p className="text-xs text-emerald-600 mt-1 bg-emerald-50 inline-block px-2 py-1 rounded">Estimasi: 1-3 Hari Kerja</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          {order.paymentMethod !== 'COD' && order.status === 'unpaid' && order.merchant_ref ? (
            <button 
              onClick={() => navigate(`/payment/${order.merchant_ref}`)}
              className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              Lanjutkan ke Pembayaran <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <button 
              onClick={() => navigate('/orders')}
              className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              Lihat Pesanan Saya <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <button 
            onClick={() => navigate('/')}
            className="flex-1 bg-white text-gray-700 border border-gray-300 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
