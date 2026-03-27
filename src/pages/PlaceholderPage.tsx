import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-emerald-600 pt-12 pb-6 px-4 flex items-center gap-4 text-white">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      <div className="flex flex-col items-center justify-center pt-20 px-4 text-center">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <Construction className="h-12 w-12 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Fitur Segera Hadir</h2>
        <p className="text-gray-500 max-w-xs">
          Halaman <span className="font-bold text-emerald-600">"{title}"</span> sedang dalam tahap pengembangan. Kami akan segera meluncurkannya untuk Anda!
        </p>
        <button 
          onClick={() => navigate('/')}
          className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-emerald-700 transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};

export default PlaceholderPage;
