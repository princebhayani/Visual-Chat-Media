'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { configureApiClient, api } from '@/lib/api-client';
import type { UserPublic } from '@ai-chat/shared';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { tokens, setTokens, setUser, logout, setLoading } = useAuthStore();

  // Configure API client with auth store
  useEffect(() => {
    configureApiClient({
      getTokens: () => useAuthStore.getState().tokens,
      onSetTokens: (tokens) => useAuthStore.getState().setTokens(tokens),
      onLogout: () => useAuthStore.getState().logout(),
    });
  }, []);

  // Validate token on mount
  useEffect(() => {
    async function validateAuth() {
      if (!tokens?.accessToken) {
        setLoading(false);
        return;
      }

      try {
        const user = await api.get<UserPublic>('/api/auth/me');
        setUser(user);
        setLoading(false);
      } catch {
        // Token expired, try refresh
        if (tokens?.refreshToken) {
          try {
            const data = await api.post<{
              user: UserPublic;
              tokens: { accessToken: string; refreshToken: string };
            }>('/api/auth/refresh', { refreshToken: tokens.refreshToken });
            setTokens(data.tokens);
            setUser(data.user);
          } catch {
            logout();
          }
        } else {
          logout();
        }
        setLoading(false);
      }
    }

    validateAuth();
  }, []);

  return <>{children}</>;
}
