import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { Filter, ArrowUpDown, ChevronRight, ShoppingBag, Leaf, Coffee, Package, MoreHorizontal } from 'lucide-react';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [sortOrder, setSortOrder] = useState('newest');

  const categories = [
    { name: 'Semua', icon: <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />, color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Sayur', icon: <Leaf className="h-5 w-5 sm:h-6 sm:w-6" />, color: 'bg-green-100 text-green-600' },
    { name: 'Sembako', icon: <Package className="h-5 w-5 sm:h-6 sm:w-6" />, color: 'bg-amber-100 text-amber-600' },
    { name: 'Minuman', icon: <Coffee className="h-5 w-5 sm:h-6 sm:w-6" />, color: 'bg-blue-100 text-blue-600' },
    { name: 'Snack', icon: <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />, color: 'bg-orange-100 text-orange-600' },
    { name: 'Lainnya', icon: <MoreHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />, color: 'bg-gray-100 text-gray-600' }
  ];

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortOrder === 'price-asc') return a.price - b.price;
    if (sortOrder === 'price-desc') return b.price - a.price;
    return 0; // 'newest' is default from Firestore query
  });

  return (
    <div className="min-h-screen bg-gray-100 pb-4 sm:pb-12 pt-2 sm:pt-6">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Categories Grid (Shopee Style) */}
        <div className="bg-white mb-2 sm:mb-6 p-3 sm:p-6 sm:rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-3 sm:mb-4 px-1 sm:px-0">
            <h2 className="text-sm sm:text-lg font-bold text-gray-800">Kategori Pilihan</h2>
            <div className="flex items-center text-xs sm:text-sm text-emerald-600 font-medium cursor-pointer">
              Lihat Semua <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-y-4 gap-x-2">
            {categories.map(category => (
              <div 
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className="flex flex-col items-center justify-start cursor-pointer group"
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center mb-1.5 sm:mb-2 transition-transform group-hover:scale-105 ${category.color} ${selectedCategory === category.name ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
                  {category.icon}
                </div>
                <span className={`text-[10px] sm:text-sm text-center leading-tight ${selectedCategory === category.name ? 'font-bold text-emerald-600' : 'text-gray-600 font-medium'}`}>
                  {category.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sort and Filter Bar */}
        <div className="bg-white sticky top-14 sm:top-0 z-40 mb-2 sm:mb-6 p-2 sm:p-4 sm:rounded-xl shadow-sm border-b border-gray-100 sm:border-none flex justify-between items-center">
          <div className="flex items-center gap-4 sm:gap-6 w-full">
            <button 
              onClick={() => setSortOrder('newest')}
              className={`text-xs sm:text-sm font-medium pb-1 border-b-2 transition-colors flex-1 sm:flex-none text-center ${sortOrder === 'newest' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Terbaru
            </button>
            <button 
              onClick={() => setSortOrder('price-asc')}
              className={`text-xs sm:text-sm font-medium pb-1 border-b-2 transition-colors flex-1 sm:flex-none text-center ${sortOrder === 'price-asc' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Termurah
            </button>
            <button 
              onClick={() => setSortOrder('price-desc')}
              className={`text-xs sm:text-sm font-medium pb-1 border-b-2 transition-colors flex-1 sm:flex-none text-center ${sortOrder === 'price-desc' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Termahal
            </button>
            
            <div className="hidden sm:flex items-center ml-auto text-gray-500 cursor-pointer hover:text-emerald-600">
              <Filter className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">Filter</span>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white sm:bg-transparent sm:rounded-xl">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="px-2 sm:px-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 sm:p-12 text-center sm:rounded-xl shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Produk tidak ditemukan</h3>
            <p className="text-sm text-gray-500">Coba gunakan kata kunci lain atau ubah filter kategori.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
