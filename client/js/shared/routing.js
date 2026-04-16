/**
 * Centralized routing logic for authenticated users
 * Handles conditional redirects based on boarder status
 */

/**
 * Get the base path for navigation (handles GitHub Pages vs local dev)
 * @returns {string} Base path for navigation
 */
export function getBasePath() {
  const pathname = window.location.pathname;

  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/';
  }

  return '/views/';
}

/**
 * Determine redirect path for boarders based on their application status
 * @param {Object} user - User object with boarderStatus property
 * @returns {string} Redirect path
 */
export function getBoarderRedirectPath(user) {
  const basePath = getBasePath();
  const boarderStatus = user.boarderStatus || 'new';

  switch (boarderStatus) {
    case 'new':
    case 'browsing':
      // New boarders need to apply first - redirect to boarder find-a-room page (authenticated)
      return `${basePath}boarder/find-a-room/index.html`;

    case 'applied_pending':
      // Has pending applications - show applications page
      return `${basePath}boarder/applications/index.html`;

    case 'pending_confirmation':
      // Landlord accepted, waiting for boarder confirmation
      return `${basePath}boarder/confirm-booking/index.html`;

    case 'accepted':
      // Has room - show full dashboard
      return `${basePath}boarder/index.html`;

    case 'rejected':
      // Application rejected - redirect to boarder find-a-room to apply elsewhere (authenticated)
      return `${basePath}boarder/find-a-room/index.html`;

    default:
      // Fallback to boarder find-a-room for unknown status (authenticated)
      return `${basePath}boarder/find-a-room/index.html`;
  }
}

/**
 * Update boarder status in localStorage
 * @param {string} status - New boarder status
 */
export function updateBoarderStatus(status) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'boarder') {
    user.boarderStatus = status;
    localStorage.setItem('user', JSON.stringify(user));
  }
}

/**
 * Get current boarder status from localStorage
 * @returns {string|null} Current boarder status or null if not boarder
 */
export function getBoarderStatus() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'boarder') {
    return user.boarderStatus || 'new';
  }
  return null;
}
