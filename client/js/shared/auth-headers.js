/**
 * Authentication header utilities
 * Provides consistent authentication headers for API requests
 */

/**
 * Get authentication headers for API requests
 * Uses JWT token if available, falls back to X-User-Id for development
 * @param {string} fallbackUserId - Fallback user ID for development/testing
 * @returns {Object} Headers object with authentication
 */
export function getAuthHeaders(fallbackUserId = '1') {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Fallback to X-User-Id for development/testing
    headers['X-User-Id'] = localStorage.getItem('user_id') || fallbackUserId;
  }

  return headers;
}

/**
 * Get authentication headers for fetch requests (without Content-Type)
 * @param {string} fallbackUserId - Fallback user ID for development/testing
 * @returns {Object} Headers object with authentication only
 */
export function getAuthHeadersOnly(fallbackUserId = '1') {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Fallback to X-User-Id for development/testing
    headers['X-User-Id'] = localStorage.getItem('user_id') || fallbackUserId;
  }

  return headers;
}
