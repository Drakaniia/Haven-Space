/**
 * Centralized routing logic for authenticated users
 * Handles conditional redirects based on boarder status
 */

import { getState } from './state.js';

/**
 * Check if user is authenticated
 * @returns {boolean} Whether user is authenticated
 */
export function isAuthenticated() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return !!(token && user);
}

/**
 * Get current user from localStorage
 * @returns {Object|null} User object or null if not authenticated
 */
export function getCurrentUser() {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (e) {
    console.warn('Failed to parse user from localStorage', e);
    return null;
  }
}

/**
 * Redirect authenticated users from public find-a-room to boarder find-a-room
 * Call this on public pages that have find-a-room functionality
 */
export function redirectAuthenticatedUsers() {
  if (isAuthenticated()) {
    const user = getCurrentUser();
    if (user && user.role === 'boarder') {
      const basePath = getBasePath();
      window.location.href = `${basePath}boarder/find-a-room/index.html`;
      return true; // Indicates redirect happened
    }
  }
  return false; // No redirect
}

/**
 * Setup authentication-aware navigation for find-a-room links
 * Call this on public pages that have links to find-a-room
 */
export function setupAuthenticatedNavigation() {
  // Find all links that point to find-a-room
  const findRoomLinks = document.querySelectorAll('a[href*="find-a-room"]');

  findRoomLinks.forEach(link => {
    link.addEventListener('click', e => {
      if (isAuthenticated()) {
        const user = getCurrentUser();
        if (user && user.role === 'boarder') {
          e.preventDefault();
          const basePath = getBasePath();
          window.location.href = `${basePath}boarder/find-a-room/index.html`;
        }
      }
      // If not authenticated or not a boarder, let the default link behavior happen
    });
  });
}

/**
 * Get the base path for navigation (handles GitHub Pages vs local dev)
 * @returns {string} Base path for navigation
 */
export function getBasePath() {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;

  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/';
  }

  // For localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check if we're already in a views subdirectory
    if (pathname.includes('/views/')) {
      // Extract the base path up to /views/
      const viewsIndex = pathname.indexOf('/views/');
      return pathname.substring(0, viewsIndex + 7); // Include '/views/'
    }

    // Default for localhost - assume haven-space project structure
    if (pathname.includes('/haven-space/')) {
      return '/haven-space/client/views/';
    }

    // Fallback for localhost
    return '/client/views/';
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
  const boarderStatus = user.boarder_status || user.boarderStatus || 'new';

  switch (boarderStatus) {
    case 'new':
    case 'browsing':
      // New boarders with no application yet - redirect to authenticated find-a-room page
      return `${basePath}boarder/find-a-room/index.html`;

    case 'applied_pending': {
      // Has pending applications - show applications dashboard
      return `${basePath}boarder/applications-dashboard/index.html`;
    }

    case 'pending_confirmation':
      // Landlord accepted, waiting for boarder confirmation
      return `${basePath}boarder/confirm-booking/index.html`;

    case 'accepted':
      // Has room - show full dashboard
      return `${basePath}boarder/index.html`;

    case 'rejected':
      // Application rejected - redirect to applications dashboard to apply elsewhere
      return `${basePath}boarder/applications-dashboard/index.html`;

    default:
      // Fallback to applications dashboard for unknown status
      return `${basePath}boarder/applications-dashboard/index.html`;
  }
}

/**
 * Update boarder status in localStorage
 * @param {string} status - New boarder status
 */
export function updateBoarderStatus(status) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'boarder') {
    user.boarder_status = status;
    user.boarderStatus = status; // Keep both for compatibility
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
    return user.boarder_status || user.boarderStatus || 'new';
  }
  return null;
}
