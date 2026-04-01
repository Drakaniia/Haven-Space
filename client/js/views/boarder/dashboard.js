/**
 * Boarder Dashboard - Dynamic Functionality
 *
 * Handles interactive features for the problem-solving focused boarder dashboard
 */

import { getIcon } from '../../shared/icons.js';

// Dashboard state management
const dashboardState = {
  user: {
    name: 'Juan',
    email: 'juan@example.com',
  },
  applications: [],
  payments: [],
  savedSearches: [],
  documents: [],
  // Track user's contract status
  contractStatus: 'application', // 'application' | 'contract' | 'active-lease'
};

/**
 * Initialize dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeSearch();
  initializePaymentAlerts();
  initializeMapPreview();
  initializeSavedSearches();
  initializeDocumentVault();
  initializeApplicationTracker();
  initializeDynamicCards();
});

/**
 * Initialize advanced search functionality
 */
function initializeSearch() {
  const searchInput = document.querySelector('.boarder-search-input');
  const searchFilters = document.querySelectorAll('.boarder-filter-select');
  const searchButton = document.querySelector('.boarder-search-filters .boarder-btn');

  if (searchButton) {
    searchButton.addEventListener('click', handleSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
}

/**
 * Handle search submission
 */
function handleSearch() {
  const searchInput = document.querySelector('.boarder-search-input');
  const filters = document.querySelectorAll('.boarder-filter-select');

  const searchQuery = searchInput?.value || '';
  const searchParams = {
    query: searchQuery,
    priceRange: filters[0]?.value || '',
    amenities: filters[1]?.value || '',
    propertyType: filters[2]?.value || '',
  };

  console.log('Searching with params:', searchParams);

  // Navigate to rooms page with search params
  const queryParams = new URLSearchParams(searchParams).toString();
  window.location.href = `../rooms/index.html?${queryParams}`;
}

/**
 * Initialize payment alert system
 */
function initializePaymentAlerts() {
  const paymentCards = document.querySelectorAll('.boarder-payment-status-card');

  paymentCards.forEach(card => {
    const payButton = card.querySelector('.boarder-btn');
    if (payButton) {
      payButton.addEventListener('click', () => {
        const propertyName =
          card.querySelector('.boarder-payment-property-name')?.textContent || '';
        const amount = card.querySelector('.boarder-payment-amount')?.textContent || '';

        // Navigate to payment page with pre-filled details
        window.location.href = `../payments/pay.html?property=${encodeURIComponent(
          propertyName
        )}&amount=${encodeURIComponent(amount)}`;
      });
    }
  });
}

/**
 * Initialize map preview interactions
 */
function initializeMapPreview() {
  const mapContainer = document.querySelector('.boarder-map-container');
  const useLocationBtn = document.querySelector('.boarder-map-actions .boarder-btn:first-child');
  const drawAreaBtn = document.querySelector('.boarder-map-actions .boarder-btn:last-child');

  if (mapContainer) {
    mapContainer.addEventListener('click', () => {
      window.location.href = '../maps.html';
    });
  }

  if (useLocationBtn) {
    useLocationBtn.addEventListener('click', e => {
      e.stopPropagation();
      getUserLocation();
    });
  }

  if (drawAreaBtn) {
    drawAreaBtn.addEventListener('click', e => {
      e.stopPropagation();
      window.location.href = '../maps.html?mode=draw';
    });
  }
}

/**
 * Get user's current location
 */
function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        console.log('User location:', latitude, longitude);
        window.location.href = `../maps.html?lat=${latitude}&lng=${longitude}`;
      },
      error => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please enable location permissions.');
      }
    );
  } else {
    alert('Geolocation is not supported by your browser');
  }
}

/**
 * Initialize saved searches toggle functionality
 */
function initializeSavedSearches() {
  const searchToggles = document.querySelectorAll('.boarder-toggle input[type="checkbox"]');

  searchToggles.forEach(toggle => {
    toggle.addEventListener('change', e => {
      const searchAlert = e.target.closest('.boarder-search-alert');
      const searchName =
        searchAlert?.querySelector('.boarder-search-alert-name')?.textContent || '';
      const isEnabled = e.target.checked;

      console.log(`Search alert "${searchName}" ${isEnabled ? 'enabled' : 'disabled'}`);

      // In production, this would call an API to update notification preferences
      showNotification(
        isEnabled ? 'Search alerts enabled' : 'Search alerts disabled',
        isEnabled ? 'success' : 'info'
      );
    });
  });
}

/**
 * Initialize document vault download functionality
 */
function initializeDocumentVault() {
  const documentActions = document.querySelectorAll('.boarder-document-action');

  documentActions.forEach(action => {
    action.addEventListener('click', () => {
      const docCard = action.closest('.boarder-document-card');
      const docName = docCard?.querySelector('.boarder-document-name')?.textContent || '';

      console.log('Downloading document:', docName);
      showNotification('Document download started', 'success');

      // In production, this would trigger a file download
      // window.location.href = `/api/documents/download/${docId}`;
    });
  });
}

/**
 * Initialize application tracker interactions
 */
function initializeApplicationTracker() {
  const viewDetailButtons = document.querySelectorAll(
    '.boarder-application-actions .boarder-btn-outline:first-child'
  );
  const actionButtons = document.querySelectorAll(
    '.boarder-application-actions .boarder-btn-primary, .boarder-application-actions .boarder-btn-outline:last-child'
  );

  viewDetailButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const appCard = btn.closest('.boarder-application-card');
      const appName = appCard?.querySelector('.boarder-application-name')?.textContent || '';

      // Navigate to application detail page
      window.location.href = `../applications/detail.html?name=${encodeURIComponent(appName)}`;
    });
  });

  actionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const appCard = btn.closest('.boarder-application-card');
      const appName = appCard?.querySelector('.boarder-application-name')?.textContent || '';
      const action = btn.textContent.trim();

      if (action === 'Sign Contract') {
        window.location.href = `../applications/detail.html?name=${encodeURIComponent(
          appName
        )}&action=sign`;
      } else if (action === 'Withdraw') {
        if (confirm(`Are you sure you want to withdraw your application for ${appName}?`)) {
          console.log('Withdrawing application:', appName);
          showNotification('Application withdrawal submitted', 'info');
        }
      }
    });
  });
}

/**
 * Show notification toast
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
  // Remove existing notification if any
  const existingNotification = document.querySelector('.boarder-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `boarder-notification boarder-notification-${type}`;
  notification.innerHTML = `
    <div class="boarder-notification-content">
      ${getIcon('infoCircle', { width: 20, height: 20 })}
      <span>${message}</span>
    </div>
  `;

  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    background-color: ${getNotificationColor(type)};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Get notification color based on type
 */
function getNotificationColor(type) {
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  return colors[type] || colors.info;
}

/**
 * Load dashboard data from API (placeholder for backend integration)
 */
async function loadDashboardData() {
  try {
    // In production, fetch from API
    // const response = await fetch('/api/boarder/dashboard');
    // const data = await response.json();

    // Mock data for now
    const mockData = {
      applications: [
        { id: 1, name: 'Sunrise Dormitory', status: 'approved' },
        { id: 2, name: 'Green Valley Boarding House', status: 'pending' },
      ],
      payments: [
        {
          id: 1,
          property: 'Sunrise Dormitory',
          amount: 5500,
          dueDate: '2025-02-01',
          status: 'upcoming',
        },
        {
          id: 2,
          property: 'Cozy Student Dorm',
          amount: 4500,
          dueDate: '2025-01-31',
          status: 'warning',
        },
      ],
    };

    dashboardState.applications = mockData.applications;
    dashboardState.payments = mockData.payments;

    updateDashboardUI();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

/**
 * Update dashboard UI with loaded data
 */
function updateDashboardUI() {
  // Update application count
  const activeApplications = dashboardState.applications.filter(
    app => app.status === 'approved' || app.status === 'pending'
  ).length;
  const statValue = document.querySelector('.boarder-stat-card:first-child .boarder-stat-value');
  if (statValue) {
    statValue.textContent = `${activeApplications} Active`;
  }

  // Update payment stats
  const upcomingPayments = dashboardState.payments.filter(
    p => p.status === 'upcoming' || p.status === 'warning'
  ).length;
  console.log(`${upcomingPayments} upcoming payments`);
}

/**
 * Initialize dynamic cards that change based on user's contract status
 */
function initializeDynamicCards() {
  updateDynamicCards();
}

/**
 * Update card to show Utilities Load status (post-contract)
 * High utility feature for Philippine boarders - prevents running out of electricity at 2 AM
 */
function updateUtilitiesCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) label.textContent = 'Utilities Load';
  if (icon) {
    icon.className = 'boarder-stat-icon orange';
    icon.innerHTML = getIcon('lightning');
  }
  if (value) value.textContent = '₱450';
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-warning"></span>
      5 kWh remaining • ₱1.00/kWh
    `;
  }
}

/**
 * Update dynamic cards based on user's contract/application phase
 * Cards switch content automatically when user signs contract
 */
function updateDynamicCards() {
  const utilitiesCard = document.querySelector('[data-dynamic-card="utilities"]');
  const maintenanceCard = document.querySelector('[data-dynamic-card="maintenance"]');
  const leaseCard = document.querySelector('[data-dynamic-card="lease"]');

  const isPostContract =
    dashboardState.contractStatus === 'contract' ||
    dashboardState.contractStatus === 'active-lease';

  // Update utilities card (only shown post-contract)
  if (utilitiesCard) {
    if (isPostContract) {
      updateUtilitiesCard(utilitiesCard);
    } else {
      // Hide utilities card for applicants (not relevant yet)
      utilitiesCard.style.display = 'none';
    }
  }

  if (!maintenanceCard || !leaseCard) return;

  if (isPostContract) {
    // Switch to Maintenance Status and Lease Timeline
    updateMaintenanceCard(maintenanceCard);
    updateLeaseCard(leaseCard);
  } else {
    // Show Application Progress and Lease Start info
    updateApplicationProgressCard(maintenanceCard);
    updateLeaseTimelineCard(leaseCard);
  }
}

/**
 * Update card to show Maintenance Status (post-contract)
 */
function updateMaintenanceCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) label.textContent = 'Maintenance Status';
  if (icon) {
    icon.innerHTML = getIcon('wrenchScrewdriver');
  }
  if (value) value.textContent = 'No Issues';
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-success"></span>
      All systems functional
    `;
  }
}

/**
 * Update card to show Lease Timeline (post-contract)
 */
function updateLeaseCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) label.textContent = 'Lease Timeline';
  if (icon) {
    icon.innerHTML = getIcon('calendarDays');
  }
  if (value) value.textContent = '11 months';
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-info"></span>
      Ends: Jan 15, 2026
    `;
  }
}

/**
 * Update card to show Application Progress (pre-contract)
 */
function updateApplicationProgressCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) label.textContent = 'Application Progress';
  if (icon) {
    icon.innerHTML = getIcon('shieldCheck');
  }
  if (value) value.textContent = '2/4 Steps';
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-success"></span>
      1 approved, 1 pending review
    `;
  }
}

/**
 * Update card to show Lease Start Timeline (pre-contract)
 */
function updateLeaseTimelineCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) label.textContent = 'Lease Timeline';
  if (icon) {
    icon.innerHTML = getIcon('calendarDays');
  }
  if (value) value.textContent = 'Starting Soon';
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-info"></span>
      Expected: Feb 1, 2025
    `;
  }
}

/**
 * Set user's contract status and update cards
 * @param {string} status - 'application' | 'contract' | 'active-lease'
 */
function setContractStatus(status) {
  dashboardState.contractStatus = status;
  updateDynamicCards();
}

// Add animation keyframes for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .boarder-notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .boarder-notification-content svg {
    width: 20px;
    height: 20px;
  }
`;
document.head.appendChild(style);

// Export functions for external use
export {
  dashboardState,
  loadDashboardData,
  showNotification,
  getUserLocation,
  handleSearch,
  initializeDynamicCards,
  updateDynamicCards,
  setContractStatus,
};
