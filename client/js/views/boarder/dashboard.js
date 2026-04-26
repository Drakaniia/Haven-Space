/**
 * Boarder Dashboard - Dynamic Functionality
 *
 * Handles interactive features for the problem-solving focused boarder dashboard
 */

import { getIcon } from '../../shared/icons.js';

import CONFIG from '../../config.js';

// Dashboard state management
const dashboardState = {
  user: null,
  applications: [],
  payments: [],
  savedSearches: [],
  documents: [],
  lease: null,
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
      const isEnabled = e.target.checked;

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

      // Show notification that this feature is not yet implemented
      showNotification('Application details feature coming soon', 'info');
    });
  });

  actionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const appCard = btn.closest('.boarder-application-card');
      const appName = appCard?.querySelector('.boarder-application-name')?.textContent || '';
      const action = btn.textContent.trim();

      if (action === 'Sign Contract') {
        // Show notification that this feature is not yet implemented
        showNotification('Contract signing feature coming soon', 'info');
      } else if (action === 'Withdraw') {
        if (confirm(`Are you sure you want to withdraw your application for ${appName}?`)) {
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
 * Load dashboard data from API
 */
async function loadDashboardData() {
  try {
    const userId = getCurrentUserId();

    // Fetch applications
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const appsResponse = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/applications`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        dashboardState.applications = appsData.data || [];
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }

    // Fetch announcements for dashboard preview
    try {
      const announcementsResponse = await fetch(
        `${CONFIG.API_BASE_URL}/api/boarder/announcements`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          credentials: 'include',
        }
      );

      if (announcementsResponse.ok) {
        const announcementsData = await announcementsResponse.json();
        const announcements = announcementsData.data?.announcements || [];
        renderDashboardAnnouncements(announcements.slice(0, 3)); // Show top 3
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }

    // Fetch maintenance requests
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const maintenanceResponse = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/maintenance`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      if (maintenanceResponse.ok) {
        const maintenanceData = await maintenanceResponse.json();
        dashboardState.maintenance = maintenanceData.data || [];
      }
    } catch (error) {
      console.error('Error loading maintenance:', error);
    }

    // Fetch lease information
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const leaseResponse = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/lease`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      if (leaseResponse.ok) {
        const leaseData = await leaseResponse.json();
        dashboardState.lease = leaseData.data || null;
        renderLeaseInfo(dashboardState.lease);

        // Render document vault and important info based on lease status
        await renderDocumentVault(dashboardState.lease);
        renderImportantInformation(dashboardState.lease);
      }
    } catch (error) {
      console.error('Error loading lease info:', error);
    }

    // Fetch payment history for dashboard preview
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const paymentsResponse = await fetch(`${CONFIG.API_BASE_URL}/api/payments/history?limit=3`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        dashboardState.payments = paymentsData.data || [];
        renderDashboardPayments(dashboardState.payments);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    }

    updateDashboardUI();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

/**
 * Get current user ID from localStorage
 */
function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return parseInt(user.id || user.user_id || localStorage.getItem('user_id') || '3');
}

/**
 * Render lease information in dashboard
 */
function renderLeaseInfo(lease) {
  if (!lease) {
    // Show default state when no lease data
    const greeting = document.querySelector('[data-greeting]');
    if (greeting) {
      greeting.textContent = 'Welcome home';
    }

    // Update stat cards to show "No active lease" state
    const balanceValue = document.querySelector('[data-balance-value]');
    if (balanceValue) {
      balanceValue.textContent = '₱0.00';
    }

    const utilitiesValue = document.querySelector('[data-utilities-value]');
    const utilitiesDesc = document.querySelector('[data-utilities-breakdown]');
    if (utilitiesValue) {
      utilitiesValue.textContent = '₱0.00';
    }
    if (utilitiesDesc) {
      utilitiesDesc.textContent = 'No active lease';
    }

    const leasePeriodValue = document.querySelector('[data-lease-period]');
    const leasePeriodDesc = document.querySelector('[data-lease-renewal]');
    if (leasePeriodValue) {
      leasePeriodValue.textContent = 'No Lease';
    }
    if (leasePeriodDesc) {
      leasePeriodDesc.textContent = 'Apply for a room to start';
    }

    const nextPaymentValue = document.querySelector('[data-payment-days]');
    const nextPaymentDesc = document.querySelector('[data-payment-details]');
    if (nextPaymentValue) {
      nextPaymentValue.textContent = 'N/A';
    }
    if (nextPaymentDesc) {
      nextPaymentDesc.textContent = 'No upcoming payments';
    }

    return;
  }

  // Update greeting with property name
  const greeting = document.querySelector('[data-greeting]');
  if (greeting && lease.property_name && lease.room_number) {
    greeting.textContent = `Welcome home to ${lease.property_name}, Room ${lease.room_number}`;
  }

  // Update lease period stat
  const leasePeriodValue = document.querySelector('[data-lease-period]');
  const leasePeriodDesc = document.querySelector('[data-lease-renewal]');

  if (leasePeriodValue && lease.current_month && lease.total_months) {
    leasePeriodValue.textContent = `Month ${lease.current_month} / ${lease.total_months}`;
  }

  if (leasePeriodDesc && lease.end_date) {
    const endDate = new Date(lease.end_date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    leasePeriodDesc.textContent = `Next Renewal: ${endDate}`;
  }

  // Update outstanding balance
  const balanceValue = document.querySelector('[data-balance-value]');
  if (balanceValue && lease.outstanding_balance !== undefined) {
    balanceValue.textContent = `₱${formatCurrency(lease.outstanding_balance)}`;
  }

  // Update utilities
  const utilitiesValue = document.querySelector('[data-utilities-value]');
  const utilitiesDesc = document.querySelector('[data-utilities-breakdown]');

  if (utilitiesValue && lease.current_utilities !== undefined) {
    utilitiesValue.textContent = `₱${formatCurrency(lease.current_utilities)}`;
  }

  if (utilitiesDesc && lease.electricity_cost !== undefined && lease.water_cost !== undefined) {
    utilitiesDesc.textContent = `Electricity: ₱${formatCurrency(
      lease.electricity_cost
    )} | Water: ₱${formatCurrency(lease.water_cost)}`;
  }

  // Update next payment
  const nextPaymentValue = document.querySelector('[data-payment-days]');
  const nextPaymentDesc = document.querySelector('[data-payment-details]');

  if (nextPaymentValue && lease.days_until_payment !== undefined) {
    nextPaymentValue.textContent = `${lease.days_until_payment} Days Left`;
  }

  if (nextPaymentDesc && lease.next_payment_amount && lease.next_payment_date) {
    const paymentDate = new Date(lease.next_payment_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    nextPaymentDesc.textContent = `₱${formatCurrency(
      lease.next_payment_amount
    )} due on ${paymentDate}`;
  }
}

/**
 * Render payment cards in dashboard
 */
function renderDashboardPayments(payments) {
  const paymentList = document.querySelector('.boarder-payment-simple-list');
  if (!paymentList) return;

  if (!payments || payments.length === 0) {
    paymentList.innerHTML = `
      <div class="boarder-empty-state" style="text-align: center; padding: 40px 20px; color: #6b7280;">
        <p style="margin: 0; font-size: 14px;">No payment history available</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">Payments will appear here once you have an active lease</p>
      </div>
    `;
    return;
  }

  paymentList.innerHTML = payments
    .slice(0, 3)
    .map((payment, index) => {
      const isPaid = payment.status === 'paid';
      const isCurrent = index === 0 && !isPaid;

      const date = new Date(payment.payment_date || payment.due_date);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const period =
        index === 0
          ? 'Current Month'
          : index === 1
          ? 'Previous Month'
          : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (isCurrent) {
        const daysLeft = Math.ceil(
          (new Date(payment.due_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return `
        <div class="boarder-payment-simple-card current">
          <div class="boarder-payment-simple-header">
            <span class="boarder-payment-period">${period}</span>
            <span class="boarder-payment-status-badge unpaid">Unpaid</span>
          </div>
          <div class="boarder-payment-simple-body">
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Amount</span>
              <span class="boarder-payment-value">₱${formatCurrency(payment.amount)}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Due Date</span>
              <span class="boarder-payment-value">${formattedDate}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Days Left</span>
              <span class="boarder-payment-value highlight">${daysLeft} days</span>
            </div>
          </div>
          <a href="./payments/pay.html" class="boarder-btn boarder-btn-primary boarder-btn-full">Pay Now</a>
        </div>
      `;
      } else {
        return `
        <div class="boarder-payment-simple-card history">
          <div class="boarder-payment-simple-header">
            <span class="boarder-payment-period">${period}</span>
            <span class="boarder-payment-status-badge paid">Paid</span>
          </div>
          <div class="boarder-payment-simple-body">
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Amount</span>
              <span class="boarder-payment-value">₱${formatCurrency(payment.amount)}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Paid On</span>
              <span class="boarder-payment-value">${formattedDate}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Payment Method</span>
              <span class="boarder-payment-value">${payment.payment_method || 'N/A'}</span>
            </div>
          </div>
        </div>
      `;
      }
    })
    .join('');
}

/**
 * Format currency value
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Update dashboard UI with loaded data
 */
function updateDashboardUI() {
  // Update application count
  const activeApplications = dashboardState.applications.filter(
    app => app.status === 'accepted' || app.status === 'pending'
  ).length;

  // Update stats if elements exist
  const statValue = document.querySelector('.boarder-stat-card:first-child .boarder-stat-value');
  if (statValue && activeApplications > 0) {
    statValue.textContent = `${activeApplications} Active`;
  }
}

/**
 * Render announcements in dashboard preview
 */
function renderDashboardAnnouncements(announcements) {
  const announcementsList = document.querySelector('.boarder-announcements-list');
  if (!announcementsList) return;

  if (!announcements || announcements.length === 0) {
    announcementsList.innerHTML = `
      <div class="boarder-empty-state" style="text-align: center; padding: 40px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">No announcements at this time</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">Check back later for updates from your landlord</p>
      </div>
    `;
    return;
  }

  announcementsList.innerHTML = announcements
    .map(announcement => {
      const date = new Date(announcement.publish_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Icon color based on category
      const iconColorMap = {
        urgent: 'orange',
        maintenance: 'blue',
        general: 'green',
        reminder: 'purple',
        event: 'blue',
      };
      const iconColor = iconColorMap[announcement.category] || 'blue';

      // Icon name based on category
      const iconNameMap = {
        urgent: 'exclamationTriangle',
        maintenance: 'wrenchScrewdriver',
        general: 'info',
        reminder: 'bell',
        event: 'calendar',
      };
      const iconName = iconNameMap[announcement.category] || 'info';

      return `
      <div class="boarder-announcement-item">
        <div class="boarder-announcement-icon ${iconColor}">
          ${getIcon(iconName, { strokeWidth: '2' })}
        </div>
        <div class="boarder-announcement-content">
          <h4 class="boarder-announcement-title">${escapeHtml(announcement.title)}</h4>
          <p class="boarder-announcement-text">${escapeHtml(announcement.description)}</p>
          <span class="boarder-announcement-date">${date}</span>
        </div>
      </div>
    `;
    })
    .join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

  if (label) {
    label.textContent = 'Utilities Load';
  }
  if (icon) {
    icon.className = 'boarder-stat-icon orange';
    icon.innerHTML = getIcon('lightning');
  }
  if (value) {
    value.textContent = '₱450';
  }
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

  if (!maintenanceCard || !leaseCard) {
    return;
  }

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

  if (label) {
    label.textContent = 'Maintenance Status';
  }
  if (icon) {
    icon.innerHTML = getIcon('wrenchScrewdriver');
  }
  if (value) {
    value.textContent = 'No Issues';
  }
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

  if (label) {
    label.textContent = 'Lease Timeline';
  }
  if (icon) {
    icon.innerHTML = getIcon('calendarDays');
  }
  if (value) {
    value.textContent = '11 months';
  }
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

  if (label) {
    label.textContent = 'Application Progress';
  }
  if (icon) {
    icon.innerHTML = getIcon('shieldCheck');
  }
  if (value) {
    value.textContent = '2/4 Steps';
  }
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

  if (label) {
    label.textContent = 'Lease Timeline';
  }
  if (icon) {
    icon.innerHTML = getIcon('calendarDays');
  }
  if (value) {
    value.textContent = 'Starting Soon';
  }
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

/**
 * Fetch documents from API
 */
async function fetchDocuments() {
  try {
    const token = localStorage.getItem('token');
    const userId = getCurrentUserId();
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/documents`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    } else {
      console.error('Failed to fetch documents');
      return [];
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

/**
 * Render document cards from real API data
 */
function renderDocumentCards(documents) {
  const documentsGrid = document.querySelector('.boarder-documents-grid');
  if (!documentsGrid) return;

  documentsGrid.innerHTML = '';

  // Limit to 3 documents for dashboard preview
  const limitedDocuments = documents.slice(0, 3);

  limitedDocuments.forEach(doc => {
    const documentCard = createDocumentCard(doc);
    documentsGrid.appendChild(documentCard);
  });
}

/**
 * Create a document card from API data
 */
function createDocumentCard(doc) {
  const card = document.createElement('div');
  card.className = 'boarder-document-card';

  // Determine document type and icon
  const docType = doc.category?.toLowerCase() || 'document';
  let iconClass = 'boarder-document-contract'; // default
  let iconSvg =
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />';

  if (docType.includes('receipt') || docType.includes('payment')) {
    iconClass = 'boarder-document-receipt';
    iconSvg =
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM19 10a2 2 0 11-4 0 2 2 0 014 0z" />';
  } else if (docType.includes('id') || docType.includes('identification')) {
    iconClass = 'boarder-document-id';
    iconSvg =
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />';
  }

  // Format date
  const receivedDate = doc.received_at
    ? new Date(doc.received_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown date';

  // Format document info
  let propertyInfo = doc.document_name || 'Document';
  let dateInfo = `Received: ${receivedDate}`;

  if (docType.includes('receipt') || docType.includes('payment')) {
    const amount = doc.amount ? `₱${parseFloat(doc.amount).toLocaleString()}` : '';
    propertyInfo = doc.description || 'Payment Receipt';
    dateInfo = `${receivedDate} • ${amount}`;
  }

  card.innerHTML = `
    <div class="boarder-document-icon ${iconClass}">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        ${iconSvg}
      </svg>
    </div>
    <div class="boarder-document-info">
      <h4 class="boarder-document-name">${escapeHtml(doc.document_name || 'Document')}</h4>
      <p class="boarder-document-property" id="dashboard-document-property">${escapeHtml(
        propertyInfo
      )}</p>
      <p class="boarder-document-date">${escapeHtml(dateInfo)}</p>
    </div>
    <button class="boarder-document-action" data-document-id="${doc.id}">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  `;

  return card;
}

/**
 * Render document vault based on lease status
 */
async function renderDocumentVault(lease) {
  const documentsGrid = document.querySelector('.boarder-documents-grid');
  if (!documentsGrid) return;

  if (!lease) {
    // Show empty state when no active lease
    documentsGrid.innerHTML = `
      <div class="boarder-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;">
          <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
        </svg>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">No documents available</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">Your rental contract and documents will appear here once you have an active lease</p>
      </div>
    `;
    return;
  }

  // Fetch real documents from API
  const documents = await fetchDocuments();

  if (documents.length === 0) {
    documentsGrid.innerHTML = `
      <div class="boarder-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;">
          <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
        </svg>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">No documents available</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">Your rental contract and documents will appear here once you have an active lease</p>
      </div>
    `;
    return;
  }

  // Render real documents
  renderDocumentCards(documents);
}

/**
 * Render important information based on lease status
 */
function renderImportantInformation(lease) {
  const infoCards = document.querySelector('.boarder-info-cards');
  if (!infoCards) return;

  if (!lease) {
    // Show empty state when no active lease
    infoCards.innerHTML = `
      <div class="boarder-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">No property information available</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">House rules, utility costs, and landlord information will appear here once you have an active lease</p>
      </div>
    `;
    return;
  }

  // If there's a lease, keep the hardcoded information for now
  // In production, this would fetch actual property info from the API
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
  renderDocumentVault,
  renderImportantInformation,
};
