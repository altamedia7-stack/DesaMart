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
import CourierDashboard from './pages/CourierDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import PaymentDetail from './pages/PaymentDetail';
import TravelBooking from './pages/TravelBooking';
import PlaceholderPage from './pages/PlaceholderPage';
import EditProfile from './pages/EditProfile';
import AddressManager from './pages/AddressManager';
import Favorites from './pages/Favorites';
import OrderHistory from './pages/OrderHistory';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import HelpCenter from './pages/HelpCenter';

import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';

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
                    <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
                    <Route path="/payment/:merchantRef" element={<PaymentDetail />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/orders" element={<MyOrders />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/seller" element={<SellerDashboard />} />
                    <Route path="/courier" element={<CourierDashboard />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/travel-booking" element={<TravelBooking />} />
                    
                    {/* Profile Menu Routes */}
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/history" element={<OrderHistory />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/edit-profile" element={<EditProfile />} />
                    <Route path="/address" element={<AddressManager />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/help" element={<HelpCenter />} />
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
