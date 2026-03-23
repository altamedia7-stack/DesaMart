import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingBag, LogOut, User, Store, Shield } from 'lucide-react';

const Navbar: React.FC = () => {
  const { currentUser, userProfile, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  return (
    <nav className="bg-emerald-600 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <ShoppingBag className="h-6 w-6" />
              <span>DesaMart</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {!currentUser ? (
              <>
                <Link to="/login" className="hover:text-emerald-200 transition">Masuk</Link>
                <Link to="/register" className="bg-white text-emerald-600 px-4 py-2 rounded-md font-medium hover:bg-emerald-50 transition">Daftar</Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                {userProfile?.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-1 hover:text-emerald-200 transition">
                    <Shield className="h-5 w-5" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
                {(userProfile?.role === 'seller' || userProfile?.role === 'admin') && (
                  <Link to="/seller" className="flex items-center gap-1 hover:text-emerald-200 transition">
                    <Store className="h-5 w-5" />
                    <span className="hidden sm:inline">Toko Saya</span>
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline">{userProfile?.name}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1 hover:text-emerald-200 transition">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
