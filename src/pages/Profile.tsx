import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, User, Mail, Shield, Store, Truck, 
  ChevronRight, CreditCard, Package, CheckCircle, 
  Heart, Star, Settings, HelpCircle,
  Clock, Bell, MapPin, Smartphone
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';

const Profile: React.FC = () => {
  const { currentUser, userProfile, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [orderCounts, setOrderCounts] = useState({
    unpaid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0
  });

  useEffect(() => {
    if (!currentUser?.uid) return;

    const ordersQuery = query(collection(db, 'orders'), where('buyerId', '==', currentUser.uid));
    const travelQuery = query(collection(db, 'travel_bookings'), where('buyerId', '==', currentUser.uid));

    const updateCounts = (snapshot: any, counts: any) => {
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.status === 'unpaid' || data.status === 'pending') counts.unpaid++;
        else if (data.status === 'paid' || data.status === 'confirmed') counts.processing++;
        else if (data.status === 'shipped' || data.status === 'in_transit') counts.shipped++;
        else if (data.status === 'delivered') counts.delivered++;
      });
    };

    let ordersSnapshot: any = null;
    let travelSnapshot: any = null;

    const processSnapshots = () => {
      const counts = { unpaid: 0, processing: 0, shipped: 0, delivered: 0 };
      if (ordersSnapshot) updateCounts(ordersSnapshot, counts);
      if (travelSnapshot) updateCounts(travelSnapshot, counts);
      setOrderCounts(counts);
    };

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      ordersSnapshot = snapshot;
      processSnapshots();
    });

    const unsubscribeTravel = onSnapshot(travelQuery, (snapshot) => {
      travelSnapshot = snapshot;
      processSnapshots();
    });

    return () => {
      unsubscribeOrders();
      unsubscribeTravel();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const menuItems = [
    { icon: <Heart className="h-5 w-5 text-red-500" />, label: 'Favorit Saya', path: '/favorites' },
    { icon: <Clock className="h-5 w-5 text-blue-500" />, label: 'Terakhir Dilihat', path: '/history' },
    { icon: <Star className="h-5 w-5 text-yellow-500" />, label: 'Penilaian Saya', path: '/reviews' },
  ];

  const accountItems = [
    { icon: <User className="h-5 w-5 text-gray-500" />, label: 'Profil Saya', path: '/edit-profile' },
    { icon: <MapPin className="h-5 w-5 text-gray-500" />, label: 'Alamat Saya', path: '/address' },
    { icon: <Settings className="h-5 w-5 text-gray-500" />, label: 'Pengaturan Akun', path: '/settings' },
    { icon: <HelpCircle className="h-5 w-5 text-gray-500" />, label: 'Pusat Bantuan', path: '/help' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Section */}
      <div className="bg-emerald-600 pt-12 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 flex gap-4 text-white">
          <Settings className="h-6 w-6 cursor-pointer" onClick={() => navigate('/settings')} />
          <Bell className="h-6 w-6 cursor-pointer" onClick={() => navigate('/notifications')} />
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full border-2 border-white/50 bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
            <User className="h-10 w-10" />
          </div>
          <div className="text-white">
            <h2 className="text-xl font-bold">{userProfile?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {userProfile?.role === 'buyer' ? 'Member Silver' : userProfile?.role.toUpperCase()}
              </span>
              <span className="text-xs opacity-80">|</span>
              <span className="text-xs opacity-80">Pengikut 0</span>
              <span className="text-xs opacity-80">|</span>
              <span className="text-xs opacity-80">Mengikuti 0</span>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="px-4 -mt-12 relative z-20 space-y-4">
        {/* Order Status Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div 
            className="flex justify-between items-center p-4 border-b border-gray-50 cursor-pointer"
            onClick={() => navigate('/orders')}
          >
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" /> Pesanan Saya
            </h3>
            <span className="text-xs text-gray-400 flex items-center">
              Lihat Riwayat Pesanan <ChevronRight className="h-4 w-4" />
            </span>
          </div>
          
          <div className="grid grid-cols-4 py-4">
            <div className="flex flex-col items-center gap-1 cursor-pointer relative" onClick={() => navigate('/orders')}>
              <div className="p-2 text-gray-600">
                <CreditCard className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-gray-600">Belum Bayar</span>
              {orderCounts.unpaid > 0 && (
                <span className="absolute top-1 right-4 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {orderCounts.unpaid}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer relative" onClick={() => navigate('/orders')}>
              <div className="p-2 text-gray-600">
                <Package className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-gray-600">Dikemas</span>
              {orderCounts.processing > 0 && (
                <span className="absolute top-1 right-4 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {orderCounts.processing}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer relative" onClick={() => navigate('/orders')}>
              <div className="p-2 text-gray-600">
                <Truck className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-gray-600">Dikirim</span>
              {orderCounts.shipped > 0 && (
                <span className="absolute top-1 right-4 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {orderCounts.shipped}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 cursor-pointer relative" onClick={() => navigate('/orders')}>
              <div className="p-2 text-gray-600">
                <Star className="h-6 w-6" />
              </div>
              <span className="text-[10px] text-gray-600">Beri Nilai</span>
              {orderCounts.delivered > 0 && (
                <span className="absolute top-1 right-4 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {orderCounts.delivered}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Seller Dashboard Link (if applicable) */}
        {userProfile?.role === 'buyer' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center cursor-pointer" onClick={() => navigate('/seller')}>
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-emerald-600" />
              <div>
                <h4 className="text-sm font-bold text-gray-800">Mulai Berjualan</h4>
                <p className="text-[10px] text-gray-500">Daftar gratis dan mulai jangkau pembeli</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center cursor-pointer" onClick={() => navigate('/seller')}>
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-emerald-600" />
              <div>
                <h4 className="text-sm font-bold text-gray-800">Toko Saya</h4>
                <p className="text-[10px] text-gray-500">Kelola produk dan pesanan toko Anda</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </div>
        )}

        {/* Menu Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {menuItems.map((item, index) => (
            <div 
              key={index} 
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </div>
          ))}
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {accountItems.map((item, index) => (
            <div 
              key={index} 
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-white text-red-600 border border-gray-100 py-4 rounded-xl font-bold text-sm shadow-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>

        <div className="text-center py-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">DesaMart v1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
