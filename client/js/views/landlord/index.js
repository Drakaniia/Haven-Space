/**
 * Landlord Dashboard Entry Point
 *
 * Initializes sidebar, navbar, and landlord dashboard for landlord views
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar, updateNavbarNotifications } from '../../components/navbar.js';
import { initLandlordDashboard } from './landlord.js';
import { initMessages } from './messages.js';
import { initLandlordSettings } from './settings.js';
import { initAnnouncements } from './announcements.js';
import { initReports } from './reports.js';
import { initLandlordPermissions } from '../../shared/permissions.js';
import { getAuthHeadersOnly } from '../../shared/auth-headers.js';

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
  return (a + b || 'L').toUpperCase();
}

/**
 * Initialize Landlord Dashboard
 * Sets up sidebar, navbar, and initializes landlord dashboard
 */
export async function initLandlordDashboardEntry() {
  let user;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
      method: 'GET',
      headers: getAuthHeadersOnly('4'),
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
    });

    // Fetch real notifications from API after navbar is initialized
    // Small delay to allow the navbar template to finish rendering
    setTimeout(() => updateNavbarNotifications(), 100);
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
