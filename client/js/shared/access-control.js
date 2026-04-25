/**
 * Access Control Module
 * Manages readonly state for boarder pages based on acceptance status
 */

import CONFIG from '../config.js';
import { authenticatedFetch } from './state.js';

// Access control state
const accessState = {
  hasAcceptedApplication: false,
  acceptedProperties: [],
  isLoading: true,
  lastChecked: null,
};

/**
 * Check if boarder has any accepted applications
 * @returns {Promise<boolean>}
 */
export async function checkAcceptanceStatus() {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      accessState.hasAcceptedApplication = false;
      accessState.isLoading = false;
      return false;
    }

    const response = await authenticatedFetch(
      `${CONFIG.API_BASE_URL}/api/boarder/has-accepted-applications`,
      {
        method: 'GET',
        headers: {
          'X-User-Id': userId,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      accessState.hasAcceptedApplication = data.has_accepted || false;
      accessState.acceptedProperties = data.property_ids || [];
      accessState.lastChecked = Date.now();
      accessState.isLoading = false;

      // Store in localStorage for quick access
      localStorage.setItem(
        'boarder_acceptance_status',
        JSON.stringify({
          hasAccepted: accessState.hasAcceptedApplication,
          propertyIds: accessState.acceptedProperties,
          timestamp: accessState.lastChecked,
        })
      );

      return accessState.hasAcceptedApplication;
    }

    accessState.isLoading = false;
    return false;
  } catch (error) {
    console.error('Error checking acceptance status:', error);
    accessState.isLoading = false;
    return false;
  }
}

/**
 * Get current acceptance status from cache or API
 * @param {boolean} forceRefresh - Force API call even if cached
 * @returns {Promise<Object>}
 */
export async function getAcceptanceStatus(forceRefresh = false) {
  // Check cache first (valid for 5 minutes)
  const cached = localStorage.getItem('boarder_acceptance_status');
  if (!forceRefresh && cached) {
    try {
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      if (age < 5 * 60 * 1000) {
        // 5 minutes
        accessState.hasAcceptedApplication = parsed.hasAccepted;
        accessState.acceptedProperties = parsed.propertyIds || [];
        accessState.isLoading = false;
        return {
          hasAccepted: parsed.hasAccepted,
          propertyIds: parsed.propertyIds || [],
        };
      }
    } catch (e) {
      // Invalid cache, continue to API call
    }
  }

  // Fetch from API
  await checkAcceptanceStatus();
  return {
    hasAccepted: accessState.hasAcceptedApplication,
    propertyIds: accessState.acceptedProperties,
  };
}

/**
 * Apply readonly mode to current page
 * Disables interactive elements and shows overlay message
 */
export function applyReadonlyMode() {
  // Add readonly class to body
  document.body.classList.add('boarder-readonly-mode');

  // Disable all form inputs
  const inputs = document.querySelectorAll('input, textarea, select, button');
  inputs.forEach(input => {
    // Skip navigation and logout buttons
    if (input.closest('.sidebar') || input.closest('.navbar')) {
      return;
    }
    input.disabled = true;
    input.classList.add('readonly-disabled');
  });

  // Disable all action buttons
  const actionButtons = document.querySelectorAll('.boarder-btn, .btn, button[type="submit"]');
  actionButtons.forEach(btn => {
    // Skip navigation buttons
    if (btn.closest('.sidebar') || btn.closest('.navbar')) {
      return;
    }
    btn.disabled = true;
    btn.classList.add('readonly-disabled');
    btn.style.cursor = 'not-allowed';
    btn.style.opacity = '0.5';
  });

  // Disable links (except navigation)
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    // Skip navigation links
    if (link.closest('.sidebar') || link.closest('.navbar')) {
      return;
    }
    link.addEventListener('click', preventAction);
    link.classList.add('readonly-disabled');
    link.style.cursor = 'not-allowed';
    link.style.opacity = '0.7';
  });

  // Show readonly banner
  showReadonlyBanner();
}

/**
 * Remove readonly mode from current page
 */
export function removeReadonlyMode() {
  document.body.classList.remove('boarder-readonly-mode');

  // Re-enable all disabled elements
  const disabledElements = document.querySelectorAll('.readonly-disabled');
  disabledElements.forEach(el => {
    el.disabled = false;
    el.classList.remove('readonly-disabled');
    el.style.cursor = '';
    el.style.opacity = '';
    el.removeEventListener('click', preventAction);
  });

  // Remove readonly banner
  const banner = document.querySelector('.boarder-readonly-banner');
  if (banner) {
    banner.remove();
  }
}

/**
 * Show readonly banner at top of page
 */
function showReadonlyBanner() {
  // Remove existing banner if any
  const existingBanner = document.querySelector('.boarder-readonly-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  const banner = document.createElement('div');
  banner.className = 'boarder-readonly-banner';
  banner.innerHTML = `
    <div class="boarder-readonly-banner-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <div class="boarder-readonly-banner-text">
        <strong>Limited Access</strong>
        <span>This feature is available once your application is accepted by a landlord. <a href="./find-a-room/index.html" style="color: inherit; text-decoration: underline;">Find a room</a> to get started.</span>
      </div>
    </div>
  `;

  // Insert at top of main content
  const mainContent =
    document.querySelector('main') ||
    document.querySelector('.boarder-main-content') ||
    document.body;
  mainContent.insertBefore(banner, mainContent.firstChild);
}

/**
 * Prevent default action for readonly elements
 */
function preventAction(e) {
  e.preventDefault();
  e.stopPropagation();
  showReadonlyToast();
}

/**
 * Show toast notification for readonly mode
 */
function showReadonlyToast() {
  // Prevent multiple toasts
  if (document.querySelector('.boarder-readonly-toast')) {
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'boarder-readonly-toast';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12s2.545-5 7-5c4.454 0 7 5 7 5s-2.546 5-7 5c-4.455 0-7-5-7-5z"></path>
      <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"></path>
      <path d="M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2"></path>
      <path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"></path>
    </svg>
    <span>This feature requires an accepted application</span>
  `;

  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Get current user ID from localStorage
 */
function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return parseInt(user.id || user.user_id || localStorage.getItem('user_id') || '0');
}

/**
 * Initialize access control for current page
 * Call this on page load for protected pages
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAcceptance - Whether page requires acceptance (default: true)
 * @param {string[]} options.allowedPages - Pages that don't require acceptance
 */
export async function initializeAccessControl(options = {}) {
  const {
    requireAcceptance = true,
    allowedPages = ['find-a-room', 'applications', 'settings', 'dashboard'],
  } = options;

  // Check if current page is in allowed list
  const currentPath = window.location.pathname;
  const isAllowedPage = allowedPages.some(page => currentPath.includes(page));

  // If page doesn't require acceptance, skip
  if (!requireAcceptance || isAllowedPage) {
    return { hasAccess: true };
  }

  // Check acceptance status
  const status = await getAcceptanceStatus();

  if (!status.hasAccepted) {
    applyReadonlyMode();
    return { hasAccess: false, reason: 'no_acceptance' };
  }

  return { hasAccess: true };
}

/**
 * Check if specific feature should be readonly
 * @param {string} feature - Feature name (e.g., 'payments', 'messages', 'announcements')
 * @returns {boolean}
 */
export function isFeatureReadonly(feature) {
  // Features that require acceptance
  const protectedFeatures = [
    'payments',
    'messages',
    'announcements',
    'lease',
    'documents',
    'maintenance',
    'house-rules',
  ];

  if (!protectedFeatures.includes(feature)) {
    return false;
  }

  return !accessState.hasAcceptedApplication;
}

/**
 * Get acceptance state (for debugging/display)
 */
export function getAccessState() {
  return { ...accessState };
}
