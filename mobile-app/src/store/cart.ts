import { create } from 'zustand';
import type { Cart } from '@shared/types';
import { api } from '../lib/api';

interface CartState {
  cart: Cart;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
}

export const useCartStore = create<CartState>()((set) => ({
  cart: { items: [], total: 0 },
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const cart = await api.cart.get();
      set({ cart });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity = 1) => {
    const cart = await api.cart.addItem(productId, quantity);
    set({ cart });
  },

  removeItem: async (productId) => {
    const cart = await api.cart.removeItem(productId);
    set({ cart });
  },
}));
