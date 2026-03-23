import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Bell, User, Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();

  const isProductDetail = location.pathname.startsWith('/products/');

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  if (isProductDetail) return null;

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex justify-around items-center h-14">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">Beranda</span>
        </Link>
        
        <Link 
          to="/seller" 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/seller') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Store className="h-5 w-5" />
          <span className="text-[10px] font-medium">Toko</span>
        </Link>

        <Link 
          to="/notifications" 
          className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/notifications') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="relative">
            <Bell className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Notifikasi</span>
        </Link>

        <Link 
          to={currentUser ? (userProfile?.role === 'admin' ? '/admin' : '/seller') : '/login'} 
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/login') || isActive('/admin') || (isActive('/seller') && location.pathname !== '/seller') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Saya</span>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;
