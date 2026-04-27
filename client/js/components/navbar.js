/**
 * Navbar Component
 * Reusable top navigation bar with search, theme toggle, notifications, and user avatar
 */

import {
  getDisplayName,
  getUserInitials,
  getAvatarUrl,
  updateProfileElements,
} from '../shared/profile-utils.js';
import { getCurrentTheme, toggleTheme, isDarkTheme } from '../shared/theme-manager.js';

/**
 * Initialize navbar component
 * @param {Object} options - Configuration options
 * @param {string} options.containerId - ID of container element (default: 'navbar-container')
 * @param {Object} options.user - User info object with name, initials, avatarUrl, email
 */
export function initNavbar(options = {}) {
  const { containerId = 'navbar-container', user = null } = options;

  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  // Get user from localStorage if not provided
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');

  // Calculate base path from URL depth
  const basePath = resolveBasePath();

  // Load navbar template
  fetch(`${basePath}/components/navbar.html`)
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      // Update user info with real profile data
      updateUserInfo(currentUser, basePath);

      // Setup event handlers
      setupThemeToggle();
      setupNotificationHandler();
      setupNotificationPopup();
      setupUserMenu();
      setupUserMenuHandlers(currentUser);
      setupDocumentClickHandler();
      setupSidebarToggle();
    })
    .catch(() => {
      // Failed to load navbar template
    });
}

/**
 * Resolve base path based on current URL structure
 * @returns {string} Base path for asset resolution
 */
function resolveBasePath() {
  const path = window.location.pathname;
  if (path.includes('/views/')) {
    return '';
  }
  if (path.includes('/frontend/views/')) {
    return '/frontend';
  }
  if (path.includes('/views/')) {
    return '';
  }
  return '';
}

/**
 * Update user profile info
 */
function updateUserInfo(user, basePath) {
  const avatarImg = document.getElementById('navbar-avatar-img');
  if (avatarImg) {
    avatarImg.src = getAvatarUrl(user, basePath);
    avatarImg.alt = `${getDisplayName(user)} Avatar`;
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
  if (!themeToggle) return;

  const iconLight = document.getElementById('navbar-theme-icon-light');
  const iconDark = document.getElementById('navbar-theme-icon-dark');

  // Update icons based on current theme
  function updateThemeIcons() {
    const isDark = isDarkTheme();
    if (iconLight && iconDark) {
      iconLight.style.display = isDark ? 'none' : '';
      iconDark.style.display = isDark ? '' : 'none';

      // Update aria-label
      themeToggle.setAttribute(
        'aria-label',
        isDark ? 'Switch to light mode' : 'Switch to dark mode'
      );

      // Update alt text
      iconLight.alt = 'Switch to dark mode';
      iconDark.alt = 'Switch to light mode';
    }
  }

  // Set initial state
  updateThemeIcons();

  // Handle theme toggle click
  themeToggle.addEventListener('click', () => {
    const newTheme = toggleTheme();
    updateThemeIcons();

    // Dispatch navbar-specific theme toggle event
    window.dispatchEvent(
      new CustomEvent('navbar:theme:toggle', {
        detail: { theme: newTheme },
      })
    );
  });

  // Listen for external theme changes
  window.addEventListener('theme:changed', () => {
    updateThemeIcons();
  });
}

/**
 * Setup notification button handler
 */
function setupNotificationHandler() {
  const notificationsBtn = document.getElementById('navbar-notifications');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', () => {
      // Notifications event dispatched
      window.dispatchEvent(new CustomEvent('navbar:notifications:click'));
    });
  }
}

/**
 * Setup notification popup handler
 */
function setupNotificationPopup() {
  const notificationsBtn = document.getElementById('navbar-notifications');
  const notificationMenu = document.getElementById('navbar-notification-menu');

  if (notificationsBtn && notificationMenu) {
    notificationsBtn.addEventListener('click', e => {
      e.stopPropagation();
      notificationMenu.classList.toggle('show');

      // Emit custom event for notification menu
      window.dispatchEvent(
        new CustomEvent('navbar:notification:menu:click', {
          detail: { isOpen: notificationMenu.classList.contains('show') },
        })
      );
    });
  }

  // Setup clear notifications button
  const clearBtn = document.getElementById('navbar-clear-notifications');
  if (clearBtn) {
    clearBtn.addEventListener('click', e => {
      e.stopPropagation();
      markAllAsRead();
    });
  }

  // Setup view all notifications link
  const viewAllLink = document.getElementById('navbar-view-all-notifications');
  if (viewAllLink) {
    viewAllLink.addEventListener('click', e => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('navbar:notification:view:click'));
      closeNotificationMenu();
    });
  }
}

/**
 * Render notification items in the popup
 * @param {Array} notifications - Array of notification objects
 */
function renderNotifications(notifications) {
  const list = document.getElementById('navbar-notification-list');
  if (!list) return;

  if (!notifications || notifications.length === 0) {
    list.innerHTML = `
      <div class="navbar-notification-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <div class="navbar-notification-empty-text">No notifications yet</div>
      </div>
    `;
    return;
  }

  list.innerHTML = notifications
    .map(
      notification => `
    <div class="navbar-notification-item ${notification.unread ? 'unread' : ''}" data-id="${
        notification.id
      }">
      <div class="navbar-notification-icon ${notification.type}">
        <span data-notification-icon="${notification.icon}"></span>
      </div>
      <div class="navbar-notification-content">
        <div class="navbar-notification-title">${notification.title}</div>
        <div class="navbar-notification-description">${notification.description}</div>
        <div class="navbar-notification-time">${notification.time}</div>
      </div>
    </div>
  `
    )
    .join('');

  // Inject icons into notification items
  list.querySelectorAll('[data-notification-icon]').forEach(placeholder => {
    const iconName = placeholder.dataset.notificationIcon;
    if (iconName) {
      // Replace with a simple text-based icon or remove entirely
      placeholder.textContent = iconName;
    }
  });

  // Setup click handlers for notification items
  list.querySelectorAll('.navbar-notification-item').forEach(item => {
    item.addEventListener('click', () => {
      const notificationId = parseInt(item.dataset.id);
      window.dispatchEvent(
        new CustomEvent('navbar:notification:click', {
          detail: { id: notificationId },
        })
      );

      // Optimistically mark as read in UI
      if (item.classList.contains('unread')) {
        item.classList.remove('unread');
        updateUnreadCount(-1);

        // Call API to persist
        import('../shared/notifications.js')
          .then(({ markNotificationAsRead }) => markNotificationAsRead(notificationId))
          .catch(() => {
            // Revert UI on failure
            item.classList.add('unread');
            updateUnreadCount(1);
          });
      }
    });
  });
}

/**
 * Mark all notifications as read
 */
function markAllAsRead() {
  const list = document.getElementById('navbar-notification-list');
  if (!list) return;

  const unreadItems = list.querySelectorAll('.navbar-notification-item.unread');
  const count = unreadItems.length;

  if (count === 0) return;

  // Optimistically update UI
  unreadItems.forEach(item => {
    item.classList.remove('unread');
  });
  updateUnreadCount(-count);

  // Call API
  import('../shared/notifications.js')
    .then(({ markAllNotificationsAsRead }) => markAllNotificationsAsRead())
    .catch(() => {
      // Revert UI on failure
      unreadItems.forEach(item => item.classList.add('unread'));
      updateUnreadCount(count);
    });

  window.dispatchEvent(new CustomEvent('navbar:notification:markAllRead'));
}

/**
 * Update unread notification count
 * @param {number} change - Number to change count by (can be negative)
 */
function updateUnreadCount(change) {
  const badge = document.getElementById('navbar-notification-badge');
  if (!badge) return;

  const currentCount = parseInt(badge.textContent) || 0;
  const newCount = Math.max(0, currentCount + change);

  if (newCount > 0) {
    badge.textContent = newCount > 99 ? '99+' : newCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

/**
 * Close notification menu
 */
function closeNotificationMenu() {
  const notificationMenu = document.getElementById('navbar-notification-menu');
  if (notificationMenu) {
    notificationMenu.classList.remove('show');
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
  // Update user menu info with real profile data
  const menuAvatar = document.getElementById('navbar-user-menu-avatar');
  const menuName = document.getElementById('navbar-user-menu-name');
  const menuEmail = document.getElementById('navbar-user-menu-email');

  if (menuAvatar) {
    menuAvatar.textContent = getUserInitials(user);
  }
  if (menuName) {
    menuName.textContent = getDisplayName(user);
  }
  if (menuEmail) {
    menuEmail.textContent = user.email || '';
  }

  // Profile menu item
  const profileBtn = document.getElementById('navbar-menu-profile');
  if (profileBtn) {
    profileBtn.addEventListener('click', e => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('navbar:user:profile:click'));
      closeUserMenu();
    });
  }

  // Settings menu item
  const settingsBtn = document.getElementById('navbar-menu-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', e => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('navbar:user:settings:click'));
      closeUserMenu();
    });
  }

  // Logout menu item
  const logoutBtn = document.getElementById('navbar-menu-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async e => {
      e.preventDefault();

      try {
        const basePath = resolveBasePath();
        const configPath = `${basePath}/js/config.js`;
        const { default: CONFIG } = await import(configPath);

        await fetch(`${CONFIG.API_BASE_URL}/auth/logout.php`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        // Logout request failed - continue with local cleanup anyway
      }

      window.dispatchEvent(new CustomEvent('navbar:user:logout:click'));
      closeUserMenu();

      // Clear authentication data
      localStorage.removeItem('user');

      // Store logout message in sessionStorage to display after redirect
      sessionStorage.setItem('logoutToast', 'You have successfully logged out');
      sessionStorage.setItem('logoutToastType', 'success');

      // Redirect to login page
      const pathname = window.location.pathname;

      // Determine correct login path based on current URL structure
      if (pathname.includes('/dist/')) {
        // Production mode (dist): auth folder is at root
        window.location.href = '/auth/login.html';
      } else if (pathname.includes('/views/')) {
        // Direct /views access
        window.location.href = '/views/public/auth/login.html';
      } else {
        // Fallback: try development path
        window.location.href = '/views/public/auth/login.html';
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
 * Setup document click handler to close menus when clicking outside
 */
function setupDocumentClickHandler() {
  document.addEventListener('click', e => {
    const userMenu = document.getElementById('navbar-user-menu');
    const userBtn = document.getElementById('navbar-user');
    const notificationMenu = document.getElementById('navbar-notification-menu');
    const notificationBtn = document.getElementById('navbar-notifications');

    // Close user menu
    if (userMenu && userBtn && !userBtn.contains(e.target) && !userMenu.contains(e.target)) {
      closeUserMenu();
    }

    // Close notification menu
    if (
      notificationMenu &&
      notificationBtn &&
      !notificationBtn.contains(e.target) &&
      !notificationMenu.contains(e.target)
    ) {
      closeNotificationMenu();
    }
  });
}

/**
 * Setup sidebar toggle button handler
 */
function setupSidebarToggle() {
  const sidebarToggle = document.getElementById('navbar-sidebar-toggle');
  if (!sidebarToggle) return;

  const iconLeft = document.getElementById('navbar-sidebar-icon-left');
  const iconRight = document.getElementById('navbar-sidebar-icon-right');

  // Reflect initial collapsed state
  const isInitiallyCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (iconLeft && iconRight) {
    iconLeft.style.display = isInitiallyCollapsed ? 'none' : '';
    iconRight.style.display = isInitiallyCollapsed ? '' : 'none';
  }

  sidebarToggle.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('navbar:sidebar:toggle'));
    if (iconLeft && iconRight) {
      const nowCollapsed = iconLeft.style.display !== 'none';
      iconLeft.style.display = nowCollapsed ? 'none' : '';
      iconRight.style.display = nowCollapsed ? '' : 'none';
    }
  });
}

/**
 * Setup keyboard shortcuts
 */

/**
 * Update navbar notification count and list from API
 * Call this after initNavbar to populate real notifications
 */
export async function updateNavbarNotifications() {
  try {
    const { fetchNotifications } = await import('../shared/notifications.js');

    const result = await fetchNotifications(10);
    const notifications = result.data || [];
    const unreadCount = result.unread_count || 0;

    // Update badge
    updateNotificationCount(unreadCount);

    // Transform API notifications for navbar display
    const formattedNotifications = notifications.map(n => ({
      id: n.id,
      type: getNotificationType(n.type),
      icon: getNotificationIcon(n.type),
      title: n.title,
      description: n.message || '',
      time: timeAgo(n.created_at),
      unread: !n.is_read,
    }));

    renderNotifications(formattedNotifications);
  } catch {
    // Failed to fetch notifications - leave defaults
  }
}

/**
 * Map notification type to display type
 */
function getNotificationType(type) {
  const map = {
    application_accepted: 'success',
    application_rejected: 'warning',
    maintenance_status_change: 'info',
    maintenance_new_request: 'info',
    maintenance_comment: 'info',
    system: 'info',
  };
  return map[type] || 'info';
}

/**
 * Map notification type to icon name
 */
function getNotificationIcon(type) {
  const map = {
    application_accepted: 'checkCircle',
    application_rejected: 'xCircle',
    maintenance_status_change: 'wrench',
    maintenance_new_request: 'exclamationTriangle',
    maintenance_comment: 'chatBubble',
    system: 'informationCircle',
  };
  return map[type] || 'bell';
}

/**
 * Format timestamp to human-readable time ago
 */
function timeAgo(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}
