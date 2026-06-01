import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Product,
  PaginatedResponse,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  User,
  Cart,
} from '@shared/types';

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'access_token';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((body as { message: string }).message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  products: {
    list: (page = 1) =>
      request<PaginatedResponse<Product>>(`/products?page=${page}&limit=20`),
    get: (id: string) => request<Product>(`/products/${id}`),
  },

  auth: {
    login: (credentials: LoginCredentials) =>
      request<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (credentials: RegisterCredentials) =>
      request<AuthTokens>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    me: () => request<User>('/auth/me'),
    saveToken: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
    clearToken: () => AsyncStorage.removeItem(TOKEN_KEY),
  },

  cart: {
    get: () => request<Cart>('/cart'),
    addItem: (productId: string, quantity: number) =>
      request<Cart>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      }),
    removeItem: (productId: string) =>
      request<Cart>(`/cart/items/${productId}`, { method: 'DELETE' }),
  },
};
