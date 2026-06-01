import { useEffect, useState } from 'react';
import type { Order } from '@shared/types';
import { api } from '../lib/api';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.orders
      .list()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-48 rounded-lg bg-gray-200" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-4 text-gray-500">No orders yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm text-gray-500">{order.id}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] ?? 'bg-gray-100'}`}>
                  {order.status}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900">${order.total.toFixed(2)}</p>
              <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
              <div className="mt-3 space-y-1">
                {order.items.map((item) => (
                  <p key={item.productId} className="text-sm text-gray-600">
                    {item.productName} × {item.quantity} — ${(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
