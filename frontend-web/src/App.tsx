import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AuthPage from './pages/AuthPage';
import OrdersPage from './pages/OrdersPage';

export default function App() {
  const { token, loadUser } = useAuthStore();

  useEffect(() => {
    if (token) loadUser();
  }, [token, loadUser]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={token ? <CheckoutPage /> : <Navigate to="/auth" />} />
        <Route path="checkout/success" element={<div className="p-8 text-center text-2xl font-semibold text-green-600">Order confirmed! Thank you.</div>} />
        <Route path="checkout/cancel" element={<div className="p-8 text-center text-2xl font-semibold text-red-500">Checkout cancelled.</div>} />
        <Route path="orders" element={token ? <OrdersPage /> : <Navigate to="/auth" />} />
        <Route path="auth" element={<AuthPage />} />
      </Route>
    </Routes>
  );
}
