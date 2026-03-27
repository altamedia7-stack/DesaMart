import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, doc, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TravelListing, Passenger, OrderStatus } from '../types';
import { MapPin, Calendar, Clock, Users, ChevronRight, Search, ArrowRight, User, Phone, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TravelBooking: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'search' | 'results' | 'details' | 'payment' | 'success'>('search');
  
  // Search state
  const [search, setSearch] = useState({
    origin: '',
    destination: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Results state
  const [listings, setListings] = useState<TravelListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<TravelListing | null>(null);
  
  // Booking state
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: '', idNumber: '', phone: '', seatNumber: '1' }
  ]);
  const [paymentMethod, setPaymentMethod] = useState('QRIS');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const q = query(
        collection(db, 'travel_listings'),
        where('origin', '==', search.origin),
        where('destination', '==', search.destination)
      );
      const snapshot = await getDocs(q);
      const results: TravelListing[] = [];
      snapshot.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() } as TravelListing);
      });
      setListings(results);
      setStep('results');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'travel_listings');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectListing = (listing: TravelListing) => {
    setSelectedListing(listing);
    setStep('details');
  };

  const handleAddPassenger = () => {
    if (passengers.length < (selectedListing?.availableSeats || 0)) {
      setPassengers([...passengers, { name: '', idNumber: '', phone: '', seatNumber: (passengers.length + 1).toString() }]);
    }
  };

  const handleRemovePassenger = (index: number) => {
    if (passengers.length > 1) {
      const newPassengers = [...passengers];
      newPassengers.splice(index, 1);
      setPassengers(newPassengers);
    }
  };

  const handleBooking = async () => {
    if (!userProfile || !selectedListing) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await runTransaction(db, async (transaction) => {
        const listingRef = doc(db, 'travel_listings', selectedListing.id);
        const listingDoc = await transaction.get(listingRef);
        
        if (!listingDoc.exists()) {
          throw new Error("Layanan travel tidak ditemukan.");
        }

        const currentAvailable = listingDoc.data().availableSeats;
        if (currentAvailable < passengers.length) {
          throw new Error("Maaf, kursi sudah penuh.");
        }

        // Create booking
        const bookingData = {
          buyerId: userProfile.uid,
          buyerName: userProfile.name,
          sellerId: selectedListing.sellerId,
          listingId: selectedListing.id,
          operatorName: selectedListing.operatorName,
          origin: selectedListing.origin,
          destination: selectedListing.destination,
          departureDate: search.date,
          departureTime: selectedListing.departureTime,
          passengers,
          totalPrice: selectedListing.price * passengers.length,
          status: 'pending' as OrderStatus,
          paymentMethod,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const bookingRef = doc(collection(db, 'travel_bookings'));
        transaction.set(bookingRef, bookingData);

        // Update available seats
        transaction.update(listingRef, {
          availableSeats: currentAvailable - passengers.length
        });

        // Create notification for seller
        const sellerNotifRef = doc(collection(db, 'notifications'));
        transaction.set(sellerNotifRef, {
          id: sellerNotifRef.id,
          userId: selectedListing.sellerId,
          title: 'Booking Travel Baru!',
          message: `Ada booking baru untuk ${selectedListing.operatorName} (${search.origin} - ${search.destination}) dari ${userProfile.name}.`,
          isRead: false,
          createdAt: serverTimestamp()
        });

        // Create notification for buyer
        const buyerNotifRef = doc(collection(db, 'notifications'));
        transaction.set(buyerNotifRef, {
          id: buyerNotifRef.id,
          userId: userProfile.uid,
          title: 'Booking Berhasil',
          message: `Booking tiket travel ${selectedListing.operatorName} (${search.origin} - ${search.destination}) berhasil dibuat.`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      });

      setStep('success');
    } catch (err: any) {
      setError(err.message || "Gagal melakukan pemesanan.");
      console.error(err);
      if (err.message && !err.message.includes('{')) {
        // Not a FirestoreErrorInfo JSON
      } else {
        handleFirestoreError(err, OperationType.WRITE, 'travel_bookings');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-emerald-600 text-white pt-8 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Bus & Travel</h1>
          <p className="text-emerald-100 text-sm">Pesan tiket travel antar kota dengan mudah dan aman.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {step === 'search' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 ml-1">Kota Asal</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <MapPin className="h-5 w-5 text-emerald-500 mr-3" />
                    <input 
                      required 
                      type="text" 
                      placeholder="Contoh: Banyuwangi" 
                      value={search.origin}
                      onChange={e => setSearch({...search, origin: e.target.value})}
                      className="bg-transparent w-full outline-none text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 ml-1">Kota Tujuan</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <MapPin className="h-5 w-5 text-emerald-500 mr-3" />
                    <input 
                      required 
                      type="text" 
                      placeholder="Contoh: Surabaya" 
                      value={search.destination}
                      onChange={e => setSearch({...search, destination: e.target.value})}
                      className="bg-transparent w-full outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="relative">
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5 ml-1">Tanggal Perjalanan</label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <Calendar className="h-5 w-5 text-emerald-500 mr-3" />
                  <input 
                    required 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    value={search.date}
                    onChange={e => setSearch({...search, date: e.target.value})}
                    className="bg-transparent w-full outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Search className="h-5 w-5" />}
                Cari Jadwal Travel
              </button>
            </form>

            <div className="mt-8">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Rute Populer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Banyuwangi ⇄ Surabaya', 'Banyuwangi ⇄ Malang', 'Banyuwangi ⇄ Bali', 'Banyuwangi ⇄ Jember'].map(route => (
                  <div 
                    key={route} 
                    onClick={() => {
                      const [o, d] = route.split(' ⇄ ');
                      setSearch({...search, origin: o, destination: d});
                    }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:border-emerald-300 transition-colors"
                  >
                    <span className="text-xs font-bold text-gray-700">{route}</span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{search.origin} → {search.destination}</h3>
                <p className="text-xs text-gray-500">{search.date}</p>
              </div>
              <button onClick={() => setStep('search')} className="text-emerald-600 text-xs font-bold">Ubah</button>
            </div>

            {listings.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl text-center border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Jadwal tidak ditemukan</h3>
                <p className="text-sm text-gray-500">Maaf, belum ada jadwal travel untuk rute dan tanggal tersebut.</p>
                <button onClick={() => setStep('search')} className="mt-6 text-emerald-600 font-bold text-sm">Cari Rute Lain</button>
              </div>
            ) : (
              listings.map(listing => (
                <div 
                  key={listing.id} 
                  onClick={() => handleSelectListing(listing)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <Users className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{listing.operatorName}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                          <Clock className="h-3 w-3" /> {listing.departureTime} WIB
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-600">Rp {listing.price.toLocaleString('id-ID')}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">per kursi</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Asal</div>
                        <div className="text-xs font-bold text-gray-700">{listing.origin}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300" />
                      <div className="text-center">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Tujuan</div>
                        <div className="text-xs font-bold text-gray-700">{listing.destination}</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Pilih <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {step === 'details' && selectedListing && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" /> Data Penumpang
              </h3>
              
              <div className="space-y-6">
                {passengers.map((passenger, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Penumpang {index + 1}</h4>
                      {passengers.length > 1 && (
                        <button onClick={() => handleRemovePassenger(index)} className="text-red-500 text-[10px] font-bold uppercase">Hapus</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nama Lengkap</label>
                        <input 
                          required 
                          type="text" 
                          value={passenger.name}
                          onChange={e => {
                            const newP = [...passengers];
                            newP[index].name = e.target.value;
                            setPassengers(newP);
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Sesuai KTP"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">No. HP / WhatsApp</label>
                        <input 
                          required 
                          type="tel" 
                          value={passenger.phone}
                          onChange={e => {
                            const newP = [...passengers];
                            newP[index].phone = e.target.value;
                            setPassengers(newP);
                          }}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="0812..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button 
                  onClick={handleAddPassenger}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-emerald-300 hover:text-emerald-600 transition-all"
                >
                  + Tambah Penumpang Lain
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" /> Metode Pembayaran
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['QRIS', 'Bayar di Tempat (COD)'].map(method => (
                  <div 
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === method ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-emerald-200'}`}
                  >
                    <span className={`text-sm font-bold ${paymentMethod === method ? 'text-emerald-700' : 'text-gray-600'}`}>{method}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">Total ({passengers.length} Kursi)</div>
                <div className="text-xl font-bold text-emerald-600">Rp {(selectedListing.price * passengers.length).toLocaleString('id-ID')}</div>
              </div>
              <button 
                onClick={handleBooking}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
              >
                Bayar Sekarang
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-gray-100">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Berhasil!</h2>
            <p className="text-gray-500 mb-8">Tiket Anda sedang diproses. Silakan cek menu "Pesanan Saya" untuk melihat detail tiket dan status pembayaran.</p>
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/orders')}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg"
              >
                Lihat Pesanan Saya
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-gray-50 text-gray-600 font-bold py-4 rounded-xl"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TravelBooking;
