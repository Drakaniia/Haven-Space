/**
 * Boarder Dashboard Entry Point
 *
 * Initializes sidebar, navbar, and loads dashboard data for boarder views
 */

import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { loadDashboardData } from './dashboard.js';
import { initFindARoom } from './boarder-find-a-room.js';
import { initLeasePage } from './lease.js';
import { initPaymentPage } from './boarder-payment-process.js';
import { initSettingsPage } from './settings.js';
import { initAnnouncements } from './announcements.js';
import { initDashboardMap } from './dashboard-map.js';
import { initHouseRulesPage } from './house-rules.js';

/**
 * Initialize Boarder Dashboard
 * Sets up sidebar, navbar, and loads dashboard data
 */
export function initBoarderDashboard() {
  const user = {
    name: 'Juan Dela Cruz',
    initials: 'JD',
    role: 'Boarder',
    email: 'juan@example.com',
  };

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'boarder',
      user,
    });
  }

  // Initialize navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: {
        name: user.name,
        initials: user.initials,
        avatarUrl: '',
        email: user.email,
      },
      notificationCount: 3,
    });
  }

  // Load dashboard data
  loadDashboardData();

  // Initialize dashboard map
  initDashboardMap();

  // Initialize specific pages based on current view
  const currentPath = window.location.pathname;

  if (currentPath.includes('find-a-room')) {
    initFindARoom();
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

  console.log('BoarderDashboard: Initialized');
}

/**
 * Setup navbar event listeners for profile and settings
 */
function setupNavbarListeners() {
  // Listen for settings click from navbar
  window.addEventListener('navbar:user:settings:click', () => {
    console.log('Settings clicked from navbar');
    // Navigate to settings page
    window.location.href = '../settings/index.html';
  });

  // Listen for profile click from navbar
  window.addEventListener('navbar:user:profile:click', () => {
    console.log('Profile clicked from navbar');
    // Navigate to profile tab in settings
    window.location.href = '../settings/index.html#profile';
  });
}
