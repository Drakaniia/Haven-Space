/**
 * Boarder Dashboard - Dynamic Functionality
 *
 * Handles interactive features for the problem-solving focused boarder dashboard
 */

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
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
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
export { dashboardState, loadDashboardData, showNotification, getUserLocation, handleSearch };
