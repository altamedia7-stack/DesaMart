import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, UserProfile } from '../types';
import ProductCard from '../components/ProductCard';
import { Store, MapPin, MessageCircle, ArrowLeft } from 'lucide-react';

const SellerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          Kembali
        </button>

        {/* Seller Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white shadow-md">
                <Store className="h-10 w-10 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{seller.name}</h1>
                <div className="flex flex-col gap-2 text-gray-600">
                  {seller.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{seller.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-400" />
                    <span>{products.length} Produk Terdaftar</span>
                  </div>
                </div>
              </div>
            </div>
            
            {seller.whatsapp && (
              <button 
                onClick={handleWhatsApp}
                className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-xl font-bold shadow-sm hover:shadow-md transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Hubungi Penjual
              </button>
            )}
          </div>
        </div>

        {/* Seller's Products */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Produk dari {seller.name}</h2>
          {products.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada produk</h3>
              <p className="text-gray-500">Penjual ini belum menambahkan produk apa pun.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerProfile;
