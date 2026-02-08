import { create } from 'zustand';
import type { UserPublic } from '@ai-chat/shared';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: UserPublic | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: UserPublic, tokens: AuthTokens) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: UserPublic) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const TOKENS_KEY = 'ai-chat-tokens';
const USER_KEY = 'ai-chat-user';

function loadPersistedState() {
  if (typeof window === 'undefined') return { tokens: null, user: null };
  try {
    const tokens = JSON.parse(localStorage.getItem(TOKENS_KEY) || 'null');
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return { tokens, user };
  } catch {
    return { tokens: null, user: null };
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const persisted = loadPersistedState();

  return {
    user: persisted.user,
    tokens: persisted.tokens,
    isAuthenticated: !!persisted.tokens,
    isLoading: true,

    setAuth: (user, tokens) => {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, tokens, isAuthenticated: true, isLoading: false });
    },

    setTokens: (tokens) => {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
      set({ tokens });
    },

    setUser: (user) => {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user });
    },

    logout: () => {
      localStorage.removeItem(TOKENS_KEY);
      localStorage.removeItem(USER_KEY);
      set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
    },

    setLoading: (isLoading) => set({ isLoading }),
  };
});
