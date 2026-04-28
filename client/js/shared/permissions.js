/**
 * Landlord Permission Helper
 *
 * Centralized utility for checking landlord verification status
 * and enforcing read-only mode on the dashboard.
 */

import CONFIG from '../config.js';
import { getAuthHeadersOnly } from './auth-headers.js';

/**
 * Check if the current user is a verified landlord.
 * Calls /api/auth/me.php and returns the user payload.
 *
 * @returns {Promise<{isVerified: boolean, user: Object|null}>}
 */
export async function checkLandlordVerification() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
      headers: getAuthHeadersOnly(),
      credentials: 'include',
    });

    if (!res.ok) {
      return { isVerified: false, user: null };
    }

    const data = await res.json();
    const user = data.user || data;

    // For landlords, check verification_status field
    // is_verified is for email verification, verification_status is for admin approval
    const isVerified =
      user.role === 'landlord'
        ? user.verification_status === 'approved'
        : Boolean(user.is_verified);

    return {
      isVerified: isVerified,
      user,
    };
  } catch {
    return { isVerified: false, user: null };
  }
}

/**
 * Show welcome message banner for newly signed-up landlords
 * Displays a welcome message with information about account verification
 * and read-only access while waiting for admin approval.
 *
 * @param {Object} user - User object from /auth/me.php
 */
export function showWelcomeBanner(user) {
  // Avoid duplicate banners
  if (document.getElementById('landlord-welcome-banner')) return;

  const firstName = user?.first_name || 'Landlord';

  const banner = document.createElement('div');
  banner.id = 'landlord-welcome-banner';
  banner.className = 'landlord-welcome-banner';
  banner.innerHTML = `
    <div class="landlord-welcome-banner-content">
      <div class="landlord-welcome-banner-header">
        <div class="landlord-welcome-banner-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="landlord-welcome-banner-text">
          <h3>Welcome to Haven Space, ${firstName}! 🎉</h3>
          <p>Thank you for joining Haven Space as a landlord. Your account is currently being verified by our admin team.</p>
        </div>
      </div>
      <div class="landlord-welcome-banner-body">
        <div class="landlord-welcome-features">
          <div class="landlord-welcome-feature">
            <div class="landlord-welcome-feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="landlord-welcome-feature-text">
              <strong>What happens next?</strong>
              <p>Our super admin team will verify your account within 24-48 hours.</p>
            </div>
          </div>
          <div class="landlord-welcome-feature">
            <div class="landlord-welcome-feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div class="landlord-welcome-feature-text">
              <strong>Feel free to browse!</strong>
              <p>While we verify your account, you can explore all features and view your dashboard in read-only mode.</p>
            </div>
          </div>
          <div class="landlord-welcome-feature">
            <div class="landlord-welcome-feature-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div class="landlord-welcome-feature-text">
              <strong>Read-only access</strong>
              <p>You can view properties and settings, but cannot create listings or modify data until verified.</p>
            </div>
          </div>
        </div>
      </div>
      <button class="landlord-welcome-banner-close" aria-label="Close welcome banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;

  // Insert at the top of the content area
  const contentArea = document.querySelector('.landlord-content');
  if (contentArea) {
    contentArea.prepend(banner);
  }

  // Close button handler
  const closeBtn = banner.querySelector('.landlord-welcome-banner-close');
  closeBtn.addEventListener('click', () => {
    banner.classList.add('banner-closing');
    setTimeout(() => {
      banner.remove();
      // Store in localStorage so we don't show it again
      localStorage.setItem('landlordWelcomeDismissed', 'true');
    }, 300);
  });

  // Auto-dismiss after 30 seconds
  const autoDismissTimeout = setTimeout(() => {
    if (document.getElementById('landlord-welcome-banner')) {
      banner.classList.add('banner-closing');
      setTimeout(() => {
        banner.remove();
        localStorage.setItem('landlordWelcomeDismissed', 'true');
      }, 300);
    }
  }, 30000);

  // Store timeout ID for cleanup
  banner._autoDismissTimeout = autoDismissTimeout;
}

/**
 * Show success notification when account is verified
 * @param {Function} [onDismiss] - Optional callback when notification is dismissed
 */
export function showVerificationSuccess(onDismiss) {
  // Remove any existing verification notifications
  const existing = document.getElementById('verification-success-notification');
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'verification-success-notification';
  notification.className = 'verification-success-notification';
  notification.innerHTML = `
    <div class="verification-success-content">
      <div class="verification-success-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <div class="verification-success-text">
        <strong>🎉 Your account has been verified!</strong>
        <p>You now have full access to manage your properties.</p>
      </div>
    </div>
    <button class="verification-success-close" aria-label="Close notification">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  // Insert at the top of the content area
  const contentArea = document.querySelector('.landlord-content');
  if (contentArea) {
    contentArea.prepend(notification);
  }

  // Remove pending banner if it exists
  const pendingBanner = document.getElementById('landlord-pending-banner');
  if (pendingBanner) {
    pendingBanner.remove();
  }

  // Re-enable all disabled actions
  enableWriteActions();

  // Auto dismiss after 10 seconds
  const autoDismissTimeout = setTimeout(() => {
    dismissNotification(notification, onDismiss);
  }, 10000);

  // Close button handler
  const closeBtn = notification.querySelector('.verification-success-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(autoDismissTimeout);
    dismissNotification(notification, onDismiss);
  });
}

/**
 * Dismiss verification success notification
 * @param {HTMLElement} notification - Notification element to remove
 * @param {Function} [onDismiss] - Optional callback
 */
function dismissNotification(notification, onDismiss) {
  notification.classList.add('notification-dismissed');
  setTimeout(() => {
    notification.remove();
    if (onDismiss) onDismiss();
  }, 300);
}

/**
 * Enable all write-action elements that were previously disabled
 */
export function enableWriteActions() {
  const writeSelectors = [
    '.landlord-btn-primary',
    '.landlord-btn-success',
    '.landlord-btn-danger',
    '.landlord-quick-actions .landlord-action-btn',
    '.landlord-payment-actions .landlord-btn',
    '.landlord-application-actions .landlord-btn-success',
    '.landlord-application-actions .landlord-btn-danger',
    '.landlord-property-actions .landlord-btn',
    '.landlord-topbar-actions .landlord-btn',
  ];

  const selector = writeSelectors.join(', ');
  const elements = document.querySelectorAll(selector);

  elements.forEach(el => {
    // Enable buttons
    if (el.tagName === 'BUTTON') {
      el.disabled = false;
    }

    // Remove click prevention for links
    if (el.tagName === 'A') {
      el.removeEventListener('click', preventAction);
      el.removeAttribute('aria-disabled');
    }

    // Remove visual indicator
    el.classList.remove('landlord-action-disabled');
    el.removeAttribute('title');
  });
}

/**
 * Inject the pending verification banner into the landlord dashboard.
 * Should be called after the DOM is ready.
 * @param {Function} [onRefresh] - Optional callback when refresh button is clicked
 * @param {boolean} [showWelcome] - Whether to show welcome message first
 * @param {Object} [user] - User object for welcome banner
 */
export function showPendingBanner(onRefresh, showWelcome = false, user = null) {
  // Show welcome banner first if it's a new landlord and hasn't been dismissed
  if (showWelcome && user && !localStorage.getItem('landlordWelcomeDismissed')) {
    showWelcomeBanner(user);
  }

  // Avoid duplicate banners
  if (document.getElementById('landlord-pending-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'landlord-pending-banner';
  banner.className = 'landlord-pending-banner';
  banner.innerHTML = `
    <div class="landlord-pending-banner-content">
      <div class="landlord-pending-banner-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="landlord-pending-banner-text">
        <strong>Account Pending Verification</strong>
        <p>Your landlord account is under review. You currently have <strong>read-only access</strong> — you can view your profile and property details, but cannot create listings, modify properties, accept applications, or process payments. A super admin will review your account shortly.</p>
      </div>
      <button class="landlord-pending-banner-refresh" aria-label="Check verification status" title="Check verification status">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.88-3.36L23 10"/>
          <path d="M20.49 15a9 9 0 0 1-14.88 3.36L1 14"/>
        </svg>
        <span>Check Status</span>
      </button>
    </div>
  `;

  // Insert at the top of the content area
  const contentArea = document.querySelector('.landlord-content');
  if (contentArea) {
    contentArea.prepend(banner);
  }

  // Refresh button handler
  const refreshBtn = banner.querySelector('.landlord-pending-banner-refresh');
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.classList.add('refreshing');

    if (onRefresh) {
      await onRefresh();
    }

    // Re-check verification status
    const { isVerified } = await checkLandlordVerification();
    if (isVerified) {
      showVerificationSuccess();
    } else {
      showToast(
        'Your account is still pending verification. Please wait for admin approval.',
        'info'
      );
    }

    refreshBtn.disabled = false;
    refreshBtn.classList.remove('refreshing');
  });
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('error', 'success', 'warning', 'info')
 */
function showToast(message, type = 'error') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const iconMap = {
    error: 'exclamationCircle',
    success: 'checkCircle',
    warning: 'exclamationTriangle',
    info: 'informationCircle',
  };

  const iconSvg = {
    exclamationCircle:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    checkCircle:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    exclamationTriangle:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    informationCircle:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  toast.innerHTML = `
    <div class="toast-icon">
      ${iconSvg[iconMap[type] || 'exclamationCircle']}
    </div>
    <div class="toast-content">${message}</div>
    <button class="toast-close" aria-label="Close notification">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto remove after 5 seconds
  const autoRemoveTimeout = setTimeout(() => {
    removeToast(toast);
  }, 5000);

  // Close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(autoRemoveTimeout);
    removeToast(toast);
  });

  // Click outside to close
  toast.addEventListener('click', e => {
    if (e.target === toast) {
      clearTimeout(autoRemoveTimeout);
      removeToast(toast);
    }
  });
}

/**
 * Remove toast notification
 * @param {HTMLElement} toast - Toast element to remove
 */
function removeToast(toast) {
  toast.classList.remove('toast-visible');
  setTimeout(() => {
    toast.remove();
  }, 300);
}

/**
 * Disable all write-action elements on the landlord dashboard.
 * Targets buttons, links, and interactive elements that perform write operations.
 */
export function disableWriteActions() {
  // Selectors for elements that should be disabled in read-only mode
  const writeSelectors = [
    // Buttons with write actions
    '.landlord-btn-primary',
    '.landlord-btn-success',
    '.landlord-btn-danger',
    // Quick action buttons (Create Listing, Record Payment, Send Announcement)
    '.landlord-quick-actions .landlord-action-btn',
    // Payment action buttons
    '.landlord-payment-actions .landlord-btn',
    // Application action buttons (Approve, Reject)
    '.landlord-application-actions .landlord-btn-success',
    '.landlord-application-actions .landlord-btn-danger',
    // Property edit buttons
    '.landlord-property-actions .landlord-btn',
    // Top bar action buttons
    '.landlord-topbar-actions .landlord-btn',
  ];

  const selector = writeSelectors.join(', ');
  const elements = document.querySelectorAll(selector);

  elements.forEach(el => {
    // Disable buttons
    if (el.tagName === 'BUTTON') {
      el.disabled = true;
    }

    // For links, prevent navigation
    if (el.tagName === 'A') {
      el.addEventListener('click', preventAction);
      el.setAttribute('aria-disabled', 'true');
    }

    // Visual indicator
    el.classList.add('landlord-action-disabled');
    el.setAttribute('title', 'Action unavailable — account pending verification');
  });
}

/**
 * Prevent default action and show a tooltip/message
 */
function preventAction(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Full initialization: check verification and apply restrictions if needed.
 * Sets up auto-refresh polling to detect when admin approves account.
 * Returns the user object for further use.
 *
 * @returns {Promise<Object|null>}
 */
export async function initLandlordPermissions() {
  const { isVerified, user } = await checkLandlordVerification();

  if (user && user.role === 'landlord' && !isVerified) {
    // Check if this is a newly signed-up landlord
    const isNewLandlord = localStorage.getItem('landlordStatus') === 'new';
    const shouldShowWelcome = isNewLandlord && !localStorage.getItem('landlordWelcomeDismissed');

    // Clear the new landlord status after checking
    if (isNewLandlord) {
      localStorage.removeItem('landlordStatus');
    }

    // Store last known status for change detection
    let lastKnownStatus = false;

    // Show pending banner with refresh callback, and welcome banner if new landlord
    showPendingBanner(
      async () => {
        // This callback runs when user clicks "Check Status" button
        const { isVerified: newStatus } = await checkLandlordVerification();
        if (newStatus && !lastKnownStatus) {
          showVerificationSuccess();
          lastKnownStatus = true;
          stopAutoRefresh();
        }
        lastKnownStatus = newStatus;
      },
      shouldShowWelcome,
      user
    );

    // Small delay to ensure all dynamic content is rendered before disabling
    requestAnimationFrame(() => {
      disableWriteActions();
    });

    // Set up auto-refresh polling every 30 seconds
    const pollingInterval = setInterval(async () => {
      const { isVerified: currentStatus } = await checkLandlordVerification();

      if (currentStatus && !lastKnownStatus) {
        // Account was just verified!
        showVerificationSuccess();
        lastKnownStatus = true;
        stopAutoRefresh();
      }

      lastKnownStatus = currentStatus;
    }, 30000); // Check every 30 seconds

    // Store interval ID for cleanup
    window._verificationPollingInterval = pollingInterval;
  } else if (user && user.role === 'landlord' && isVerified) {
    // User is already verified - could show a welcome back message here
  }

  return user;
}

/**
 * Stop the auto-refresh polling
 */
function stopAutoRefresh() {
  if (window._verificationPollingInterval) {
    clearInterval(window._verificationPollingInterval);
    window._verificationPollingInterval = null;
  }
}
