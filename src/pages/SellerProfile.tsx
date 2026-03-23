import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, UserProfile } from '../types';
import ProductCard from '../components/ProductCard';
import { Store, MapPin, MessageCircle, ArrowLeft, Star, Users, Package, Search, ChevronRight } from 'lucide-react';

const SellerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'products'>('products');

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!id) return;
      
      try {
        // Fetch seller profile
        const sellerDoc = await getDoc(doc(db, 'users', id));
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data() as UserProfile;
          // Only show if they are actually a seller or admin (who can sell)
          if (sellerData.role === 'seller' || sellerData.role === 'admin') {
            setSeller(sellerData);
          }
        }

        // Fetch seller's products
        const q = query(collection(db, 'products'), where('sellerId', '==', id));
        const productsSnapshot = await getDocs(q);
        const productsData: Product[] = [];
        productsSnapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() } as Product);
        });
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching seller data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [id]);

  const handleWhatsApp = () => {
    if (!seller || !seller.whatsapp) return;
    let phone = seller.whatsapp;
    if (phone.startsWith('0')) {
      phone = '62' + phone.substring(1);
    }
    const message = `Halo ${seller.name}, saya melihat profil toko Anda di DesaMart.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Penjual tidak ditemukan</h2>
        <p className="text-gray-600 mb-6">Maaf, profil penjual yang Anda cari tidak ada atau telah dihapus.</p>
        <button onClick={() => navigate('/')} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Mobile Header */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white flex items-center px-4 py-3 shadow-md">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 bg-white/20 rounded-sm flex items-center px-3 py-1.5">
          <Search className="h-4 w-4 text-white/80 mr-2" />
          <input 
            type="text" 
            placeholder={`Cari di toko ${seller.name}`} 
            className="bg-transparent text-white placeholder-white/80 outline-none text-sm w-full"
            disabled
          />
        </div>
      </div>

      {/* Desktop Back Button */}
      <div className="hidden sm:block max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-4 transition font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          Kembali
        </button>
      </div>

      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-14 sm:mt-0">
        {/* Store Banner & Info */}
        <div className="bg-white sm:rounded-2xl sm:shadow-sm overflow-hidden mb-2 sm:mb-6">
          {/* Banner Background */}
          <div className="h-32 sm:h-48 bg-gradient-to-r from-emerald-800 to-emerald-600 relative">
            {/* Overlay pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex items-end gap-4 bg-gradient-to-t from-black/60 to-transparent">
              {/* Store Avatar */}
              <div className="h-16 w-16 sm:h-24 sm:w-24 bg-white rounded-full flex items-center justify-center flex-shrink-0 border-2 sm:border-4 border-white shadow-md overflow-hidden relative">
                <Store className="h-8 w-8 sm:h-12 sm:w-12 text-emerald-600" />
                <div className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white text-[8px] sm:text-[10px] font-bold text-center py-0.5">
                  STAR+
                </div>
              </div>
              
              {/* Store Name & Basic Info */}
              <div className="flex-1 text-white pb-1">
                <h1 className="text-lg sm:text-2xl font-bold mb-0.5 sm:mb-1">{seller.name}</h1>
                <div className="flex items-center gap-3 text-xs sm:text-sm text-white/90">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    Aktif 5 menit lalu
                  </span>
                  {seller.address && (
                    <span className="flex items-center gap-1 hidden sm:flex">
                      <MapPin className="h-3 w-3" />
                      {seller.address}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons (Desktop) */}
              <div className="hidden sm:flex gap-3 pb-1">
                <button className="border border-white text-white hover:bg-white/20 px-6 py-2 rounded-sm font-medium transition flex items-center gap-2">
                  <span className="text-lg leading-none">+</span> Ikuti
                </button>
                {seller.whatsapp && (
                  <button 
                    onClick={handleWhatsApp}
                    className="bg-white text-emerald-600 hover:bg-gray-50 px-6 py-2 rounded-sm font-medium transition flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons (Mobile) */}
          <div className="sm:hidden flex p-3 gap-2 border-b border-gray-100">
            <button className="flex-1 border border-emerald-600 text-emerald-600 py-1.5 rounded-sm text-sm font-medium flex items-center justify-center gap-1">
              <span className="text-base leading-none">+</span> Ikuti
            </button>
            {seller.whatsapp && (
              <button 
                onClick={handleWhatsApp}
                className="flex-1 bg-emerald-600 text-white py-1.5 rounded-sm text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </button>
            )}
          </div>

          {/* Store Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-4 text-sm border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 text-gray-500">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Produk:</span>
              </div>
              <span className="font-bold text-emerald-600">{products.length}</span>
              <span className="sm:hidden text-xs text-gray-500">Produk</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 text-gray-500">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Pengikut:</span>
              </div>
              <span className="font-bold text-emerald-600">1,2RB</span>
              <span className="sm:hidden text-xs text-gray-500">Pengikut</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 text-gray-500">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Penilaian:</span>
              </div>
              <span className="font-bold text-emerald-600">4.9</span>
              <span className="sm:hidden text-xs text-gray-500">Penilaian</span>
            </div>
            <div className="hidden sm:flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 text-gray-500">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Performa Chat:</span>
              </div>
              <span className="font-bold text-emerald-600">98%</span>
            </div>
          </div>

          {/* Store Tabs */}
          <div className="flex">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'home' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-600 hover:text-emerald-600'}`}
            >
              Halaman Utama
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-600 hover:text-emerald-600'}`}
            >
              Semua Produk
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'home' ? (
          <div className="bg-white sm:rounded-2xl sm:shadow-sm p-4 sm:p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
            <Store className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Selamat Datang di {seller.name}</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Temukan berbagai produk berkualitas dari toko kami. Kami selalu berusaha memberikan pelayanan terbaik untuk Anda.
            </p>
            <button 
              onClick={() => setActiveTab('products')}
              className="mt-6 border border-emerald-600 text-emerald-600 px-6 py-2 rounded-sm text-sm font-medium hover:bg-emerald-50 transition"
            >
              Lihat Semua Produk
            </button>
          </div>
        ) : (
          <div>
            {/* Filter/Sort Bar (Visual only for Shopee look) */}
            <div className="bg-white p-3 mb-2 sm:mb-4 sm:rounded-lg sm:shadow-sm flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-emerald-600 font-medium">Terkait</span>
                <span className="text-gray-600">Terbaru</span>
                <span className="text-gray-600">Terlaris</span>
                <div className="flex items-center gap-1 text-gray-600">
                  Harga <ChevronRight className="h-3 w-3 rotate-90" />
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {products.length === 0 ? (
              <div className="bg-white sm:rounded-2xl sm:shadow-sm p-12 text-center">
                <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada produk</h3>
                <p className="text-gray-500 text-sm">Penjual ini belum menambahkan produk apa pun.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 px-2 sm:px-0">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;
