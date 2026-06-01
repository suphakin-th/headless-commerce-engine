import { Link } from 'react-router-dom';
import type { Product } from '@shared/types';
import { useCartStore } from '../stores/cart.store';
import { useAuthStore } from '../stores/auth.store';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const { addItem } = useCartStore();
  const { token } = useAuthStore();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!token) return;
    await addItem(product.id);
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-gray-900">{product.name}</h3>
        <p className="mt-1 flex-1 text-sm text-gray-500 line-clamp-2">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
          {token ? (
            <button
              onClick={handleAddToCart}
              disabled={product.inventory === 0}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {product.inventory === 0 ? 'Out of stock' : 'Add to cart'}
            </button>
          ) : (
            <span className="text-xs text-gray-400">Sign in to buy</span>
          )}
        </div>
      </div>
    </Link>
  );
}
