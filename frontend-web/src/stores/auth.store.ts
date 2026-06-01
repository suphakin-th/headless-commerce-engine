import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@shared/types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  setToken: (token: string) => void;
  loadUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      setToken: (token) => {
        localStorage.setItem('access_token', token);
        set({ token });
      },

      loadUser: async () => {
        try {
          const user = await api.auth.me();
          set({ user });
        } catch {
          set({ user: null, token: null });
          localStorage.removeItem('access_token');
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
