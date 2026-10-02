import { create } from 'zustand';
import { User } from '../types/index.js';
import { api } from '../services/api.js';
import { disconnectSocket } from '../services/socket.js';

interface AuthState {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null, token?: string | null, sessionId?: string | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem('cb_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const initialToken = typeof window !== 'undefined' ? localStorage.getItem('cb_token') : null;
const initialSessionId = typeof window !== 'undefined' ? localStorage.getItem('cb_session_id') : null;
const initialUser = typeof window !== 'undefined' ? getStoredUser() : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  token: initialToken,
  sessionId: initialSessionId,
  isLoading: true,
  isAuthenticated: Boolean(initialUser),

  setUser: (user, token, sessionId) => {
    if (user) {
      const storedToken = token !== undefined ? token : get().token;
      const storedSessionId = sessionId !== undefined ? sessionId : get().sessionId;

      if (token) localStorage.setItem('cb_token', token);
      if (sessionId) localStorage.setItem('cb_session_id', sessionId);
      localStorage.setItem('cb_user', JSON.stringify(user));

      set({
        user,
        token: storedToken,
        sessionId: storedSessionId,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      localStorage.removeItem('cb_token');
      localStorage.removeItem('cb_session_id');
      localStorage.removeItem('cb_user');

      set({
        user: null,
        token: null,
        sessionId: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get<{ success: boolean; data: { user: User; sessionId?: string } }>('/api/auth/me');
      if (res.success && res.data?.user) {
        if (res.data.sessionId) {
          localStorage.setItem('cb_session_id', res.data.sessionId);
        }
        localStorage.setItem('cb_user', JSON.stringify(res.data.user));
        set({
          user: res.data.user,
          sessionId: res.data.sessionId || get().sessionId,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        localStorage.removeItem('cb_token');
        localStorage.removeItem('cb_session_id');
        localStorage.removeItem('cb_user');
        set({ user: null, token: null, sessionId: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      localStorage.removeItem('cb_token');
      localStorage.removeItem('cb_session_id');
      localStorage.removeItem('cb_user');
      set({ user: null, token: null, sessionId: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try {
      disconnectSocket();
      const state = get();
      const sessionId = state.sessionId || localStorage.getItem('cb_session_id');
      const user = state.user || getStoredUser();
      const userId = user?.id;
      const email = user?.email;
      const token = state.token || localStorage.getItem('cb_token');

      await api.post('/api/auth/logout', {
        sessionId: sessionId || undefined,
        userId: userId || undefined,
        email: email || undefined,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        keepalive: true,
      });
    } catch (err) {
      console.warn('Backend logout encountered error, proceeding with local cleanup:', err);
    } finally {
      localStorage.removeItem('cb_token');
      localStorage.removeItem('cb_session_id');
      localStorage.removeItem('cb_user');
      disconnectSocket();
      set({
        user: null,
        token: null,
        sessionId: null,
        isAuthenticated: false,
        isLoading: false,
      });
      window.location.href = '/login';
    }
  },
}));
