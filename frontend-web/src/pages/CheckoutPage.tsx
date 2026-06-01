import { useState } from 'react';
import { useCartStore } from '../stores/cart.store';
import { api } from '../lib/api';

export default function CheckoutPage() {
  const { cart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = cart.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
      const session = await api.orders.createCheckout(items);
      window.location.href = session.url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return <div className="text-gray-500">Your cart is empty.</div>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 space-y-3">
        {cart.items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-gray-700">{item.product.name} × {item.quantity}</span>
            <span className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-gray-900">
          <span>Total</span>
          <span>${cart.total.toFixed(2)}</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="mt-6 w-full rounded-md bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? 'Redirecting to Stripe...' : 'Pay with Stripe'}
      </button>

      <p className="mt-3 text-center text-xs text-gray-400">
        You will be redirected to Stripe's secure checkout page.
      </p>
    </div>
  );
}
