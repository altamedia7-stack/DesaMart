import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Courier } from '../types';
import { BANYUWANGI_DISTRICTS } from '../constants';
import { Truck, Save, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const CourierDashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [courier, setCourier] = useState<Courier | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [rates, setRates] = useState<{ [district: string]: number }>({});

  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(collection(db, 'couriers'), where('userId', '==', userProfile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const courierData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Courier;
        setCourier(courierData);
        setName(courierData.name);
        setBaseRate(courierData.baseRate.toString());
        setRates(courierData.rates || {});
      } else {
        setCourier(null);
        setName(userProfile.name || '');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'couriers');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const data = {
        name,
        baseRate: Number(baseRate),
        rates,
        userId: userProfile.uid,
        updatedAt: serverTimestamp()
      };

      if (courier) {
        await updateDoc(doc(db, 'couriers', courier.id), data);
      } else {
        await addDoc(collection(db, 'couriers'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }

      setMessage({ type: 'success', text: 'Data kurir dan tarif berhasil disimpan!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'couriers');
      setMessage({ type: 'error', text: 'Gagal menyimpan data kurir.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRateChange = (district: string, value: string) => {
    setRates(prev => ({
      ...prev,
      [district]: Number(value)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-emerald-600 px-6 py-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Dashboard Kurir</h1>
          </div>
          <p className="text-emerald-100">Kelola tarif pengiriman Anda berdasarkan kecamatan di Banyuwangi.</p>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-8">
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Layanan Kurir</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kurir Desa Mandiri"
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarif Dasar (Rp)</label>
              <input
                type="number"
                required
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                placeholder="Tarif jika kecamatan tidak terdaftar"
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              Tarif Per Kecamatan (Banyuwangi)
            </h2>
            <p className="text-sm text-gray-500 mb-6 italic">
              * Tentukan tarif khusus untuk setiap kecamatan. Jika dikosongkan, tarif dasar akan digunakan.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {BANYUWANGI_DISTRICTS.map((district) => (
                <div key={district} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">{district}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                    <input
                      type="number"
                      value={rates[district] || ''}
                      onChange={(e) => handleRateChange(district, e.target.value)}
                      placeholder="Tarif"
                      className="w-full border border-gray-300 rounded-md py-1.5 pl-9 pr-3 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Kurir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourierDashboard;
