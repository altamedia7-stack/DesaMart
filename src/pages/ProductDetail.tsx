import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product, Review, ProductVariant } from '../types';
import { MessageCircle, ArrowLeft, Store, Star, ShoppingCart, ChevronRight, Layers, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { addToCart, totalItems } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  

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
          const data = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(data);
          if (data.variants && data.variants.length > 0) {
            setSelectedVariant(data.variants[0]);
          }
        } else {
          setProduct(null);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `products/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);


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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
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
        userName: userProfile.name || 'Unknown',
        rating: newRating,
        text: newReviewText,
        createdAt: serverTimestamp()
      });
      setNewReviewText('');
      setNewRating(5);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reviews');
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
    
    const currentPrice = selectedVariant 
      ? (selectedVariant.discountPercentage ? selectedVariant.price * (1 - selectedVariant.discountPercentage / 100) : selectedVariant.price)
      : (product.discountPercentage ? product.price * (1 - product.discountPercentage / 100) : product.price);

    let message = `Halo, saya tertarik dengan produk ${product.name}${selectedVariant ? ` (Varian: ${selectedVariant.name})` : ''} yang dijual dengan harga Rp${currentPrice.toLocaleString('id-ID')}. Apakah masih tersedia?\n\nLink Produk: ${window.location.origin}/products/${product.id}`;
    
    
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
    <div className="min-h-screen bg-gray-100 pb-16 sm:pb-20">
      {/* Floating Header for Mobile */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 sm:hidden pointer-events-none">
        <button onClick={() => navigate(-1)} className="bg-black/40 text-white p-2 rounded-full pointer-events-auto backdrop-blur-sm">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <button onClick={() => navigate('/cart')} className="bg-black/40 text-white p-2 rounded-full pointer-events-auto backdrop-blur-sm relative">
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Back Button */}
      <div className="hidden sm:block max-w-5xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 mb-4 transition font-medium"
        >
          <ArrowLeft className="h-5 w-5" />
          Kembali
        </button>
      </div>

      <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
        <div className="bg-gray-100 sm:bg-white sm:rounded-2xl sm:shadow-sm overflow-hidden flex flex-col md:flex-row">
          
          {/* Product Image */}
          <div className="w-full md:w-1/2 aspect-square relative bg-white">
            {product.discountPercentage !== undefined && product.discountPercentage > 0 && (
              <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs sm:text-sm font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
                DISKON {product.discountPercentage}%
              </div>
            )}
            <img 
              src={product.imageUrl || 'https://picsum.photos/seed/product/800/800'} 
              alt={product.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Product Details */}
          <div className="w-full md:w-1/2 flex flex-col">
            
            {/* Price & Title Block */}
            <div className="bg-white p-4 sm:p-6 mb-2 sm:mb-0">
              <div className="flex flex-col mb-2">
                {selectedVariant ? (
                  <>
                    {selectedVariant.discountPercentage !== undefined && selectedVariant.discountPercentage > 0 ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base text-gray-400 line-through">Rp {selectedVariant.price.toLocaleString('id-ID')}</span>
                          <span className="bg-red-100 text-red-600 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded">-{selectedVariant.discountPercentage}%</span>
                        </div>
                        <p className="text-2xl sm:text-4xl font-black text-emerald-600">
                          Rp {(selectedVariant.price * (1 - selectedVariant.discountPercentage / 100)).toLocaleString('id-ID')}
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl sm:text-4xl font-black text-emerald-600">
                        Rp {selectedVariant.price.toLocaleString('id-ID')}
                      </p>
                    )}
                  </>
                ) : product.discountPercentage !== undefined && product.discountPercentage > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base text-gray-400 line-through">Rp {product.price.toLocaleString('id-ID')}</span>
                      <span className="bg-red-100 text-red-600 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded">-{product.discountPercentage}%</span>
                    </div>
                    <p className="text-2xl sm:text-4xl font-black text-emerald-600">
                      Rp {(product.price * (1 - product.discountPercentage / 100)).toLocaleString('id-ID')}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                    Rp {product.price.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-medium text-gray-900 leading-snug mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {product.category}
                </span>
                {product.isDigital && (
                  <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <Download className="h-3 w-3" /> Digital
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="font-medium text-gray-700">4.9</span>
                  <span className="mx-1">•</span>
                  <span>100+ Terjual</span>
                </div>
                <span>Stok: {selectedVariant ? selectedVariant.stock : (product.stock !== undefined ? product.stock : '-')}</span>
              </div>
            </div>

            {/* Variant Selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="bg-white p-4 sm:p-6 mb-2 sm:mb-0 sm:border-t sm:border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600" /> Pilih Varian
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        selectedVariant?.id === variant.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-500'
                      }`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Store Block */}
            <div className="bg-white p-4 sm:p-6 mb-2 sm:mb-0 sm:border-t sm:border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 border border-gray-200">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{product.sellerName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Aktif 5 menit lalu</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleWhatsApp}
                  className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-emerald-100 transition flex items-center gap-1"
                >
                  <MessageCircle className="h-3 w-3" /> Chat
                </button>
                <Link 
                  to={`/seller/${product.sellerId}`} 
                  className="border border-emerald-600 text-emerald-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-emerald-50 transition"
                >
                  Kunjungi Toko
                </Link>
              </div>
            </div>

            {/* Description Block */}
            <div className="bg-white p-4 sm:p-6 mb-2 sm:mb-0 sm:border-t sm:border-gray-100 flex-grow">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Deskripsi Produk</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{product.description}</p>
            </div>

          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-2 sm:mt-6 bg-white sm:rounded-2xl sm:shadow-sm p-4 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Penilaian Produk</h2>
            <div className="flex items-center gap-1 text-sm text-emerald-600">
              <span>Lihat Semua</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>

          {/* Review Form */}
          {userProfile ? (
            <form onSubmit={handleSubmitReview} className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
              <h4 className="font-semibold text-sm text-gray-800 mb-3">Tulis Ulasan Anda</h4>
              <div className="flex items-center mb-3">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className={`p-1 focus:outline-none transition-colors ${newRating >= star ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
                    >
                      <Star className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="Ceritakan pengalaman Anda..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 mb-3 outline-none resize-none"
                rows={3}
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview || !newReviewText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-blue-50 text-blue-800 p-3 rounded-lg mb-6 text-xs flex items-center justify-between">
              <span>Silakan masuk (login) untuk memberikan ulasan.</span>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm italic">Belum ada ulasan untuk produk ini.</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm text-gray-900">{review.userName}</span>
                  </div>
                  <div className="flex items-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${review.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                    <span className="text-[10px] text-gray-400 ml-2">
                      {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Baru saja'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex h-14 sm:h-16">
        <button 
          onClick={handleWhatsApp} 
          className="flex flex-col items-center justify-center w-16 sm:w-20 border-r border-gray-200 text-emerald-600 hover:bg-emerald-50 transition"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[10px] sm:text-xs mt-0.5">Chat</span>
        </button>
        
        <button 
          onClick={() => {
            if (product.variants && product.variants.length > 0 && !selectedVariant) {
              alert('Silakan pilih varian terlebih dahulu');
              return;
            }
            addToCart(product, selectedVariant || undefined);
            alert('Produk ditambahkan ke keranjang!');
          }} 
          className="flex flex-col items-center justify-center w-16 sm:w-20 border-r border-gray-200 text-emerald-600 hover:bg-emerald-50 transition"
        >
          <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[10px] sm:text-xs mt-0.5">Keranjang</span>
        </button>
        
        <button 
          onClick={() => {
            if (product.variants && product.variants.length > 0 && !selectedVariant) {
              alert('Silakan pilih varian terlebih dahulu');
              return;
            }
            addToCart(product, selectedVariant || undefined);
            navigate('/cart');
          }} 
          className="flex-1 bg-emerald-600 text-white font-bold text-sm sm:text-base hover:bg-emerald-700 transition"
        >
          Beli Sekarang
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
