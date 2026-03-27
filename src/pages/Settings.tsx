import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Shield, Smartphone, Trash2, ChevronRight, Globe, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logoutUser } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
      await logoutUser();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-emerald-600 pt-12 pb-6 px-4 flex items-center gap-4 text-white">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Pengaturan Akun</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Notifikasi Aplikasi</span>
            </div>
            <button 
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-emerald-600' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Mode Gelap (Segera)</span>
            </div>
            <button 
              disabled
              className="w-12 h-6 rounded-full bg-gray-100 relative cursor-not-allowed"
            >
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white" />
            </button>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Bahasa</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>Bahasa Indonesia</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Keamanan Akun</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>

          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">Perangkat Terhubung</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            onClick={handleLogout}
            className="w-full p-4 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-sm font-bold">Hapus Akun</span>
          </button>
        </div>

        <div className="text-center pt-8">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">DesaMart v1.0.0</p>
          <p className="text-[10px] text-gray-300 mt-1">Marketplace Pemberdayaan Desa</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
