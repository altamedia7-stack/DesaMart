import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, MessageCircle, Mail, Phone, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Bagaimana cara berbelanja di DesaMart?',
      answer: 'Cari produk yang Anda inginkan, tambahkan ke keranjang, pilih metode pengiriman, dan lakukan pembayaran. Pesanan Anda akan segera diproses oleh penjual.'
    },
    {
      question: 'Apa itu Bus & Travel DesaMart?',
      answer: 'Layanan pemesanan tiket bus dan travel antar desa/kota yang memudahkan transportasi warga desa dengan sistem pemesanan digital.'
    },
    {
      question: 'Bagaimana cara menjadi penjual?',
      answer: 'Buka menu Profil, klik "Mulai Berjualan", lengkapi data toko Anda, dan Anda bisa langsung mengunggah produk desa Anda.'
    },
    {
      question: 'Metode pembayaran apa saja yang tersedia?',
      answer: 'Kami mendukung pembayaran melalui Transfer Bank, E-Wallet (QRIS), dan COD (Bayar di Tempat) untuk produk tertentu.'
    },
    {
      question: 'Berapa lama waktu pengiriman?',
      answer: 'Waktu pengiriman bervariasi tergantung lokasi penjual dan kurir yang dipilih, biasanya berkisar antara 1-3 hari kerja untuk sesama wilayah desa.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-emerald-600 pt-12 pb-12 px-4 relative overflow-hidden">
        <div className="flex items-center gap-4 text-white relative z-10">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Pusat Bantuan</h1>
        </div>
        
        <div className="mt-6 relative z-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari bantuan atau FAQ..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-700">Live Chat</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-700">Email</span>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
              <Phone className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-gray-700">Telepon</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-emerald-600" /> Pertanyaan Populer (FAQ)
          </h2>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <div key={index} className="overflow-hidden">
                  <button 
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700">{faq.question}</span>
                    {openFaq === index ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {openFaq === index && (
                    <div className="p-4 bg-gray-50 text-sm text-gray-600 border-t border-gray-100 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                Tidak ada hasil untuk pencarian Anda.
              </div>
            )}
          </div>
        </div>

        <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Masih butuh bantuan?</h3>
            <p className="text-xs opacity-80 mt-1">Tim kami siap membantu Anda 24/7</p>
          </div>
          <button className="bg-white text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-gray-100 transition-colors">
            Hubungi Kami
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
