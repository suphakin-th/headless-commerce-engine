import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Product } from '@shared/types';
import { api } from '../lib/api';
import { useCartStore } from '../stores/cart.store';
import { useAuthStore } from '../stores/auth.store';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { addItem } = useCartStore();
  const { token } = useAuthStore();

  useEffect(() => {
    if (!id) return;
    api.products
      .get(id)
      .then(setProduct)
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!product || !token) return;
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      navigate('/cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="h-96 animate-pulse rounded-lg bg-gray-200" />;
  if (!product) return <div className="text-gray-500">Product not found.</div>;

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-col justify-center">
        <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
        <p className="mt-4 text-gray-600">{product.description}</p>
        <p className="mt-6 text-4xl font-bold text-gray-900">${product.price.toFixed(2)}</p>

        <p className="mt-2 text-sm text-gray-500">
          {product.inventory > 0 ? `${product.inventory} in stock` : 'Out of stock'}
        </p>

        {token ? (
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center rounded-md border border-gray-300">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                −
              </button>
              <span className="px-4 py-2 font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.inventory, q + 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={adding || product.inventory === 0}
              className="flex-1 rounded-md bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {adding ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        ) : (
          <p className="mt-8 text-gray-500">
            <a href="/auth" className="text-brand-600 hover:underline">Sign in</a> to purchase
          </p>
        )}
      </div>
    </div>
  );
}
