/**
 * Landlord Dashboard Entry Point
 *
 * Initializes sidebar, navbar, and landlord dashboard for landlord views
 */

import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { initLandlordDashboard } from './landlord.js';
import { initMessages } from './messages.js';
import { initLandlordSettings } from './settings.js';
import { initAnnouncements } from './announcements.js';

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

  // Initialize announcements page
  if (currentPath.includes('announcements')) {
    initAnnouncements();
    // Inject toast styles (one-time setup)
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize settings page
  if (currentPath.includes('settings')) {
    initLandlordSettings();
  }

  // Setup navbar event listeners
  setupNavbarListeners();

  console.log('LandlordDashboard: Initialized');
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
