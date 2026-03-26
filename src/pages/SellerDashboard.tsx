import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, setDoc, orderBy } from 'firebase/firestore';
import { Product, Order, OrderStatus, ProductVariant } from '../types';
import { Plus, Trash2, Edit, Save, X, Store, Package, Truck, CheckCircle, Clock, AlertCircle, Layers, Download } from 'lucide-react';
import SellerRevenue from '../components/SellerRevenue';

const SellerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'revenue' | 'profile'>('products');
  
  // Profile state
  const [name, setName] = useState(userProfile?.name || '');
  const [whatsapp, setWhatsapp] = useState(userProfile?.whatsapp || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    setName(userProfile?.name || '');
    setWhatsapp(userProfile?.whatsapp || '');
    setAddress(userProfile?.address || '');
  }, [userProfile]);

  // New product state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Sayur',
    imageUrl: '',
    discountPercentage: '',
    variants: [] as ProductVariant[],
    isDigital: false
  });
  const [newProductImage, setNewProductImage] = useState<File | null>(null);

  // Edit product state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Sayur',
    imageUrl: '',
    discountPercentage: '',
    variants: [] as ProductVariant[],
    isDigital: false
  });

  const categories = ['Digital', 'Travel', 'Sembako', 'Sayur', 'Minuman', 'Snack'];

  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(collection(db, 'products'), where('sellerId', '==', userProfile.uid));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
      setLoading(false);
    });

    const path = 'orders';
    const qOrders = query(collection(db, path), where('sellerId', '==', userProfile.uid), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData: Order[] = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() } as Order);
      });
      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [userProfile]);

  const handleUpdateProfile = async () => {
    if (!userProfile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        name,
        whatsapp,
        address
      });
      setIsEditingProfile(false);
      alert('Profil berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Gagal mengunggah gambar ke Cloudinary');
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('URL gambar tidak ditemukan');
    }
    return data.secure_url;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;
    
    if (!whatsapp) {
      alert('Silakan isi nomor WhatsApp di profil Anda terlebih dahulu agar pembeli bisa menghubungi Anda.');
      return;
    }

    setUploadingImage(true);
    try {
      let imageUrl = newProduct.imageUrl;
      if (newProductImage) {
        imageUrl = await uploadToCloudinary(newProductImage);
      }
      
      if (!imageUrl) {
        imageUrl = `https://picsum.photos/seed/${newProduct.name}/400/300`;
      }

      await addDoc(collection(db, 'products'), {
        sellerId: userProfile.uid,
        sellerName: userProfile.name || 'Unknown',
        sellerWhatsapp: whatsapp || '',
        name: newProduct.name || '',
        description: newProduct.description || '',
        price: Number(newProduct.price) || 0,
        stock: Number(newProduct.stock) || 0,
        category: newProduct.category || 'Digital',
        discountPercentage: newProduct.discountPercentage ? Number(newProduct.discountPercentage) : 0,
        variants: newProduct.variants || [],
        isDigital: newProduct.isDigital || false,
        imageUrl,
        createdAt: serverTimestamp()
      });
      
      // Send notification
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: userProfile.uid,
          title: 'Produk Berhasil Ditambahkan',
          message: `Produk "${newProduct.name}" sekarang tersedia di toko Anda.`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to send notification", err);
      }
      
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', price: '', stock: '', category: 'Sayur', imageUrl: '', discountPercentage: '', variants: [], isDigital: false });
      setNewProductImage(null);
      alert('Produk berhasil ditambahkan!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
      }
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProductId(product.id);
    setEditProduct({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock?.toString() || '0',
      category: product.category,
      imageUrl: product.imageUrl || '',
      discountPercentage: product.discountPercentage?.toString() || '',
      variants: product.variants || [],
      isDigital: product.isDigital || false
    });
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId || !userProfile?.uid) return;

    setUploadingImage(true);
    try {
      let imageUrl = editProduct.imageUrl;
      if (editProductImage) {
        imageUrl = await uploadToCloudinary(editProductImage);
      }
      
      if (!imageUrl) {
        imageUrl = `https://picsum.photos/seed/${editProduct.name}/400/300`;
      }

      await updateDoc(doc(db, 'products', editingProductId), {
        name: editProduct.name,
        description: editProduct.description,
        price: Number(editProduct.price),
        stock: Number(editProduct.stock),
        category: editProduct.category,
        discountPercentage: editProduct.discountPercentage ? Number(editProduct.discountPercentage) : 0,
        variants: editProduct.variants,
        isDigital: editProduct.isDigital || false,
        imageUrl
      });
      
      setEditingProductId(null);
      setEditProductImage(null);
      alert('Produk berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${editingProductId}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpgradeToSeller = async () => {
    if (!userProfile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        role: 'seller'
      });
      
      // Send notification
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: userProfile.uid,
          title: 'Toko Berhasil Dibuka!',
          message: 'Selamat! Anda sekarang adalah penjual. Silakan lengkapi profil toko Anda dan tambahkan produk pertama Anda.',
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to send notification", err);
      }
      
      alert('Selamat! Anda sekarang adalah penjual. Silakan lengkapi profil toko Anda.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, buyerId: string, productName: string, newStatus: OrderStatus) => {
    const path = `orders/${orderId}`;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Send notification to buyer
      const statusLabels: Record<OrderStatus, string> = {
        pending: 'Menunggu',
        shipped: 'Dikirim',
        in_transit: 'Dalam Perjalanan',
        delivered: 'Diterima',
        cancelled: 'Dibatalkan',
        unpaid: 'Belum Dibayar',
        paid: 'Sudah Dibayar'
      };

      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: buyerId,
          title: 'Update Status Pesanan',
          message: `Status pesanan Anda untuk "${productName}" telah diperbarui menjadi: ${statusLabels[newStatus]}.`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to send notification to buyer", err);
      }

      alert('Status pesanan berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pesanan ini dari daftar Anda?')) {
      const path = `orders/${orderId}`;
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        alert('Pesanan berhasil dihapus.');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'shipped': return <Package className="h-4 w-4 text-blue-500" />;
      case 'in_transit': return <Truck className="h-4 w-4 text-indigo-500" />;
      case 'delivered': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return 'bg-orange-100 text-orange-800';
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'unpaid': return 'Belum Dibayar';
      case 'paid': return 'Sudah Dibayar';
      case 'pending': return 'Menunggu';
      case 'shipped': return 'Dikirim';
      case 'in_transit': return 'Dalam Perjalanan';
      case 'delivered': return 'Diterima';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  if (!userProfile) {
    return <Navigate to="/login" />;
  }

  if (userProfile.role === 'buyer') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-gray-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
            <Store className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Buka Toko Anda</h2>
          <p className="text-gray-600 mb-6">
            Mulai berjualan dan jangkau lebih banyak pembeli di DesaMart. Gratis dan mudah!
          </p>
          <button
            onClick={handleUpgradeToSeller}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Daftar Sebagai Penjual
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Toko Saya</h1>
        {activeTab === 'products' && !isAddingProduct && (
          <button 
            onClick={() => setIsAddingProduct(true)}
            className="sm:hidden bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Plus className="h-4 w-4" /> Tambah Produk
          </button>
        )}
      </div>

      {/* Tabs - Sticky on Mobile */}
      <div className="sticky top-[56px] sm:top-[112px] z-10 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 border-b border-gray-200 overflow-x-auto scrollbar-hide shadow-sm sm:shadow-none">
        <div className="flex min-w-max sm:min-w-0">
          <button 
            onClick={() => setActiveTab('products')}
            className={`py-4 px-5 font-bold text-sm transition-all relative whitespace-nowrap ${activeTab === 'products' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Produk
            {activeTab === 'products' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`py-4 px-5 font-bold text-sm transition-all relative whitespace-nowrap flex items-center gap-2 ${activeTab === 'orders' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pesanan
            {orders.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {orders.filter(o => o.status === 'pending' || o.status === 'paid' || o.status === 'unpaid').length}
              </span>
            )}
            {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('revenue')}
            className={`py-4 px-5 font-bold text-sm transition-all relative whitespace-nowrap ${activeTab === 'revenue' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Pendapatan
            {activeTab === 'revenue' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-5 font-bold text-sm transition-all relative whitespace-nowrap ${activeTab === 'profile' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Profil
            {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Products Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Produk Saya</h2>
              <button 
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                className="hidden sm:flex bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium items-center gap-2 transition shadow-sm"
              >
                {isAddingProduct ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isAddingProduct ? 'Batal' : 'Tambah Produk'}
              </button>
            </div>

            {isAddingProduct && (
              <form onSubmit={handleAddProduct} className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Tambah Produk Baru</h3>
                  <button type="button" onClick={() => setIsAddingProduct(false)} className="sm:hidden p-2 text-gray-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {!whatsapp && (
                  <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>Perhatian:</strong> Anda belum mengisi nomor WhatsApp di profil toko. Pembeli tidak akan bisa menghubungi Anda untuk memesan produk ini. Silakan lengkapi profil Anda terlebih dahulu.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Nama Produk *</label>
                      <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Nama produk Anda" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Harga (Rp) *</label>
                        <input required type="number" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Stok *</label>
                        <input required type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Kategori *</label>
                        <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Diskon (%)</label>
                        <input type="number" min="0" max="100" value={newProduct.discountPercentage} onChange={e => setNewProduct({...newProduct, discountPercentage: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="0" />
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id="isDigital" 
                        checked={newProduct.isDigital} 
                        onChange={e => setNewProduct({...newProduct, isDigital: e.target.checked})}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <label htmlFor="isDigital" className="text-sm text-emerald-900 font-medium cursor-pointer">
                        Produk Digital (Tidak perlu ongkos kirim)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Gambar Produk</label>
                      <div className="flex flex-col gap-2">
                        <div className="relative group">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={e => setNewProductImage(e.target.files?.[0] || null)} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                          />
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center group-hover:border-emerald-500 transition-colors">
                            <Plus className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Klik untuk Upload</p>
                            {newProductImage && <p className="text-[10px] text-emerald-600 mt-1 font-bold truncate">{newProductImage.name}</p>}
                          </div>
                        </div>
                        <input type="text" placeholder="Atau tempel URL gambar di sini..." value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Deskripsi *</label>
                      <textarea required rows={4} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Ceritakan tentang produk Anda..."></textarea>
                    </div>
                  </div>

                  <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-600" /> Varian Produk (Opsional)
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const id = Math.random().toString(36).substring(2, 9);
                          setNewProduct({
                            ...newProduct,
                            variants: [...newProduct.variants, { id, name: '', price: Number(newProduct.price) || 0, stock: Number(newProduct.stock) || 0 }]
                          });
                        }}
                        className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 font-bold transition-colors"
                      >
                        + Tambah Varian
                      </button>
                    </div>
                    
                    {newProduct.variants.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {newProduct.variants.map((variant, index) => (
                          <div key={variant.id} className="p-4 bg-white border border-gray-200 rounded-2xl relative shadow-sm">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedVariants = [...newProduct.variants];
                                updatedVariants.splice(index, 1);
                                setNewProduct({ ...newProduct, variants: updatedVariants });
                              }}
                              className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 shadow-sm transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Nama Varian</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: Merah, XL"
                                  value={variant.name}
                                  onChange={(e) => {
                                    const updatedVariants = [...newProduct.variants];
                                    updatedVariants[index].name = e.target.value;
                                    setNewProduct({ ...newProduct, variants: updatedVariants });
                                  }}
                                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Harga (Rp)</label>
                                <input
                                  type="number"
                                  value={variant.price}
                                  onChange={(e) => {
                                    const updatedVariants = [...newProduct.variants];
                                    updatedVariants[index].price = Number(e.target.value);
                                    setNewProduct({ ...newProduct, variants: updatedVariants });
                                  }}
                                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Stok</label>
                                <input
                                  type="number"
                                  value={variant.stock}
                                  onChange={(e) => {
                                    const updatedVariants = [...newProduct.variants];
                                    updatedVariants[index].stock = Number(e.target.value);
                                    setNewProduct({ ...newProduct, variants: updatedVariants });
                                  }}
                                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-gray-200">
                        <p className="text-xs text-gray-400 italic">Belum ada varian. Gunakan varian jika produk memiliki pilihan seperti ukuran atau warna.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={() => setIsAddingProduct(false)} className="flex-1 sm:hidden bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm">Batal</button>
                  <button type="submit" className="flex-[2] sm:flex-none sm:ml-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-md transition-all">Simpan Produk</button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-gray-500 text-sm">Memuat produk...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Produk</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">Mulai tambahkan produk pertama Anda untuk mulai berjualan.</p>
                <button 
                  onClick={() => setIsAddingProduct(true)}
                  className="mt-6 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-sm"
                >
                  Tambah Produk Sekarang
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 sm:hidden">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex gap-4">
                        <div className="relative flex-shrink-0">
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-24 h-24 rounded-xl object-cover bg-gray-50 border border-gray-100"
                            referrerPolicy="no-referrer"
                          />
                          {product.discountPercentage && product.discountPercentage > 0 && (
                            <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
                              -{product.discountPercentage}%
                            </span>
                          )}
                        </div>
                        <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight">{product.name}</h4>
                              <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                                {product.category}
                              </span>
                            </div>
                            <div className="mt-1.5">
                              {product.variants && product.variants.length > 0 ? (
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400">Mulai dari</span>
                                  <span className="font-bold text-emerald-600">
                                    Rp {Math.min(...product.variants.map(v => 
                                      v.discountPercentage ? v.price * (1 - v.discountPercentage / 100) : v.price
                                    )).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              ) : product.discountPercentage && product.discountPercentage > 0 ? (
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-gray-400 line-through">Rp {product.price.toLocaleString('id-ID')}</span>
                                  <span className="font-bold text-emerald-600">
                                    Rp {(product.price * (1 - product.discountPercentage / 100)).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-emerald-600">Rp {product.price.toLocaleString('id-ID')}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-[11px] text-gray-500">
                              Stok: <span className={`font-bold ${product.stock && product.stock < 5 ? 'text-red-500' : 'text-gray-900'}`}>
                                {product.variants && product.variants.length > 0 ? 
                                  `${product.variants.reduce((sum, v) => sum + v.stock, 0)}` : 
                                  (product.stock !== undefined ? product.stock : '-')}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleEditClick(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {editingProductId === product.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <form onSubmit={handleUpdateProduct} className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-emerald-800 text-sm">Edit Produk</h4>
                              <button type="button" onClick={() => setEditingProductId(null)} className="text-emerald-400">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Produk *</label>
                                <input required type="text" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga (Rp) *</label>
                                  <input required type="number" min="0" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Stok *</label>
                                  <input required type="number" min="0" value={editProduct.stock} onChange={e => setEditProduct({...editProduct, stock: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kategori *</label>
                                  <select value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white">
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Diskon (%)</label>
                                  <input type="number" min="0" max="100" value={editProduct.discountPercentage} onChange={e => setEditProduct({...editProduct, discountPercentage: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" placeholder="0" />
                                </div>
                              </div>
                              
                              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  id={`editIsDigitalMobile-${product.id}`}
                                  checked={editProduct.isDigital} 
                                  onChange={e => setEditProduct({...editProduct, isDigital: e.target.checked})}
                                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                />
                                <label htmlFor={`editIsDigitalMobile-${product.id}`} className="text-sm text-emerald-900 font-medium cursor-pointer">
                                  Produk Digital (Tidak perlu ongkos kirim)
                                </label>
                              </div>

                              <div>
                                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Deskripsi *</label>
                                <textarea required rows={3} value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"></textarea>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setEditingProductId(null)} className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold shadow-sm">Batal</button>
                                <button type="submit" className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-700">Simpan</button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <React.Fragment key={product.id}>
                          {editingProductId === product.id ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-4">
                                <form onSubmit={handleUpdateProduct} className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                                  <h4 className="font-medium text-emerald-800 mb-3">Edit Produk</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Nama Produk *</label>
                                      <input required type="text" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Harga (Rp) *</label>
                                      <input required type="number" min="0" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Stok *</label>
                                      <input required type="number" min="0" value={editProduct.stock} onChange={e => setEditProduct({...editProduct, stock: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Kategori *</label>
                                      <select value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm">
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Diskon (%)</label>
                                      <input type="number" min="0" max="100" value={editProduct.discountPercentage} onChange={e => setEditProduct({...editProduct, discountPercentage: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm" placeholder="0" />
                                    </div>
                                    
                                    <div className="md:col-span-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3">
                                      <input 
                                        type="checkbox" 
                                        id={`editIsDigitalDesktop-${product.id}`}
                                        checked={editProduct.isDigital} 
                                        onChange={e => setEditProduct({...editProduct, isDigital: e.target.checked})}
                                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                      />
                                      <label htmlFor={`editIsDigitalDesktop-${product.id}`} className="text-sm text-emerald-900 font-medium cursor-pointer">
                                        Produk Digital (Tidak perlu ongkos kirim)
                                      </label>
                                    </div>

                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Gambar Produk</label>
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={e => setEditProductImage(e.target.files?.[0] || null)} 
                                        className="w-full border border-gray-300 rounded p-1.5 text-sm" 
                                      />
                                      <p className="text-[10px] text-gray-500 mt-1">Atau masukkan URL gambar jika tidak ingin upload:</p>
                                      <input type="text" value={editProduct.imageUrl} onChange={e => setEditProduct({...editProduct, imageUrl: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm mt-1" />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi *</label>
                                      <textarea required rows={2} value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm"></textarea>
                                    </div>

                                    {/* Variant Management (Edit) */}
                                    <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                                      <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                          <Layers className="h-3 w-3" /> Varian Produk
                                        </h4>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const id = Math.random().toString(36).substring(2, 9);
                                            setEditProduct({
                                              ...editProduct,
                                              variants: [...editProduct.variants, { id, name: '', price: Number(editProduct.price) || 0, stock: Number(editProduct.stock) || 0 }]
                                            });
                                          }}
                                          className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-100"
                                        >
                                          + Tambah Varian
                                        </button>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        {editProduct.variants.map((variant, index) => (
                                          <div key={variant.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-white border border-gray-200 rounded-lg relative">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedVariants = [...editProduct.variants];
                                                updatedVariants.splice(index, 1);
                                                setEditProduct({ ...editProduct, variants: updatedVariants });
                                              }}
                                              className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full hover:bg-red-200"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                            <div className="sm:col-span-1">
                                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Nama Varian</label>
                                              <input
                                                type="text"
                                                value={variant.name}
                                                onChange={(e) => {
                                                  const updatedVariants = [...editProduct.variants];
                                                  updatedVariants[index].name = e.target.value;
                                                  setEditProduct({ ...editProduct, variants: updatedVariants });
                                                }}
                                                className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                                required
                                              />
                                            </div>
                                            <div className="sm:col-span-1">
                                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Harga (Rp)</label>
                                              <input
                                                type="number"
                                                value={variant.price}
                                                onChange={(e) => {
                                                  const updatedVariants = [...editProduct.variants];
                                                  updatedVariants[index].price = Number(e.target.value);
                                                  setEditProduct({ ...editProduct, variants: updatedVariants });
                                                }}
                                                className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                                required
                                              />
                                            </div>
                                            <div className="sm:col-span-1">
                                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Stok</label>
                                              <input
                                                type="number"
                                                value={variant.stock}
                                                onChange={(e) => {
                                                  const updatedVariants = [...editProduct.variants];
                                                  updatedVariants[index].stock = Number(e.target.value);
                                                  setEditProduct({ ...editProduct, variants: updatedVariants });
                                                }}
                                                className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                                required
                                              />
                                            </div>
                                            <div className="sm:col-span-1">
                                              <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Diskon (%)</label>
                                              <input
                                                type="number"
                                                value={variant.discountPercentage || ''}
                                                onChange={(e) => {
                                                  const updatedVariants = [...editProduct.variants];
                                                  updatedVariants[index].discountPercentage = e.target.value ? Number(e.target.value) : undefined;
                                                  setEditProduct({ ...editProduct, variants: updatedVariants });
                                                }}
                                                className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                                placeholder="0"
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex justify-end gap-2">
                                    <button type="button" onClick={() => setEditingProductId(null)} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-50">Batal</button>
                                    <button type="submit" className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-emerald-700">Simpan Perubahan</button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <img className="h-10 w-10 rounded-md object-cover" src={product.imageUrl} alt="" referrerPolicy="no-referrer" />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                    {product.variants && product.variants.length > 0 && (
                                      <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Layers className="h-3 w-3" /> {product.variants.length} Varian
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                  {product.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.variants && product.variants.length > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400">Mulai dari</span>
                                    <span className="font-bold text-emerald-600">
                                      Rp {Math.min(...product.variants.map(v => 
                                        v.discountPercentage ? v.price * (1 - v.discountPercentage / 100) : v.price
                                      )).toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                ) : product.discountPercentage && product.discountPercentage > 0 ? (
                                  <div className="flex flex-col">
                                    <span className="text-xs text-gray-400 line-through">Rp {product.price.toLocaleString('id-ID')}</span>
                                    <div className="flex items-center gap-1">
                                      <span className="font-bold text-emerald-600">
                                        Rp {(product.price * (1 - product.discountPercentage / 100)).toLocaleString('id-ID')}
                                      </span>
                                      <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold">-{product.discountPercentage}%</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span>Rp {product.price.toLocaleString('id-ID')}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.variants && product.variants.length > 0 ? (
                                  <span>{product.variants.reduce((sum, v) => sum + v.stock, 0)} (Total)</span>
                                ) : (
                                  <span>{product.stock !== undefined ? product.stock : '-'}</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => handleEditClick(product)} className="text-blue-600 hover:text-blue-900 mr-3">
                                  <Edit className="h-5 w-5 inline" />
                                </button>
                                <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900">
                                  <Trash2 className="h-5 w-5 inline" />
                                </button>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      ) : activeTab === 'orders' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Pesanan Masuk</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Truck className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Pesanan</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">Pesanan dari pembeli akan muncul di sini.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex justify-between items-start sm:block">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID: {order.id.substring(0, 8)}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${getStatusBadgeClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Pembeli: <span className="font-bold text-gray-900">{order.buyerName}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        className="sm:hidden p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] text-gray-500 mb-0.5 uppercase font-bold tracking-tight">Total Produk</div>
                        <div className="text-lg font-bold text-emerald-600">Rp {(order.totalPrice - (order.shippingCost || 0)).toLocaleString('id-ID')}</div>
                      </div>
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        className="hidden sm:flex p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                        title="Hapus Pesanan"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-6">
                    <div className="space-y-4 mb-6">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name} 
                            className="w-14 h-14 rounded-xl object-cover bg-gray-50 border border-gray-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-grow min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                              {item.product.name}
                            </h4>
                            {item.product.isDigital && (
                              <div className="mt-0.5 mb-1">
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                                  <Download className="h-2.5 w-2.5" /> Digital
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.selectedVariant && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-lg font-bold">
                                  {item.selectedVariant.name}
                                </span>
                              )}
                              <p className="text-xs text-gray-500">
                                {item.quantity} x Rp {
                                  item.selectedVariant 
                                    ? (item.selectedVariant.discountPercentage 
                                        ? (item.selectedVariant.price * (1 - item.selectedVariant.discountPercentage / 100)).toLocaleString('id-ID')
                                        : item.selectedVariant.price.toLocaleString('id-ID'))
                                    : (item.product.discountPercentage && item.product.discountPercentage > 0)
                                      ? (item.product.price * (1 - item.product.discountPercentage / 100)).toLocaleString('id-ID')
                                      : item.product.price.toLocaleString('id-ID')
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
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
                    
                    <div className="border-t border-gray-100 pt-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Update Status Pengiriman:</label>
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        {(['pending', 'shipped', 'in_transit', 'delivered', 'cancelled'] as OrderStatus[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateOrderStatus(order.id, order.buyerId, order.items[0].product.name, status)}
                            disabled={order.status === status || (order.status === 'unpaid' && status !== 'cancelled')}
                            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                              order.status === status 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-transparent' 
                                : (order.status === 'unpaid' && status !== 'cancelled')
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-600 shadow-sm'
                            }`}
                          >
                            <span className="flex-shrink-0">{getStatusIcon(status)}</span>
                            <span className="truncate">
                              {status === 'pending' ? 'Menunggu' : 
                               status === 'shipped' ? 'Dikirim' : 
                               status === 'in_transit' ? 'Perjalanan' : 
                               status === 'delivered' ? 'Diterima' : 'Batal'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'revenue' ? (
        <SellerRevenue orders={orders} />
      ) : (
        /* Profile Section */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Informasi Profil Toko</h2>
            {!isEditingProfile ? (
              <button onClick={() => setIsEditingProfile(true)} className="w-full sm:w-auto bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-colors border border-emerald-100">
                <Edit className="h-4 w-4" /> Edit Profil
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 sm:flex-none bg-gray-50 text-gray-600 hover:bg-gray-100 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-colors border border-gray-200">
                  <X className="h-4 w-4" /> Batal
                </button>
                <button onClick={handleUpdateProfile} className="flex-1 sm:flex-none bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-colors shadow-sm">
                  <Save className="h-4 w-4" /> Simpan
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Nama Toko / Pemilik</label>
              <input 
                type="text" 
                disabled={!isEditingProfile} 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama toko atau nama Anda"
                className={`w-full border rounded-xl shadow-sm p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all ${isEditingProfile ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`} 
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Nomor WhatsApp</label>
              <input 
                type="text" 
                disabled={!isEditingProfile} 
                value={whatsapp} 
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Contoh: 081234567890"
                className={`w-full border rounded-xl shadow-sm p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all ${isEditingProfile ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`} 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Alamat Toko / Desa</label>
              <textarea 
                disabled={!isEditingProfile} 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Masukkan alamat lengkap desa Anda"
                rows={3}
                className={`w-full border rounded-xl shadow-sm p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all ${isEditingProfile ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50 text-gray-500'}`} 
              />
              <p className="text-[10px] text-gray-400 mt-2 italic">
                * Alamat ini akan ditampilkan kepada pembeli pada saat checkout.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
