/**
 * Boarder Applications Page
 * Manages application tracking and status display
 */

import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { initBoarderStatus } from './status.js';
import { getIcon } from '../../shared/icons.js';
import { updateBoarderStatus } from '../../shared/routing.js';

/**
 * Initialize Boarder Applications Page
 */
export function initBoarderApplications() {
  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'boarder',
      user: {
        name: 'Juan Dela Cruz',
        initials: 'JD',
        role: 'Boarder',
        email: 'juan@example.com',
      },
    });
  }

  // Initialize navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: {
        name: 'Juan Dela Cruz',
        initials: 'JD',
        avatarUrl: '',
        email: 'juan@example.com',
      },
      notificationCount: 3,
    });
  }

  // Initialize status banners
  initBoarderStatus();

  // Inject icons
  injectIcons();

  // Setup event listeners
  setupEventListeners();

  // TODO: Fetch applications from backend
  // fetchApplications();
}

/**
 * Inject icons from centralized library
 */
function injectIcons() {
  const iconElements = document.querySelectorAll('[data-icon]');

  iconElements.forEach(element => {
    const iconName = element.dataset.icon;
    const options = {
      width: element.dataset.iconWidth || 24,
      height: element.dataset.iconHeight || 24,
      strokeWidth: element.dataset.iconStrokeWidth || '1.5',
      className: element.dataset.iconClass || '',
    };

    element.innerHTML = getIcon(iconName, options);
  });
}

/**
 * Setup event listeners for application actions
 */
function setupEventListeners() {
  // View details buttons
  document.querySelectorAll('[data-action="view-details"]').forEach(btn => {
    btn.addEventListener('click', handleViewDetails);
  });

  // Cancel application buttons
  document.querySelectorAll('[data-action="cancel"]').forEach(btn => {
    btn.addEventListener('click', handleCancelApplication);
  });
}

/**
 * Handle view details click
 * @param {Event} e
 */
function handleViewDetails(e) {
  const card = e.target.closest('.application-card');
  const applicationId = card.dataset.applicationId;

  // For now, show alert
  alert(`Viewing details for application #${applicationId}`);
}

/**
 * Handle cancel application click
 * @param {Event} e
 */
function handleCancelApplication(e) {
  const card = e.target.closest('.application-card');

  // Confirm cancellation
  const confirmed = confirm(
    'Are you sure you want to cancel this application? This action cannot be undone.'
  );

  if (confirmed) {
    // Update UI optimistically
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';

    // Update status badge
    const statusBadge = card.querySelector('.application-status-badge');
    if (statusBadge) {
      statusBadge.textContent = 'Canceled';
      statusBadge.className = 'application-status-badge canceled';
    }

    // Update status indicator
    const statusIndicator = card.querySelector('.application-status-indicator');
    if (statusIndicator) {
      statusIndicator.className = 'application-status-indicator canceled';
    }

    // Update boarder status if this was the only pending application
    updateBoarderStatus('browsing');

    // Show success message
    alert('Application canceled successfully');
  }
}

/**
 * Fetch applications from backend
 * TODO: Implement when backend is ready
 */
// async function fetchApplications() {
//   try {
//     // const response = await fetch(`${CONFIG.API_BASE_URL}/boarder/applications`);
//     // const applications = await response.json();
//     // renderApplications(applications);
//   } catch (error) {
//     // Error fetching applications
//   }
// }

/**
 * Render applications list
 * @param {Array} applications
 * TODO: Implement when backend is ready
 */
// function renderApplications(applications) {
//   const list = document.getElementById('applications-list');
//   const emptyState = document.getElementById('applications-empty');
//
//   if (applications.length === 0) {
//     list.style.display = 'none';
//     emptyState.style.display = 'block';
//   } else {
//     list.style.display = 'flex';
//     emptyState.style.display = 'none';
//   }
// }
