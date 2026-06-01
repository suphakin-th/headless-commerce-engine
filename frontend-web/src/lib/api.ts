import type {
  Product,
  PaginatedResponse,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  User,
  Cart,
  Order,
  CheckoutSession,
} from '@shared/types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
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
    list: (page = 1, limit = 20) =>
      request<PaginatedResponse<Product>>(`/products?page=${page}&limit=${limit}`),
    get: (id: string) => request<Product>(`/products/${id}`),
  },

  auth: {
    register: (credentials: RegisterCredentials) =>
      request<AuthTokens>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    login: (credentials: LoginCredentials) =>
      request<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    me: () => request<User>('/auth/me'),
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

  orders: {
    list: () => request<Order[]>('/orders'),
    createCheckout: (items: Array<{ productId: string; quantity: number }>) =>
      request<CheckoutSession>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
  },
};
