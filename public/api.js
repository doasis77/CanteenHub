// CanteenHub API client — uses live API when available, local demo mode as fallback
const API_BASE_URL = `${window.location.origin}/api`;

const DEMO_KEYS = {
  users: 'canteen_demo_users',
  session: 'canteen_demo_session',
  cart: 'canteen_demo_cart',
  orders: 'canteen_demo_orders',
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
    this.demoMode = false;
    this.ready = this.detectMode();
  }

  async detectMode() {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      this.demoMode = data.database !== 'configured';
    } catch {
      this.demoMode = true;
    }
    window.CANTEEN_DEMO_MODE = this.demoMode;
    this.updateDemoBanner();
    return this.demoMode;
  }

  updateDemoBanner() {
    const banner = document.getElementById('demo-banner');
    if (!banner) return;
    if (this.demoMode) {
      banner.style.display = 'block';
      banner.textContent = 'Demo mode — browse the menu, cart, and orders locally. Connect DATABASE_URL on Vercel for live accounts.';
    } else {
      banner.style.display = 'none';
    }
  }

  async ensureReady() {
    await this.ready;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  getDemoUser() {
    const session = readJson(DEMO_KEYS.session, null);
    if (!session) return null;
    const users = readJson(DEMO_KEYS.users, []);
    return users.find((user) => user.id === session.userId) || null;
  }

  async request(endpoint, options = {}) {
    await this.ensureReady();
    if (this.demoMode) {
      throw new Error('Demo mode active');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: this.getHeaders(),
      ...options,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  }

  async register(userData) {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    }

    const users = readJson(DEMO_KEYS.users, []);
    if (users.some((user) => user.email === userData.email)) {
      throw new Error('Email already registered');
    }

    const user = {
      id: `demo-${Date.now()}`,
      email: userData.email,
      fullName: userData.fullName,
      studentId: userData.studentId,
      loyaltyPoints: 0,
    };
    users.push(user);
    writeJson(DEMO_KEYS.users, users);
    writeJson(DEMO_KEYS.session, { userId: user.id });
    this.setToken(`demo-token-${user.id}`);
    return { success: true, data: { user, token: this.token } };
  }

  async login(credentials) {
    await this.ensureReady();
    if (!this.demoMode) {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (response.success && response.data.token) {
        this.setToken(response.data.token);
      }
      return response;
    }

    const users = readJson(DEMO_KEYS.users, []);
    let user = users.find((entry) => entry.email === credentials.email);
    if (!user) {
      user = {
        id: `demo-${Date.now()}`,
        email: credentials.email,
        fullName: credentials.email.split('@')[0],
        studentId: 'DEMO-001',
        loyaltyPoints: 0,
      };
      users.push(user);
      writeJson(DEMO_KEYS.users, users);
    }

    writeJson(DEMO_KEYS.session, { userId: user.id });
    this.setToken(`demo-token-${user.id}`);
    return { success: true, data: { user, token: this.token } };
  }

  async verifyToken() {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request('/auth/verify');
    }

    const user = this.getDemoUser();
    if (!user) {
      throw new Error('Invalid session');
    }
    return { success: true, data: { user } };
  }

  async getMenuItems() {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request('/menu/items');
    }
    throw new Error('Use sample menu in demo mode');
  }

  async getCart() {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request('/cart');
    }

    const user = this.getDemoUser();
    const carts = readJson(DEMO_KEYS.cart, {});
    return { success: true, data: { items: user ? carts[user.id] || [] : [] } };
  }

  async addToCart(itemData) {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request('/cart/items', {
        method: 'POST',
        body: JSON.stringify(itemData),
      });
    }

    const user = this.getDemoUser();
    if (!user) throw new Error('Please login first');

    const carts = readJson(DEMO_KEYS.cart, {});
    const items = carts[user.id] || [];
    const existing = items.find((item) => item.menuItemId === itemData.menuItemId);

    if (existing) {
      existing.quantity += itemData.quantity;
    } else {
      items.push({
        id: Date.now(),
        menuItemId: itemData.menuItemId,
        quantity: itemData.quantity,
      });
    }

    carts[user.id] = items;
    writeJson(DEMO_KEYS.cart, carts);
    return { success: true, data: { items } };
  }

  async updateCartItem(itemId, updateData) {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request(`/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    }

    const user = this.getDemoUser();
    const carts = readJson(DEMO_KEYS.cart, {});
    const items = carts[user.id] || [];
    const item = items.find((entry) => entry.id === itemId);
    if (item) item.quantity = updateData.quantity;
    writeJson(DEMO_KEYS.cart, carts);
    return { success: true, data: { items } };
  }

  async removeFromCart(itemId) {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request(`/cart/items/${itemId}`, { method: 'DELETE' });
    }

    const user = this.getDemoUser();
    const carts = readJson(DEMO_KEYS.cart, {});
    carts[user.id] = (carts[user.id] || []).filter((item) => item.id !== itemId);
    writeJson(DEMO_KEYS.cart, carts);
    return { success: true };
  }

  async clearCart() {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request('/cart', { method: 'DELETE' });
    }

    const user = this.getDemoUser();
    const carts = readJson(DEMO_KEYS.cart, {});
    carts[user.id] = [];
    writeJson(DEMO_KEYS.cart, carts);
    return { success: true };
  }

  async createOrder(orderData) {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
    }

    const user = this.getDemoUser();
    const carts = readJson(DEMO_KEYS.cart, {});
    const cartItems = carts[user.id] || [];
    const menuItems = window.__canteenMenuItems || [];
    const orderItems = cartItems.map((cartItem) => {
      const menuItem = menuItems.find((entry) => entry.id === cartItem.menuItemId);
      return {
        name: menuItem?.name || 'Item',
        price: menuItem?.price || 0,
        quantity: cartItem.quantity,
      };
    });
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const pointsEarned = Math.floor(total);

    const order = {
      id: `ORD-${Date.now()}`,
      userId: user.id,
      items: orderItems,
      total,
      status: 'preparing',
      pointsEarned,
      createdAt: new Date().toISOString(),
    };

    user.loyaltyPoints = (user.loyaltyPoints || 0) + pointsEarned;
    const users = readJson(DEMO_KEYS.users, []);
    writeJson(DEMO_KEYS.users, users.map((entry) => (entry.id === user.id ? user : entry)));

    const allOrders = readJson(DEMO_KEYS.orders, []);
    allOrders.unshift(order);
    writeJson(DEMO_KEYS.orders, allOrders);
    carts[user.id] = [];
    writeJson(DEMO_KEYS.cart, carts);

    return { success: true, data: { order, pointsEarned } };
  }

  async getOrders() {
    await this.ensureReady();
    if (!this.demoMode) {
      return this.request('/orders');
    }

    const user = this.getDemoUser();
    const allOrders = readJson(DEMO_KEYS.orders, []);
    return {
      success: true,
      data: allOrders.filter((order) => order.userId === user?.id),
    };
  }

  // Pass-through stubs for unused endpoints in demo mode
  async getMenuItemById(id) { return this.request(`/menu/items/${id}`); }
  async getMenuCategories() { return this.request('/menu/categories'); }
  async searchMenuItems(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters });
    return this.request(`/menu/search?${params.toString()}`);
  }
  async getCartSummary() { return this.request('/cart/summary'); }
  async getOrderById(orderId) { return this.request(`/orders/${orderId}`); }
  async cancelOrder(orderId) { return this.request(`/orders/${orderId}/cancel`, { method: 'PUT' }); }
  async getUserProfile() { return this.request('/users/profile'); }
  async updateUserProfile(profileData) {
    return this.request('/users/profile', { method: 'PUT', body: JSON.stringify(profileData) });
  }
  async updatePassword(passwordData) {
    return this.request('/users/password', { method: 'PUT', body: JSON.stringify(passwordData) });
  }
  async updateDietaryPreferences(preferences) {
    return this.request('/users/dietary-preferences', { method: 'PUT', body: JSON.stringify(preferences) });
  }
  async addAllergy(allergyData) {
    return this.request('/users/allergies', { method: 'POST', body: JSON.stringify(allergyData) });
  }
  async removeAllergy(allergyId) {
    return this.request(`/users/allergies/${allergyId}`, { method: 'DELETE' });
  }
  async getUserStats() { return this.request('/users/stats'); }
  async getLoyaltyBalance() { return this.request('/loyalty/balance'); }
  async getLoyaltyTransactions(filters = {}) {
    const params = new URLSearchParams(filters);
    const endpoint = params.toString() ? `/loyalty/transactions?${params}` : '/loyalty/transactions';
    return this.request(endpoint);
  }
  async redeemPoints(pointsData) {
    return this.request('/loyalty/redeem', { method: 'POST', body: JSON.stringify(pointsData) });
  }
  async getLoyaltyRewards() { return this.request('/loyalty/rewards'); }
  async getLoyaltyStats() { return this.request('/loyalty/stats'); }
}

const api = new ApiClient();
window.api = api;
