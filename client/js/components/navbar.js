/**
 * Navbar Component
 * Reusable top navigation bar with search, theme toggle, notifications, and user avatar
 */

import { getIcon } from '../shared/icons.js';

/**
 * Initialize navbar component
 * @param {Object} options - Configuration options
 * @param {string} options.containerId - ID of container element (default: 'navbar-container')
 * @param {Object} options.user - User info object with name, initials, avatarUrl, email
 * @param {number} options.notificationCount - Number of unread notifications
 */
export function initNavbar(options = {}) {
  const {
    containerId = 'navbar-container',
    user = {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      avatarUrl: '',
      email: 'juan@example.com',
    },
    notificationCount = 3,
  } = options;

  const container = document.getElementById(containerId);
  if (!container) return;

  // Calculate base path from URL depth
  const basePath = resolveBasePath();

  // Load navbar template
  fetch(`${basePath}/components/navbar.html`)
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      // Inject icons
      injectIcons();

      // Update user info
      updateUserInfo(user, basePath);

      // Update notification count
      updateNotificationCount(notificationCount);

      // Setup event handlers
      setupThemeToggle();
      setupNotificationHandler();
      setupUserMenu();
      setupUserMenuHandlers(user);
      setupDocumentClickHandler();
    })
    .catch(err => {
      console.error('Failed to load navbar template:', err);
    });
}

/**
 * Resolve base path based on current URL structure
 * @returns {string} Base path for asset resolution
 */
function resolveBasePath() {
  const path = window.location.pathname;
  if (path.includes('/client/views/')) return '/client';
  if (path.includes('/frontend/views/')) return '/frontend';
  if (path.includes('/views/')) return '';
  return '';
}

/**
 * Inject icons into placeholder elements
 */
function injectIcons() {
  const placeholders = document.querySelectorAll('.navbar-icon-placeholder');

  placeholders.forEach(placeholder => {
    const iconName = placeholder.dataset.icon;
    if (iconName) {
      placeholder.outerHTML = getIcon(iconName, {
        className: 'navbar-icon',
        width: 24,
        height: 24,
      });
    }
  });
}

/**
 * Update user profile info
 */
function updateUserInfo(user, basePath) {
  const avatarImg = document.getElementById('navbar-avatar-img');
  if (avatarImg) {
    // Use provided avatarUrl or default to sample.png
    const avatarSource =
      user.avatarUrl && user.avatarUrl.trim()
        ? user.avatarUrl
        : `${basePath}/assets/images/sample.png`;
    avatarImg.src = avatarSource;
    console.log('Navbar: Avatar image source:', avatarSource);
  }
}

/**
 * Update notification count badge
 */
function updateNotificationCount(count) {
  const badge = document.getElementById('navbar-notification-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

/**
 * Setup theme toggle button
 */
function setupThemeToggle() {
  const themeToggle = document.getElementById('navbar-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      // Emit custom event for theme toggle
      window.dispatchEvent(new CustomEvent('navbar:theme:toggle'));

      // Optional: Add your theme toggle logic here
      // For now, just log the action
      console.log('Theme toggle clicked');
    });
  }
}

/**
 * Setup notification button handler
 */
function setupNotificationHandler() {
  const notificationsBtn = document.getElementById('navbar-notifications');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', () => {
      // Emit custom event for notifications
      window.dispatchEvent(new CustomEvent('navbar:notifications:click'));

      // Optional: Navigate to notifications page or open dropdown
      console.log('Notifications clicked');
    });
  }
}

/**
 * Setup user avatar menu handler
 */
function setupUserMenu() {
  const userBtn = document.getElementById('navbar-user');
  const userMenu = document.getElementById('navbar-user-menu');

  if (userBtn && userMenu) {
    userBtn.addEventListener('click', e => {
      e.stopPropagation();
      userMenu.classList.toggle('show');

      // Emit custom event for user menu
      window.dispatchEvent(
        new CustomEvent('navbar:user:click', {
          detail: { isOpen: userMenu.classList.contains('show') },
        })
      );
    });
  }
}

/**
 * Setup user menu item handlers
 * @param {Object} user - User info object
 */
function setupUserMenuHandlers(user) {
  // Update user menu info
  const menuAvatar = document.getElementById('navbar-user-menu-avatar');
  const menuName = document.getElementById('navbar-user-menu-name');
  const menuEmail = document.getElementById('navbar-user-menu-email');

  if (menuAvatar) menuAvatar.textContent = user.initials || 'JD';
  if (menuName) menuName.textContent = user.name || 'Juan Dela Cruz';
  if (menuEmail) menuEmail.textContent = user.email || 'juan@example.com';

  // Profile menu item
  const profileBtn = document.getElementById('navbar-menu-profile');
  if (profileBtn) {
    profileBtn.addEventListener('click', e => {
      e.preventDefault();
      console.log('Profile clicked');
      window.dispatchEvent(new CustomEvent('navbar:user:profile:click'));
      closeUserMenu();
    });
  }

  // Settings menu item
  const settingsBtn = document.getElementById('navbar-menu-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', e => {
      e.preventDefault();
      console.log('Settings clicked');
      window.dispatchEvent(new CustomEvent('navbar:user:settings:click'));
      closeUserMenu();
    });
  }

  // Logout menu item
  const logoutBtn = document.getElementById('navbar-menu-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async e => {
      e.preventDefault();
      console.log('Logout clicked');

      try {
        const basePath = resolveBasePath();
        const configPath = `${basePath}/js/config.js`;
        const { default: CONFIG } = await import(configPath);

        await fetch(`${CONFIG.API_BASE_URL}/auth/logout.php`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }

      window.dispatchEvent(new CustomEvent('navbar:user:logout:click'));
      closeUserMenu();

      // Clear authentication data
      localStorage.removeItem('user');

      const basePath = resolveBasePath();
      // Use correct path for production vs development mode
      if (basePath === '') {
        // Production mode (dist): auth folder is at root
        window.location.href = '/auth/login.html';
      } else {
        // Development mode (client): auth folder is in views/public
        window.location.href = `${basePath}/views/public/auth/login.html`;
      }
    });
  }
}

/**
 * Close user menu
 */
function closeUserMenu() {
  const userMenu = document.getElementById('navbar-user-menu');
  if (userMenu) {
    userMenu.classList.remove('show');
  }
}

/**
 * Setup document click handler to close menu when clicking outside
 */
function setupDocumentClickHandler() {
  document.addEventListener('click', e => {
    const userMenu = document.getElementById('navbar-user-menu');
    const userBtn = document.getElementById('navbar-user');

    if (userMenu && userBtn && !userBtn.contains(e.target) && !userMenu.contains(e.target)) {
      closeUserMenu();
    }
  });
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  // Keyboard shortcuts removed - search bar no longer in navbar
}
