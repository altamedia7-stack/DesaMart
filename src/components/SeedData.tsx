import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { PackagePlus } from 'lucide-react';

const SeedData: React.FC = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const sampleProducts = [
    {
      name: 'Sayur Bayam Segar',
      description: 'Bayam segar baru dipetik dari kebun pagi ini. Bebas pestisida kimia, sangat sehat untuk keluarga.',
      price: 3500,
      category: 'Sayur',
      imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Beras Premium 5kg',
      description: 'Beras pulen kualitas premium hasil panen petani lokal. Putih bersih dan wangi saat dimasak.',
      price: 75000,
      category: 'Sembako',
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Telur Ayam Kampung (10 Butir)',
      description: 'Telur ayam kampung asli, kaya omega 3. Cocok untuk jamu atau lauk bergizi anak-anak.',
      price: 25000,
      category: 'Sembako',
      imageUrl: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Kopi Bubuk Robusta Asli',
      description: 'Kopi bubuk robusta petik merah, digiling halus. Aroma kuat dan rasa mantap, cocok untuk teman begadang.',
      price: 15000,
      category: 'Minuman',
      imageUrl: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Keripik Pisang Manis',
      description: 'Keripik pisang kepok renyah dengan taburan gula asli. Camilan sehat tanpa pengawet.',
      price: 12000,
      category: 'Snack',
      imageUrl: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd08c?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Minyak Goreng 2 Liter',
      description: 'Minyak goreng kelapa sawit jernih, kemasan pouch 2 liter. Harga promo khusus minggu ini.',
      price: 34000,
      category: 'Sembako',
      imageUrl: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Tomat Merah Besar',
      description: 'Tomat segar ukuran besar, cocok untuk sambal atau jus. Harga per 1 kilogram.',
      price: 8000,
      category: 'Sayur',
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'
    },
    {
      name: 'Susu Sapi Segar 1L',
      description: 'Susu sapi perah murni yang sudah dipasteurisasi. Tahan 3 hari di kulkas.',
      price: 18000,
      category: 'Minuman',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=800'
    }
  ];

  const handleSeedData = async () => {
    if (!userProfile) {
      setMessage('Anda harus login terlebih dahulu.');
      return;
    }

    setLoading(true);
    setMessage('Menambahkan contoh produk...');

    try {
      const productsRef = collection(db, 'products');
      
      for (const product of sampleProducts) {
        await addDoc(productsRef, {
          sellerId: userProfile.uid,
          sellerName: userProfile.name,
          sellerWhatsapp: userProfile.whatsapp || '081234567890',
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          imageUrl: product.imageUrl,
          createdAt: serverTimestamp()
        });
      }
      
      setMessage('Berhasil menambahkan 8 contoh produk!');
    } catch (error) {
      console.error("Error seeding data:", error);
      setMessage('Gagal menambahkan produk. Pastikan Anda sudah login.');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Only show this button if user is admin
  if (userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-center justify-between">
      <div>
        <h3 className="font-medium text-emerald-800">Alat Admin: Data Contoh</h3>
        <p className="text-sm text-emerald-600">Tambahkan beberapa produk contoh untuk melihat tampilan website.</p>
        {message && <p className={`text-sm mt-1 font-medium ${message.includes('Gagal') ? 'text-red-600' : 'text-emerald-700'}`}>{message}</p>}
      </div>
      <button 
        onClick={handleSeedData}
        disabled={loading}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition disabled:opacity-50"
      >
        <PackagePlus className="h-4 w-4" />
        {loading ? 'Memproses...' : 'Buat Contoh Produk'}
      </button>
    </div>
  );
};

export default SeedData;
