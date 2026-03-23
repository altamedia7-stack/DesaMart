import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { Courier, UserProfile, Product, ProductVariant } from '../types';
import { Truck, Trash2, Plus, Users, X, Package, Settings, Edit, Save, Layers } from 'lucide-react';
import SeedData from '../components/SeedData';

const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'couriers' | 'users' | 'products'>('products');

  // New courier state
  const [isAddingCourier, setIsAddingCourier] = useState(false);
  const [newCourier, setNewCourier] = useState({
    name: '',
    baseRate: '',
    perKmRate: ''
  });

  // Edit product state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    discountPercentage: '',
    category: 'Sayur',
    imageUrl: '',
    variants: [] as ProductVariant[]
  });

  const categories = ['Sayur', 'Sembako', 'Minuman', 'Snack', 'Lainnya'];

  useEffect(() => {
    if (userProfile?.role !== 'admin') return;

    const couriersQ = query(collection(db, 'couriers'));
    const unsubCouriers = onSnapshot(couriersQ, (snapshot) => {
      const data: Courier[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Courier);
      });
      setCouriers(data);
    });

    const usersQ = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      const data: UserProfile[] = [];
      snapshot.forEach((doc) => {
        data.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(data);
    });

    const productsQ = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(productsQ, (snapshot) => {
      const data: Product[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(data);
      setLoading(false);
    });

    return () => {
      unsubCouriers();
      unsubUsers();
      unsubProducts();
    };
  }, [userProfile]);

  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'couriers'), {
        name: newCourier.name,
        baseRate: Number(newCourier.baseRate),
        perKmRate: Number(newCourier.perKmRate),
        createdAt: serverTimestamp()
      });
      setIsAddingCourier(false);
      setNewCourier({ name: '', baseRate: '', perKmRate: '' });
      alert('Kurir berhasil ditambahkan!');
    } catch (error) {
      console.error("Error adding courier", error);
      alert('Gagal menambahkan kurir.');
    }
  };

  const handleDeleteCourier = async (courierId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kurir ini?')) {
      try {
        await deleteDoc(doc(db, 'couriers', courierId));
      } catch (error) {
        console.error("Error deleting courier", error);
        alert('Gagal menghapus kurir.');
      }
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      
      // Send notification
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          id: notifRef.id,
          userId: userId,
          title: 'Perubahan Peran Akun',
          message: `Peran akun Anda telah diubah menjadi ${newRole === 'seller' ? 'Penjual' : newRole === 'admin' ? 'Admin' : 'Pembeli'}.`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to send notification", err);
      }
      
      alert('Peran pengguna berhasil diperbarui!');
    } catch (error) {
      console.error("Error updating user role", error);
      alert('Gagal memperbarui peran pengguna.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini secara permanen?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        alert('Produk berhasil dihapus.');
      } catch (error) {
        console.error("Error deleting product", error);
        alert('Gagal menghapus produk.');
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditProduct({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock !== undefined ? product.stock.toString() : '',
      discountPercentage: product.discountPercentage !== undefined ? product.discountPercentage.toString() : '0',
      category: product.category,
      imageUrl: product.imageUrl,
      variants: product.variants || []
    });
  };

  const handleSaveEditProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        name: editProduct.name,
        description: editProduct.description,
        price: Number(editProduct.price),
        stock: Number(editProduct.stock),
        discountPercentage: Number(editProduct.discountPercentage),
        category: editProduct.category,
        imageUrl: editProduct.imageUrl,
        variants: editProduct.variants
      });
      setEditingProductId(null);
      alert('Produk berhasil diperbarui!');
    } catch (error) {
      console.error("Error updating product", error);
      alert('Gagal memperbarui produk.');
    }
  };

  const handleDeleteEmptyProducts = async () => {
    if (window.confirm('Hapus semua produk yang bernama "tidak ada" atau kosong?')) {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        let deletedCount = 0;
        for (const document of snapshot.docs) {
          const data = document.data();
          if (!data.name || data.name.toLowerCase().includes('tidak ada') || data.name.trim() === '') {
            await deleteDoc(doc(db, 'products', document.id));
            deletedCount++;
          }
        }
        alert(`Berhasil menghapus ${deletedCount} produk.`);
      } catch (error) {
        console.error("Error deleting empty products", error);
        alert('Gagal menghapus produk.');
      }
    }
  };

  if (!userProfile || userProfile.role !== 'admin') {
    return <div className="p-8 text-center text-red-600 font-bold">Akses ditolak. Halaman ini hanya untuk Admin.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Admin</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <SeedData />
        <button 
          onClick={handleDeleteEmptyProducts}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Trash2 className="h-4 w-4" />
          Hapus Produk "Tidak Ada"
        </button>
      </div>

      <div className="flex overflow-x-auto border-b border-gray-200 mb-6 scrollbar-hide">
        <button
          onClick={() => setActiveTab('products')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'products' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2"><Package className="h-4 w-4" /> Manajemen Produk</div>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Manajemen Pengguna</div>
        </button>
        <button
          onClick={() => setActiveTab('couriers')}
          className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'couriers' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> Manajemen Kurir & Ongkir</div>
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Daftar Semua Produk</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
              Total: {products.length} Produk
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga & Stok</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penjual</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      {editingProductId === product.id ? (
                        <div className="space-y-2">
                          <input type="text" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm" placeholder="Nama Produk" />
                          <input type="text" value={editProduct.imageUrl} onChange={e => setEditProduct({...editProduct, imageUrl: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm" placeholder="URL Gambar" />
                          <textarea value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm" placeholder="Deskripsi" rows={2} />
                          
                          {/* Variant Management (Admin Edit) */}
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                <Layers className="h-3 w-3" /> Varian
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const id = Math.random().toString(36).substring(2, 9);
                                  setEditProduct({
                                    ...editProduct,
                                    variants: [...editProduct.variants, { id, name: '', price: Number(editProduct.price) || 0, stock: Number(editProduct.stock) || 0 }]
                                  });
                                }}
                                className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-200"
                              >
                                + Tambah
                              </button>
                            </div>
                            <div className="space-y-2">
                              {editProduct.variants.map((variant, index) => (
                                <div key={variant.id} className="grid grid-cols-4 gap-1 p-2 bg-gray-50 rounded relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedVariants = [...editProduct.variants];
                                      updatedVariants.splice(index, 1);
                                      setEditProduct({ ...editProduct, variants: updatedVariants });
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-0.5 rounded-full"
                                  >
                                    <X className="h-2 w-2" />
                                  </button>
                                  <input
                                    type="text"
                                    placeholder="Nama"
                                    value={variant.name}
                                    onChange={(e) => {
                                      const updatedVariants = [...editProduct.variants];
                                      updatedVariants[index].name = e.target.value;
                                      setEditProduct({ ...editProduct, variants: updatedVariants });
                                    }}
                                    className="border border-gray-300 rounded p-1 text-[10px]"
                                    required
                                  />
                                  <input
                                    type="number"
                                    placeholder="Harga"
                                    value={variant.price}
                                    onChange={(e) => {
                                      const updatedVariants = [...editProduct.variants];
                                      updatedVariants[index].price = Number(e.target.value);
                                      setEditProduct({ ...editProduct, variants: updatedVariants });
                                    }}
                                    className="border border-gray-300 rounded p-1 text-[10px]"
                                    required
                                  />
                                  <input
                                    type="number"
                                    placeholder="Stok"
                                    value={variant.stock}
                                    onChange={(e) => {
                                      const updatedVariants = [...editProduct.variants];
                                      updatedVariants[index].stock = Number(e.target.value);
                                      setEditProduct({ ...editProduct, variants: updatedVariants });
                                    }}
                                    className="border border-gray-300 rounded p-1 text-[10px]"
                                    required
                                  />
                                  <input
                                    type="number"
                                    placeholder="Disc %"
                                    value={variant.discountPercentage || ''}
                                    onChange={(e) => {
                                      const updatedVariants = [...editProduct.variants];
                                      updatedVariants[index].discountPercentage = e.target.value ? Number(e.target.value) : undefined;
                                      setEditProduct({ ...editProduct, variants: updatedVariants });
                                    }}
                                    className="border border-gray-300 rounded p-1 text-[10px]"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img className="h-10 w-10 rounded-md object-cover" src={product.imageUrl || 'https://picsum.photos/seed/product/100/100'} alt="" referrerPolicy="no-referrer" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{product.name}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.description}</div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProductId === product.id ? (
                        <select value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value})} className="border border-gray-300 rounded p-1 text-sm w-full">
                          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {product.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProductId === product.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-12">Harga:</span>
                            <input type="number" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm" placeholder="Harga" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-12">Stok:</span>
                            <input type="number" value={editProduct.stock} onChange={e => setEditProduct({...editProduct, stock: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm" placeholder="Stok" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-12">Diskon:</span>
                            <input type="number" min="0" max="100" value={editProduct.discountPercentage} onChange={e => setEditProduct({...editProduct, discountPercentage: e.target.value})} className="w-full border border-gray-300 rounded p-1 text-sm" placeholder="Diskon %" />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm text-gray-900 font-medium">
                            {product.variants && product.variants.length > 0 ? (
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400">Mulai dari</span>
                                <span className="text-emerald-600 font-bold">
                                  Rp {Math.min(...product.variants.map(v => 
                                    v.discountPercentage ? v.price * (1 - v.discountPercentage / 100) : v.price
                                  )).toLocaleString('id-ID')}
                                </span>
                              </div>
                            ) : product.discountPercentage && product.discountPercentage > 0 ? (
                              <div className="flex flex-col">
                                <span className="text-xs text-red-500 line-through">Rp {product.price.toLocaleString('id-ID')}</span>
                                <span>Rp {(product.price * (1 - product.discountPercentage / 100)).toLocaleString('id-ID')}</span>
                                <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded w-fit">-{product.discountPercentage}%</span>
                              </div>
                            ) : (
                              <span>Rp {product.price.toLocaleString('id-ID')}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Stok: {product.variants && product.variants.length > 0 
                              ? `${product.variants.reduce((sum, v) => sum + v.stock, 0)} (Total)` 
                              : (product.stock !== undefined ? product.stock : '-')}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.sellerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingProductId === product.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleSaveEditProduct(product.id)} className="text-emerald-600 hover:text-emerald-900 p-2 rounded-full hover:bg-emerald-50 transition">
                            <Save className="h-5 w-5" />
                          </button>
                          <button onClick={() => setEditingProductId(null)} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50 transition">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition">
                            <Edit className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Belum ada produk di website.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'couriers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Daftar Kurir Desa</h2>
            <button 
              onClick={() => setIsAddingCourier(!isAddingCourier)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              {isAddingCourier ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isAddingCourier ? 'Batal' : 'Tambah Kurir'}
            </button>
          </div>

          {isAddingCourier && (
            <form onSubmit={handleAddCourier} className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tambah Kurir Baru</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kurir *</label>
                  <input required type="text" value={newCourier.name} onChange={e => setNewCourier({...newCourier, name: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" placeholder="Contoh: Kurir Desa A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarif Dasar (Rp) *</label>
                  <input required type="number" min="0" value={newCourier.baseRate} onChange={e => setNewCourier({...newCourier, baseRate: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" placeholder="Contoh: 5000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarif per KM (Rp) *</label>
                  <input required type="number" min="0" value={newCourier.perKmRate} onChange={e => setNewCourier({...newCourier, perKmRate: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" placeholder="Contoh: 2000" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-md font-medium hover:bg-emerald-700">Simpan Kurir</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Kurir</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarif Dasar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarif per KM</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {couriers.map((courier) => (
                  <tr key={courier.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{courier.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Rp {courier.baseRate.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Rp {courier.perKmRate.toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleDeleteCourier(courier.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {couriers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Belum ada kurir yang ditambahkan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Daftar Pengguna</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama & Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peran</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ubah Peran</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.whatsapp || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'seller' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <select 
                        value={user.role}
                        onChange={(e) => {
                          if (window.confirm(`Apakah Anda yakin ingin mengubah peran ${user.name} menjadi ${e.target.value}?`)) {
                            handleUpdateUserRole(user.uid, e.target.value);
                          }
                        }}
                        disabled={user.uid === userProfile.uid} // Can't change own role
                        className="border border-gray-300 rounded-lg text-sm p-2 bg-gray-50 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                      >
                        <option value="buyer">Pembeli</option>
                        <option value="seller">Penjual</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
