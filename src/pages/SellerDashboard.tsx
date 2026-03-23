import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Product } from '../types';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

const SellerDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile state
  const [whatsapp, setWhatsapp] = useState(userProfile?.whatsapp || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // New product state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Sayur',
    imageUrl: ''
  });

  // Edit product state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Sayur',
    imageUrl: ''
  });

  const categories = ['Sayur', 'Sembako', 'Minuman', 'Snack', 'Lainnya'];

  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(collection(db, 'products'), where('sellerId', '==', userProfile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleUpdateProfile = async () => {
    if (!userProfile?.uid) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        whatsapp,
        address
      });
      setIsEditingProfile(false);
      alert('Profil berhasil diperbarui!');
    } catch (error) {
      console.error("Error updating profile", error);
      alert('Gagal memperbarui profil.');
    }
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
        category: newProduct.category,
        imageUrl: newProduct.imageUrl || `https://picsum.photos/seed/${newProduct.name}/400/300`,
        createdAt: serverTimestamp()
      });
      
      setIsAddingProduct(false);
      setNewProduct({ name: '', description: '', price: '', category: 'Sayur', imageUrl: '' });
      alert('Produk berhasil ditambahkan!');
    } catch (error) {
      console.error("Error adding product", error);
      alert('Gagal menambahkan produk.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (error) {
        console.error("Error deleting product", error);
        alert('Gagal menghapus produk.');
      }
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProductId(product.id);
    setEditProduct({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      imageUrl: product.imageUrl || ''
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
        category: editProduct.category,
        imageUrl: editProduct.imageUrl || `https://picsum.photos/seed/${editProduct.name}/400/300`
      });
      
      setEditingProductId(null);
      alert('Produk berhasil diperbarui!');
    } catch (error) {
      console.error("Error updating product", error);
      alert('Gagal memperbarui produk.');
    }
  };

  if (!userProfile || (userProfile.role !== 'seller' && userProfile.role !== 'admin')) {
    return <div className="p-8 text-center">Akses ditolak. Halaman ini hanya untuk penjual dan admin.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Toko Saya</h1>

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
              className={`w-full border rounded-md shadow-sm p-2 ${isEditingProfile ? 'border-emerald-500 focus:ring-emerald-500 focus:border-emerald-500' : 'border-gray-300 bg-gray-50'}`} 
            />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full border border-gray-300 rounded-md p-2">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar (Opsional)</label>
                <input type="text" placeholder="https://..." value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} className="w-full border border-gray-300 rounded-md p-2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                <textarea required rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full border border-gray-300 rounded-md p-2"></textarea>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <React.Fragment key={product.id}>
                    {editingProductId === product.id ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4">
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
                                <label className="block text-xs font-medium text-gray-700 mb-1">Kategori *</label>
                                <select value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm">
                                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">URL Gambar (Opsional)</label>
                                <input type="text" value={editProduct.imageUrl} onChange={e => setEditProduct({...editProduct, imageUrl: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi *</label>
                                <textarea required rows={2} value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} className="w-full border border-gray-300 rounded p-1.5 text-sm"></textarea>
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
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Rp {product.price.toLocaleString('id-ID')}
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
    </div>
  );
};

export default SellerDashboard;
