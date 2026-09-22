import { create } from 'zustand';
import { User, Role } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
    }),

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get<{ success: boolean; data: { user: User } }>('/api/auth/me');
      if (res.success && res.data?.user) {
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
      window.location.href = '/login';
    }
  },
}));
