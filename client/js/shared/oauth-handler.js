/**
 * Universal OAuth Redirect Handler
 * Handles OAuth callback data in URL hash fragment across all pages
 * Must be called BEFORE any auth checks to ensure tokens are stored
 */

/**
 * Handle Google OAuth redirect with user data in hash fragment
 * @returns {boolean} True if OAuth redirect was handled, false otherwise
 */
export function handleOAuthRedirect() {
  try {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#auth=')) {
      const authData = hash.substring(6); // Remove '#auth='
      const decodedData = decodeURIComponent(authData);
      const userData = JSON.parse(decodedData);

      console.log('OAuth redirect detected, storing user data:', {
        email: userData.email,
        role: userData.role,
        hasToken: !!userData.access_token,
      });

      // Store user data in localStorage
      const userRecord = {
        id: userData.id,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email,
        email: userData.email,
        role: userData.role,
        boarder_status: userData.boarder_status || userData.boarderStatus || 'new',
      };

      localStorage.setItem('user', JSON.stringify(userRecord));

      // Store the JWT token for API authentication
      if (userData.access_token) {
        localStorage.setItem('token', userData.access_token);
      }

      // Store refresh token if available
      if (userData.refresh_token) {
        localStorage.setItem('refresh_token', userData.refresh_token);
      }

      // Clean up the hash from URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );

      console.log('OAuth redirect handled successfully');
      return true; // Indicates OAuth redirect was handled
    }
  } catch (error) {
    console.error('Error handling OAuth redirect:', error);
  }

  return false; // No OAuth redirect handled
}

/**
 * Initialize OAuth handler - call this at the top of every page
 * Returns a promise that resolves when OAuth handling is complete
 */
export function initOAuthHandler() {
  return new Promise(resolve => {
    const handled = handleOAuthRedirect();
    // Small delay to ensure localStorage is written
    if (handled) {
      setTimeout(() => resolve(handled), 50);
    } else {
      resolve(handled);
    }
  });
}
