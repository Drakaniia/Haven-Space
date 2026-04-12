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
 * @param {Array} options.notifications - Array of notification objects
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
    notifications = getDefaultNotifications(),
  } = options;

  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

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

      // Render notification list
      renderNotifications(notifications);

      // Setup event handlers
      setupThemeToggle();
      setupNotificationHandler();
      setupNotificationPopup();
      setupUserMenu();
      setupUserMenuHandlers(user);
      setupDocumentClickHandler();
      setupSidebarToggle();
    })
    .catch(() => {
      // Failed to load navbar template
    });
}

/**
 * Get default notifications for demo
 * @returns {Array} Array of notification objects
 */
function getDefaultNotifications() {
  return [
    {
      id: 1,
      type: 'success',
      icon: 'checkCircle',
      title: 'Payment Received',
      description: 'Your payment of ₱5,000 has been successfully processed.',
      time: '2 minutes ago',
      unread: true,
    },
    {
      id: 2,
      type: 'info',
      icon: 'informationCircle',
      title: 'New Message',
      description: 'You have a new message from your landlord regarding Room 204.',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: 3,
      type: 'warning',
      icon: 'exclamationTriangle',
      title: 'Maintenance Scheduled',
      description: 'Water system maintenance scheduled for tomorrow, 9:00 AM - 12:00 PM.',
      time: '3 hours ago',
      unread: true,
    },
  ];
}

/**
 * Resolve base path based on current URL structure
 * @returns {string} Base path for asset resolution
 */
function resolveBasePath() {
  const path = window.location.pathname;
  if (path.includes('/client/views/')) {
    return '/client';
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
      // Theme toggle event dispatched
      window.dispatchEvent(new CustomEvent('navbar:theme:toggle'));
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
      placeholder.outerHTML = getIcon(iconName, {
        className: 'navbar-notification-icon-svg',
        width: 20,
        height: 20,
      });
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

      // Mark as read
      if (item.classList.contains('unread')) {
        item.classList.remove('unread');
        updateUnreadCount(-1);
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

  unreadItems.forEach(item => {
    item.classList.remove('unread');
  });

  updateUnreadCount(-count);

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
  // Update user menu info
  const menuAvatar = document.getElementById('navbar-user-menu-avatar');
  const menuName = document.getElementById('navbar-user-menu-name');
  const menuEmail = document.getElementById('navbar-user-menu-email');

  if (menuAvatar) {
    menuAvatar.textContent = user.initials || 'JD';
  }
  if (menuName) {
    menuName.textContent = user.name || 'Juan Dela Cruz';
  }
  if (menuEmail) {
    menuEmail.textContent = user.email || 'juan@example.com';
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

  sidebarToggle.addEventListener('click', () => {
    // Dispatch custom event for sidebar toggle
    window.dispatchEvent(new CustomEvent('navbar:sidebar:toggle'));
  });
}

/**
 * Setup keyboard shortcuts
 */
