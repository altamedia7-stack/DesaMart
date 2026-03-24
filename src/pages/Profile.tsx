import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, Shield, Store } from 'lucide-react';

const Profile: React.FC = () => {
  const { currentUser, userProfile, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Saya</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{userProfile?.name}</h2>
            <p className="text-gray-500 text-sm">{userProfile?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-700">
            <Mail className="h-5 w-5 text-gray-400" />
            <span>{userProfile?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <Shield className="h-5 w-5 text-gray-400" />
            <span className="capitalize">{userProfile?.role}</span>
          </div>
          {userProfile?.role === 'seller' && (
            <button
              onClick={() => navigate('/seller')}
              className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 px-4 rounded-lg font-medium hover:bg-emerald-100 transition-colors"
            >
              <Store className="h-5 w-5" />
              Dashboard Penjual
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-3 px-4 rounded-lg font-medium hover:bg-red-100 transition-colors"
      >
        <LogOut className="h-5 w-5" />
        Logout
      </button>
    </div>
  );
};

export default Profile;
