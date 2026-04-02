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

  console.log('BoarderDashboard: Initialized');
}
