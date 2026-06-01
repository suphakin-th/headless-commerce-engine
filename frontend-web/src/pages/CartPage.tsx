import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cart.store';
import { useAuthStore } from '../stores/auth.store';

export default function CartPage() {
  const { cart, fetchCart, removeItem } = useCartStore();
  const { token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) fetchCart();
  }, [token, fetchCart]);

  if (cart.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-700">Your cart is empty</h2>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>

        {cart.items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <img
              src={item.product.imageUrl}
              alt={item.product.name}
              className="h-20 w-20 rounded-md object-cover"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{item.product.name}</p>
              <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">${(item.product.price * item.quantity).toFixed(2)}</p>
              <button
                onClick={() => removeItem(item.productId)}
                className="mt-1 text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 h-fit">
        <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
        <div className="mt-4 space-y-2">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm text-gray-600">
              <span>{item.product.name} × {item.quantity}</span>
              <span>${(item.product.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-200 pt-4 flex justify-between font-bold text-gray-900">
          <span>Total</span>
          <span>${cart.total.toFixed(2)}</span>
        </div>
        <button
          onClick={() => navigate(token ? '/checkout' : '/auth')}
          className="mt-6 w-full rounded-md bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
        >
          {token ? 'Proceed to Checkout' : 'Sign In to Checkout'}
        </button>
      </div>
    </div>
  );
}
