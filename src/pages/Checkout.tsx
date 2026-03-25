import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { ArrowLeft, MapPin, ChevronRight, CheckCircle2, Circle, Store, Home, Truck } from 'lucide-react';

const Checkout: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { cartItems, removeFromCart } = useCart();
  const { currentUser, userProfile, loading } = useAuth();
  
  // Locations Data (Comprehensive Banyuwangi Districts)
  const locations = {
    'Banyuwangi': {
      districts: {
        'Bangorejo': ['Bangorejo', 'Kebondalem', 'Ringintelu', 'Sambimulyo', 'Sambirejo', 'Sukorejo', 'Temurejo'],
        'Banyuwangi': ['Kepanjen', 'Lateng', 'Penganjuran', 'Singonegaran', 'Singotrunan', 'Temenggungan', 'Taman Baru', 'Tukangkayu'],
        'Blimbingsari': ['Blimbingsari', 'Bomo', 'Gintangan', 'Kalatiri', 'Karangrejo', 'Patoman', 'Watukebo'],
        'Cluring': ['Benculuk', 'Cluring', 'Kaliploso', 'Plampangrejo', 'Sarimulyo', 'Sembulung', 'Tamanagung'],
        'Gambiran': ['Gambiran', 'Jajag', 'Purwodadi', 'Wringinagung', 'Wringinpitu'],
        'Genteng': ['Genteng Kulon', 'Genteng Wetan', 'Kaligondo', 'Kembiritan', 'Setail'],
        'Giri': ['Giri', 'Grogol', 'Jambesari', 'Mojopanggung', 'Penataban', 'Boyolangu'],
        'Glagah': ['Bakungan', 'Glagah', 'Kampung Anyar', 'Kemiren', 'Olehsari', 'Paspan', 'Rejosari', 'Tamansuruh'],
        'Glenmore': ['Bomorejo', 'Karangharjo', 'Margomulyo', 'Sepanjang', 'Sumbergondo', 'Tegalharjo', 'Tulungrejo'],
        'Kabat': ['Bunder', 'Gombolirang', 'Kabat', 'Kalirejo', 'Kedayunan', 'Labanasem', 'Macan Putih', 'Pendarungan', 'Tambong'],
        'Kalibaru': ['Banyuanyar', 'Kalibaru Kulon', 'Kalibaru Manis', 'Kalibaru Wetan', 'Kajarharjo', 'Kebunrejo'],
        'Kalipuro': ['Bulusan', 'Kalipuro', 'Klatak', 'Ketapang', 'Pesucen', 'Gombengsari'],
        'Licin': ['Banjar', 'Gumitir', 'Licin', 'Paksiring', 'Segobang', 'Tamansari'],
        'Muncar': ['Blambangan', 'Kedungrejo', 'Kedungringin', 'Kumendung', 'Sumber Beras', 'Tembokrejo', 'Wringinputih'],
        'Pesanggaran': ['Kandangan', 'Pesanggaran', 'Sarongan', 'Sumberagung', 'Sumbermulyo'],
        'Purwoharjo': ['Bulurejo', 'Glagahagung', 'Gra jagan', 'Kradenan', 'Purwoharjo', 'Sidorejo', 'Sumberasri'],
        'Rogojampi': ['Aliyan', 'Bubuk', 'Gitik', 'Karangbendo', 'Kedaleman', 'Lemahbangdewo', 'Mangir', 'Pengatigan', 'Rogojampi'],
        'Sempu': ['Gendoh', 'Jambewangi', 'Karangsari', 'Sempu', 'Stail', 'Tegalarum', 'Temuguruh'],
        'Siliragung': ['Barurejo', 'Bulurejo', 'Kesilir', 'Seneporejo', 'Siliragung'],
        'Singojuruh': ['Alasmalang', 'Benelan Kidul', 'Cantuk', 'Gambor', 'Gumirih', 'Kemiri', 'Lemahbang Kulon', 'Singojuruh'],
        'Songgon': ['Balak', 'Bayu', 'Bedewang', 'Parangharjo', 'Songgon', 'Sragi', 'Sumberarum', 'Sumberbulu'],
        'Srono': ['Bagorejo', 'Kebaman', 'Kepundungan', 'Parijatah Kulon', 'Parijatah Wetan', 'Sukomaju', 'Sukonatar', 'Sumbersari', 'Wonorejo'],
        'Tegaldlimo': ['Kalipait', 'Kedungasri', 'Kedunggebang', 'Kedungwungu', 'Purwoagung', 'Purwoasri', 'Tegaldlimo', 'Wringinpitu'],
        'Tegalsari': ['Dasri', 'Karangdoro', 'Karangmulyo', 'Tamanasri', 'Tegalsari'],
        'Wongsorejo': ['Alasbulu', 'Alasrejo', 'Bajulmati', 'Bengkak', 'Sidodadi', 'Sidowangi', 'Watukebo', 'Wongsorejo']
      }
    }
  };

  const [selectedCity, setSelectedCity] = useState<string>('Banyuwangi');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedVillage, setSelectedVillage] = useState<string>('');
  
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('COD');
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      setIsLoadingChannels(true);
      setPaymentError(null);
      try {
        const response = await fetch('/api/tripay/payment-channels');
        if (!response.ok) throw new Error("Gagal memuat metode pembayaran");
        const data = await response.json();
        if (data && data.success) setPaymentChannels(data.data);
      } catch (error) {
        setPaymentError("Gagal memuat metode pembayaran");
      } finally {
        setIsLoadingChannels(false);
      }
    };

    const fetchCouriers = async () => {
      try {
        const q = query(collection(db, 'couriers'));
        const snapshot = await getDocs(q);
        const data: any[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setCouriers(data);
      } catch (error) {
        console.error("Error fetching couriers", error);
      }
    };

    fetchChannels();
    fetchCouriers();
  }, []);

  // Update shipping cost when district or courier changes
  useEffect(() => {
    if (selectedDistrict && selectedCourier) {
      const rate = (selectedCourier.rates && selectedCourier.rates[selectedDistrict]) || selectedCourier.baseRate || 0;
      setShippingCost(rate);
    } else {
      setShippingCost(null);
    }
  }, [selectedDistrict, selectedCourier]);

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
    if (!loading && !currentUser) navigate('/login');
  }, [loading, currentUser, navigate]);

  if (loading || (cartItems.length > 0 && sellerItems.length === 0)) {
    return <div className="p-8 text-center">Memuat data...</div>;
  }

  if (sellerItems.length === 0 && !isSubmitting && !isSuccess) {
    navigate('/cart');
    return null;
  }

  const handlePlaceOrder = async () => {
    if (!currentUser || !sellerId) return;
    if (!selectedDistrict || !selectedVillage) {
      alert("Silakan pilih Kecamatan dan Desa terlebih dahulu.");
      return;
    }
    if (!selectedCourier) {
      alert("Silakan pilih kurir terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);

    try {
      const merchant_ref = `ORDER-${Date.now()}`;
      
      if (selectedPaymentMethod === 'COD') {
        const path = 'orders';
        await addDoc(collection(db, path), {
          buyerId: currentUser.uid,
          buyerName: userProfile?.name || currentUser.email || 'Unknown',
          sellerId: sellerId,
          sellerName: sellerName || 'Unknown',
          items: JSON.parse(JSON.stringify(sellerItems)),
          totalPrice: totalPembayaran,
          status: 'pending',
          paymentMethod: 'COD',
          shippingMethod: selectedCourier?.name || 'Unknown',
          shippingCost: shippingCost || 0,
          shippingAddress: {
            city: selectedCity || '',
            district: selectedDistrict || '',
            village: selectedVillage || ''
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          merchant_ref
        });
        
        sellerItems.forEach(item => removeFromCart(item.product.id, item.selectedVariant?.id));

        let phone = sellerWhatsapp;
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);

        let message = `Halo ${sellerName}, saya ingin memesan produk berikut:\n\n`;
        sellerItems.forEach((item, index) => {
          const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
          const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
          const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
          message += `${index + 1}. ${item.product.name} x${item.quantity} - Rp ${(price * item.quantity).toLocaleString('id-ID')}\n`;
        });

        message += `\n*Subtotal: Rp ${subtotalPesanan.toLocaleString('id-ID')}*\n`;
        message += `*Ongkir: Rp ${shippingCost?.toLocaleString('id-ID')}*\n`;
        message += `*Total: Rp ${totalPembayaran.toLocaleString('id-ID')}*\n\n`;
        message += `Metode: COD\n`;
        message += `Alamat: ${selectedVillage}, Kec. ${selectedDistrict}, ${selectedCity}`;
        
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        navigate('/orders');
      } else {
        // TriPay logic
        const orderItems = sellerItems.map(item => {
          const basePrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
          const discount = item.selectedVariant ? (item.selectedVariant.discountPercentage || 0) : (item.product.discountPercentage || 0);
          const price = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
          return {
            sku: item.product.id,
            name: item.product.name,
            price: Math.round(price),
            quantity: item.quantity
          };
        });

        orderItems.push({
          sku: 'SHIPPING',
          name: 'Ongkos Kirim',
          price: Math.round(shippingCost || 0),
          quantity: 1
        });

        const calculatedAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

        const response = await fetch('/api/tripay/create-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: selectedPaymentMethod,
            merchant_ref,
            amount: calculatedAmount,
            customer_name: userProfile?.name || 'Customer',
            customer_email: currentUser.email || 'customer@example.com',
            customer_phone: userProfile?.whatsapp || '',
            order_items: orderItems
          })
        });

        const data = await response.json();
        if (data.success) {
          const orderData = {
            buyerId: currentUser.uid,
            buyerName: userProfile?.name || currentUser.email || 'Unknown',
            sellerId: sellerId,
            sellerName: sellerName || 'Unknown',
            items: JSON.parse(JSON.stringify(sellerItems)),
            totalPrice: calculatedAmount,
            status: 'unpaid',
            paymentMethod: selectedPaymentMethod,
            payment_name: data.data.payment_name || null,
            pay_code: data.data.pay_code || null,
            qr_url: data.data.qr_url || null,
            instructions: data.data.instructions || null,
            expired_time: data.data.expired_time || null,
            shippingMethod: selectedCourier?.name || 'Unknown',
            shippingCost: shippingCost || 0,
            tripay_reference: data.data.reference || null,
            checkout_url: data.data.checkout_url || null,
            shippingAddress: {
              city: selectedCity || '',
              district: selectedDistrict || '',
              village: selectedVillage || ''
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            merchant_ref
          };

          await addDoc(collection(db, 'orders'), orderData);
          setIsSuccess(true);
          navigate(`/payment/${merchant_ref}`);
          sellerItems.forEach(item => removeFromCart(item.product.id, item.selectedVariant?.id));
        } else {
          alert(`Gagal membuat transaksi: ${data.message}`);
        }
      }
    } catch (error: any) {
      alert(`Terjadi kesalahan: ${error.message || String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="bg-white md:rounded-lg shadow-sm p-4">
              <div className="flex items-start gap-3 mb-4">
                <MapPin className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-grow">
                  <div className="text-sm text-gray-900">
                    <span className="font-bold">{userProfile?.name || 'Nama Pembeli'}</span> | {userProfile?.whatsapp || 'No. WhatsApp'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {userProfile?.address || 'Alamat lengkap belum diatur.'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Kota</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm bg-gray-50"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                  >
                    <option value="Banyuwangi">Banyuwangi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Kecamatan</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-emerald-500"
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      setSelectedVillage('');
                    }}
                  >
                    <option value="">Pilih Kecamatan</option>
                    {Object.keys(locations.Banyuwangi.districts).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Desa/Kelurahan</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-emerald-500"
                    value={selectedVillage}
                    onChange={(e) => setSelectedVillage(e.target.value)}
                    disabled={!selectedDistrict}
                  >
                    <option value="">Pilih Desa</option>
                    {selectedDistrict && locations.Banyuwangi.districts[selectedDistrict as keyof typeof locations.Banyuwangi.districts].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Produk */}
            <div className="bg-white md:rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-600" />
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
                      className="w-16 h-16 object-cover rounded border border-gray-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-grow">
                      <div className="text-sm text-gray-900 line-clamp-1 font-medium">{item.product.name}</div>
                      {item.selectedVariant && (
                        <div className="text-xs text-gray-500">Variasi: {item.selectedVariant.name}</div>
                      )}
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-sm font-bold text-emerald-600">Rp{price.toLocaleString('id-ID')}</div>
                        <div className="text-sm text-gray-500">x{item.quantity}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Opsi Pengiriman */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-bold text-gray-900">Pilih Kurir</span>
                </div>
                <div className="space-y-2">
                  {couriers.map(courier => (
                    <div 
                      key={courier.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedCourier?.id === courier.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}
                      onClick={() => setSelectedCourier(courier)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{courier.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {selectedDistrict ? (
                              courier.rates && courier.rates[selectedDistrict] 
                                ? `Tarif ke ${selectedDistrict}: Rp ${courier.rates[selectedDistrict].toLocaleString('id-ID')}`
                                : `Tarif Dasar: Rp ${courier.baseRate.toLocaleString('id-ID')}`
                            ) : 'Pilih kecamatan untuk lihat tarif'}
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedCourier?.id === courier.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                          {selectedCourier?.id === courier.id && <div className="h-2 w-2 bg-white rounded-full" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="bg-white md:rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Metode Pembayaran</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  className={`flex justify-between items-center cursor-pointer p-3 rounded-lg border transition-all ${selectedPaymentMethod === 'COD' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}
                  onClick={() => setSelectedPaymentMethod('COD')}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-5 w-5 ${selectedPaymentMethod === 'COD' ? 'text-emerald-600' : 'text-gray-300'}`} />
                    <span className="text-sm font-medium text-gray-900">COD (Bayar di Tempat)</span>
                  </div>
                </div>

                {isLoadingChannels ? (
                  <div className="col-span-full text-center text-sm text-gray-500 py-2">Memuat metode pembayaran...</div>
                ) : (
                  paymentChannels.map(channel => (
                    <div 
                      key={channel.code}
                      className={`flex justify-between items-center cursor-pointer p-3 rounded-lg border transition-all ${selectedPaymentMethod === channel.code ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'} ${!channel.active ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                      onClick={() => channel.active && setSelectedPaymentMethod(channel.code)}
                    >
                      <div className="flex items-center gap-2">
                        <img src={channel.icon_url} alt={channel.name} className="h-5 w-auto" referrerPolicy="no-referrer" />
                        <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                      </div>
                      {selectedPaymentMethod === channel.code && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
            <div className="bg-white md:rounded-lg shadow-sm p-4 sticky top-24">
              <h3 className="text-md font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Ringkasan Pembayaran</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal Produk</span>
                  <span>Rp{subtotalPesanan.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Ongkos Kirim</span>
                  <span>{shippingCost === null ? '-' : `Rp${shippingCost.toLocaleString('id-ID')}`}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-3 mt-3 border-t border-gray-100 text-lg">
                  <span>Total Tagihan</span>
                  <span className="text-emerald-600">Rp{totalPembayaran.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button 
                onClick={handlePlaceOrder}
                disabled={isSubmitting || shippingCost === null}
                className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Memproses...' : 'Buat Pesanan'}
              </button>
              
              {shippingCost === null && (
                <p className="text-[10px] text-center text-red-500 mt-2 italic">
                  * Pilih Kecamatan & Kurir untuk menghitung ongkir
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
