import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { ShoppingBag, LogOut, User, Store, Shield, ShoppingCart, Search, Bell, HelpCircle, Globe, Facebook, Instagram } from 'lucide-react';

const Navbar: React.FC = () => {
  const { currentUser, userProfile, logoutUser } = useAuth();
  const { totalItems } = useCart();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const isProductDetail = location.pathname.startsWith('/products/');
  const isSellerProfile = location.pathname.startsWith('/seller/') && location.pathname !== '/seller';

  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      alert('Aplikasi sudah diinstal atau browser Anda tidak mendukung fitur ini.');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/?q=${encodeURIComponent(searchInput.trim())}`);
    } else {
      navigate('/');
    }
  };

  return (
    <nav className={`bg-emerald-600 text-white shadow-md sticky top-0 z-50 ${isProductDetail || isSellerProfile ? 'hidden sm:block' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar (Hidden on very small screens) */}
        <div className="hidden md:flex justify-between items-center py-2 text-[13px] font-medium border-b border-emerald-500/50">
          <div className="flex items-center gap-3">
            {(userProfile?.role === 'seller' || userProfile?.role === 'admin') ? (
              <Link to="/seller" className="hover:text-emerald-200 transition">Toko Saya</Link>
            ) : (
              <>
                <Link to="/seller" className="hover:text-emerald-200 transition">Seller Centre</Link>
                <span className="text-emerald-400/50">|</span>
                <Link to={currentUser ? "/seller" : "/register"} className="hover:text-emerald-200 transition">Mulai Berjualan</Link>
              </>
            )}
            <span className="text-emerald-400/50">|</span>
            <span onClick={handleInstallClick} className="hover:text-emerald-200 transition cursor-pointer">Download</span>
            <span className="text-emerald-400/50">|</span>
            <div className="flex items-center gap-1.5">
              <span>Ikuti kami di</span>
              <Facebook className="h-3.5 w-3.5 cursor-pointer hover:text-emerald-200 transition" />
              <Instagram className="h-3.5 w-3.5 cursor-pointer hover:text-emerald-200 transition" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="flex items-center gap-1.5 hover:text-emerald-200 transition cursor-pointer relative">
              <Bell className="h-4 w-4" /> Notifikasi
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-600">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-1.5 hover:text-emerald-200 transition cursor-pointer">
              <HelpCircle className="h-4 w-4" /> Bantuan
            </div>
            <div className="flex items-center gap-1.5 hover:text-emerald-200 transition cursor-pointer">
              <Globe className="h-4 w-4" /> Bahasa Indonesia
            </div>
            
            {!currentUser ? (
              <div className="flex items-center gap-2 ml-2">
                <Link to="/register" className="hover:text-emerald-200 transition">Daftar</Link>
                <span className="text-emerald-400/50">|</span>
                <Link to="/login" className="hover:text-emerald-200 transition">Log In</Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 ml-2">
                {userProfile?.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-1 hover:text-emerald-200 transition">
                    <Shield className="h-3.5 w-3.5" /> Admin
                  </Link>
                )}
                <div className="flex items-center gap-1.5 hover:text-emerald-200 transition cursor-pointer">
                  <User className="h-4 w-4" />
                  <span>{userProfile?.name}</span>
                </div>
                <button onClick={handleLogout} className="hover:text-emerald-200 transition">Logout</button>
              </div>
            )}
          </div>
        </div>

        {/* Main Bar */}
        <div className="flex items-center justify-between py-3 sm:py-4 gap-2 sm:gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-3xl font-bold flex-shrink-0">
            <ShoppingBag className="h-6 w-6 sm:h-10 sm:w-10" />
            <span className="hidden sm:block">DesaMart</span>
          </Link>

          {/* Search Bar (Desktop) */}
          <div className="hidden sm:block flex-grow max-w-4xl">
            <form onSubmit={handleSearch} className="flex w-full bg-white rounded-sm overflow-hidden p-1 shadow-inner">
              <input 
                type="text" 
                placeholder="Daftar & Dapat Voucher Gratis" 
                className="w-full px-4 py-2 text-gray-700 outline-none text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-sm transition flex items-center justify-center">
                <Search className="h-5 w-5" />
              </button>
            </form>
            <div className="flex gap-4 mt-2 text-[11px] sm:text-xs text-white/90">
              <span className="hover:text-white cursor-pointer">Beras Organik</span>
              <span className="hover:text-white cursor-pointer">Sayur Segar</span>
              <span className="hover:text-white cursor-pointer">Kerajinan Bambu</span>
              <span className="hover:text-white cursor-pointer">Pupuk Kompos</span>
              <span className="hover:text-white cursor-pointer hidden md:inline">Madu Hutan</span>
            </div>
          </div>

          {/* Search Bar (Mobile) */}
          <div className="sm:hidden flex-grow mx-1">
            <form onSubmit={handleSearch} className="flex w-full bg-white rounded-md overflow-hidden p-0.5 shadow-sm">
              <input 
                type="text" 
                placeholder="Cari..." 
                className="w-full px-2.5 py-1.5 text-gray-700 outline-none text-xs bg-transparent"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded transition flex items-center justify-center">
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* Cart */}
          <div className="flex items-center flex-shrink-0 sm:pr-4">
            <Link to="/cart" className="relative p-1.5 sm:p-2 hover:bg-emerald-700 rounded-full transition">
              <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-white text-emerald-600 border-2 border-emerald-600 text-[10px] sm:text-xs font-bold rounded-full h-4 w-4 sm:h-6 sm:w-6 flex items-center justify-center transform translate-x-1 -translate-y-1">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
