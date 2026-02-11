import { API_URL } from './constants';

let getTokens: () => { accessToken: string; refreshToken: string } | null = () => null;
let onSetTokens: (tokens: { accessToken: string; refreshToken: string }) => void = () => {};
let onLogout: () => void = () => {};

export function configureApiClient(config: {
  getTokens: () => { accessToken: string; refreshToken: string } | null;
  onSetTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  onLogout: () => void;
}) {
  getTokens = config.getTokens;
  onSetTokens = config.onSetTokens;
  onLogout = config.onLogout;
}

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const tokens = getTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (tokens?.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Try refresh on 401
  if (res.status === 401 && tokens?.refreshToken) {
    const refreshed = await tryRefreshToken(tokens.refreshToken);
    if (refreshed) {
      headers.Authorization = `Bearer ${refreshed.accessToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    } else {
      onLogout();
    }
  }

  return res;
}

async function tryRefreshToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    onSetTokens(data.tokens);
    return data.tokens;
  } catch {
    return null;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetchWithAuth(path);
    return handleResponse<T>(res);
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetchWithAuth(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  patch: async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetchWithAuth(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  delete: async (path: string): Promise<void> => {
    const res = await fetchWithAuth(path, { method: 'DELETE' });
    return handleResponse<void>(res);
  },

  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const tokens = getTokens();
    const headers: Record<string, string> = {};
    // Don't set Content-Type — browser will set it with boundary for FormData

    if (tokens?.accessToken) {
      headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    let res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    // Try refresh on 401
    if (res.status === 401 && tokens?.refreshToken) {
      const refreshed = await tryRefreshToken(tokens.refreshToken);
      if (refreshed) {
        headers.Authorization = `Bearer ${refreshed.accessToken}`;
        res = await fetch(`${API_URL}${path}`, {
          method: 'POST',
          headers,
          body: formData,
        });
      } else {
        onLogout();
      }
    }

    return handleResponse<T>(res);
  },
};
