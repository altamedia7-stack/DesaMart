import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { ArrowLeft, Clock, Copy, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, QrCode, CreditCard, Wallet } from 'lucide-react';

const PaymentDetail = () => {
  const { merchantRef } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!merchantRef) {
      console.log("No merchantRef in params");
      setLoading(false);
      return;
    }

    console.log("Listening to order updates for merchantRef:", merchantRef);
    const ordersRef = collection(db, 'orders');
    const travelRef = collection(db, 'travel_bookings');
    
    const qOrders = query(ordersRef, where('merchant_ref', '==', merchantRef), limit(1));
    const qTravel = query(travelRef, where('merchant_ref', '==', merchantRef), limit(1));

    let unsubscribeTravel: () => void;

    const unsubscribeOrders = onSnapshot(qOrders, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        console.log("Order update received:", data);
        setOrder(data);
        setLoading(false);
      } else {
        // If not found in orders, check travel_bookings
        unsubscribeTravel = onSnapshot(qTravel, (travelSnapshot) => {
          if (!travelSnapshot.empty) {
            const data = travelSnapshot.docs[0].data();
            console.log("Travel booking update received:", data);
            setOrder(data);
          } else {
            console.error("Order not found for merchantRef:", merchantRef);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to travel booking:", error);
          setLoading(false);
        });
      }
    }, (error) => {
      console.error("Error listening to order:", error);
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      if (unsubscribeTravel) unsubscribeTravel();
    };
  }, [merchantRef]);

  useEffect(() => {
    if (!order?.expired_time) return;

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = order.expired_time - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Berhasil disalin!');
  };

  if (loading) return <div className="p-8 text-center">Memuat detail pembayaran...</div>;
  if (!order) return <div className="p-8 text-center">Pesanan tidak ditemukan.</div>;

  const isQRIS = order.paymentMethod?.startsWith('QRIS') || !!order.qr_url;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto flex items-center p-4">
          <button onClick={() => navigate('/orders')} className="mr-4 text-emerald-600">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Pembayaran</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
            <div>
              <p className="text-xs opacity-80">Total Tagihan</p>
              <p className="text-2xl font-bold">Rp{order.totalPrice.toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80 flex items-center justify-end gap-1">
                Status: <span className={`font-bold uppercase ${order.status === 'paid' ? 'text-white' : 'text-orange-200'}`}>{order.status}</span>
              </p>
              <p className="text-xs opacity-80 flex items-center justify-end gap-1 mt-1">
                <Clock className="h-3 w-3" /> Batas Waktu
              </p>
              <p className="text-lg font-mono font-bold">{timeLeft}</p>
            </div>
          </div>
          <div className="p-4 flex justify-between items-center text-sm">
            <span className="text-gray-500">No. Referensi</span>
            <span className="font-medium text-gray-900">{order.merchant_ref}</span>
          </div>
        </div>

        {/* Payment Method Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
          <p className="text-sm text-gray-500 mb-2">Metode Pembayaran</p>
          <div className="flex flex-col items-center gap-2">
            <span className="font-bold text-lg text-gray-900">{order.payment_name || order.paymentMethod}</span>
            {isQRIS ? (
              <div className="mt-4 p-4 bg-white border-2 border-dashed border-emerald-200 rounded-xl inline-block">
                {order.qr_url ? (
                  <img src={order.qr_url} alt="QRIS Code" className="w-64 h-64 mx-auto" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-64 h-64 flex flex-col items-center justify-center text-gray-400">
                    <QrCode className="h-20 w-20 mb-2 opacity-20" />
                    <p className="text-xs">QR Code belum tersedia</p>
                  </div>
                )}
                <p className="mt-4 text-xs text-gray-500">Scan QRIS ini menggunakan aplikasi pembayaran Anda</p>
              </div>
            ) : (
              <div className="mt-2 w-full max-w-xs mx-auto">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                  <span className="text-xl font-mono font-bold text-emerald-700">{order.pay_code}</span>
                  <button 
                    onClick={() => copyToClipboard(order.pay_code)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Salin kode di atas untuk melakukan pembayaran</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        {order.instructions && order.instructions.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-50 font-bold text-gray-900">Instruksi Pembayaran</div>
            <div className="divide-y divide-gray-50">
              {order.instructions.map((step: any, idx: number) => (
                <div key={idx} className="overflow-hidden">
                  <button 
                    onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700">{step.title}</span>
                    {expandedStep === idx ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {expandedStep === idx && (
                    <div className="px-4 pb-4 bg-gray-50">
                      <ul className="space-y-2">
                        {step.steps.map((s: string, sIdx: number) => (
                          <li key={sIdx} className="text-xs text-gray-600 flex gap-2">
                            <span className="bg-emerald-100 text-emerald-700 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                              {sIdx + 1}
                            </span>
                            <span dangerouslySetInnerHTML={{ __html: s }} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4">
          <button 
            onClick={() => {
              if (order?.sellerWhatsapp) {
                let phone = order.sellerWhatsapp;
                if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                
                let message = `Halo ${order.sellerName || 'Admin'}, saya telah membuat pesanan dengan detail berikut:\n\n`;
                message += `*Order ID:* ${order.merchant_ref}\n`;
                message += `*Total Pembayaran:* Rp ${order.totalPrice?.toLocaleString('id-ID')}\n`;
                message += `*Metode Pembayaran:* ${order.payment_name || order.paymentMethod}\n`;
                
                if (order.paymentMethod?.startsWith('QRIS') || order.qr_url) {
                  message += `\nSaya akan segera melakukan pembayaran via QRIS.\n`;
                  if (order.qr_url) {
                    message += `Link QRIS: ${order.qr_url}\n`;
                  }
                  message += `\nMohon diproses setelah pembayaran terkonfirmasi.`;
                } else {
                  message += `\nSaya akan segera melakukan pembayaran.\n`;
                  if (order.pay_code) {
                    message += `Kode Pembayaran: ${order.pay_code}\n`;
                  }
                  message += `\nMohon diproses setelah pembayaran terkonfirmasi.`;
                }
                
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
              }
              navigate('/orders');
            }}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100"
          >
            Selesai & Cek Status Pesanan
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetail;
