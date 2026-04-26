/**
 * Admin dashboard entry — RBAC gate + shell
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { initAdminDashboardPanels } from './admin-dashboard.js';
import { getAuthHeaders } from '../../shared/auth-headers.js';
import { initOAuthHandler } from '../../shared/oauth-handler.js';

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
  return (a + b || 'A').toUpperCase();
}

/**
 * Initialize Super Admin dashboard (admin role only)
 */
export async function initAdminDashboard() {
  // Handle OAuth redirect FIRST before any auth checks
  await initOAuthHandler();

  let user;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
      headers: getAuthHeaders(),
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

  if (user.role !== 'admin') {
    window.location.href = loginPath();
    return;
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Admin';
  const initials = initialsFrom(user);

  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'admin',
      user: {
        name,
        initials,
        role: 'Super Admin',
        email: user.email || '',
      },
      onAfterRender: () => {
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
        }
        initAdminDashboardPanels(user);
      },
    });
  } else {
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
    }
    initAdminDashboardPanels(user);
  }
}
