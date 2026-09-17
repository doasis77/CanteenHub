import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User } from '@/lib/api';

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,

  login: async (email, password) => {
    const { user } = await api.login(email, password);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    await api.logout();
    set({ user: null });
  },

  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;
      const { user } = await api.me();
      set({ user });
    } catch {
      set({ user: null });
    }
  },
}));
