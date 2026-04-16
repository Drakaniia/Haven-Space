/**
 * Boarder Dashboard Entry Point
 *
 * Initializes sidebar, navbar, and loads dashboard data for boarder views
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { loadDashboardData } from './dashboard.js';
import { initMessages } from './messages.js';
import { initFindARoom } from './boarder-find-a-room.js';
import { initLeasePage } from './lease.js';
import { initPaymentPage } from './boarder-payment-process.js';
import { initSettingsPage } from './settings.js';
import { initAnnouncements } from './announcements.js';
import { initDashboardMap } from './dashboard-map.js';
import { initHouseRulesPage } from './house-rules.js';
import { initBoarderStatus } from './status.js';
import { openAcceptedApplicationsOverlay } from '../../components/accepted-applications-overlay.js';
import { hasAcceptedApplications } from '../../shared/notifications.js';
import { updateNavbarNotifications } from '../../components/navbar.js';

function loginPath() {
  const pathname = window.location.pathname;
  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }
  if (pathname.includes('/views/')) {
    return '/views/public/auth/login.html';
  }
  return '/views/public/auth/login.html';
}

function initialsFrom(user) {
  const a = (user.first_name || '').trim().charAt(0);
  const b = (user.last_name || '').trim().charAt(0);
  return (a + b || 'B').toUpperCase();
}

/**
 * Initialize Boarder Dashboard
 * Sets up sidebar, navbar, and loads dashboard data
 */
export async function initBoarderDashboard() {
  let user;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
      method: 'GET',
      headers: {
        'X-User-Id': localStorage.getItem('user_id') || '3',
      },
      credentials: 'include',
    });
    if (!res.ok) {
      window.location.href = loginPath();
      return;
    }
    const data = await res.json();
    user = data.user;
  } catch {
    window.location.href = loginPath();
    return;
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Boarder';
  const initials = initialsFrom(user);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'boarder',
      user: {
        name,
        initials,
        role: 'Boarder',
        email: user.email || '',
      },
    });
  }

  // Initialize navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: {
        name,
        initials,
        avatarUrl: user.avatar_url || '',
        email: user.email || '',
      },
      notificationCount: 0,
    });

    // Fetch real notifications from API
    updateNavbarNotifications();
  }

  // Check for accepted applications and show overlay
  try {
    const hasAccepted = await hasAcceptedApplications();
    if (hasAccepted) {
      openAcceptedApplicationsOverlay();
    }
  } catch {
    // Failed to check accepted applications
  }

  // Load dashboard data
  loadDashboardData();

  // Initialize boarder status banners (pending/rejected states)
  initBoarderStatus();

  // Initialize dashboard map
  initDashboardMap();

  // Initialize specific pages based on current view
  const currentPath = window.location.pathname;

  if (currentPath.includes('find-a-room')) {
    initFindARoom();
  }

  if (currentPath.includes('messages')) {
    initMessages();
  }

  if (currentPath.includes('lease')) {
    initLeasePage();
  }

  // Initialize payment page
  if (currentPath.includes('pay.html')) {
    initPaymentPage();
  }

  // Initialize settings page
  if (currentPath.includes('settings')) {
    initSettingsPage();
  }

  // Initialize announcements page
  if (currentPath.includes('announcements')) {
    initAnnouncements();
  }

  // Initialize house rules page
  if (currentPath.includes('house-rules')) {
    initHouseRulesPage();
  }

  // Setup navbar event listeners only if navbar exists
  if (navbarContainer) {
    setupNavbarListeners();
  }
}

/**
 * Setup navbar event listeners for profile and settings
 */
function setupNavbarListeners() {
  // Listen for settings click from navbar
  window.addEventListener('navbar:user:settings:click', () => {
    // Navigate to settings page
    window.location.href = '../settings/index.html';
  });

  // Listen for profile click from navbar
  window.addEventListener('navbar:user:profile:click', () => {
    // Navigate to profile tab in settings
    window.location.href = '../settings/index.html#profile';
  });
}
