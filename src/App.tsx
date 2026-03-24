import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProductDetail from './pages/ProductDetail';
import SellerProfile from './pages/SellerProfile';
import Cart from './pages/Cart';
import Notifications from './pages/Notifications';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import ErrorBoundary from './components/ErrorBoundary';

import Checkout from './pages/Checkout';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <Router>
              <div className="min-h-screen bg-gray-50 flex flex-col pb-14 sm:pb-0">
                <Navbar />
                <main className="flex-grow">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/seller/:id" element={<SellerProfile />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout/:sellerId" element={<Checkout />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/orders" element={<MyOrders />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/seller" element={<SellerDashboard />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Routes>
                </main>
                <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-500 text-sm hidden sm:block">
                  <p>&copy; {new Date().getFullYear()} DesaMart - Marketplace Desa Digital.</p>
                </footer>
                <BottomNav />
              </div>
            </Router>
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
