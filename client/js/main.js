/**
 * Main Entry Point - View Router
 *
 * Detects current view and initializes appropriate components
 * Uses data attributes on body to detect view type
 */

import { initPublicViews } from './views/public/index.js';
import { initHavenAIPage } from './views/public/haven-ai.js';
import { initBoarderDashboard } from './views/boarder/index.js';
import { initLandlordDashboardEntry } from './views/landlord/index.js';
import { initAdminDashboard } from './views/admin/index.js';

/**
 * Detect current view and initialize appropriate components
 * Uses data attribute on body to detect view type
 */
function detectAndInitialize() {
  const body = document.body;
  const view = body.dataset.view || 'public';
  const dashboardType = body.dataset.dashboardType;

  console.log('Main: Detected view:', view, 'Dashboard type:', dashboardType);

  // Initialize appropriate dashboard based on view type
  switch (view) {
    case 'boarder':
      initBoarderDashboard();
      break;
    case 'landlord':
      initLandlordDashboardEntry();
      break;
    case 'admin':
      initAdminDashboard();
      break;
    case 'haven-ai':
      initHavenAIPage();
      break;
    case 'public':
    default:
      initPublicViews();
      break;
  }
}

// Initialize on DOM ready
function initialize() {
  console.log('Main: DOMContentLoaded');
  detectAndInitialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM already loaded, initialize immediately
  initialize();
}
