'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, User } from '@/lib/api-client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await api.auth.login({ email, password });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          set({ user: data.user as User, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const data = await api.auth.register(formData);
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          set({ user: data.user as User, isLoading: false });
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null });
      },

      fetchUser: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        try {
          const { user } = await api.auth.me();
          set({ user });
        } catch {
          set({ user: null });
        }
      },
    }),
    { name: 'canteen-auth', partialize: (s) => ({ user: s.user }) }
  )
);
