import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Star, MessageSquare, Loader2, ShoppingBag } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Review, Product } from '../types';

const Reviews: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<(Review & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'reviews'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const reviewPromises = snapshot.docs.map(async (reviewDoc) => {
        const reviewData = { id: reviewDoc.id, ...reviewDoc.data() } as Review;
        const productRef = doc(db, 'products', reviewData.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          return { ...reviewData, product: { id: productSnap.id, ...productSnap.data() } as Product };
        }
        return reviewData;
      });

      const reviewsWithProducts = await Promise.all(reviewPromises);
      setReviews(reviewsWithProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

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
        <h1 className="text-xl font-bold">Penilaian Saya</h1>
      </div>

      <div className="p-4 space-y-4">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Belum ada penilaian</h2>
            <p className="text-sm text-gray-500 max-w-xs mt-2">
              Beri penilaian pada produk yang telah Anda beli untuk membantu pembeli lain.
            </p>
            <Link 
              to="/orders" 
              className="mt-6 bg-emerald-600 text-white px-6 py-2 rounded-full font-bold shadow-md hover:bg-emerald-700 transition-colors"
            >
              Lihat Pesanan
            </Link>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
              {review.product && (
                <Link to={`/products/${review.product.id}`} className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <img 
                    src={review.product.imageUrl} 
                    alt={review.product.name} 
                    className="w-12 h-12 object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-grow">
                    <h3 className="text-xs font-bold text-gray-800 line-clamp-1">{review.product.name}</h3>
                    <p className="text-[10px] text-gray-500">{review.product.sellerName}</p>
                  </div>
                </Link>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`h-4 w-4 ${review.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Baru saja'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed italic">"{review.text}"</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
