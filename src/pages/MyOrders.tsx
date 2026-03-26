import React, { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Order, OrderStatus, TravelBooking } from '../types';
import { Package, Truck, CheckCircle, Clock, AlertCircle, ChevronRight, ShoppingBag, Download, Car, MapPin, Calendar, Users } from 'lucide-react';

const MyOrders: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [travelBookings, setTravelBookings] = useState<TravelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'travel'>('products');

  useEffect(() => {
    if (!currentUser?.uid) return;

    const path = 'orders';
    const q = query(
      collection(db, path),
      where('buyerId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
      if (activeTab === 'products') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    // Fetch Travel Bookings
    const travelPath = 'travel_bookings';
    const travelQ = query(
      collection(db, travelPath),
      where('buyerId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeTravel = onSnapshot(travelQ, (snapshot) => {
      const travelData: TravelBooking[] = [];
      snapshot.forEach((doc) => {
        travelData.push({ id: doc.id, ...doc.data() } as TravelBooking);
      });
      setTravelBookings(travelData);
      if (activeTab === 'travel') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, travelPath);
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTravel();
    };
  }, [currentUser, activeTab]);

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'paid': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
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
      case 'unpaid': return 'Belum Dibayar';
      case 'paid': return 'Sudah Dibayar';
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
      case 'unpaid': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'paid': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
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
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="h-8 w-8 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-900">Pesanan Saya</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'products' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Produk
        </button>
        <button
          onClick={() => setActiveTab('travel')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'travel' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Bus & Travel
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-500">Memuat pesanan Anda...</p>
        </div>
      ) : activeTab === 'products' ? (
        orders.length === 0 ? (
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
                          {item.product.isDigital && (
                            <div className="mt-0.5 mb-1">
                              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                                <Download className="h-2.5 w-2.5" /> Digital
                              </span>
                            </div>
                          )}
                          {item.selectedVariant && (
                            <p className="text-[10px] text-emerald-600 font-bold">Varian: {item.selectedVariant.name}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Rp {
                              item.selectedVariant 
                                ? (item.selectedVariant.discountPercentage ? item.selectedVariant.price * (1 - item.selectedVariant.discountPercentage / 100) : item.selectedVariant.price).toLocaleString('id-ID')
                                : (item.product.discountPercentage && item.product.discountPercentage > 0)
                                  ? (item.product.price * (1 - item.product.discountPercentage / 100)).toLocaleString('id-ID')
                                  : item.product.price.toLocaleString('id-ID')
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Informasi Pengiriman</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Metode / Kurir</p>
                        <p className="text-sm text-gray-900 font-medium">{order.shippingMethod || 'Tidak ada'}</p>
                      </div>
                      {order.shippingAddress && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Alamat Tujuan</p>
                          <p className="text-sm text-gray-900">
                            {order.shippingAddress.village}, Kec. {order.shippingAddress.district}, {order.shippingAddress.city}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button (Optional: Link to Chat Seller) */}
                  <div className="mt-6 pt-6 border-t border-gray-50 flex flex-col gap-3">
                    {order.status === 'unpaid' && order.merchant_ref && (
                      <button 
                        onClick={() => navigate(`/payment/${order.merchant_ref}`)}
                        className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-200"
                      >
                        Bayar Sekarang
                      </button>
                    )}
                    <div className="flex justify-end">
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
              </div>
            ))}
          </div>
        )
      ) : (
        travelBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 mb-6">
              <Car className="h-10 w-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Tiket</h2>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto">
              Anda belum memiliki pesanan tiket travel. Yuk, cari rute perjalanan Anda!
            </p>
            <Link 
              to="/travel-booking" 
              className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200"
            >
              Cari Tiket Travel
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {travelBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Booking Header */}
                <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      booking.status === 'confirmed' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                      booking.status === 'pending' ? 'text-yellow-600 bg-yellow-50 border-yellow-100' :
                      'text-red-600 bg-red-50 border-red-100'
                    }`}>
                      {booking.status === 'confirmed' ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        Booking ID: {booking.id.substring(0, 8)}
                      </div>
                      <div className={`text-sm font-bold ${
                        booking.status === 'confirmed' ? 'text-emerald-600' :
                        booking.status === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {booking.status === 'confirmed' ? 'Terkonfirmasi' : booking.status === 'pending' ? 'Menunggu Konfirmasi' : 'Dibatalkan'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-0.5">Total Pembayaran</div>
                    <div className="text-lg font-black text-emerald-600">
                      Rp {booking.totalPrice.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-bold text-gray-700">{booking.travelListing.operatorName}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {booking.createdAt?.toDate ? new Date(booking.createdAt.toDate()).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      }) : 'Baru saja'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-900">{booking.travelListing.origin}</span>
                      </div>
                      <div className="ml-2 border-l-2 border-dashed border-gray-200 h-4 my-1"></div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-900">{booking.travelListing.destination}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        {booking.travelListing.departureTime}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        {booking.passengers.length} Penumpang
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Daftar Penumpang</h4>
                    {booking.passengers.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Kursi</p>
                          <p className="text-sm font-bold text-emerald-600">{p.seatNumber}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-50 flex justify-end">
                    <button className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:underline">
                      Lihat E-Tiket <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default MyOrders;
