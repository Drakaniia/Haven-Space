/**
 * Landlord Dashboard Entry Point
 *
 * Initializes sidebar, navbar, and landlord dashboard for landlord views
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { initLandlordDashboard } from './landlord.js';
import { initMessages } from './messages.js';
import { initLandlordSettings } from './settings.js';
import { initAnnouncements } from './announcements.js';
import { initReports } from './reports.js';
import { initLandlordPermissions } from '../../shared/permissions.js';

function loginPath() {
  const pathname = window.location.pathname;
  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }
  if (pathname.includes('/client/views/')) {
    return '/client/views/public/auth/login.html';
  }
  return '/views/public/auth/login.html';
}

function initialsFrom(user) {
  const a = (user.first_name || '').trim().charAt(0);
  const b = (user.last_name || '').trim().charAt(0);
  return (a + b || 'L').toUpperCase();
}

/**
 * Initialize Landlord Dashboard
 * Sets up sidebar, navbar, and initializes landlord dashboard
 */
export async function initLandlordDashboardEntry() {
  let user;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me.php`, { credentials: 'include' });
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

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Landlord';
  const initials = initialsFrom(user);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'landlord',
      user: {
        name,
        initials,
        role: 'Landlord',
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
      notificationCount: 3,
    });
  }

  // Initialize landlord dashboard
  initLandlordDashboard({
    user: {
      name,
      initials,
      role: 'Landlord',
    },
  });

  // Check landlord verification status and apply read-only restrictions if pending
  initLandlordPermissions();

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

  // Initialize reports page
  if (currentPath.includes('reports')) {
    initReports();
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
