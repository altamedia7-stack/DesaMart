import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, setDoc, orderBy } from 'firebase/firestore';
import { Product, Order, OrderStatus, ProductVariant } from '../types';
import { Plus, Trash2, Edit, Save, X, Store, Package, Truck, CheckCircle, Clock, AlertCircle, Layers, LocateFixed } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationSelector({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const SellerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  
  // Profile state
  const [whatsapp, setWhatsapp] = useState(userProfile?.whatsapp || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(userProfile?.location || null);
  const [isLocating, setIsLocating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    setWhatsapp(userProfile?.whatsapp || '');
    setAddress(userProfile?.address || '');
    setLocation(userProfile?.location || null);
  }, [userProfile]);

  // New product state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Sayur',
    imageUrl: '',
    discountPercentage: '',
    variants: [] as ProductVariant[]
  });

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
    variants: [] as ProductVariant[]
  });

  const categories = ['Sayur', 'Sembako', 'Minuman', 'Snack', 'Lainnya'];

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
        whatsapp,
        address,
        location
      });
      setIsEditingProfile(false);
      alert('Profil berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        await fetchAddressFromCoords(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert('Gagal mendapatkan lokasi. Pastikan Anda memberikan izin akses lokasi pada browser Anda.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;
    
    if (!whatsapp) {
      alert('Silakan isi nomor WhatsApp di profil Anda terlebih dahulu agar pembeli bisa menghubungi Anda.');
      return;
    }

    try {
      await addDoc(collection(db, 'products'), {
        sellerId: userProfile.uid,
        sellerName: userProfile.name,
        sellerWhatsapp: whatsapp,
        name: newProduct.name,
        description: newProduct.description,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        category: newProduct.category,
        discountPercentage: newProduct.discountPercentage ? Number(newProduct.discountPercentage) : 0,
        variants: newProduct.variants,
        imageUrl: newProduct.imageUrl || `https://picsum.photos/seed/${newProduct.name}/400/300`,
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
      setNewProduct({ name: '', description: '', price: '', stock: '', category: 'Sayur', imageUrl: '', discountPercentage: '', variants: [] });
      alert('Produk berhasil ditambahkan!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
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
      variants: product.variants || []
    });
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;

    try {
      await updateDoc(doc(db, 'products', editingProductId), {
        name: editProduct.name,
        description: editProduct.description,
        price: Number(editProduct.price),
        stock: Number(editProduct.stock),
        category: editProduct.category,
        discountPercentage: editProduct.discountPercentage ? Number(editProduct.discountPercentage) : 0,
        variants: editProduct.variants,
        imageUrl: editProduct.imageUrl || `https://picsum.photos/seed/${editProduct.name}/400/300`
      });
      
      setEditingProductId(null);
      alert('Produk berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${editingProductId}`);
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
        cancelled: 'Dibatalkan'
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Toko Saya</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button 
          onClick={() => setActiveTab('products')}
          className={`py-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'products' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Produk Saya
          {activeTab === 'products' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`py-4 px-6 font-medium text-sm transition-colors relative ${activeTab === 'orders' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Pesanan Masuk
          {orders.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
          {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>}
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Profile Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Informasi Toko</h2>
              {!isEditingProfile ? (
                <button onClick={() => setIsEditingProfile(true)} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm font-medium">
                  <Edit className="h-4 w-4" /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingProfile(false)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium">
                    <X className="h-4 w-4" /> Batal
                  </button>
                  <button onClick={handleUpdateProfile} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm font-medium">
                    <Save className="h-4 w-4" /> Simpan
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik</label>
                <input type="text" disabled value={userProfile.name} className="w-full border-gray-300 rounded-md shadow-sm bg-gray-50 p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp (Mulai dengan 08...)</label>
                <input 
                  type="text" 
                  disabled={!isEditingProfile} 
                  value={whatsapp} 
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className={`w-full border rounded-md shadow-sm p-2 ${isEditingProfile ? 'border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500' : 'border-gray-300 bg-gray-50'}`} 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Toko / Desa</label>
                <textarea 
                  disabled={!isEditingProfile} 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Masukkan alamat lengkap desa Anda"
                  rows={2}
                  className={`w-full border rounded-md shadow-sm p-2 mb-4 ${isEditingProfile ? 'border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500' : 'border-gray-300 bg-gray-50'}`} 
                />
                
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi GPS Toko (Untuk perhitungan ongkir)</label>
                {isEditingProfile && (
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="mb-3 flex items-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 py-2 px-4 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 text-sm"
                  >
                    <LocateFixed className="h-4 w-4" />
                    {isLocating ? 'Mencari lokasi...' : 'Deteksi Lokasi Saat Ini'}
                  </button>
                )}
                
                <div className="h-[250px] w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
                  <MapContainer 
                    center={location ? [location.lat, location.lng] : [-8.2192, 114.3692]} 
                    zoom={location ? 15 : 11} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <MapUpdater 
                      center={location ? [location.lat, location.lng] : [-8.2192, 114.3692]} 
                      zoom={location ? 15 : 11} 
                    />
                    <TileLayer
                      attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    />
                    {isEditingProfile && (
                      <LocationSelector onLocationSelect={(lat, lng) => {
                        setLocation({ lat, lng });
                        fetchAddressFromCoords(lat, lng);
                      }} />
                    )}
                    {location && (
                      <Marker position={[location.lat, location.lng]}>
                        <Popup>Lokasi Toko Anda</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
                {isEditingProfile && (
                  <p className="text-xs text-gray-500 mt-2">
                    * Anda juga bisa menggeser peta dan klik untuk menentukan lokasi toko secara manual.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Produk Saya</h2>
              <button 
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
              >
                {isAddingProduct ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isAddingProduct ? 'Batal' : 'Tambah Produk'}
              </button>
            </div>

            {isAddingProduct && (
              <form onSubmit={handleAddProduct} className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Tambah Produk Baru</h3>
                
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
                    <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp) *</label>
                    <input required type="number" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stok *</label>
                    <input required type="number" min="0" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full border border-gray-300 rounded-md p-2">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diskon (%)</label>
                    <input type="number" min="0" max="100" value={newProduct.discountPercentage} onChange={e => setNewProduct({...newProduct, discountPercentage: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" placeholder="0" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar (Opsional)</label>
                    <input type="text" placeholder="https://..." value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                    <textarea required rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full border border-gray-300 rounded-md p-2"></textarea>
                  </div>

                  {/* Variant Management */}
                  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Layers className="h-4 w-4" /> Varian Produk (Opsional)
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
                        className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-200 hover:bg-emerald-100"
                      >
                        + Tambah Varian
                      </button>
                    </div>
                    
                    {newProduct.variants.length > 0 ? (
                      <div className="space-y-3">
                        {newProduct.variants.map((variant, index) => (
                          <div key={variant.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-white border border-gray-200 rounded-lg relative">
                            <button
                              type="button"
                              onClick={() => {
                                const updatedVariants = [...newProduct.variants];
                                updatedVariants.splice(index, 1);
                                setNewProduct({ ...newProduct, variants: updatedVariants });
                              }}
                              className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full hover:bg-red-200"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nama Varian</label>
                              <input
                                type="text"
                                placeholder="Contoh: Merah, XL"
                                value={variant.name}
                                onChange={(e) => {
                                  const updatedVariants = [...newProduct.variants];
                                  updatedVariants[index].name = e.target.value;
                                  setNewProduct({ ...newProduct, variants: updatedVariants });
                                }}
                                className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                required
                              />
                            </div>
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Harga (Rp)</label>
                              <input
                                type="number"
                                value={variant.price}
                                onChange={(e) => {
                                  const updatedVariants = [...newProduct.variants];
                                  updatedVariants[index].price = Number(e.target.value);
                                  setNewProduct({ ...newProduct, variants: updatedVariants });
                                }}
                                className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                required
                              />
                            </div>
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Stok</label>
                              <input
                                type="number"
                                value={variant.stock}
                                onChange={(e) => {
                                  const updatedVariants = [...newProduct.variants];
                                  updatedVariants[index].stock = Number(e.target.value);
                                  setNewProduct({ ...newProduct, variants: updatedVariants });
                                }}
                                className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                required
                              />
                            </div>
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Diskon (%)</label>
                              <input
                                type="number"
                                value={variant.discountPercentage || ''}
                                onChange={(e) => {
                                  const updatedVariants = [...newProduct.variants];
                                  updatedVariants[index].discountPercentage = e.target.value ? Number(e.target.value) : undefined;
                                  setNewProduct({ ...newProduct, variants: updatedVariants });
                                }}
                                className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Belum ada varian. Gunakan varian jika produk memiliki pilihan seperti ukuran atau warna.</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-md font-medium hover:bg-emerald-700">Simpan Produk</button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-center py-8">Memuat produk...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">Anda belum memiliki produk. Silakan tambah produk baru.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                                  <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">URL Gambar (Opsional)</label>
                                    <input type="text" value={editProduct.imageUrl} onChange={e => setEditProduct({...editProduct, imageUrl: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
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
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Pesanan Masuk</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">Belum ada pesanan masuk.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order ID: {order.id.substring(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Pembeli: <span className="font-bold text-gray-900">{order.buyerName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">Total Pesanan</div>
                        <div className="text-lg font-bold text-emerald-600">Rp {order.totalPrice.toLocaleString('id-ID')}</div>
                      </div>
                      <button 
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Pesanan"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name} 
                            className="w-12 h-12 rounded-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-grow">
                            <h4 className="text-sm font-bold text-gray-900">
                              {item.product.name}
                              {item.selectedVariant && (
                                <span className="ml-2 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {item.selectedVariant.name}
                                </span>
                              )}
                            </h4>
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
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-100 pt-6">
                      <label className="block text-sm font-bold text-gray-700 mb-3">Update Status Pengiriman:</label>
                      <div className="flex flex-wrap gap-2">
                        {(['pending', 'shipped', 'in_transit', 'delivered', 'cancelled'] as OrderStatus[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateOrderStatus(order.id, order.buyerId, order.items[0].product.name, status)}
                            disabled={order.status === status}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                              order.status === status 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-500 hover:text-emerald-600'
                            }`}
                          >
                            {getStatusIcon(status)}
                            {status === 'pending' ? 'Menunggu' : 
                             status === 'shipped' ? 'Dikirim' : 
                             status === 'in_transit' ? 'Dalam Perjalanan' : 
                             status === 'delivered' ? 'Diterima' : 'Dibatalkan'}
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
      )}
    </div>
  );
};

export default SellerDashboard;
