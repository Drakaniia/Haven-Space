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
import { initDashboard } from '../../shared/dashboard-init.js';
import { initOAuthHandler } from '../../shared/oauth-handler.js';

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

function getStoredLandlordUser() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    return storedUser?.role === 'landlord' ? storedUser : null;
  } catch (error) {
    console.warn('Failed to parse stored user', error);
    return null;
  }
}

function persistAuthenticatedUser(user) {
  if (!user) {
    return;
  }

  localStorage.setItem('user', JSON.stringify(user));

  if (user.id || user.user_id) {
    localStorage.setItem('user_id', String(user.user_id || user.id));
  }
}

/**
 * Initialize Landlord Dashboard
 * Sets up sidebar, navbar, and initializes landlord dashboard
 */
export async function initLandlordDashboardEntry() {
  console.log('=== LANDLORD DASHBOARD INIT ===');

  // Handle OAuth redirect FIRST before any auth checks
  await initOAuthHandler();

  console.log('Token in localStorage:', localStorage.getItem('token')?.substring(0, 20) + '...');
  console.log('User in localStorage:', localStorage.getItem('user'));

  const storedLandlordUser = getStoredLandlordUser();
  const hasStoredToken = !!localStorage.getItem('token');

  // Check if this is a fresh registration (landlordStatus = 'new')
  const landlordStatus = localStorage.getItem('landlordStatus');
  const isNewRegistration = landlordStatus === 'new';

  console.log('Is new registration:', isNewRegistration);
  console.log('Has stored token:', hasStoredToken);
  console.log('Has stored user:', !!storedLandlordUser);

  // For new registrations, verify we have the essentials before proceeding
  if (isNewRegistration) {
    if (!hasStoredToken || !storedLandlordUser) {
      console.error('New registration but missing token or user data. Redirecting to login.');
      window.location.href = loginPath();
      return;
    }
    console.log('New landlord registration detected, adding delay for backend sync...');
    // Add delay for new registrations to ensure backend is ready
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  let user;
  let retryCount = 0;
  const maxRetries = isNewRegistration ? 3 : 1;

  while (retryCount < maxRetries) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        window.location.href = loginPath();
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      console.log('Attempting auth check (attempt', retryCount + 1, '/', maxRetries, ')');

      const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      console.log('Auth response status:', res.status);

      if (res.ok) {
        const data = await res.json();
        console.log('Auth successful, user role:', data.user?.role);
        user = data.user;
        persistAuthenticatedUser(user);
        console.log('=== AUTH SUCCESS ===');
        break; // Success, exit retry loop
      } else {
        const errorText = await res.text();
        console.error('Auth failed:', res.status, errorText);

        if (retryCount < maxRetries - 1) {
          console.log('Retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        } else if (storedLandlordUser && hasStoredToken && isNewRegistration) {
          // For new registrations, trust the stored data if auth keeps failing
          console.warn('Using stored landlord data for new registration');
          user = storedLandlordUser;
          break;
        } else {
          console.error('All auth attempts failed, redirecting to login');
          window.location.href = loginPath();
          return;
        }
      }
    } catch (error) {
      console.error('Auth error (attempt', retryCount + 1, '):', error);

      if (retryCount < maxRetries - 1) {
        console.log('Retrying in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
      } else if (storedLandlordUser && hasStoredToken && isNewRegistration) {
        // For new registrations, trust the stored data if auth keeps failing
        console.warn('Using stored landlord data for new registration after error');
        user = storedLandlordUser;
        break;
      } else {
        console.error('All auth attempts failed with errors, redirecting to login');
        window.location.href = loginPath();
        return;
      }
    }
  }

  if (!user || user.role !== 'landlord') {
    console.error('Invalid user or role:', user?.role);
    window.location.href = loginPath();
    return;
  }

  console.log('Proceeding with dashboard initialization for:', user.first_name, user.last_name);

  // Initialize profile data first
  await initDashboard();

  // Get updated user data
  const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const name =
    [updatedUser.first_name, updatedUser.last_name].filter(Boolean).join(' ').trim() || 'Landlord';
  const initials = initialsFrom(updatedUser);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'landlord',
      user: {
        name,
        initials,
        role: 'Landlord',
        email: updatedUser.email || '',
      },
    });
  }

  // Initialize navbar with updated user data
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: updatedUser,
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

  // Initialize boarders page
  if (currentPath.includes('boarders')) {
    const { initLandlordBoarders } = await import('./landlord-boarders.js');
    initLandlordBoarders();
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
