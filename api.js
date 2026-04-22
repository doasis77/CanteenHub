// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// API Helper Functions
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
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
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Authentication API
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // Menu API
  async getMenuItems(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/menu/items?${queryString}` : '/menu/items';
    
    return this.request(endpoint);
  }

  async getMenuItemById(id) {
    return this.request(`/menu/items/${id}`);
  }

  async getMenuCategories() {
    return this.request('/menu/categories');
  }

  async searchMenuItems(query, filters = {}) {
    const params = new URLSearchParams({ q: query });
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });
    
    return this.request(`/menu/search?${params.toString()}`);
  }

  // Cart API
  async getCart() {
    return this.request('/cart');
  }

  async addToCart(itemData) {
    return this.request('/cart/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateCartItem(itemId, updateData) {
    return this.request(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async removeFromCart(itemId) {
    return this.request(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  async clearCart() {
    return this.request('/cart', {
      method: 'DELETE',
    });
  }

  async getCartSummary() {
    return this.request('/cart/summary');
  }

  // Orders API
  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrders(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/orders?${queryString}` : '/orders';
    
    return this.request(endpoint);
  }

  async getOrderById(orderId) {
    return this.request(`/orders/${orderId}`);
  }

  async cancelOrder(orderId) {
    return this.request(`/orders/${orderId}/cancel`, {
      method: 'PUT',
    });
  }

  // User API
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async updatePassword(passwordData) {
    return this.request('/users/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  async updateDietaryPreferences(preferences) {
    return this.request('/users/dietary-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async addAllergy(allergyData) {
    return this.request('/users/allergies', {
      method: 'POST',
      body: JSON.stringify(allergyData),
    });
  }

  async removeAllergy(allergyId) {
    return this.request(`/users/allergies/${allergyId}`, {
      method: 'DELETE',
    });
  }

  async getUserStats() {
    return this.request('/users/stats');
  }

  // Loyalty API
  async getLoyaltyBalance() {
    return this.request('/loyalty/balance');
  }

  async getLoyaltyTransactions(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });
    
    const queryString = params.toString();
    const endpoint = queryString ? `/loyalty/transactions?${queryString}` : '/loyalty/transactions';
    
    return this.request(endpoint);
  }

  async redeemPoints(pointsData) {
    return this.request('/loyalty/redeem', {
      method: 'POST',
      body: JSON.stringify(pointsData),
    });
  }

  async getLoyaltyRewards() {
    return this.request('/loyalty/rewards');
  }

  async getLoyaltyStats() {
    return this.request('/loyalty/stats');
  }
}

// Create global API client instance
const api = new ApiClient();

// Export for use in other files
window.api = api;

