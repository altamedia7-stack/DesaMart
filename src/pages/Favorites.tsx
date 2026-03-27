import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Heart, ShoppingCart, Star, Trash2, Loader2, ShoppingBag } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { Product } from '../types';

const Favorites: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'favorites'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const productPromises = snapshot.docs.map(async (favoriteDoc) => {
        const productId = favoriteDoc.data().productId;
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          return { id: productSnap.id, ...productSnap.data(), favoriteId: favoriteDoc.id } as any;
        }
        return null;
      });

      const products = await Promise.all(productPromises);
      setFavorites(products.filter(p => p !== null));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const removeFavorite = async (favoriteId: string) => {
    try {
      await deleteDoc(doc(db, 'favorites', favoriteId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-emerald-600 pt-12 pb-6 px-4 flex items-center gap-4 text-white">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Favorit Saya</h1>
      </div>

      <div className="p-4">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Heart className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Belum ada favorit</h2>
            <p className="text-sm text-gray-500 max-w-xs mt-2">
              Simpan produk yang Anda sukai agar mudah ditemukan kembali nanti.
            </p>
            <Link 
              to="/" 
              className="mt-6 bg-emerald-600 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-emerald-700 transition-colors"
            >
              Cari Produk
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {favorites.map((product: any) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
                <button 
                  onClick={() => removeFavorite(product.favoriteId)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-red-500 shadow-sm hover:bg-white transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                
                <Link to={`/products/${product.id}`} className="flex-grow">
                  <div className="aspect-square bg-gray-100">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-xs font-bold text-gray-800 line-clamp-2 mb-1 h-8">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-[10px] font-bold text-gray-600">4.9</span>
                    </div>
                    <p className="text-sm font-black text-emerald-600">
                      Rp {product.price.toLocaleString('id-ID')}
                    </p>
                  </div>
                </Link>
                
                <div className="p-2 border-t border-gray-50">
                  <Link 
                    to={`/products/${product.id}`}
                    className="w-full bg-emerald-50 text-emerald-600 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors"
                  >
                    <ShoppingBag className="h-3 w-3" /> Beli Sekarang
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
