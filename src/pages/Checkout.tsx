import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, MapPin, ChevronRight, CheckCircle2, Circle, Map, Store, Home, LocateFixed } from 'lucide-react';
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

const SELLER_LOCATION = { lat: -8.2192, lng: 114.3692 }; // Mock seller location (Banyuwangi)

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

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

const Checkout: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { cartItems, removeFromCart } = useCart();
  const { currentUser, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [sellerLocation, setSellerLocation] = useState<{lat: number, lng: number}>(SELLER_LOCATION);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!sellerId) return;
      try {
        const docRef = doc(db, 'users', sellerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.location) {
            setSellerLocation(data.location);
          }
        }
      } catch (error) {
        console.error("Error fetching seller location:", error);
      }
    };
    fetchSeller();
  }, [sellerId]);

  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedVillage, setSelectedVillage] = useState<string>('');

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setSelectedLocation({ lat, lng });

        // Calculate distance in km
        const distanceKm = calculateDistance(sellerLocation.lat, sellerLocation.lng, lat, lng);
        
        // Mock calculation: Rp 2000 per km
        setShippingCost(Math.max(5000, Math.round(distanceKm * 2000))); // Minimum Rp 5000
        setIsLocating(false);
        
        // Reset dropdowns
        setSelectedCity('');
        setSelectedVillage('');
      },
      (error) => {
        console.error("Error getting location:", error);
        alert('Gagal mendapatkan lokasi. Pastikan Anda memberikan izin akses lokasi pada browser Anda.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Mock data for cities and villages
  const locations = {
    'Banyuwangi': {
      lat: -8.2192, lng: 114.3692,
      villages: {
        'Kecamatan Banyuwangi': { lat: -8.2192, lng: 114.3692, distance: 2 },
        'Kecamatan Genteng': { lat: -8.3672, lng: 114.1525, distance: 35 },
        'Kecamatan Rogojampi': { lat: -8.3039, lng: 114.2953, distance: 15 },
        'Kecamatan Muncar': { lat: -8.4411, lng: 114.3314, distance: 40 },
        'Kecamatan Glagah': { lat: -8.2111, lng: 114.3167, distance: 8 },
        'Kecamatan Kalipuro': { lat: -8.1333, lng: 114.3667, distance: 12 },
        'Kecamatan Songgon': { lat: -8.2450, lng: 114.1858, distance: 25 },
        'Kecamatan Kabat': { lat: -8.2833, lng: 114.3167, distance: 10 },
        'Kecamatan Bangorejo': { lat: -8.4981, lng: 114.1672, distance: 45 },
        'Kecamatan Pesanggaran': { lat: -8.5833, lng: 114.0000, distance: 60 }
      }
    }
  };

  // Filter items by seller
  const sellerItems = cartItems.filter(item => item.product.sellerId === sellerId);
  const sellerName = sellerItems.length > 0 ? sellerItems[0].product.sellerName : '';
  const sellerWhatsapp = sellerItems.length > 0 ? sellerItems[0].product.sellerWhatsapp : '';

  // Calculate totals
  const subtotalPesanan = sellerItems.reduce((total, item) => {
    const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
    const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
    const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
    return total + (price * item.quantity);
  }, 0);

  const totalPembayaran = subtotalPesanan + (shippingCost || 0);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else if (sellerItems.length === 0) {
      navigate('/cart');
    }
  }, [currentUser, sellerItems, navigate]);

  const handlePlaceOrder = async () => {
    if (!currentUser || !sellerId) return;
    setIsSubmitting(true);

    try {
      const path = 'orders';
      await addDoc(collection(db, path), {
        buyerId: currentUser.uid,
        buyerName: userProfile?.name || currentUser.email,
        sellerId: sellerId,
        sellerName: sellerName,
        items: sellerItems,
        totalPrice: totalPembayaran,
        status: 'pending',
        paymentMethod: 'COD',
        shippingMethod: 'Reguler',
        shippingCost: shippingCost || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // WhatsApp logic
      let phone = sellerWhatsapp;
      if (phone.startsWith('0')) {
        phone = '62' + phone.substring(1);
      }

      let message = `Halo ${sellerName}, saya ingin memesan produk berikut dari DesaMart:\n\n`;
      
      sellerItems.forEach((item, index) => {
        const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
        const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
        const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
        const itemTotal = price * item.quantity;
        message += `${index + 1}. ${item.product.name}${item.selectedVariant ? ` (${item.selectedVariant.name})` : ''}\n`;
        message += `   Jumlah: ${item.quantity}\n`;
        message += `   Harga: Rp ${itemTotal.toLocaleString('id-ID')}\n\n`;
      });

      message += `*Subtotal Pesanan: Rp ${subtotalPesanan.toLocaleString('id-ID')}*\n`;
      if (shippingCost !== null) {
        message += `*Ongkos Kirim: Rp ${shippingCost.toLocaleString('id-ID')}*\n`;
      }
      message += `*Total Pembayaran: Rp ${totalPembayaran.toLocaleString('id-ID')}*\n\n`;
      message += `Metode Pembayaran: COD (Bayar di Tempat)\n`;
      message += `Mohon segera diproses. Terima kasih!`;

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      
      // Remove items from cart
      sellerItems.forEach(item => removeFromCart(item.product.id, item.selectedVariant?.id));
      
      navigate('/orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
      alert("Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sellerItems.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-10">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center p-4">
          <button onClick={() => navigate(-1)} className="mr-4 text-emerald-600">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-0 md:px-4 py-0 md:py-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          
          {/* Left Column */}
          <div className="flex-grow space-y-2 md:space-y-4">
            
            {/* Alamat Pengiriman */}
            <div className="bg-white md:rounded-lg shadow-sm p-4 flex items-start gap-3">
              <MapPin className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="flex-grow">
                <div className="text-sm text-gray-900">
                  <span className="font-bold">{userProfile?.name || 'Nama Pembeli'}</span> | {userProfile?.phone || '081234567890'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {userProfile?.address || 'Alamat belum diatur. Silakan atur alamat pengiriman Anda.'}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </div>

            {/* Produk */}
            <div className="bg-white md:rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <span className="font-bold text-gray-900">{sellerName}</span>
              </div>
              {sellerItems.map((item, index) => {
                const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
                const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
                const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;

                return (
                  <div key={index} className="p-4 flex gap-3 border-b border-gray-100 bg-[#fafafa]">
                    <img 
                      src={item.product.imageUrl || 'https://picsum.photos/seed/product/100/100'} 
                      alt={item.product.name}
                      className="w-20 h-20 object-cover border border-gray-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-grow flex flex-col justify-between">
                      <div>
                        <div className="text-sm text-gray-900 line-clamp-2">{item.product.name}</div>
                        {item.selectedVariant && (
                          <div className="text-xs text-gray-500 mt-1">Variasi: {item.selectedVariant.name}</div>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-sm font-medium text-gray-900">Rp{price.toLocaleString('id-ID')}</div>
                        <div className="text-sm text-gray-600">x{item.quantity}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pesan */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Pesan untuk Penjual</span>
                <div className="flex items-center">
                  <input 
                    type="text" 
                    placeholder="Tinggalkan pesan" 
                    className="text-sm text-gray-900 outline-none placeholder-gray-400 text-right w-32 sm:w-48 bg-transparent"
                  />
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-1" />
                </div>
              </div>

              {/* Opsi Pengiriman */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-900">Opsi Pengiriman</span>
                  <div className="flex items-center text-sm text-gray-500">
                    Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
                <div className="bg-[#f6fbf9] border border-[#a5d6c1] rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Reguler</div>
                      <div className="text-xs text-[#00bfa5] mt-1 flex items-center gap-1">
                        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current"><path d="M11.5 2h-7a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5Zm-7-1h7A1.5 1.5 0 0 1 13 2.5v8A1.5 1.5 0 0 1 11.5 12h-7A1.5 1.5 0 0 1 3 10.5v-8A1.5 1.5 0 0 1 4.5 1Zm5.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"></path></svg>
                        Garansi tiba 28 - 31 Mar
                      </div>
                    </div>
                    <div className="text-sm flex items-center">
                      <span className="font-bold text-gray-900">Rp0</span>
                      <CheckCircle2 className="h-4 w-4 text-[#00bfa5] ml-2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Produk */}
              <div className="p-4 flex justify-between items-center">
                <span className="text-sm text-gray-900">Total {sellerItems.reduce((acc, item) => acc + item.quantity, 0)} Produk</span>
                <span className="text-sm font-medium text-emerald-600">Rp{subtotalPesanan.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="bg-white md:rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Metode Pembayaran</span>
                <div className="flex items-center text-sm text-gray-500">
                  Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1 border border-orange-200 rounded">COD</span>
                    <span className="text-sm text-gray-900">Bayar di Tempat</span>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-[#ee4d2d]" />
                </div>
              </div>
            </div>

            {/* Simulasi Maps */}
            <div className="bg-white md:rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Map className="h-5 w-5 text-orange-500" /> Pilih Lokasi Pengiriman
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Pilih Kota dan Desa/Kelurahan Anda untuk menghitung ongkos kirim.
              </p>

              <div className="space-y-4 mb-4">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 border border-blue-200 py-2.5 px-4 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <LocateFixed className="h-4 w-4" />
                  {isLocating ? 'Mencari lokasi...' : 'Gunakan Lokasi Saat Ini'}
                </button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">atau pilih manual</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kota/Kabupaten</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-orange-500 focus:border-orange-500"
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      setSelectedVillage('');
                      setShippingCost(null);
                      if (e.target.value) {
                        const city = locations[e.target.value as keyof typeof locations];
                        setSelectedLocation({ lat: city.lat, lng: city.lng });
                      } else {
                        setSelectedLocation(null);
                      }
                    }}
                  >
                    <option value="">Pilih Kota/Kabupaten</option>
                    {Object.keys(locations).map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {selectedCity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desa/Kelurahan</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-orange-500 focus:border-orange-500"
                      value={selectedVillage}
                      onChange={(e) => {
                        const village = e.target.value;
                        setSelectedVillage(village);
                        
                        if (village && selectedCity) {
                          const cityData = locations[selectedCity as keyof typeof locations];
                          const villageData = cityData.villages[village as keyof typeof cityData.villages];
                          
                          setSelectedLocation({ lat: villageData.lat, lng: villageData.lng });
                          
                          // Set shipping cost based on predefined distance (Rp 2000 per km)
                          setShippingCost(Math.max(5000, villageData.distance * 2000));
                        } else {
                          setShippingCost(null);
                        }
                      }}
                    >
                      <option value="">Pilih Desa/Kelurahan</option>
                      {Object.keys(locations[selectedCity as keyof typeof locations].villages).map(village => (
                        <option key={village} value={village}>{village}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="h-[300px] w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
                <MapContainer 
                  center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [sellerLocation.lat, sellerLocation.lng]} 
                  zoom={selectedLocation ? 13 : 11} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <MapUpdater 
                    center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [sellerLocation.lat, sellerLocation.lng]} 
                    zoom={selectedLocation ? 13 : 11} 
                  />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  <LocationSelector onLocationSelect={(lat, lng) => {
                    setSelectedLocation({ lat, lng });
                    const distanceKm = calculateDistance(sellerLocation.lat, sellerLocation.lng, lat, lng);
                    setShippingCost(Math.max(5000, Math.round(distanceKm * 2000)));
                    setSelectedCity('');
                    setSelectedVillage('');
                  }} />
                  
                  {/* Seller Marker */}
                  <Marker position={[sellerLocation.lat, sellerLocation.lng]}>
                    <Popup>Lokasi Penjual</Popup>
                  </Marker>
                  
                  {/* Buyer Marker */}
                  {selectedLocation && (
                    <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
                      <Popup>Lokasi Anda</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Anda juga bisa menggeser peta dan klik untuk menentukan lokasi pengiriman secara manual.
              </p>
            </div>

          </div>

          {/* Right Column (Desktop) / Bottom (Mobile) */}
          <div className="w-full md:w-80 lg:w-96 flex-shrink-0 space-y-4">
            
            {/* Rincian Ongkos Kirim */}
            <div className="bg-white md:rounded-lg shadow-sm p-4">
              <h3 className="text-md font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Rincian Ongkos Kirim</h3>
              {shippingCost === null ? (
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-500 text-center">
                  Silakan pilih lokasi di peta untuk mengecek ongkir.
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ongkos Kirim</span>
                  <span className="font-medium text-gray-900">Rp{shippingCost.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            {/* Total Pembayaran */}
            <div className="bg-white md:rounded-lg shadow-sm p-4 mb-24 md:mb-0">
              <h3 className="text-md font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Total Pembayaran</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Total Barang</span>
                  <span>Rp{subtotalPesanan.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Ongkos Kirim</span>
                  <span>{shippingCost === null ? '-' : `Rp${shippingCost.toLocaleString('id-ID')}`}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-2 mt-2 border-t border-gray-100 text-lg">
                  <span>Total</span>
                  <span className="text-[#ee4d2d]">Rp{totalPembayaran.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
        <div className="max-w-6xl mx-auto flex items-stretch justify-end">
          <div className="flex flex-col items-end justify-center pr-6 py-2">
            <span className="text-sm text-gray-900">Total Pembayaran</span>
            <span className="text-2xl font-bold text-[#ee4d2d]">Rp{totalPembayaran.toLocaleString('id-ID')}</span>
          </div>
          <button 
            onClick={handlePlaceOrder}
            disabled={isSubmitting || shippingCost === null}
            className="bg-[#ee4d2d] text-white px-10 md:px-14 font-medium text-lg disabled:opacity-70 disabled:bg-gray-400 flex items-center justify-center"
          >
            {isSubmitting ? 'Memproses...' : 'Buat Pesanan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
