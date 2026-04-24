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
import { initBoarderFindARoom } from './boarder-find-a-room-auth.js';
import { initLeasePage } from './lease.js';
import { initPaymentPage } from './boarder-payment-process.js';
import { initSettingsPage } from './settings.js';
import { getAuthHeadersOnly } from '../../shared/auth-headers.js';
import { initAnnouncements } from './announcements.js';
import { initDashboardMap } from './dashboard-map.js';
import { initHouseRulesPage } from './house-rules.js';
import { initBoarderStatus } from './status.js';
import { openAcceptedApplicationsOverlay } from '../../components/accepted-applications-overlay.js';
import { hasAcceptedApplications } from '../../shared/notifications.js';
import { updateNavbarNotifications } from '../../components/navbar.js';
import { initDashboard } from '../../shared/dashboard-init.js';

function loginPath() {
  const pathname = window.location.pathname;
  const hostname = window.location.hostname;

  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }

  // For localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check if we're already in a views subdirectory
    if (pathname.includes('/views/')) {
      // Extract the base path up to /views/
      const viewsIndex = pathname.indexOf('/views/');
      const basePath = pathname.substring(0, viewsIndex + 7); // Include '/views/'
      return `${basePath}public/auth/login.html`;
    }

    // Default for localhost - assume haven-space project structure
    if (pathname.includes('/haven-space/')) {
      return '/haven-space/client/views/public/auth/login.html';
    }

    // Fallback for localhost
    return '/client/views/public/auth/login.html';
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
      headers: getAuthHeadersOnly('3'),
      credentials: 'include',
    });

    if (!res.ok) {
      console.error('Authentication failed:', res.status, res.statusText);
      window.location.href = loginPath();
      return;
    }

    const data = await res.json();
    user = data.user;
  } catch (error) {
    console.error('Error during authentication:', error);
    window.location.href = loginPath();
    return;
  }

  // Initialize profile data first
  await initDashboard();

  // Get updated user data
  const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const name =
    [updatedUser.first_name, updatedUser.last_name].filter(Boolean).join(' ').trim() || 'Boarder';
  const initials = initialsFrom(updatedUser);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    // Get boarder status from user data (default to accepted for main dashboard)
    const boarderStatus = updatedUser.boarder_status || updatedUser.boarderStatus || 'accepted';

    initSidebar({
      role: 'boarder',
      boarderStatus: boarderStatus,
      user: {
        name,
        initials,
        role: 'Boarder',
        email: updatedUser.email || '',
      },
    });
  }

  // Initialize navbar with updated user data
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: updatedUser,
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
    initBoarderFindARoom();
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
