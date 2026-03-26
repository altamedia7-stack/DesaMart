import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { Courier, UserProfile, Product, ProductVariant } from '../types';
import { BANYUWANGI_DISTRICTS } from '../constants';
import { Truck, Trash2, Plus, Users, X, Package, Settings, Edit, Save, Layers } from 'lucide-react';

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
    rates: {} as { [key: string]: number }
  });

  // Edit courier state
  const [editingCourierId, setEditingCourierId] = useState<string | null>(null);
  const [editCourier, setEditCourier] = useState({
    name: '',
    baseRate: '',
    rates: {} as { [key: string]: number }
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

  const categories = ['Digital', 'Travel', 'Sembako', 'Sayur', 'Minuman', 'Snack'];

  useEffect(() => {
    if (userProfile?.role !== 'admin') return;

    const couriersQ = query(collection(db, 'couriers'));
    const unsubCouriers = onSnapshot(couriersQ, (snapshot) => {
      const data: Courier[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Courier);
      });
      setCouriers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'couriers');
    });

    const usersQ = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      const data: UserProfile[] = [];
      snapshot.forEach((doc) => {
        data.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const productsQ = query(collection(db, 'products'));
    const unsubProducts = onSnapshot(productsQ, (snapshot) => {
      const data: Product[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
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
        rates: newCourier.rates,
        createdAt: serverTimestamp()
      });
      setIsAddingCourier(false);
      setNewCourier({ name: '', baseRate: '', rates: {} });
      alert('Kurir berhasil ditambahkan!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'couriers');
    }
  };

  const handleEditCourier = (courier: Courier) => {
    setEditingCourierId(courier.id);
    setEditCourier({
      name: courier.name,
      baseRate: courier.baseRate.toString(),
      rates: courier.rates || {}
    });
  };

  const handleSaveEditCourier = async (courierId: string) => {
    try {
      await updateDoc(doc(db, 'couriers', courierId), {
        name: editCourier.name,
        baseRate: Number(editCourier.baseRate),
        rates: editCourier.rates
      });
      setEditingCourierId(null);
      alert('Kurir berhasil diperbarui!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `couriers/${courierId}`);
    }
  };

  const handleDeleteCourier = async (courierId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kurir ini?')) {
      try {
        await deleteDoc(doc(db, 'couriers', courierId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `couriers/${courierId}`);
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
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini secara permanen?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        alert('Produk berhasil dihapus.');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
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
      handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
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

  const handleCreateDummyData = async () => {
    if (!userProfile?.uid) return;
    if (!window.confirm('Buat data dummy produk?')) return;

    try {
      const dummyProducts = [
        {
          sellerId: userProfile.uid,
          sellerName: userProfile.name || 'Admin',
          sellerWhatsapp: userProfile.whatsapp || '081234567890',
          name: 'Sayur Bayam Segar',
          description: 'Bayam segar langsung dari petani lokal.',
          price: 5000,
          stock: 100,
          category: 'Sayur',
          imageUrl: 'https://picsum.photos/seed/bayam/400/400',
          createdAt: serverTimestamp(),
          isDigital: false
        },
        {
          sellerId: userProfile.uid,
          sellerName: userProfile.name || 'Admin',
          sellerWhatsapp: userProfile.whatsapp || '081234567890',
          name: 'Beras Premium 5kg',
          description: 'Beras putih pulen kualitas premium.',
          price: 65000,
          stock: 50,
          category: 'Sembako',
          imageUrl: 'https://picsum.photos/seed/beras/400/400',
          createdAt: serverTimestamp(),
          isDigital: false
        },
        {
          sellerId: userProfile.uid,
          sellerName: userProfile.name || 'Admin',
          sellerWhatsapp: userProfile.whatsapp || '081234567890',
          name: 'Kopi Susu Gula Aren',
          description: 'Kopi susu kekinian dengan gula aren asli.',
          price: 15000,
          stock: 30,
          category: 'Minuman',
          imageUrl: 'https://picsum.photos/seed/kopi/400/400',
          createdAt: serverTimestamp(),
          isDigital: false
        },
        {
          sellerId: userProfile.uid,
          sellerName: userProfile.name || 'Admin',
          sellerWhatsapp: userProfile.whatsapp || '081234567890',
          name: 'Keripik Singkong Pedas',
          description: 'Keripik singkong renyah dengan bumbu pedas manis.',
          price: 12000,
          stock: 200,
          category: 'Snack',
          imageUrl: 'https://picsum.photos/seed/keripik/400/400',
          createdAt: serverTimestamp(),
          isDigital: false
        },
        {
          sellerId: userProfile.uid,
          sellerName: userProfile.name || 'Admin',
          sellerWhatsapp: userProfile.whatsapp || '081234567890',
          name: 'Voucher Game 100k',
          description: 'Voucher game online nominal 100.000.',
          price: 98000,
          stock: 999,
          category: 'Digital',
          imageUrl: 'https://picsum.photos/seed/voucher/400/400',
          createdAt: serverTimestamp(),
          isDigital: true
        },
        {
          sellerId: userProfile.uid,
          sellerName: userProfile.name || 'Admin',
          sellerWhatsapp: userProfile.whatsapp || '081234567890',
          name: 'Travel Banyuwangi - Surabaya',
          description: 'Tiket travel eksekutif Banyuwangi ke Surabaya PP.',
          price: 150000,
          stock: 10,
          category: 'Travel',
          imageUrl: 'https://picsum.photos/seed/travel/400/400',
          createdAt: serverTimestamp(),
          isDigital: true
        }
      ];

      for (const product of dummyProducts) {
        await addDoc(collection(db, 'products'), product);
      }

      alert('Berhasil membuat data dummy produk!');
    } catch (error) {
      console.error("Error creating dummy data", error);
      alert('Gagal membuat data dummy.');
    }
  };

  if (!userProfile || userProfile.role !== 'admin') {
    return <div className="p-8 text-center text-red-600 font-bold">Akses ditolak. Halaman ini hanya untuk Admin.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Admin</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <button 
          onClick={handleDeleteEmptyProducts}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Trash2 className="h-4 w-4" />
          Hapus Produk "Tidak Ada"
        </button>
        <button 
          onClick={handleCreateDummyData}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Plus className="h-4 w-4" />
          Buat Data Dummy
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kurir *</label>
                  <input required type="text" value={newCourier.name} onChange={e => setNewCourier({...newCourier, name: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" placeholder="Contoh: Kurir Desa A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarif Dasar (Rp) *</label>
                  <input required type="number" min="0" value={newCourier.baseRate} onChange={e => setNewCourier({...newCourier, baseRate: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" placeholder="Contoh: 5000" />
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Tarif per Kecamatan (Banyuwangi)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-2 bg-white border border-gray-200 rounded-md">
                  {BANYUWANGI_DISTRICTS.map(district => (
                    <div key={district} className="space-y-1">
                      <label className="block text-[10px] text-gray-500 truncate">{district}</label>
                      <input 
                        type="number" 
                        placeholder="Rp" 
                        className="w-full border border-gray-300 rounded p-1 text-xs"
                        value={newCourier.rates[district] || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : 0;
                          setNewCourier({
                            ...newCourier,
                            rates: { ...newCourier.rates, [district]: val }
                          });
                        }}
                      />
                    </div>
                  ))}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarif Kecamatan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {couriers.map((courier) => (
                  <tr key={courier.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editingCourierId === courier.id ? (
                        <input 
                          type="text" 
                          value={editCourier.name} 
                          onChange={e => setEditCourier({...editCourier, name: e.target.value})} 
                          className="border border-gray-300 rounded p-1 text-sm w-full"
                        />
                      ) : courier.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingCourierId === courier.id ? (
                        <input 
                          type="number" 
                          value={editCourier.baseRate} 
                          onChange={e => setEditCourier({...editCourier, baseRate: e.target.value})} 
                          className="border border-gray-300 rounded p-1 text-sm w-full"
                        />
                      ) : `Rp ${courier.baseRate.toLocaleString('id-ID')}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {editingCourierId === courier.id ? (
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded">
                          {BANYUWANGI_DISTRICTS.map(district => (
                            <div key={district} className="flex flex-col">
                              <span className="text-[10px] text-gray-400">{district}</span>
                              <input 
                                type="number" 
                                value={editCourier.rates[district] || ''} 
                                onChange={(e) => {
                                  const val = e.target.value ? Number(e.target.value) : 0;
                                  setEditCourier({
                                    ...editCourier,
                                    rates: { ...editCourier.rates, [district]: val }
                                  });
                                }}
                                className="border border-gray-300 rounded p-1 text-[10px]"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs">
                          {courier.rates && Object.keys(courier.rates).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(courier.rates).slice(0, 3).map(([d, r]) => (
                                <span key={d} className="bg-gray-100 px-1.5 py-0.5 rounded">
                                  {d}: Rp {(r as number).toLocaleString('id-ID')}
                                </span>
                              ))}
                              {Object.keys(courier.rates).length > 3 && <span>...</span>}
                            </div>
                          ) : 'Belum ada tarif khusus'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingCourierId === courier.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleSaveEditCourier(courier.id)} className="text-emerald-600 hover:text-emerald-900 p-2 rounded-full hover:bg-emerald-50 transition">
                            <Save className="h-5 w-5" />
                          </button>
                          <button onClick={() => setEditingCourierId(null)} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50 transition">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditCourier(courier)} className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50 transition">
                            <Edit className="h-5 w-5" />
                          </button>
                          <button onClick={() => handleDeleteCourier(courier.id)} className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50 transition">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
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
