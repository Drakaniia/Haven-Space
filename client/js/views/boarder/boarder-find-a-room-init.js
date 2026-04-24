/**
 * Boarder Find a Room Initialization
 * Forces authenticated state for boarder users
 */

import { initFindARoomEnhanced } from '../public/find-a-room.js';

/**
 * Handle Google OAuth redirect with user data in hash fragment
 */
function handleGoogleOAuthRedirect() {
  try {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#auth=')) {
      const authData = hash.substring(6); // Remove '#auth='
      const decodedData = decodeURIComponent(authData);
      const userData = JSON.parse(decodedData);

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));

      // Also store a token if not already present (for compatibility)
      if (!localStorage.getItem('token')) {
        localStorage.setItem('token', 'google-oauth-token');
      }

      // Clean up the hash from URL
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );

      console.log('Google OAuth user data stored in localStorage:', userData);

      return userData; // Return the user data for immediate use
    }
  } catch (error) {
    console.error('Error handling Google OAuth redirect:', error);
  }

  return null; // No Google OAuth redirect handled
}

/**
 * Initialize boarder find-a-room with forced authentication
 */
export function initBoarderFindARoomAuth() {
  // Handle Google OAuth redirect first
  const googleUserData = handleGoogleOAuthRedirect();

  // Get user from localStorage (either from Google OAuth or existing)
  const user = googleUserData || JSON.parse(localStorage.getItem('user') || '{}');

  if (!user || !user.id) {
    // Redirect to login if not authenticated
    window.location.href = '../../public/auth/login.html';
    return;
  }

  // Force authenticated state before initializing
  const authState = {
    isAuthenticated: true,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
      email: user.email || '',
      initials: getInitials(user),
      avatarUrl: user.avatar_url || '',
      role: user.role || 'boarder',
    },
  };

  // Override loadState to always return authenticated state
  window.loadState = function () {
    return authState;
  };

  // Override getState to always return authenticated state
  window.getState = function () {
    return authState;
  };

  // Store auth state in localStorage for the public script to use
  localStorage.setItem('user', JSON.stringify(user));

  // Show authenticated UI immediately (before the script runs)
  showAuthenticatedUI(authState);

  // Initialize the enhanced find-a-room functionality FIRST
  initFindARoomEnhanced();

  // Wait for DOM to be fully ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Ensure UI stays visible after script initialization
      setTimeout(() => {
        showAuthenticatedUI(authState);
        fixPropertyLinks();
        ensureDropdownsWork(); // Ensure dropdowns are working
        initHeaderHoverBehavior(); // Initialize header hover behavior
        // Re-render icons after adding status
        if (window.initIconElements) {
          window.initIconElements();
        }
      }, 100);
    });
  } else {
    // DOM already loaded
    setTimeout(() => {
      showAuthenticatedUI(authState);
      fixPropertyLinks();
      ensureDropdownsWork(); // Ensure dropdowns are working
      initHeaderHoverBehavior(); // Initialize header hover behavior
      // Re-render icons after adding status
      if (window.initIconElements) {
        window.initIconElements();
      }
    }, 100);
  }

  // Set up mutation observer to fix links when properties are dynamically added
  setupLinkObserver();

  // Add additional delay to ensure status is added after all initialization
  setTimeout(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    addStatusToProfileDropdown(user);
    // Re-render icons one more time
    if (window.initIconElements) {
      window.initIconElements();
    }
  }, 500);
}

/**
 * Initialize header hover behavior for boarders
 * Allow the header to hide/show on hover like the public version
 */
function initHeaderHoverBehavior() {
  const header = document.getElementById('find-room-floating-header');
  if (!header) return;

  // Remove any forced visibility styles
  header.style.display = '';
  header.style.visibility = '';
  header.style.opacity = '';
  header.style.pointerEvents = '';
  header.style.transform = '';

  // Start with header hidden (let the existing hover system handle it)
  header.classList.remove('show');

  console.log('Header hover behavior initialized for boarder user');
}

/**
 * Ensure dropdown functionality is working
 * This is a fallback in case the main initialization doesn't attach event listeners
 */
function ensureDropdownsWork() {
  // First, ensure the header is visible and clickable
  const header = document.getElementById('find-room-floating-header');
  if (header) {
    header.classList.add('show');
    header.style.pointerEvents = 'auto';
  }

  // Status Dropdown
  const statusDropdownBtn = document.getElementById('status-dropdown-btn');
  const statusDropdownMenu = document.getElementById('status-dropdown-menu');
  const statusCloseBtn = document.getElementById('find-room-status-close');

  if (statusDropdownBtn && statusDropdownMenu) {
    // Remove any existing listeners by cloning and replacing
    const newStatusBtn = statusDropdownBtn.cloneNode(true);
    statusDropdownBtn.parentNode.replaceChild(newStatusBtn, statusDropdownBtn);

    // Ensure the button is clickable
    newStatusBtn.style.pointerEvents = 'auto';
    newStatusBtn.style.cursor = 'pointer';

    // Add click listener to toggle dropdown
    newStatusBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      statusDropdownMenu.classList.toggle('show');
      console.log('Status dropdown toggled:', statusDropdownMenu.classList.contains('show'));
    });

    // Close button
    if (statusCloseBtn) {
      const newCloseBtn = statusCloseBtn.cloneNode(true);
      statusCloseBtn.parentNode.replaceChild(newCloseBtn, statusCloseBtn);

      newCloseBtn.addEventListener('click', e => {
        e.stopPropagation();
        statusDropdownMenu.classList.remove('show');
      });
    }

    // Close when clicking outside
    document.addEventListener('click', e => {
      if (!newStatusBtn.contains(e.target) && !statusDropdownMenu.contains(e.target)) {
        statusDropdownMenu.classList.remove('show');
      }
    });

    console.log('Status dropdown initialized successfully');
  } else {
    console.warn('Status dropdown elements not found:', {
      btn: !!statusDropdownBtn,
      menu: !!statusDropdownMenu,
    });
  }

  // Profile Dropdown (ensure it works too)
  const profileDropdownBtn = document.getElementById('profile-dropdown-btn');
  const profileDropdownMenu = document.getElementById('profile-dropdown-menu');

  if (profileDropdownBtn && profileDropdownMenu) {
    // Remove any existing listeners by cloning and replacing
    const newProfileBtn = profileDropdownBtn.cloneNode(true);
    profileDropdownBtn.parentNode.replaceChild(newProfileBtn, profileDropdownBtn);

    // Ensure the button is clickable
    newProfileBtn.style.pointerEvents = 'auto';
    newProfileBtn.style.cursor = 'pointer';

    // Add click listener to toggle dropdown
    newProfileBtn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      profileDropdownMenu.classList.toggle('show');
      console.log('Profile dropdown toggled:', profileDropdownMenu.classList.contains('show'));
    });

    // Close when clicking outside
    document.addEventListener('click', e => {
      if (!newProfileBtn.contains(e.target) && !profileDropdownMenu.contains(e.target)) {
        profileDropdownMenu.classList.remove('show');
      }
    });

    console.log('Profile dropdown initialized successfully');
  } else {
    console.warn('Profile dropdown elements not found:', {
      btn: !!profileDropdownBtn,
      menu: !!profileDropdownMenu,
    });
  }
}

/**
 * Get user initials
 */
function getInitials(user) {
  const first = (user.first_name || '').trim().charAt(0).toUpperCase();
  const last = (user.last_name || '').trim().charAt(0).toUpperCase();
  return first + last || 'U';
}

/**
 * Show authenticated UI immediately
 */
function showAuthenticatedUI(authState) {
  // Show auth controls
  const authControls = document.getElementById('find-room-auth-controls');
  const guestControls = document.getElementById('find-room-guest-controls');
  if (authControls) authControls.style.display = 'flex';
  if (guestControls) guestControls.style.display = 'none';

  // Show auth hero
  const heroAuth = document.getElementById('find-room-hero-auth');
  const heroGuest = document.getElementById('find-room-hero-guest');
  if (heroAuth) heroAuth.style.display = 'block';
  if (heroGuest) heroGuest.style.display = 'none';

  // Update profile info
  updateUserProfile(authState.user);

  // Show floating header
  const header = document.getElementById('find-room-floating-header');
  if (header) {
    header.classList.add('show');
    header.style.display = 'block';
    header.style.visibility = 'visible';
    header.style.opacity = '1';
  }
}

/**
 * Update user profile in header
 */
function updateUserProfile(user) {
  if (!user) return;

  // Create full name from first_name and last_name
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';

  // Create initials from first and last name
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';

  // Update profile name
  const profileNames = document.querySelectorAll('.find-room-header-profile-name');
  profileNames.forEach(el => {
    el.textContent = fullName;
  });

  // Update profile avatar initials in dropdown
  const avatarEl = document.querySelector('.find-room-profile-menu-avatar');
  if (avatarEl) {
    avatarEl.textContent = initials;
  }

  // Update profile menu name
  const menuNames = document.querySelectorAll('.find-room-profile-menu-name');
  menuNames.forEach(el => {
    el.textContent = fullName;
  });

  // Update profile menu email
  const menuEmails = document.querySelectorAll('.find-room-profile-menu-email');
  menuEmails.forEach(el => {
    el.textContent = user.email || '';
  });

  // Update avatar image if available
  const avatarImg = document.querySelector('.find-room-header-profile-avatar');
  if (avatarImg && user.avatarUrl) {
    avatarImg.src = user.avatarUrl;
  }

  // Add status information to profile dropdown
  addStatusToProfileDropdown(user);
}

/**
 * Add status information to profile dropdown
 */
function addStatusToProfileDropdown(user) {
  const profileMenuHeader = document.querySelector('.find-room-profile-menu-header');
  if (!profileMenuHeader) {
    console.log('Profile menu header not found');
    return;
  }

  // Remove existing status if present
  const existingStatus = document.querySelector('.find-room-profile-status');
  if (existingStatus) {
    existingStatus.remove();
  }

  // Create status element
  const statusEl = document.createElement('div');
  statusEl.className = 'find-room-profile-status';

  // Get boarder status from user object
  const boarderStatus = user.boarderStatus || 'new';

  // Generate status content based on boarder status
  const statusContent = getStatusContent(boarderStatus);

  statusEl.innerHTML = statusContent;

  // Insert after the profile menu header
  const firstDivider = profileMenuHeader.nextElementSibling;
  if (firstDivider && firstDivider.classList.contains('find-room-profile-menu-divider')) {
    // Insert after the first divider
    firstDivider.parentNode.insertBefore(statusEl, firstDivider.nextSibling);
  } else {
    // Insert right after header
    profileMenuHeader.parentNode.insertBefore(statusEl, profileMenuHeader.nextSibling);
  }

  console.log('Status added to profile dropdown:', boarderStatus);
}

/**
 * Get status content HTML based on boarder status
 */
function getStatusContent(boarderStatus) {
  const statusConfig = {
    new: {
      icon: 'sparkles',
      label: 'New User',
      message: 'Start browsing properties',
      color: '#3b82f6', // blue
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    browsing: {
      icon: 'search',
      label: 'Browsing',
      message: 'Looking for properties',
      color: '#3b82f6', // blue
      bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    applied_pending: {
      icon: 'clock',
      label: 'Application Pending',
      message: 'Waiting for landlord response',
      color: '#f59e0b', // amber
      bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    pending_confirmation: {
      icon: 'checkCircle',
      label: 'Application Accepted',
      message: 'Confirm your booking now',
      color: '#10b981', // green
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    accepted: {
      icon: 'home',
      label: 'Active Tenant',
      message: 'You have a room',
      color: '#10b981', // green
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    rejected: {
      icon: 'xCircle',
      label: 'Application Not Accepted',
      message: 'Browse other properties',
      color: '#ef4444', // red
      bgColor: 'rgba(239, 68, 68, 0.1)',
    },
  };

  const config = statusConfig[boarderStatus] || statusConfig.new;

  return `
    <div class="find-room-profile-status-content" style="
      padding: 0.75rem 1rem;
      margin: 0.5rem 0;
      background: ${config.bgColor};
      border-left: 3px solid ${config.color};
      border-radius: 6px;
    ">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
        <span data-icon="${config.icon}" data-icon-width="16" data-icon-height="16" style="color: ${config.color};"></span>
        <span style="font-size: 0.875rem; font-weight: 600; color: ${config.color};">${config.label}</span>
      </div>
      <p style="font-size: 0.8125rem; color: var(--text-gray); margin: 0; padding-left: 1.5rem;">
        ${config.message}
      </p>
    </div>
  `;
}

/**
 * Fix property card links to point to the correct detail page
 */
function fixPropertyLinks() {
  const propertyLinks = document.querySelectorAll('.find-room-card-btn');
  propertyLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes('./rooms/detail.html')) {
      // Change from ./rooms/detail.html to ./detail.html
      link.setAttribute('href', href.replace('./rooms/detail.html', './detail.html'));
    }
  });
}

/**
 * Setup mutation observer to fix links when properties are dynamically added
 */
function setupLinkObserver() {
  const grid = document.getElementById('properties-grid');
  if (!grid) return;

  const observer = new MutationObserver(() => {
    fixPropertyLinks();
  });

  observer.observe(grid, {
    childList: true,
    subtree: true,
  });
}
