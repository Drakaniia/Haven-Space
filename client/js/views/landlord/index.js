/**
 * Landlord Dashboard Entry Point
 *
 * Initializes sidebar, navbar, and landlord dashboard for landlord views
 */

import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { initLandlordDashboard } from './landlord.js';
import { initMessages } from './messages.js';

/**
 * Initialize Landlord Dashboard
 * Sets up sidebar, navbar, and initializes landlord dashboard
 */
export function initLandlordDashboardEntry() {
  const user = {
    name: 'Juan Dela Cruz',
    initials: 'JD',
    role: 'Landlord',
    email: 'juan@example.com',
  };

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'landlord',
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

  // Initialize landlord dashboard
  initLandlordDashboard({
    user: {
      name: user.name,
      initials: user.initials,
      role: user.role,
    },
  });

  // Initialize specific pages based on current view
  const currentPath = window.location.pathname;

  if (currentPath.includes('messages')) {
    initMessages();
  }

  console.log('LandlordDashboard: Initialized');
}
