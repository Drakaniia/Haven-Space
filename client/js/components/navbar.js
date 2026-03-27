/**
 * Navbar Component
 * Reusable top navigation bar with search, theme toggle, notifications, and user avatar
 */

/**
 * Initialize navbar component
 * @param {Object} options - Configuration options
 * @param {string} options.containerId - ID of container element (default: 'navbar-container')
 * @param {Object} options.user - User info object with name, initials, avatarUrl
 * @param {number} options.notificationCount - Number of unread notifications
 */
export function initNavbar(options = {}) {
  const {
    containerId = 'navbar-container',
    user = {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      avatarUrl: '',
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

      // Update user info
      updateUserInfo(user, basePath);

      // Update notification count
      updateNotificationCount(notificationCount);

      // Setup event handlers
      setupSearchHandler();
      setupThemeToggle();
      setupNotificationHandler();
      setupUserMenu();
      setupKeyboardShortcuts();
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
 * Setup search input handler
 */
function setupSearchHandler() {
  const searchInput = document.getElementById('navbar-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const query = e.target.value.trim();
      // Emit custom event for search
      window.dispatchEvent(
        new CustomEvent('navbar:search', {
          detail: { query },
        })
      );
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const query = e.target.value.trim();
        // Emit custom event for search submit
        window.dispatchEvent(
          new CustomEvent('navbar:search:submit', {
            detail: { query },
          })
        );
      }
    });
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
  if (userBtn) {
    userBtn.addEventListener('click', () => {
      // Emit custom event for user menu
      window.dispatchEvent(new CustomEvent('navbar:user:click'));

      // Optional: Open user dropdown menu
      console.log('User menu clicked');
    });
  }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Cmd+K or Ctrl+K to focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('navbar-search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }

    // Escape to blur search
    if (e.key === 'Escape') {
      const searchInput = document.getElementById('navbar-search-input');
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
      }
    }
  });
}
