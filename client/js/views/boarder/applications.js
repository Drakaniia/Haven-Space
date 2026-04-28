/**
 * Boarder Applications Page
 * Manages application tracking and status display
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { initBoarderStatus } from './status.js';
import { getIcon } from '../../shared/icons.js';
import { authenticatedFetch } from '../../shared/state.js';
import { updateBoarderStatus } from '../../shared/routing.js';

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
  return (a + b || 'B').toUpperCase();
}

/**
 * Initialize Boarder Applications Page
 */
export async function initBoarderApplications() {
  let user;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, { credentials: 'include' });
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

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Boarder';
  const initials = initialsFrom(user);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'boarder',
      user: {
        name,
        initials,
        role: 'Boarder',
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
      notificationCount: 3,
    });
  }

  // Initialize status banners
  initBoarderStatus();

  // Inject icons
  injectIcons();

  // Fetch and render applications from backend
  await fetchApplications();

  // Setup event listeners
  setupEventListeners();
}

/**
 * Fetch applications from backend
 */
async function fetchApplications() {
  try {
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/boarder/applications`);

    if (!response.ok) {
      throw new Error('Failed to fetch applications');
    }

    const result = await response.json();
    const applications = result.data || [];
    renderApplications(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    showError('Failed to load applications');
  }
}

/**
 * Render applications list
 * @param {Array} applications
 */
function renderApplications(applications) {
  const list = document.getElementById('applications-list');
  const emptyState = document.getElementById('applications-empty');

  if (!list) return;

  if (applications.length === 0) {
    if (list) list.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (list) list.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';

  list.innerHTML = applications.map(app => createApplicationCard(app)).join('');

  // Re-inject icons in the new cards
  injectIcons();

  // Re-setup event listeners
  setupEventListeners();
}

/**
 * Create application card HTML
 */
function createApplicationCard(app) {
  const statusClass = app.status.toLowerCase().replace('_', '-');
  const statusLabel = app.status.replace('_', ' ').toUpperCase();

  const appliedDate = new Date(app.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `
    <div class="application-card" data-application-id="${app.id}">
      <div class="application-card-header">
        <div class="application-property-info">
          <h3 class="application-property-name">${escapeHtml(app.property_name || 'Property')}</h3>
          <p class="application-property-location">${escapeHtml(app.property_location || '')}</p>
        </div>
        <div class="application-status-indicator ${statusClass}"></div>
      </div>
      
      <div class="application-card-body">
        <div class="application-detail-row">
          <span class="application-detail-label">Room</span>
          <span class="application-detail-value">${escapeHtml(app.room_title || 'N/A')}</span>
        </div>
        <div class="application-detail-row">
          <span class="application-detail-label">Monthly Rent</span>
          <span class="application-detail-value">₱${formatCurrency(app.monthly_rent || 0)}</span>
        </div>
        <div class="application-detail-row">
          <span class="application-detail-label">Applied On</span>
          <span class="application-detail-value">${appliedDate}</span>
        </div>
        <div class="application-detail-row">
          <span class="application-detail-label">Status</span>
          <span class="application-status-badge ${statusClass}">${statusLabel}</span>
        </div>
      </div>
      
      <div class="application-card-footer">
        <button class="application-btn application-btn-outline" data-action="view-details" data-application-id="${
          app.id
        }">
          <span data-icon="eye" data-icon-width="20" data-icon-height="20"></span>
          View Details
        </button>
        ${
          app.status === 'pending' || app.status === 'under_review'
            ? `
          <button class="application-btn application-btn-danger" data-action="cancel" data-application-id="${app.id}">
            <span data-icon="xMark" data-icon-width="20" data-icon-height="20"></span>
            Cancel
          </button>
        `
            : ''
        }
      </div>
    </div>
  `;
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return parseInt(user.id || user.user_id || localStorage.getItem('user_id') || '3');
}

/**
 * Format currency
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'toast-message toast-error';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
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
async function handleCancelApplication(e) {
  const card = e.target.closest('.application-card');
  const applicationId = card.dataset.applicationId;

  // Confirm cancellation
  const confirmed = confirm(
    'Are you sure you want to cancel this application? This action cannot be undone.'
  );

  if (confirmed) {
    try {
      const userId = getCurrentUserId();
      const response = await fetch(
        `${CONFIG.API_BASE_URL}/api/boarder/applications/${applicationId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel application');
      }

      // Update UI optimistically
      card.style.opacity = '0.5';
      card.style.pointerEvents = 'none';

      // Update status badge
      const statusBadge = card.querySelector('.application-status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'CANCELED';
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
      showSuccess('Application canceled successfully');

      // Refresh applications list after a delay
      setTimeout(() => {
        fetchApplications();
      }, 1500);
    } catch (error) {
      console.error('Error canceling application:', error);
      showError('Failed to cancel application. Please try again.');

      // Restore card state
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
    }
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'toast-message toast-success';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  setTimeout(() => successDiv.remove(), 3000);
}
