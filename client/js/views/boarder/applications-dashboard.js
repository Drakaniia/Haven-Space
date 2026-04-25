/**
 * Applications Dashboard - For boarders who haven't been accepted yet
 * Shows applications, saved properties, and search functionality
 */

import { getIcon } from '../../shared/icons.js';
import { updateBoarderStatus } from '../../shared/routing.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { authenticatedFetch } from '../../shared/state.js';
import CONFIG from '../../config.js';

/**
 * Initialize the applications dashboard
 */
export async function initApplicationsDashboard() {
  console.log('Initializing Applications Dashboard');

  // Initialize sidebar and navbar
  initializeComponents();

  // Show loading states initially
  showLoadingStates();

  // Load dashboard data with better error handling
  try {
    await loadDashboardStats();
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    // Continue with other data loading even if stats fail
  }

  try {
    await loadRecentApplications();
  } catch (error) {
    console.error('Failed to load recent applications:', error);
  }

  try {
    loadSavedProperties();
  } catch (error) {
    console.error('Failed to load saved properties:', error);
  }

  try {
    await loadRecentActivity();
  } catch (error) {
    console.error('Failed to load recent activity:', error);
  }

  setupEventListeners();

  // Show a helpful message if the user is new
  checkForNewUser();
}

/**
 * Show loading states for all dynamic content
 */
function showLoadingStates() {
  // Show loading for stats with animation
  const totalEl = document.querySelector('[data-total-applications]');
  const pendingEl = document.querySelector('[data-pending-applications]');
  const acceptedEl = document.querySelector('[data-accepted-applications]');
  const savedEl = document.querySelector('[data-saved-properties]');

  if (totalEl) {
    totalEl.textContent = '';
    totalEl.setAttribute('data-loading', 'true');
  }
  if (pendingEl) {
    pendingEl.textContent = '';
    pendingEl.setAttribute('data-loading', 'true');
  }
  if (acceptedEl) {
    acceptedEl.textContent = '';
    acceptedEl.setAttribute('data-loading', 'true');
  }
  if (savedEl) {
    savedEl.textContent = '';
    savedEl.setAttribute('data-loading', 'true');
  }
}

/**
 * Clear loading states and show actual values
 */
function clearLoadingStates() {
  const elements = [
    document.querySelector('[data-total-applications]'),
    document.querySelector('[data-pending-applications]'),
    document.querySelector('[data-accepted-applications]'),
    document.querySelector('[data-saved-properties]'),
  ];

  elements.forEach(el => {
    if (el) {
      el.removeAttribute('data-loading');
    }
  });
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
  const boarderStatus = user.boarder_status || user.boarderStatus || 'applied_pending';

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
async function loadDashboardStats() {
  try {
    // Fetch dashboard stats from API
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/boarder/dashboard/stats`);

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard stats: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const stats = data.data;

    // Clear loading states
    clearLoadingStates();

    // Update application stats
    const totalEl = document.querySelector('[data-total-applications]');
    const pendingEl = document.querySelector('[data-pending-applications]');
    const acceptedEl = document.querySelector('[data-accepted-applications]');
    const savedEl = document.querySelector('[data-saved-properties]');

    if (totalEl) totalEl.textContent = stats.applications.total;
    if (pendingEl) pendingEl.textContent = stats.applications.pending;
    if (acceptedEl) acceptedEl.textContent = stats.applications.accepted;
    if (savedEl) savedEl.textContent = stats.saved_properties.count;

    // Update profile completion
    updateProfileCompletion(stats.profile_completion);
  } catch (error) {
    console.error('Error loading dashboard stats:', error);

    // Clear loading states
    clearLoadingStates();

    // Show user-friendly error message
    showToast('Unable to load dashboard statistics. Using offline data.', 'warning');

    // Fall back to localStorage data on error
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const savedProperties = JSON.parse(localStorage.getItem('savedProperties') || '[]');

    const totalApplications = applications.length;
    const pendingApplications = applications.filter(app => app.status === 'pending').length;
    const acceptedApplications = applications.filter(app => app.status === 'accepted').length;
    const totalSaved = savedProperties.length;

    const totalEl = document.querySelector('[data-total-applications]');
    const pendingEl = document.querySelector('[data-pending-applications]');
    const acceptedEl = document.querySelector('[data-accepted-applications]');
    const savedEl = document.querySelector('[data-saved-properties]');

    if (totalEl) totalEl.textContent = totalApplications;
    if (pendingEl) pendingEl.textContent = pendingApplications;
    if (acceptedEl) acceptedEl.textContent = acceptedApplications;
    if (savedEl) savedEl.textContent = totalSaved;

    // Show fallback profile completion when API fails
    updateProfileCompletion({
      percentage: 60,
      completed_fields: 6,
      total_fields: 10,
      checklist: [
        { field: 'basic_info', label: 'Basic Information', completed: true },
        { field: 'personal_details', label: 'Personal Details', completed: true },
        { field: 'profile_photo', label: 'Profile Photo', completed: false },
        { field: 'employment_info', label: 'Employment Information', completed: false },
        { field: 'emergency_contact', label: 'Emergency Contact', completed: true },
      ],
    });
  }
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
async function loadRecentApplications() {
  const container = document.getElementById('recent-applications-list');

  if (!container) return;

  try {
    // Show loading state
    container.innerHTML = `
      <div class="boarder-loading-state">
        <p>Loading your applications...</p>
      </div>
    `;

    // Fetch applications from API
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/boarder/applications`);

    if (!response.ok) {
      throw new Error('Failed to fetch applications');
    }

    const data = await response.json();
    const applications = data.data || [];

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
            <h4 class="application-property-name">${
              app.property_title || app.title || 'Property'
            }</h4>
            <p class="application-property-address">${
              app.property_address || app.address || 'Address not available'
            }</p>
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
              <span class="application-detail-value">${
                app.room_title || app.roomType || 'Standard Room'
              }</span>
            </div>
            <div class="application-detail">
              <span class="application-detail-label">Monthly Rent:</span>
              <span class="application-detail-value">₱${
                app.room_price
                  ? Number(app.room_price).toLocaleString()
                  : app.monthly_rent
                  ? Number(app.monthly_rent).toLocaleString()
                  : app.monthlyRent
                  ? Number(app.monthlyRent).toLocaleString()
                  : 'N/A'
              }</span>
            </div>
            <div class="application-detail">
              <span class="application-detail-label">Applied:</span>
              <span class="application-detail-value">${formatDate(
                app.created_at || app.submittedAt || app.appliedDate
              )}</span>
            </div>
            ${
              app.move_in_date || app.movingDate
                ? `
              <div class="application-detail">
                <span class="application-detail-label">Moving Date:</span>
                <span class="application-detail-value">${formatDate(
                  app.move_in_date || app.movingDate
                )}</span>
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
  } catch (error) {
    console.error('Error loading applications:', error);

    // Show user-friendly error message
    showToast('Unable to load recent applications from server. Showing offline data.', 'warning');

    // Fall back to localStorage data on error
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');

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

    // Show recent applications (last 3) from localStorage
    const recentApplications = applications.slice(-3).reverse();

    container.innerHTML = recentApplications
      .map(
        app => `
      <div class="application-card" data-application-id="${app.id}">
        <div class="application-card-header">
          <div class="application-property-info">
            <h4 class="application-property-name">${
              app.property_title || app.title || 'Property'
            }</h4>
            <p class="application-property-address">${
              app.property_address || app.address || 'Address not available'
            }</p>
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
              <span class="application-detail-value">${
                app.room_title || app.roomType || 'Standard Room'
              }</span>
            </div>
            <div class="application-detail">
              <span class="application-detail-label">Monthly Rent:</span>
              <span class="application-detail-value">₱${
                app.room_price
                  ? Number(app.room_price).toLocaleString()
                  : app.monthlyRent?.toLocaleString() || 'N/A'
              }</span>
            </div>
            <div class="application-detail">
              <span class="application-detail-label">Applied:</span>
              <span class="application-detail-value">${formatDate(
                app.created_at || app.submittedAt || app.appliedDate
              )}</span>
            </div>
            ${
              app.move_in_date || app.movingDate
                ? `
              <div class="application-detail">
                <span class="application-detail-label">Moving Date:</span>
                <span class="application-detail-value">${formatDate(
                  app.move_in_date || app.movingDate
                )}</span>
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
        <button class="boarder-btn boarder-btn-outline boarder-btn-sm" onclick="viewApplication(${app.id})">
          <span class="icon-placeholder" data-icon="eye"></span>
          View Details
        </button>
      `;
    case 'rejected':
      return `
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
async function loadSavedProperties() {
  const container = document.getElementById('saved-properties-list');

  if (!container) return;

  try {
    // Show loading state
    container.innerHTML = `
      <div class="boarder-loading-state">
        <p>Loading saved properties...</p>
      </div>
    `;

    // Fetch saved properties from API
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/boarder/saved-listings`);

    if (!response.ok) {
      throw new Error('Failed to load saved properties');
    }

    const data = await response.json();
    const savedProperties = data.data || [];

    if (savedProperties.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <span class="icon-placeholder" data-icon="bookmark"></span>
          <p>No saved properties yet</p>
          <a href="../find-a-room/index.html" class="boarder-btn boarder-btn-outline boarder-btn-sm">
            Browse Properties
          </a>
        </div>
      `;
      replaceIconsInContainer(container);
      return;
    }

    // Show recent saved properties (last 3)
    const recentSaved = savedProperties.slice(0, 3);

    container.innerHTML = recentSaved
      .map(savedListing => {
        const property = savedListing.property;
        return `
        <div class="saved-property-card" data-property-id="${property.id}">
          <div class="saved-property-image">
            <img src="${
              property.image ||
              'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=300&q=80'
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
      `;
      })
      .join('');

    replaceIconsInContainer(container);
  } catch (error) {
    console.error('Error loading saved properties:', error);
    showToast('Unable to load saved properties from server.', 'warning');
    container.innerHTML = `
      <div class="empty-state-small">
        <span class="icon-placeholder" data-icon="exclamationTriangle"></span>
        <p>Unable to load saved properties</p>
        <p class="text-sm text-gray-500">Check your internet connection and try refreshing the page.</p>
        <button class="boarder-btn boarder-btn-outline boarder-btn-sm" onclick="location.reload()">
          Refresh Page
        </button>
      </div>
    `;
    replaceIconsInContainer(container);
  }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
  const container = document.getElementById('activity-timeline');

  if (!container) return;

  try {
    // Show loading state
    container.innerHTML = `
      <div class="boarder-loading-state">
        <p>Loading recent activity...</p>
      </div>
    `;

    // Fetch applications from API to generate activity
    const applicationsResponse = await authenticatedFetch(
      `${CONFIG.API_BASE_URL}/api/boarder/applications`
    );

    let applications = [];
    if (applicationsResponse.ok) {
      const applicationsData = await applicationsResponse.json();
      applications = applicationsData.data || [];
    }

    // TODO: Fetch saved properties from API when endpoint is available
    // For now, fall back to localStorage
    const savedProperties = JSON.parse(localStorage.getItem('savedProperties') || '[]');

    const activities = [];

    // Add application activities
    applications.forEach(app => {
      activities.push({
        type: 'application',
        title: `Applied to ${app.property_title || app.title || 'Property'}`,
        description: `Submitted application for ${
          app.room_type || app.roomType || 'Standard Room'
        }`,
        date: app.created_at || app.submittedAt || app.appliedDate,
        icon: 'clipboardList',
      });

      // Add status change activities if there are updates
      if (app.updated_at && app.updated_at !== app.created_at) {
        activities.push({
          type: 'status_update',
          title: `Application ${getStatusText(app.status).toLowerCase()}`,
          description: `Your application for ${
            app.property_title || app.title || 'Property'
          } was ${getStatusText(app.status).toLowerCase()}`,
          date: app.updated_at,
          icon: getStatusActivityIcon(app.status),
        });
      }
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
  } catch (error) {
    console.error('Error loading recent activity:', error);

    // Fall back to localStorage data on error
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
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // View all saved properties
  const viewAllSavedBtn = document.getElementById('view-all-saved');
  if (viewAllSavedBtn) {
    viewAllSavedBtn.addEventListener('click', () => {
      // TODO: Navigate to saved properties page
      alert('Saved properties page coming soon!');
    });
  }

  // Modal event listeners
  const closeModalBtn = document.getElementById('close-application-modal');
  const closeModalFooterBtn = document.getElementById('close-application-modal-btn');
  const modal = document.getElementById('application-details-modal');

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeApplicationModal);
  }

  if (closeModalFooterBtn) {
    closeModalFooterBtn.addEventListener('click', closeApplicationModal);
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeApplicationModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeApplicationModal();
    }
  });
}

/**
 * Setup application action event listeners
 */
function setupApplicationActions() {
  // Make functions globally available for onclick handlers
  window.viewApplication = async applicationId => {
    await showApplicationDetailsModal(applicationId);
  };
}

/**
 * Show application details modal
 */
async function showApplicationDetailsModal(applicationId) {
  const modal = document.getElementById('application-details-modal');
  const content = document.getElementById('application-details-content');
  const actions = document.getElementById('application-modal-actions');

  if (!modal || !content) return;

  // Show modal with loading state
  modal.style.display = 'flex';
  content.innerHTML = `
    <div class="boarder-loading-state">
      <p>Loading application details...</p>
    </div>
  `;
  actions.innerHTML = '';

  try {
    // Fetch application details from API
    const response = await authenticatedFetch(
      `${CONFIG.API_BASE_URL}/api/boarder/applications/${applicationId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch application details');
    }

    const data = await response.json();
    const application = data.data;

    // Render application details
    renderApplicationDetails(application, content, actions);
  } catch (error) {
    console.error('Error loading application details:', error);

    // Try to find application in localStorage as fallback
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const application = applications.find(app => app.id === applicationId);

    if (application) {
      renderApplicationDetails(application, content, actions);
    } else {
      content.innerHTML = `
        <div class="empty-state-small">
          <span class="icon-placeholder" data-icon="exclamationTriangle"></span>
          <p>Failed to load application details</p>
        </div>
      `;
      replaceIconsInContainer(content);
    }
  }
}

/**
 * Render application details in modal
 */
function renderApplicationDetails(application, contentContainer, actionsContainer) {
  const propertyTitle = application.property_title || application.title || 'Property';
  const propertyAddress =
    application.property_address || application.address || 'Address not available';
  const roomTitle = application.room_title || application.roomType || 'Standard Room';
  const roomPrice = application.room_price || application.monthlyRent || 0;
  const landlordName =
    `${application.first_name || ''} ${application.last_name || ''}`.trim() || 'Landlord';

  contentContainer.innerHTML = `
    <div class="application-details-grid">
      <!-- Property Information -->
      <div class="application-detail-section">
        <h3>Property Information</h3>
        <div class="application-detail-item">
          <span class="label">Property Name:</span>
          <span class="value">${propertyTitle}</span>
        </div>
        <div class="application-detail-item">
          <span class="label">Address:</span>
          <span class="value">${propertyAddress}</span>
        </div>
        <div class="application-detail-item">
          <span class="label">Room Type:</span>
          <span class="value">${roomTitle}</span>
        </div>
        <div class="application-detail-item">
          <span class="label">Monthly Rent:</span>
          <span class="value">₱${Number(roomPrice).toLocaleString()}</span>
        </div>
      </div>

      <!-- Application Information -->
      <div class="application-detail-section">
        <h3>Application Status</h3>
        <div class="application-detail-item">
          <span class="label">Status:</span>
          <span class="value">
            <span class="application-status application-status-${application.status}">
              ${getStatusIcon(application.status)}
              ${getStatusText(application.status)}
            </span>
          </span>
        </div>
        <div class="application-detail-item">
          <span class="label">Applied Date:</span>
          <span class="value">${formatDate(
            application.created_at || application.submittedAt || application.appliedDate
          )}</span>
        </div>
        <div class="application-detail-item">
          <span class="label">Landlord:</span>
          <span class="value">${landlordName}</span>
        </div>
        ${
          application.updated_at && application.updated_at !== application.created_at
            ? `
        <div class="application-detail-item">
          <span class="label">Last Updated:</span>
          <span class="value">${formatDate(application.updated_at)}</span>
        </div>
        `
            : ''
        }
      </div>
    </div>

    ${
      application.message
        ? `
    <div class="application-message">
      <h3>Your Message</h3>
      <p>${application.message}</p>
    </div>
    `
        : ''
    }
  `;

  // Add action buttons based on status
  if (application.status === 'pending') {
    actionsContainer.innerHTML = `
      <button class="boarder-btn boarder-btn-outline" onclick="cancelApplication(${application.id})">
        <span class="icon-placeholder" data-icon="xMark"></span>
        Cancel Application
      </button>
    `;
  } else if (application.status === 'accepted') {
    actionsContainer.innerHTML = `
      <div class="application-accepted-message">
        <span class="icon-placeholder" data-icon="checkCircle"></span>
        <span>Your application has been accepted! The landlord will contact you with next steps.</span>
      </div>
    `;
  } else if (application.status === 'rejected') {
    actionsContainer.innerHTML = `
      <div class="application-rejected-message">
        <span class="icon-placeholder" data-icon="xCircle"></span>
        <span>This application was not accepted. You can apply to other properties.</span>
      </div>
    `;
  }

  // Replace icons in the rendered content
  replaceIconsInContainer(contentContainer);
  replaceIconsInContainer(actionsContainer);
}

/**
 * Close application details modal
 */
function closeApplicationModal() {
  const modal = document.getElementById('application-details-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Cancel application
 */
window.cancelApplication = async applicationId => {
  if (!confirm('Are you sure you want to cancel this application?')) {
    return;
  }

  try {
    const response = await authenticatedFetch(
      `${CONFIG.API_BASE_URL}/api/boarder/applications/${applicationId}`,
      {
        method: 'DELETE',
      }
    );

    if (response.ok) {
      closeApplicationModal();
      // Reload the dashboard
      await loadDashboardStats();
      await loadRecentApplications();
      await loadRecentActivity();
    } else {
      alert('Failed to cancel application. Please try again.');
    }
  } catch (error) {
    console.error('Error canceling application:', error);
    alert('Failed to cancel application. Please try again.');
  }
};

/**
 * Update profile completion section with real data
 */
function updateProfileCompletion(profileData) {
  // Update progress circle
  const progressCircle = document.querySelector('[data-progress]');
  const progressValue = document.querySelector('.progress-value');

  if (progressCircle && progressValue) {
    progressCircle.setAttribute('data-progress', profileData.percentage);
    progressCircle.style.setProperty('--progress', profileData.percentage);
    progressValue.textContent = `${profileData.percentage}%`;
  }

  // Update header text based on completion percentage
  const headerTitle = document.querySelector('.profile-completion-info h3');
  const headerDescription = document.querySelector('.profile-completion-info p');

  if (headerTitle && headerDescription) {
    if (profileData.percentage === 100) {
      headerTitle.textContent = 'Profile Complete!';
      headerDescription.textContent = 'Your profile is fully complete and ready for applications';
    } else if (profileData.percentage >= 75) {
      headerTitle.textContent = 'Almost Complete!';
      headerDescription.textContent =
        'Complete your profile to improve your application success rate';
    } else if (profileData.percentage >= 50) {
      headerTitle.textContent = 'Good Progress!';
      headerDescription.textContent =
        'Keep going to complete your profile and increase your chances';
    } else {
      headerTitle.textContent = 'Complete Your Profile';
      headerDescription.textContent = 'A complete profile helps landlords trust your application';
    }
  }

  // Update checklist
  const checklistContainer = document.querySelector('.profile-completion-checklist');
  if (checklistContainer && profileData.checklist) {
    checklistContainer.innerHTML = profileData.checklist
      .map(
        item => `
        <div class="checklist-item ${item.completed ? 'completed' : ''}">
          <span class="icon-placeholder" data-icon="${
            item.completed ? 'checkCircle' : 'circle'
          }"></span>
          <span>${item.label}</span>
        </div>
      `
      )
      .join('');

    // Replace icons in the updated checklist
    replaceIconsInContainer(checklistContainer);
  }
}

/**
 * Get status activity icon for recent activity
 */
function getStatusActivityIcon(status) {
  switch (status) {
    case 'accepted':
      return 'checkCircle';
    case 'rejected':
      return 'xCircle';
    case 'cancelled':
      return 'minusCircle';
    default:
      return 'clock';
  }
}

/**
 * Remove saved property
 */
window.removeSavedProperty = async propertyId => {
  try {
    // Call API to remove saved property
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/boarder/saved-listings`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        property_id: parseInt(propertyId),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove property');
    }

    // Show success message
    showToast('Property removed from saved list', 'success');

    // Reload saved properties and stats
    loadSavedProperties();
    await loadDashboardStats();
  } catch (error) {
    console.error('Error removing saved property:', error);
    showToast(error.message || 'Failed to remove property', 'error');
  }
};

/**
 * View property details
 */
window.viewProperty = propertyId => {
  window.location.href = `../find-a-room/room-detail.html?id=${propertyId}`;
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

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add styles
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '6px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
  });

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

/**
 * Check if this is a new user and show helpful guidance
 */
function checkForNewUser() {
  const applications = JSON.parse(localStorage.getItem('applications') || '[]');
  const savedProperties = JSON.parse(localStorage.getItem('savedProperties') || '[]');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // If user has no applications and no saved properties, show welcome message
  if (applications.length === 0 && savedProperties.length === 0) {
    setTimeout(() => {
      showToast(
        `Welcome ${
          user.name || 'to Haven Space'
        }! Start by browsing properties to find your perfect room.`,
        'info',
        8000
      );
    }, 2000);
  }
}

// Initialize on module load for single-page apps
if (typeof window !== 'undefined') {
  window.initApplicationsDashboard = initApplicationsDashboard;

  // Auto-initialize if the applications dashboard exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      if (document.querySelector('[data-dashboard-type="applications"]')) {
        await initApplicationsDashboard();
      }
    });
  } else {
    // DOM already loaded
    if (document.querySelector('[data-dashboard-type="applications"]')) {
      initApplicationsDashboard();
    }
  }
}
