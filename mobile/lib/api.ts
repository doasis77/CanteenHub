import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function getToken() {
  return AsyncStorage.getItem('accessToken');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  emoji?: string;
  available: boolean;
  prepTimeMinutes: number;
  isSpecial: boolean;
  dietaryTags: string[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  loyaltyPoints: number;
  loyaltyTier?: string;
}

export const api = {
  login: async (email: string, password: string) => {
    const data = await request<{ accessToken: string; refreshToken: string; user: User }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    return data;
  },
  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  },
  me: () => request<{ user: User }>('/api/auth/me'),
  menu: () => request<{ items: MenuItem[]; specials: MenuItem[] }>('/api/menu/items'),
  cart: {
    get: () => request<{ items: Array<{ id: string; quantity: number; menuItem: MenuItem }>; summary: { total: string; itemCount: number } }>('/api/cart'),
    add: (menuItemId: string) =>
      request('/api/cart/items', { method: 'POST', body: JSON.stringify({ menuItemId, quantity: 1 }) }),
  },
  orders: {
    list: () => request<{ orders: Array<{ id: string; status: string; totalAmount: string | number; createdAt: string }> }>('/api/orders'),
    get: (id: string) => request<{ order: { id: string; status: string; estimatedTime?: string; items: Array<{ itemName?: string; quantity: number }> }; canCancel: boolean }>(`/api/orders/${id}`),
    create: () => request('/api/orders', { method: 'POST', body: JSON.stringify({ paymentMethod: 'mock' }) }),
  },
  loyalty: () => request<{ balance: number; tier: string }>('/api/loyalty'),
};
