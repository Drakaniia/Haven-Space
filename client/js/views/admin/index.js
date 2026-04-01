/**
 * Admin Dashboard Entry Point
 *
 * Initializes sidebar and navbar for admin views
 */

import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';

/**
 * Initialize Admin Dashboard
 * Sets up sidebar and navbar for admin users
 */
export function initAdminDashboard() {
  const user = {
    name: 'Admin User',
    initials: 'AU',
    role: 'Admin',
    email: 'admin@havenspace.com',
  };

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'admin',
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
      notificationCount: 0,
    });
  }

  console.log('AdminDashboard: Initialized');
}
