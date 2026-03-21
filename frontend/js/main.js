/**
 * Main Entry Point
 * Initializes the application and loads view-specific modules
 */

import { state } from './shared/state.js';

// Import view controllers
import { initLandingView } from './views/landing.js';
import { initLandlordView } from './views/landlord.js';
import { initBoarderView } from './views/boarder.js';
import { initAdminView } from './views/admin.js';

// View initialization map
const viewInitializers = {
  'landing': initLandingView,
  'landlord': initLandlordView,
  'boarder': initBoarderView,
  'admin': initAdminView,
};

/**
 * Initialize application based on current view
 */
function initApp() {
  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  state.setTheme(savedTheme);
  
  // Check for saved auth state
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      state.setUser(JSON.parse(savedUser));
    } catch (error) {
      console.error('Failed to parse saved user:', error);
    }
  }
  
  // Determine current view and initialize
  const currentView = getCurrentView();
  console.log(`Initializing ${currentView} view...`);
  
  const initializer = viewInitializers[currentView];
  if (initializer) {
    initializer();
  } else {
    console.warn(`No initializer found for view: ${currentView}`);
  }
  
  // Setup global event listeners
  setupGlobalListeners();
}

/**
 * Get current view name from URL path
 */
function getCurrentView() {
  const path = window.location.pathname;
  
  // Check for view-specific paths
  if (path.includes('/landlord')) return 'landlord';
  if (path.includes('/boarder')) return 'boarder';
  if (path.includes('/admin')) return 'admin';
  
  // Default to landing
  return 'landing';
}

/**
 * Setup global event listeners
 */
function setupGlobalListeners() {
  // Theme toggle
  const themeToggle = document.querySelector('#theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Navigation active state
  updateNavigationActiveState();
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
  const newTheme = state.theme === 'light' ? 'dark' : 'light';
  state.setTheme(newTheme);
  localStorage.setItem('theme', newTheme);
}

/**
 * Update navigation active state based on current page
 */
function updateNavigationActiveState() {
  const navLinks = document.querySelectorAll('nav a');
  const currentPath = window.location.pathname;
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.includes(href)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for potential external usage
export { state };
