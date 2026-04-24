/**
 * Authentication Check Utilities
 * Provides auth guards, token expiry checks, and logout for protected pages
 */

/**
 * Check if the user is authenticated and has the required role.
 * Redirects to the login page if not authenticated or role doesn't match.
 *
 * @param {string} requiredRole - Required role ('landlord', 'boarder', 'admin')
 * @returns {boolean} True if authenticated with the correct role, false otherwise
 */
export function requireAuth(requiredRole) {
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');

  if (!token || !userRaw) {
    redirectToLogin();
    return false;
  }

  try {
    const user = JSON.parse(userRaw);
    if (requiredRole && user.role !== requiredRole) {
      redirectToLogin();
      return false;
    }
    return true;
  } catch (e) {
    redirectToLogin();
    return false;
  }
}

/**
 * Check if the stored JWT token is expired.
 * Parses the token payload and compares the `exp` claim to the current time.
 *
 * @returns {boolean} True if the token is expired or cannot be parsed
 */
export function isTokenExpired() {
  const token = localStorage.getItem('token');
  if (!token) return true;

  try {
    // JWT is base64url-encoded: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false; // No expiry claim — treat as valid

    return Date.now() / 1000 > payload.exp;
  } catch (e) {
    return true;
  }
}

/**
 * Log the user out by clearing stored credentials and redirecting to login.
 */
export async function logout() {
  try {
    // Import account from appwrite.js to delete the session
    const { account } = await import('../appwrite.js');
    
    // Delete the current Appwrite session
    await account.deleteSession('current');
  } catch (error) {
    console.warn('Failed to delete Appwrite session:', error);
    // Continue with local cleanup even if session deletion fails
  }
  
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('user_id');
  localStorage.removeItem('haven_state');
  localStorage.removeItem('boarder_acceptance_status');
  redirectToLogin();
}

/**
 * Redirect to the login page, preserving the current URL as a return destination.
 */
function redirectToLogin() {
  const loginPath = getLoginPath();
  window.location.href = loginPath;
}

/**
 * Resolve the login page path relative to the current page location.
 * Works for both the dev server (client/) and the built dist/ output.
 *
 * @returns {string} Path to the login page
 */
function getLoginPath() {
  const pathname = window.location.pathname;

  // Count how many directory levels deep we are to build a relative path
  // e.g. /views/landlord/listings/create.html → 3 levels → ../../../auth/login.html
  const segments = pathname.split('/').filter(Boolean);

  // Find the role segment (landlord, boarder, admin) to determine depth
  const roleSegments = ['landlord', 'boarder', 'admin'];
  const roleIndex = segments.findIndex(s => roleSegments.includes(s));

  let depth;
  if (roleIndex !== -1) {
    // Depth = number of segments after the role (including the file itself)
    depth = segments.length - roleIndex;
  } else {
    // Fallback: go up one level per path segment beyond the root
    depth = Math.max(segments.length - 1, 1);
  }

  const prefix = '../'.repeat(depth);
  return `${prefix}auth/login.html`;
}
