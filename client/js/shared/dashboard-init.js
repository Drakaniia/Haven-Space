/**
 * Dashboard Initialization
 * Common initialization logic for dashboard pages
 */

import { initializeProfile } from './profile-utils.js';
import CONFIG from '../config.js';

/**
 * Initialize dashboard with profile data
 * Call this on dashboard pages to ensure profile data is loaded
 */
export async function initDashboard() {
  try {
    // Initialize profile data
    await initializeProfile(CONFIG.API_BASE_URL);

    // Dispatch event to notify other components that profile is loaded
    window.dispatchEvent(new CustomEvent('dashboard:profile:loaded'));
  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }
}

/**
 * Initialize dashboard with navbar
 * For pages that use the navbar component
 */
export async function initDashboardWithNavbar() {
  try {
    // Initialize profile data first
    const user = await initializeProfile(CONFIG.API_BASE_URL);

    // Initialize navbar with user data
    const { initNavbar } = await import('../components/navbar.js');
    initNavbar({ user });

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('dashboard:profile:loaded', { detail: { user } }));
  } catch (error) {
    console.error('Error initializing dashboard with navbar:', error);
  }
}
