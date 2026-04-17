/**
 * Applications Dashboard - For boarders who haven't been accepted yet
 * Shows applications, saved properties, and search functionality
 */

import { getIcon } from '../../shared/icons.js';
import { updateBoarderStatus } from '../../shared/routing.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';

/**
 * Initialize the applications dashboard
 */
export function initApplicationsDashboard() {
  console.log('Initializing Applications Dashboard');

  // Initialize sidebar and navbar
  initializeComponents();

  // Load dashboard data
  loadDashboardStats();
  loadRecentApplications();
  loadSavedProperties();
  loadSearchAlerts();
  loadRecentActivity();
  setupEventListeners();
}

/**
 * Initialize sidebar and navbar components
 */
function initializeComponents() {
  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const userInfo = {
    name: user.name || 'Boarder User',
    initials: getInitials(user.name || 'Boarder User'),
    role: 'Boarder',
    email: user.email || 'boarder@example.com',
    avatarUrl: user.avatarUrl || '',
  };

  // Get boarder status from user data (default to applied_pending for applications dashboard)
  const boarderStatus = user.boarderStatus || 'applied_pending';

  // Initialize sidebar with appropriate navigation based on status
  initSidebar({
    role: 'boarder',
    boarderStatus: boarderStatus,
    user: userInfo,
  });

  // Initialize navbar
  initNavbar({
    user: userInfo,
  });
}

/**
 * Get initials from full name
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Load dashboard statistics
 */
function loadDashboardStats() {
  const applications = JSON.parse(localStorage.getItem('applications') || '[]');
  const savedProperties = JSON.parse(localStorage.getItem('savedProperties') || '[]');

  // Calculate stats
  const totalApplications = applications.length;
  const pendingApplications = applications.filter(app => app.status === 'pending').length;
  const acceptedApplications = applications.filter(app => app.status === 'accepted').length;
  const totalSaved = savedProperties.length;

  // Update UI
  const totalEl = document.querySelector('[data-total-applications]');
  const pendingEl = document.querySelector('[data-pending-applications]');
  const acceptedEl = document.querySelector('[data-accepted-applications]');
  const savedEl = document.querySelector('[data-saved-properties]');

  if (totalEl) totalEl.textContent = totalApplications;
  if (pendingEl) pendingEl.textContent = pendingApplications;
  if (acceptedEl) acceptedEl.textContent = acceptedApplications;
  if (savedEl) savedEl.textContent = totalSaved;
}

/**
 * Replace icon placeholders in a container
 */
function replaceIconsInContainer(container) {
  container.querySelectorAll('.icon-placeholder').forEach(el => {
    const iconName = el.dataset.icon;
    const className = el.className.replace('icon-placeholder', '').trim();
    const iconHtml = getIcon(iconName, { className });
    el.outerHTML = iconHtml;
  });
}

/**
 * Load recent applications
 */
function loadRecentApplications() {
  const applications = JSON.parse(localStorage.getItem('applications') || '[]');
  const container = document.getElementById('recent-applications-list');

  if (!container) return;

  if (applications.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="icon-placeholder" data-icon="clipboardList"></span>
        <h3>No Applications Yet</h3>
        <p>Start by browsing properties and submitting your first application</p>
        <a href="../public/find-a-room/index.html" class="boarder-btn boarder-btn-primary">
          <span class="icon-placeholder" data-icon="search"></span>
          Find Properties
        </a>
      </div>
    `;
    replaceIconsInContainer(container);
    return;
  }

  // Show recent applications (last 3)
  const recentApplications = applications.slice(-3).reverse();

  container.innerHTML = recentApplications
    .map(
      app => `
    <div class="application-card" data-application-id="${app.id}">
      <div class="application-card-header">
        <div class="application-property-info">
          <h4 class="application-property-name">${app.title}</h4>
          <p class="application-property-address">${app.address || 'Address not available'}</p>
        </div>
        <div class="application-status application-status-${app.status}">
          ${getStatusIcon(app.status)}
          <span>${getStatusText(app.status)}</span>
        </div>
      </div>
      
      <div class="application-card-body">
        <div class="application-details">
          <div class="application-detail">
            <span class="application-detail-label">Room Type:</span>
            <span class="application-detail-value">${app.roomType || 'Standard Room'}</span>
          </div>
          <div class="application-detail">
            <span class="application-detail-label">Monthly Rent:</span>
            <span class="application-detail-value">₱${
              app.monthlyRent?.toLocaleString() || 'N/A'
            }</span>
          </div>
          <div class="application-detail">
            <span class="application-detail-label">Applied:</span>
            <span class="application-detail-value">${formatDate(
              app.submittedAt || app.appliedDate
            )}</span>
          </div>
          ${
            app.movingDate
              ? `
            <div class="application-detail">
              <span class="application-detail-label">Moving Date:</span>
              <span class="application-detail-value">${formatDate(app.movingDate)}</span>
            </div>
          `
              : ''
          }
        </div>
        
        <div class="application-card-actions">
          ${getApplicationActions(app)}
        </div>
      </div>
    </div>
  `
    )
    .join('');

  // Add event listeners for application actions
  setupApplicationActions();

  // Replace icons in dynamically generated content
  replaceIconsInContainer(container);
}

/**
 * Get status icon for application
 */
function getStatusIcon(status) {
  switch (status) {
    case 'pending':
      return '<span class="icon-placeholder" data-icon="clock"></span>';
    case 'accepted':
      return '<span class="icon-placeholder" data-icon="checkCircle"></span>';
    case 'rejected':
      return '<span class="icon-placeholder" data-icon="xCircle"></span>';
    case 'cancelled':
      return '<span class="icon-placeholder" data-icon="minusCircle"></span>';
    default:
      return '<span class="icon-placeholder" data-icon="circle"></span>';
  }
}

/**
 * Get status text for application
 */
function getStatusText(status) {
  switch (status) {
    case 'pending':
      return 'Under Review';
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Declined';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Get application actions based on status
 */
function getApplicationActions(app) {
  switch (app.status) {
    case 'pending':
      return `
        <button class="boarder-btn boarder-btn-outline boarder-btn-sm" onclick="viewApplication(${app.id})">
          <span class="icon-placeholder" data-icon="eye"></span>
          View Details
        </button>
      `;
    case 'accepted':
      return `
        <button class="boarder-btn boarder-btn-primary boarder-btn-sm" onclick="confirmBooking(${app.id})">
          <span class="icon-placeholder" data-icon="check"></span>
          Confirm Booking
        </button>
        <button class="boarder-btn boarder-btn-outline boarder-btn-sm" onclick="viewApplication(${app.id})">
          <span class="icon-placeholder" data-icon="eye"></span>
          View Details
        </button>
      `;
    default:
      return `
        <button class="boarder-btn boarder-btn-outline boarder-btn-sm" onclick="viewApplication(${app.id})">
          <span class="icon-placeholder" data-icon="eye"></span>
          View Details
        </button>
      `;
  }
}

/**
 * Load saved properties
 */
function loadSavedProperties() {
  const savedProperties = JSON.parse(localStorage.getItem('savedProperties') || '[]');
  const container = document.getElementById('saved-properties-list');

  if (!container) return;

  if (savedProperties.length === 0) {
    container.innerHTML = `
      <div class="empty-state-small">
        <span class="icon-placeholder" data-icon="bookmark"></span>
        <p>No saved properties yet</p>
        <a href="../public/find-a-room/index.html" class="boarder-btn boarder-btn-outline boarder-btn-sm">
          Browse Properties
        </a>
      </div>
    `;
    replaceIconsInContainer(container);
    return;
  }

  // Show recent saved properties (last 3)
  const recentSaved = savedProperties.slice(-3).reverse();

  container.innerHTML = recentSaved
    .map(
      property => `
    <div class="saved-property-card" data-property-id="${property.id}">
      <div class="saved-property-image">
        <img src="${
          property.image || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=300&q=80'
        }" 
             alt="${property.title}" />
        <button class="saved-property-remove" onclick="removeSavedProperty(${property.id})">
          <span class="icon-placeholder" data-icon="xMark"></span>
        </button>
      </div>
      <div class="saved-property-info">
        <h4 class="saved-property-title">${property.title}</h4>
        <p class="saved-property-address">${property.address}</p>
        <div class="saved-property-price">₱${property.price?.toLocaleString()}/mo</div>
        <button class="boarder-btn boarder-btn-outline boarder-btn-sm" onclick="viewProperty(${
          property.id
        })">
          View Details
        </button>
      </div>
    </div>
  `
    )
    .join('');

  replaceIconsInContainer(container);
}

/**
 * Load search alerts
 */
function loadSearchAlerts() {
  const searchAlerts = JSON.parse(localStorage.getItem('searchAlerts') || '[]');
  const container = document.getElementById('search-alerts-list');

  if (!container) return;

  if (searchAlerts.length === 0) {
    // Empty state is already in HTML
    return;
  }

  container.innerHTML = searchAlerts
    .map(
      alert => `
    <div class="search-alert-card">
      <div class="search-alert-header">
        <h4 class="search-alert-name">${alert.name}</h4>
        <label class="boarder-toggle">
          <input type="checkbox" ${alert.active ? 'checked' : ''} 
                 onchange="toggleAlert(${alert.id})" />
          <span class="boarder-toggle-slider"></span>
        </label>
      </div>
      <p class="search-alert-criteria">${alert.criteria}</p>
      <div class="search-alert-stats">
        ${alert.newCount > 0 ? `<span class="boarder-alert-new">${alert.newCount} new</span>` : ''}
        <span class="boarder-alert-total">${alert.totalCount} properties</span>
      </div>
    </div>
  `
    )
    .join('');
}

/**
 * Load recent activity
 */
function loadRecentActivity() {
  const container = document.getElementById('activity-timeline');

  if (!container) return;

  // Generate sample activity based on applications and saved properties
  const applications = JSON.parse(localStorage.getItem('applications') || '[]');
  const savedProperties = JSON.parse(localStorage.getItem('savedProperties') || '[]');

  const activities = [];

  // Add application activities
  applications.forEach(app => {
    activities.push({
      type: 'application',
      title: `Applied to ${app.title}`,
      description: `Submitted application for ${app.roomType || 'Standard Room'}`,
      date: app.submittedAt || app.appliedDate,
      icon: 'clipboardList',
    });
  });

  // Add saved property activities
  savedProperties.slice(-3).forEach(property => {
    activities.push({
      type: 'saved',
      title: `Saved ${property.title}`,
      description: `Added property to your saved list`,
      date: property.savedAt || new Date().toISOString(),
      icon: 'bookmark',
    });
  });

  // Sort by date (most recent first)
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (activities.length === 0) {
    container.innerHTML = `
      <div class="empty-state-small">
        <span class="icon-placeholder" data-icon="clock"></span>
        <p>No recent activity</p>
      </div>
    `;
    replaceIconsInContainer(container);
    return;
  }

  container.innerHTML = activities
    .slice(0, 5)
    .map(
      activity => `
    <div class="activity-item">
      <div class="activity-icon">
        <span class="icon-placeholder" data-icon="${activity.icon}"></span>
      </div>
      <div class="activity-content">
        <h4 class="activity-title">${activity.title}</h4>
        <p class="activity-description">${activity.description}</p>
        <span class="activity-date">${formatRelativeDate(activity.date)}</span>
      </div>
    </div>
  `
    )
    .join('');

  replaceIconsInContainer(container);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Create alert buttons
  const createAlertBtns = document.querySelectorAll('#create-alert-btn, #create-first-alert');
  createAlertBtns.forEach(btn => {
    btn.addEventListener('click', createSearchAlert);
  });

  // View all saved properties
  const viewAllSavedBtn = document.getElementById('view-all-saved');
  if (viewAllSavedBtn) {
    viewAllSavedBtn.addEventListener('click', () => {
      // TODO: Navigate to saved properties page
      alert('Saved properties page coming soon!');
    });
  }

  // Saved properties action button
  const savedPropertiesBtn = document.getElementById('saved-properties-btn');
  if (savedPropertiesBtn) {
    savedPropertiesBtn.addEventListener('click', e => {
      e.preventDefault();
      // TODO: Navigate to saved properties page
      alert('Saved properties page coming soon!');
    });
  }
}

/**
 * Setup application action event listeners
 */
function setupApplicationActions() {
  // Make functions globally available for onclick handlers
  window.viewApplication = applicationId => {
    window.location.href = `./applications/index.html?id=${applicationId}`;
  };

  window.confirmBooking = applicationId => {
    window.location.href = `./confirm-booking/index.html?applicationId=${applicationId}`;
  };
}

/**
 * Create search alert
 */
function createSearchAlert() {
  // TODO: Implement search alert creation modal
  alert('Search alert creation coming soon!');
}

/**
 * Toggle search alert
 */
window.toggleAlert = alertId => {
  const searchAlerts = JSON.parse(localStorage.getItem('searchAlerts') || '[]');
  const alert = searchAlerts.find(a => a.id === alertId);

  if (alert) {
    alert.active = !alert.active;
    localStorage.setItem('searchAlerts', JSON.stringify(searchAlerts));
  }
};

/**
 * Remove saved property
 */
window.removeSavedProperty = propertyId => {
  const savedProperties = JSON.parse(localStorage.getItem('savedProperties') || '[]');
  const updatedProperties = savedProperties.filter(p => p.id !== propertyId);

  localStorage.setItem('savedProperties', JSON.stringify(updatedProperties));

  // Reload saved properties and stats
  loadSavedProperties();
  loadDashboardStats();
};

/**
 * View property details
 */
window.viewProperty = propertyId => {
  window.location.href = `./find-a-room/detail.html?id=${propertyId}`;
};

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format relative date (e.g., "2 days ago")
 */
function formatRelativeDate(dateString) {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;

  return formatDate(dateString);
}

// Initialize on module load for single-page apps
if (typeof window !== 'undefined') {
  window.initApplicationsDashboard = initApplicationsDashboard;

  // Auto-initialize if the applications dashboard exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.querySelector('[data-dashboard-type="applications"]')) {
        initApplicationsDashboard();
      }
    });
  } else {
    // DOM already loaded
    if (document.querySelector('[data-dashboard-type="applications"]')) {
      initApplicationsDashboard();
    }
  }
}
