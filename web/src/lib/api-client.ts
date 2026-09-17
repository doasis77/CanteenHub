const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type ApiResponse<T> = { success: true; data: T } | { success: false; message: string; details?: unknown };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    if (res.status === 401 && typeof window !== 'undefined') {
      const refreshed = await refreshToken();
      if (refreshed) return request(path, options);
    }
    throw new Error('message' in json ? json.message : 'Request failed');
  }

  return json.data;
}

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem('refreshToken');
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const json = await res.json();
    if (json.success) {
      localStorage.setItem('accessToken', json.data.accessToken);
      localStorage.setItem('refreshToken', json.data.refreshToken);
      return true;
    }
  } catch {
    /* ignore */
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  return false;
}

export const api = {
  auth: {
    register: (data: Record<string, string>) =>
      request<{ user: unknown; accessToken: string; refreshToken: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ user: unknown; accessToken: string; refreshToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () => request<{ user: User }>('/api/auth/me'),
    forgotPassword: (email: string) =>
      request<{ message: string; mockResetLink?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      request<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
  },
  payments: {
    checkout: (orderId: string) =>
      request<{ url: string; sessionId: string }>('/api/payments/checkout', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      }),
    confirm: (sessionId: string) =>
      request<{ confirmed: boolean; orderId?: string }>('/api/payments/confirm', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }),
  },
  menu: {
    items: (params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params)}` : '';
      return request<{ items: MenuItem[]; specials: MenuItem[]; popular: MenuItem[] }>(`/api/menu/items${qs}`);
    },
    categories: () => request<{ categories: Category[] }>('/api/menu/categories'),
    updateItem: (id: string, data: Partial<MenuItem>) =>
      request(`/api/menu/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    createItem: (data: Partial<MenuItem>) =>
      request('/api/menu/items', { method: 'POST', body: JSON.stringify(data) }),
    deleteItem: (id: string) => request(`/api/menu/items/${id}`, { method: 'DELETE' }),
  },
  cart: {
    get: () => request<{ items: CartItem[]; summary: CartSummary }>('/api/cart'),
    add: (data: { menuItemId: string; quantity: number }) =>
      request('/api/cart/items', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, quantity: number) =>
      request(`/api/cart/items/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
    remove: (id: string) => request(`/api/cart/items/${id}`, { method: 'DELETE' }),
    clear: () => request('/api/cart', { method: 'DELETE' }),
  },
  orders: {
    list: (status?: string) => {
      const qs = status ? `?status=${status}` : '';
      return request<{ orders: Order[] }>(`/api/orders${qs}`);
    },
    get: (id: string) => request<{ order: Order; canCancel: boolean }>(`/api/orders/${id}`),
    create: (data: {
      pointsToRedeem?: number;
      notes?: string;
      paymentMethod?: string;
      pickupType?: string;
      scheduledPickup?: string;
    }) => request<{ order: Order }>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
    reject: (id: string, reason: string) =>
      request(`/api/orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    review: (id: string, rating: number, review?: string) =>
      request(`/api/orders/${id}/review`, { method: 'POST', body: JSON.stringify({ rating, review }) }),
    cancel: (id: string) => request(`/api/orders/${id}/cancel`, { method: 'POST' }),
    updateStatus: (id: string, status: string) =>
      request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    reorder: (id: string) => request(`/api/orders/${id}/reorder`, { method: 'POST' }),
  },
  loyalty: {
    get: () => request<LoyaltyData>('/api/loyalty'),
  },
  profile: {
    get: () => request<{ user: Record<string, unknown> }>('/api/profile'),
    update: (data: Record<string, unknown>) =>
      request('/api/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  admin: {
    users: () => request<{ users: User[] }>('/api/admin/users'),
    updateUser: (data: { userId: string; role?: string; loyaltyPoints?: number; isActive?: boolean }) =>
      request('/api/admin/users', { method: 'PATCH', body: JSON.stringify(data) }),
    analytics: () => request<{ analytics: Analytics }>('/api/admin/analytics'),
    loyaltyConfig: () => request('/api/admin/loyalty-config'),
    updateLoyaltyConfig: (data: Record<string, number>) =>
      request('/api/admin/loyalty-config', { method: 'PUT', body: JSON.stringify(data) }),
    invites: () => request<{ invites: InviteCode[] }>('/api/admin/invites'),
    createInvite: (data: { role: 'STAFF' | 'ADMIN'; expiresInDays?: number }) =>
      request<{ invite: InviteCode }>('/api/admin/invites', { method: 'POST', body: JSON.stringify(data) }),
    cancelOrder: (orderId: string) =>
      request(`/api/admin/orders/${orderId}/cancel`, { method: 'POST' }),
    exportCsv: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const res = await fetch(`${API_BASE}/api/admin/export?format=csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canteen-orders-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  },
  notifications: {
    list: () => request<{ notifications: Notification[]; unreadCount: number }>('/api/notifications'),
    markRead: (ids?: string[]) =>
      request('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify(ids ? { notificationIds: ids } : { markAllRead: true }),
      }),
  },
};

export interface User {
  id: string;
  email: string;
  fullName: string;
  studentId: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  loyaltyPoints: number;
  loyaltyTier?: string;
  emailVerified?: boolean;
  isActive?: boolean;
}

export interface InviteCode {
  id: string;
  code: string;
  role: string;
  expiresAt: string;
  usedBy?: string | null;
  usedAt?: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  emoji?: string;
  imageUrl?: string;
  available: boolean;
  prepTimeMinutes: number;
  isSpecial: boolean;
  dietaryTags: string[];
  allergens: string[];
  category?: Category;
  categoryId?: string;
}

export interface CartItem {
  id: string;
  quantity: number;
  menuItem: MenuItem;
}

export interface CartSummary {
  subtotal: string;
  tax: string;
  total: string;
  itemCount: number;
  maxItems: number;
}

export interface Order {
  id: string;
  status: string;
  totalAmount: string | number;
  subtotal?: string | number;
  taxAmount?: string | number;
  discountAmount?: string | number;
  pointsRedeemed?: number;
  estimatedTime?: string;
  cancelDeadline?: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string | number;
    totalPrice: string | number;
    itemName?: string;
    menuItem?: MenuItem;
  }>;
  user?: { fullName: string; email: string; studentId?: string };
  rating?: number | null;
  review?: string | null;
  paymentMethod?: string;
}

export interface LoyaltyData {
  balance: number;
  tier: string;
  lifetimeEarned: number;
  redeemableValue: number;
  config: Record<string, unknown>;
  transactions: Array<{
    id: string;
    transactionType: string;
    pointsEarned: number;
    pointsRedeemed: number;
    description?: string;
    createdAt: string;
  }>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Analytics {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  userCount: number;
  popularItems: Array<{ name?: string; emoji?: string; quantitySold?: number }>;
  statusBreakdown: Array<{ status: string; _count: { id: number } }>;
}
