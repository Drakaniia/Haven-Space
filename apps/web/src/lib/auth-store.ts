import type { AuthUser } from './types';

export const TOKEN_KEY = 'token';
export const REFRESH_KEY = 'refresh_token';
export const USER_KEY = 'user';

/**
 * Dispatched on `window` after the session is written or cleared, so the auth
 * context (and any other in-page listener) can re-sync from localStorage
 * immediately — no page reload needed. Fires in the same tab; cross-tab sync
 * rides the browser's `storage` event instead.
 */
export const AUTH_CHANGED_EVENT = 'haven:auth-changed';

function notifyAuthChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

export interface StoredAuth {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}

export function getStoredAuth(): StoredAuth {
  if (typeof window === 'undefined') return { token: null, refreshToken: null, user: null };
  try {
    const userRaw = localStorage.getItem(USER_KEY);
    return {
      token: localStorage.getItem(TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_KEY),
      user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null,
    };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

export function setStoredAuth(
  token: string,
  refreshToken: string | undefined,
  user: AuthUser
): void {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChanged();
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('user_id');
  localStorage.removeItem('haven_state');
  notifyAuthChanged();
}
