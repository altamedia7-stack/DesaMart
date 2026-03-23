import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Courier, Review } from '../types';
import { MessageCircle, Truck, ArrowLeft, Store, Star, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Shipping state
  const [showShipping, setShowShipping] = useState(false);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [distance, setDistance] = useState<number>(1);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

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

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData: Review[] = [];
      snapshot.forEach((doc) => {
        reviewsData.push({ id: doc.id, ...doc.data() } as Review);
      });
      setReviews(reviewsData);
    });
    return () => unsubscribe();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !id || !newReviewText.trim()) return;

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: id,
        userId: userProfile.uid,
        userName: userProfile.name,
        rating: newRating,
        text: newReviewText,
        createdAt: serverTimestamp()
      });
      setNewReviewText('');
      setNewRating(5);
    } catch (error) {
      console.error("Error adding review:", error);
      alert("Gagal mengirim ulasan.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleWhatsApp = () => {
    if (!product) return;
    
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Produk tidak ditemukan</h2>
        <p className="text-gray-600 mb-6">Maaf, produk yang Anda cari mungkin sudah dihapus atau tidak tersedia.</p>
        <button onClick={() => navigate('/')} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-6 transition font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          Kembali
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Product Image */}
            <div className="h-64 md:h-auto relative bg-gray-100">
              <img 
                src={product.imageUrl || 'https://picsum.photos/seed/product/800/800'} 
                alt={product.name} 
                className="w-full h-full object-cover absolute inset-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-emerald-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                {product.category}
              </div>
            </div>

            {/* Product Details */}
            <div className="p-6 md:p-10 flex flex-col">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex justify-between items-center mb-6">
                <p className="text-3xl font-extrabold text-emerald-600">
                  Rp {product.price.toLocaleString('id-ID')}
                </p>
                <span className="text-sm font-medium bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">
                  Stok: {product.stock !== undefined ? product.stock : '-'}
                </span>
              </div>

              <div className="prose prose-sm sm:prose text-gray-600 mb-8 flex-grow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Deskripsi Produk</h3>
                <p className="whitespace-pre-line">{product.description}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Store className="h-4 w-4 text-gray-500" />
                  Informasi Penjual
                </h3>
                <div className="flex flex-col">
                  <Link to={`/seller/${product.sellerId}`} className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline text-lg w-fit">{product.sellerName}</Link>
                  <span className="text-gray-600 flex items-center gap-2 mt-1">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    {product.sellerWhatsapp || 'Nomor tidak tersedia'}
                  </span>
                </div>
              </div>

              {/* Shipping Calculator */}
              <div className="mb-6">
                {!showShipping ? (
                  <button 
                    onClick={() => setShowShipping(true)}
                    className="w-full py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <Truck className="h-5 w-5" />
                    Cek Ongkos Kirim
                  </button>
                ) : (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
                        <Truck className="h-4 w-4" /> Estimasi Ongkir
                      </h4>
                      <button onClick={() => setShowShipping(false)} className="text-emerald-600 hover:text-emerald-800 text-sm font-medium">
                        Tutup
                      </button>
                    </div>
                    
                    {couriers.length === 0 ? (
                      <p className="text-sm text-emerald-600 italic">Belum ada kurir tersedia.</p>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-emerald-700 mb-1">Pilih Kurir Desa</label>
                          <select 
                            className="w-full border-emerald-200 rounded-lg p-2 text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500"
                            value={selectedCourier?.id || ''}
                            onChange={(e) => setSelectedCourier(couriers.find(c => c.id === e.target.value) || null)}
                          >
                            {couriers.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-emerald-700 mb-1">Estimasi Jarak (KM)</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={distance} 
                            onChange={(e) => setDistance(Number(e.target.value))}
                            className="w-full border-emerald-200 rounded-lg p-2 text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        {selectedCourier && (
                          <div className="pt-3 border-t border-emerald-200 mt-3 flex justify-between items-center">
                            <span className="text-sm font-medium text-emerald-800">Total Ongkir:</span>
                            <span className="text-lg font-bold text-emerald-700">
                              Rp {(selectedCourier.baseRate + (selectedCourier.perKmRate * distance)).toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => {
                    addToCart(product);
                    alert('Produk ditambahkan ke keranjang!');
                  }}
                  className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-4 px-6 rounded-xl font-bold text-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-6 w-6" />
                  Tambah ke Keranjang
                </button>
                <button 
                  onClick={handleWhatsApp}
                  className="flex-1 bg-[#25D366] hover:bg-[#1DA851] text-white py-4 px-6 rounded-xl font-bold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="h-6 w-6" />
                  Pesan ke WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ulasan Pembeli</h2>

          {/* Review Form */}
          {userProfile ? (
            <form onSubmit={handleSubmitReview} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
              <h4 className="font-semibold text-gray-800 mb-4">Tulis Ulasan Anda</h4>
              <div className="flex items-center mb-4">
                <span className="text-sm font-medium text-gray-700 mr-3">Penilaian:</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className={`p-1 focus:outline-none transition-colors ${newRating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                    >
                      <Star className="h-8 w-8 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="Ceritakan pengalaman Anda dengan produk ini..."
                className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:ring-emerald-500 focus:border-emerald-500 mb-4 outline-none resize-none"
                rows={4}
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview || !newReviewText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-8 text-sm flex items-center justify-between">
              <span>Silakan masuk (login) untuk memberikan ulasan.</span>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 italic">Belum ada ulasan untuk produk ini. Jadilah yang pertama!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900">{review.userName}</span>
                    <span className="text-xs text-gray-500">
                      {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Baru saja'}
                    </span>
                  </div>
                  <div className="flex items-center mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${review.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{review.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
