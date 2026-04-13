/**
 * Main Entry Point - View Router
 *
 * Detects current view and initializes appropriate components
 * Uses data attributes on body to detect view type
 * Uses dynamic imports to isolate failures - a broken view won't break others
 */

/**
 * Detect current view and initialize appropriate components
 * Uses data attribute on body to detect view type
 */
async function detectAndInitialize() {
  const body = document.body;
  const view = body.dataset.view || 'public';

  // Initialize appropriate dashboard based on view type
  switch (view) {
    case 'boarder': {
      const { initBoarderDashboard } = await import('./views/boarder/index.js');
      initBoarderDashboard();
      break;
    }
    case 'landlord': {
      const { initLandlordDashboardEntry } = await import('./views/landlord/index.js');
      initLandlordDashboardEntry();
      break;
    }
    case 'admin': {
      const { initAdminDashboard } = await import('./views/admin/index.js');
      initAdminDashboard();
      break;
    }
    case 'haven-ai': {
      const { initHavenAIPage } = await import('./views/public/haven-ai.js');
      initHavenAIPage();
      break;
    }
    case 'public':
    default: {
      const { initPublicViews } = await import('./views/public/index.js');
      initPublicViews();
      break;
    }
  }
}

// Initialize on DOM ready
function initialize() {
  detectAndInitialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM already loaded, initialize immediately
  initialize();
}
