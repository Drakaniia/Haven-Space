/**
 * Landlord Permission Helper
 *
 * Centralized utility for checking landlord verification status
 * and enforcing read-only mode on the dashboard.
 */

const API_BASE = window.location.origin;

/**
 * Check if the current user is a verified landlord.
 * Calls /api/auth/me.php and returns the user payload.
 *
 * @returns {Promise<{isVerified: boolean, user: Object|null}>}
 */
export async function checkLandlordVerification() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me.php`, {
      credentials: 'include',
    });

    if (!res.ok) {
      return { isVerified: false, user: null };
    }

    const data = await res.json();
    const user = data.user || data;

    return {
      isVerified: Boolean(user.is_verified),
      user,
    };
  } catch {
    return { isVerified: false, user: null };
  }
}

/**
 * Inject the pending verification banner into the landlord dashboard.
 * Should be called after the DOM is ready.
 */
export function showPendingBanner() {
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
    </div>
  `;

  // Insert at the top of the content area
  const contentArea = document.querySelector('.landlord-content');
  if (contentArea) {
    contentArea.prepend(banner);
  }
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
 * Returns the user object for further use.
 *
 * @returns {Promise<Object|null>}
 */
export async function initLandlordPermissions() {
  const { isVerified, user } = await checkLandlordVerification();

  if (user && user.role === 'landlord' && !isVerified) {
    showPendingBanner();
    // Small delay to ensure all dynamic content is rendered before disabling
    requestAnimationFrame(() => {
      disableWriteActions();
    });
  }

  return user;
}
