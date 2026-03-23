import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';
import { Package, Truck, CheckCircle, Clock, AlertCircle, ChevronRight, ShoppingBag } from 'lucide-react';

const MyOrders: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const path = 'orders';
    const q = query(
      collection(db, path),
      where('buyerId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'shipped': return <Package className="h-5 w-5 text-blue-500" />;
      case 'in_transit': return <Truck className="h-5 w-5 text-indigo-500" />;
      case 'delivered': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'cancelled': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Menunggu Konfirmasi';
      case 'shipped': return 'Telah Dikirim';
      case 'in_transit': return 'Dalam Perjalanan';
      case 'delivered': return 'Pesanan Diterima';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const getStatusColorClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'shipped': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'in_transit': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'delivered': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag className="h-8 w-8 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900">Pesanan Saya</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-500">Memuat pesanan Anda...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6">
            <ShoppingBag className="h-10 w-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Pesanan</h2>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">
            Sepertinya Anda belum melakukan pemesanan apapun. Yuk, mulai belanja produk desa terbaik!
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200"
          >
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${getStatusColorClass(order.status)}`}>
                    {getStatusIcon(order.status)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                      Order ID: {order.id.substring(0, 8)}
                    </div>
                    <div className={`text-sm font-bold ${getStatusColorClass(order.status).split(' ')[0]}`}>
                      {getStatusLabel(order.status)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-0.5">Total Pembayaran</div>
                  <div className="text-lg font-black text-emerald-600">
                    Rp {order.totalPrice.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">{order.sellerName}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {order.createdAt?.toDate ? new Date(order.createdAt.toDate()).toLocaleDateString('id-ID', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    }) : 'Baru saja'}
                  </div>
                </div>

                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name} 
                          className="w-16 h-16 rounded-xl object-cover border border-gray-100"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{item.product.name}</h4>
                        <p className="text-xs text-gray-500">
                          Rp {
                            (item.product.discountPercentage && item.product.discountPercentage > 0)
                              ? (item.product.price * (1 - item.product.discountPercentage / 100)).toLocaleString('id-ID')
                              : item.product.price.toLocaleString('id-ID')
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button (Optional: Link to Chat Seller) */}
                <div className="mt-6 pt-6 border-t border-gray-50 flex justify-end">
                  <a 
                    href={`https://wa.me/${order.items[0].product.sellerWhatsapp}?text=Halo, saya ingin bertanya tentang pesanan saya dengan ID ${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:underline"
                  >
                    Hubungi Penjual <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
