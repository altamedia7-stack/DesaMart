import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Courier, UserProfile } from '../types';
import { Truck, Trash2, Plus, Users, X } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'couriers' | 'users'>('couriers');

  // New courier state
  const [isAddingCourier, setIsAddingCourier] = useState(false);
  const [newCourier, setNewCourier] = useState({
    name: '',
    baseRate: '',
    perKmRate: ''
  });

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
      setLoading(false);
    });

    return () => {
      unsubCouriers();
      unsubUsers();
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
      alert('Peran pengguna berhasil diperbarui!');
    } catch (error) {
      console.error("Error updating user role", error);
      alert('Gagal memperbarui peran pengguna.');
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

      <div className="mb-6">
        <button 
          onClick={handleDeleteEmptyProducts}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Trash2 className="h-4 w-4" />
          Hapus Produk "Tidak Ada"
        </button>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('couriers')}
          className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'couriers' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> Manajemen Kurir & Ongkir</div>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'users' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Manajemen Pengguna</div>
        </button>
      </div>

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
                      <button onClick={() => handleDeleteCourier(courier.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-5 w-5 inline" />
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
