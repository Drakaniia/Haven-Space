/**
 * Access Control Initialization for Boarder Pages
 * Import this module in protected boarder pages to enable readonly mode
 */

import { initializeAccessControl, isFeatureReadonly } from '../../shared/access-control.js';

// Pages that don't require acceptance (always accessible)
const ALWAYS_ACCESSIBLE_PAGES = [
  'find-a-room',
  'applications',
  'settings',
  'dashboard',
  'index',
  'room-detail',
  'confirm-application',
  'confirm-booking',
];

// Features that require acceptance
const PROTECTED_FEATURES = {
  payments: ['payments', 'payment-process'],
  messages: ['messages'],
  announcements: ['announcements'],
  lease: ['lease'],
  documents: ['documents'],
  maintenance: ['maintenance', 'boarder-maintenance'],
  houseRules: ['house-rules'],
};

/**
 * Check if current page requires acceptance
 * @returns {boolean}
 */
function isProtectedPage() {
  const currentPath = window.location.pathname;

  // Check if page is in always accessible list
  const isAccessible = ALWAYS_ACCESSIBLE_PAGES.some(page => currentPath.includes(page));

  if (isAccessible) {
    return false;
  }

  // Check if page is in protected features
  for (const [, pages] of Object.entries(PROTECTED_FEATURES)) {
    if (pages.some(page => currentPath.includes(page))) {
      return true;
    }
  }

  return false;
}

/**
 * Initialize access control for current page
 * Call this at the top of each boarder page module
 */
export async function initBoarderAccessControl() {
  // Only apply to protected pages
  if (!isProtectedPage()) {
    return { hasAccess: true, isProtected: false };
  }

  const result = await initializeAccessControl({
    requireAcceptance: true,
    allowedPages: ALWAYS_ACCESSIBLE_PAGES,
  });

  return { ...result, isProtected: true };
}

/**
 * Show empty state for protected content
 * @param {HTMLElement} container - Container element to show empty state in
 * @param {string} feature - Feature name (e.g., 'payments', 'messages')
 */
export function showProtectedEmptyState(container, feature) {
  if (!container) return;

  const messages = {
    payments: {
      title: 'Payment History Unavailable',
      description:
        'Your payment history will be available once your application is accepted by a landlord.',
      icon: 'creditCard',
    },
    messages: {
      title: 'Messages Unavailable',
      description:
        'You can send and receive messages once your application is accepted by a landlord.',
      icon: 'chatBubble',
    },
    announcements: {
      title: 'No Announcements',
      description:
        'Announcements from your landlord will appear here once your application is accepted.',
      icon: 'megaphone',
    },
    lease: {
      title: 'No Active Lease',
      description: 'Your lease information will be available once your application is accepted.',
      icon: 'document',
    },
    documents: {
      title: 'No Documents',
      description: 'Your rental documents will be available once your application is accepted.',
      icon: 'folder',
    },
    maintenance: {
      title: 'Maintenance Requests Unavailable',
      description: 'You can submit maintenance requests once your application is accepted.',
      icon: 'wrench',
    },
    houseRules: {
      title: 'House Rules Unavailable',
      description: 'House rules will be available once your application is accepted.',
      icon: 'clipboard',
    },
  };

  const config = messages[feature] || {
    title: 'Content Unavailable',
    description: 'This content will be available once your application is accepted.',
    icon: 'lock',
  };

  container.innerHTML = `
    <div class="boarder-readonly-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${getIconPath(config.icon)}
      </svg>
      <h3>${config.title}</h3>
      <p>${config.description}</p>
      <a href="./find-a-room/index.html" class="boarder-btn boarder-btn-primary">
        Find a Room
      </a>
    </div>
  `;
}

/**
 * Get SVG path for icon
 * @param {string} iconName
 * @returns {string}
 */
function getIconPath(iconName) {
  const icons = {
    creditCard:
      '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
    chatBubble: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    megaphone:
      '<path d="M3 11l18-5v12L3 13v-2z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>',
    document:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
    folder:
      '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
    wrench:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
    clipboard:
      '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
  };

  return icons[iconName] || icons.lock;
}

// Auto-initialize on module load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBoarderAccessControl);
} else {
  initBoarderAccessControl();
}

export { isFeatureReadonly };
