/**
 * Main Entry Point - View Router
 *
 * Detects current view and initializes appropriate components
 * Uses data attributes on body to detect view type
 * Uses dynamic imports to isolate failures - a broken view won't break others
 */

// Initialize theme system early
import { initTheme } from './shared/theme-manager.js';
initTheme();

/**
 * Detect current view and initialize appropriate components
 * Uses data attribute on body to detect view type
 */
async function detectAndInitialize() {
  const body = document.body;
  const view = body.dataset.view || 'public';

  // Initialize appropriate dashboard based on view type
  switch (view) {
    case 'boarder-find-room-auth': {
      const { initBoarderFindARoomAuth } = await import(
        './views/boarder/boarder-find-a-room-init.js'
      );
      initBoarderFindARoomAuth();
      break;
    }
    case 'boarder-room-detail-auth': {
      const { initBoarderRoomDetailAuth } = await import(
        './views/boarder/boarder-room-detail-init.js'
      );
      initBoarderRoomDetailAuth();
      break;
    }
    case 'boarder-confirm-application': {
      const { initConfirmApplication } = await import('./views/boarder/confirm-application.js');
      initConfirmApplication();
      break;
    }
    case 'application-submitted': {
      const { initApplicationSubmitted } = await import('./views/boarder/application-submitted.js');
      initApplicationSubmitted();
      break;
    }
    case 'boarder': {
      const { initBoarderDashboard } = await import('./views/boarder/index.js');
      initBoarderDashboard();
      break;
    }
    case 'boarder-applications': {
      const { initApplicationsDashboard } = await import(
        './views/boarder/applications-dashboard.js'
      );
      initApplicationsDashboard();
      break;
    }
    case 'boarder-maps': {
      const { initBoarderMaps } = await import('./views/boarder/boarder-maps-init.js');
      initBoarderMaps();
      break;
    }
    case 'landlord': {
      const { initLandlordDashboardEntry } = await import('./views/landlord/index.js');
      initLandlordDashboardEntry();
      break;
    }
    case 'landlord-onboarding': {
      // Onboarding page handles its own initialization
      break;
    }
    case 'admin': {
      const { initAdminDashboard } = await import('./views/admin/index.js?v=2');
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
