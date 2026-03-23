import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { totalItems } = useCart();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

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
          to="/cart" 
          className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/cart') ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[8px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center border border-white">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Keranjang</span>
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
