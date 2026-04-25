/**
 * Authentication Synchronization Utilities
 * Ensures user data in localStorage matches server-side data
 */

import CONFIG from '../config.js';
import { getAuthHeadersOnly } from './auth-headers.js';

/**
 * Sync user data with server and update localStorage
 * @returns {Promise<Object|null>} Updated user data or null if failed
 */
export async function syncUserData() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
      method: 'GET',
      headers: getAuthHeadersOnly(),
      credentials: 'include',
    });

    if (!response.ok) {
      // Try to refresh token if unauthorized
      if (response.status === 401) {
        const refreshResponse = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh-token.php`, {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          // Retry after token refresh
          const retryResponse = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
            method: 'GET',
            headers: getAuthHeadersOnly(),
            credentials: 'include',
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            updateLocalStorage(data.user);
            return data.user;
          }
        }
      }
      return null;
    }

    const data = await response.json();
    updateLocalStorage(data.user);
    return data.user;
  } catch (error) {
    console.error('Failed to sync user data:', error);
    return null;
  }
}

/**
 * Update localStorage with fresh user data
 * @param {Object} user - User data from server
 */
function updateLocalStorage(user) {
  if (!user) return;

  // Update user data
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('user_id', user.id.toString());

  // Update boarder acceptance status if applicable
  if (user.role === 'boarder' && user.boarder_status) {
    localStorage.setItem('boarder_acceptance_status', user.boarder_status);
  }
}

/**
 * Check if user data needs to be synced (e.g., role mismatch)
 * @returns {boolean} True if sync is needed
 */
export function needsSync() {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) return true;

    // Decode JWT payload to check role
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const user = JSON.parse(userStr);

    // Check if roles match
    if (payload.role !== user.role) {
      console.warn('Role mismatch detected:', { jwt: payload.role, localStorage: user.role });
      return true;
    }

    // Check if token is expired
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.warn('Token expired');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking sync status:', error);
    return true;
  }
}

/**
 * Ensure user is authenticated and data is synced
 * @param {string} requiredRole - Required user role
 * @returns {Promise<Object|null>} User data if authenticated, null otherwise
 */
export async function ensureAuth(requiredRole = null) {
  // Check if sync is needed
  if (needsSync()) {
    const user = await syncUserData();
    if (!user) return null;
  }

  // Get current user data
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);

    // Check role if required
    if (requiredRole && user.role !== requiredRole) {
      console.error(`Access denied. Required role: ${requiredRole}, user role: ${user.role}`);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
}
