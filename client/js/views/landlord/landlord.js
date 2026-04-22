import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';
import { getAuthHeaders } from '../../shared/state.js';
import { getAuthHeaders } from '../../shared/auth-headers.js';

/**
 * Inject icons from centralized library into elements with data-icon attributes
 * Replaces inline SVGs with centralized icon library calls
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
 * Initialize landlord dashboard components
 * @param {Object} config - Dashboard configuration
 * @param {Object} config.user - User information
 * @param {string} config.user.name - User's full name
 * @param {string} config.user.initials - User's initials for avatar
 * @param {string} config.user.role - User role (landlord)
 */
export function initLandlordDashboard(config = {}) {
  const { user = { name: 'Juan', initials: 'JD', role: 'Landlord' } } = config;

  // Inject icons from centralized library
  injectIcons();

  // Update greeting based on time of day
  updateGreeting(user.name);

  // Check if we're on the listings page or boarders page - if so, skip dashboard-specific loaders
  const isListingsPage = window.location.pathname.includes('/listings/');
  const isBoardersPage = window.location.pathname.includes('/boarders/');

  if (!isListingsPage && !isBoardersPage) {
    // Load dashboard data (placeholder for API integration)
    loadDashboardData();

    // Load payment overview data
    loadPaymentOverview();

    // Load recent activities
    loadRecentActivities();

    // Load properties
    loadProperties();

    // Initialize edit property modal handlers
    initEditPropertyModal();

    // Dynamically import and initialize applications only on dashboard
    import('./landlord-applications.js').then(({ initLandlordApplications }) => {
      initLandlordApplications();
    });
  }
}

/**
 * Update greeting based on time of day
 * @param {string} name - User's name
 */
function updateGreeting(name) {
  const greetingElement = document.querySelector('.landlord-greeting h1');
  if (!greetingElement) {
    return;
  }

  const hour = new Date().getHours();
  let greeting = 'Good afternoon';

  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 18) {
    greeting = 'Good evening';
  }

  greetingElement.textContent = `${greeting}, ${name}! 👋`;
}

/**
 * Load dashboard data from API
 */
async function loadDashboardData() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/dashboard-stats.php`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }

    const result = await response.json();

    if (result.data) {
      _updateDashboardStats(result.data);
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    // Show error state in UI
    _showErrorState();
  }
}

/**
 * Update dashboard stats with fetched data
 * @param {Object} data - Dashboard data from API
 */
function _updateDashboardStats(data) {
  // Update Occupancy Rate
  const occupancyElement = document.querySelector('[data-stat="occupancy-rate"]');
  if (occupancyElement && data.occupancy) {
    occupancyElement.textContent = `${data.occupancy.rate}%`;

    // Update trend indicator
    const trendElement = occupancyElement.parentElement.querySelector(
      '[data-stat="occupancy-trend"]'
    );
    if (trendElement) {
      const trend = data.occupancy.trend;
      const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral';
      const trendSymbol = trend > 0 ? '↑' : trend < 0 ? '↓' : '•';
      trendElement.className = `trend-indicator ${trendClass}`;
      trendElement.textContent = `${trendSymbol} ${Math.abs(trend)}%`;
    }
  }

  // Update Monthly Revenue
  const revenueElement = document.querySelector('[data-stat="monthly-revenue"]');
  if (revenueElement && data.revenue) {
    const formattedRevenue = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(data.revenue.monthly);
    revenueElement.textContent = formattedRevenue.replace('PHP', '₱');

    // Update trend indicator
    const trendElement = revenueElement.parentElement.querySelector('[data-stat="revenue-trend"]');
    if (trendElement) {
      const trend = data.revenue.trend;
      const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-neutral';
      const trendSymbol = trend > 0 ? '↑' : trend < 0 ? '↓' : '•';
      trendElement.className = `trend-indicator ${trendClass}`;
      trendElement.textContent = `${trendSymbol} ${Math.abs(trend)}%`;
    }
  }

  // Update Upcoming Renewals
  const renewalsElement = document.querySelector('[data-stat="upcoming-renewals"]');
  if (renewalsElement && data.renewals) {
    renewalsElement.textContent = data.renewals.upcoming_count;
  }

  // Update Payment Alerts
  const dueSoonElement = document.querySelector('[data-stat="due-soon-count"]');
  const overdueElement = document.querySelector('[data-stat="overdue-count"]');
  const paymentAlertsTextElement = document.querySelector('[data-stat="payment-alerts-text"]');
  if (dueSoonElement && overdueElement && data.payment_alerts) {
    dueSoonElement.textContent = data.payment_alerts.due_soon;
    overdueElement.textContent = data.payment_alerts.overdue;

    // Update the payment alerts description text
    if (paymentAlertsTextElement) {
      paymentAlertsTextElement.textContent = `${data.payment_alerts.due_soon} due soon, ${data.payment_alerts.overdue} overdue`;
    }
  }
}

/**
 * Show error state when data fails to load
 */
function _showErrorState() {
  // Optionally show error indicators in stat cards
  const statValues = document.querySelectorAll('.landlord-stat-value');
  statValues.forEach(element => {
    if (!element.dataset.error) {
      element.dataset.error = 'true';
      element.style.opacity = '0.5';
    }
  });
}

/**
 * Send payment reminder to tenant
 * @param {number} paymentId - Payment ID
 * @param {string} tenantName - Tenant's name
 */
export async function sendPaymentReminder(paymentId, tenantName) {
  // TODO: Implement API call to send payment reminder
  // Example:
  // try {
  //   const response = await fetch('/api/payments/send-reminder', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ paymentId })
  //   });
  //   const result = await response.json();
  //   showNotification('Reminder sent successfully', 'success');
  // } catch (error) {
  //   console.error('Failed to send reminder:', error);
  //   showNotification('Failed to send reminder', 'error');
  // }
}

/**
 * Record a payment
 * @param {number} paymentId - Payment ID
 * @param {Object} paymentData - Payment information
 */
export async function recordPayment(paymentId, paymentData) {
  // TODO: Implement API call to record payment
  // Example:
  // try {
  //   const response = await fetch('/api/payments/record', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ paymentId, ...paymentData })
  //   });
  //   const result = await response.json();
  //   showNotification('Payment recorded successfully', 'success');
  //   return result;
  // } catch (error) {
  //   console.error('Failed to record payment:', error);
  //   showNotification('Failed to record payment', 'error');
  // }
}

/**
 * Approve rental application
 * @param {number} applicationId - Application ID
 */
export async function approveApplication(applicationId) {
  // TODO: Implement API call to approve application
  // Example:
  // try {
  //   const response = await fetch('/api/applications/approve', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ applicationId })
  //   });
  //   const result = await response.json();
  //   showNotification('Application approved', 'success');
  //   return result;
  // } catch (error) {
  //   console.error('Failed to approve application:', error);
  //   showNotification('Failed to approve application', 'error');
  // }
}

/**
 * Reject rental application
 * @param {number} applicationId - Application ID
 * @param {string} reason - Rejection reason
 */
export async function rejectApplication(applicationId, reason = '') {
  // TODO: Implement API call to reject application
  // Example:
  // try {
  //   const response = await fetch('/api/applications/reject', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ applicationId, reason })
  //   });
  //   const result = await response.json();
  //   showNotification('Application rejected', 'success');
  //   return result;
  // } catch (error) {
  //   console.error('Failed to reject application:', error);
  //   showNotification('Failed to reject application', 'error');
  // }
}

/**
 * Show notification toast
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function _showNotification(message, type = 'info') {
  // TODO: Implement notification toast UI
}

/**
 * Initialize payment reminder buttons
 */
function initPaymentReminderButtons() {
  const reminderButtons = document.querySelectorAll('[data-action="send-reminder"]');

  reminderButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const paymentId = button.dataset.paymentId;
      const tenantName = button.dataset.tenantName;

      if (paymentId && tenantName) {
        await sendPaymentReminder(paymentId, tenantName);
      }
    });
  });
}

/**
 * Initialize application action buttons
 */
function initApplicationActionButtons() {
  const approveButtons = document.querySelectorAll('[data-action="approve"]');
  const rejectButtons = document.querySelectorAll('[data-action="reject"]');

  approveButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const applicationId = button.dataset.applicationId;
      if (applicationId) {
        const confirmed = confirm('Are you sure you want to approve this application?');
        if (confirmed) {
          await approveApplication(applicationId);
        }
      }
    });
  });

  rejectButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const applicationId = button.dataset.applicationId;
      if (applicationId) {
        const reason = prompt('Enter rejection reason (optional):');
        await rejectApplication(applicationId, reason || '');
      }
    });
  });
}

/**
 * Initialize all event listeners when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Inject icons from centralized library
  injectIcons();

  initPaymentReminderButtons();
  initApplicationActionButtons();
});

/**
 * Load recent activities from API
 */
async function loadRecentActivities() {
  const container = document.getElementById('recent-activity-feed');
  if (!container) return;

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/activity.php`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recent activities');
    }

    const result = await response.json();

    if (result.data && result.data.activities) {
      renderActivities(result.data.activities, container);
    } else {
      renderEmptyState(container);
    }
  } catch (error) {
    console.error('Failed to load recent activities:', error);
    renderErrorState(container);
  }
}

/**
 * Render activities list
 * @param {Array} activities - Array of activity objects
 * @param {HTMLElement} container - Container element to render into
 */
function renderActivities(activities, container) {
  if (!activities || activities.length === 0) {
    renderEmptyState(container);
    return;
  }

  const html = activities
    .map(activity => {
      return `
        <div class="landlord-activity-item" data-activity-id="${activity.id}" data-activity-type="${activity.type}">
          <div class="landlord-activity-icon ${activity.color}">
            <span
              data-icon="${activity.icon}"
              data-icon-width="20"
              data-icon-height="20"
              data-icon-stroke-width="2"
            ></span>
          </div>
          <div class="landlord-activity-content">
            <p class="landlord-activity-text">${activity.description}</p>
            <span class="landlord-activity-time">${activity.time_ago}</span>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = html;

  // Re-inject icons after rendering
  injectIcons();
}

/**
 * Render empty state when no activities exist
 * @param {HTMLElement} container - Container element
 */
function renderEmptyState(container) {
  container.innerHTML = `
    <div class="landlord-activity-empty">
      <p class="landlord-activity-text">
        No recent activity. Activities will appear here as boarders interact with your properties.
      </p>
    </div>
  `;
}

/**
 * Render error state when API fails
 * @param {HTMLElement} container - Container element
 */
function renderErrorState(container) {
  container.innerHTML = `
    <div class="landlord-activity-error">
      <p class="landlord-activity-text">
        Unable to load recent activity. Please try again later.
      </p>
    </div>
  `;
}

/**
 * Load payment overview data from API
 * Falls back to sample data if API is unavailable
 */
async function loadPaymentOverview() {
  const container = document.getElementById('payment-overview-container');
  if (!container) return;

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payment-overview.php`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment overview');
    }

    const result = await response.json();

    if (result.data) {
      renderPaymentOverview(result.data, container);
    }
  } catch (error) {
    console.error('Failed to load payment overview:', error);
    container.innerHTML = `
      <div class="landlord-payment-status-card">
        <p style="text-align: center; color: var(--text-gray); padding: 2rem;">
          No payment data available yet.
        </p>
      </div>
    `;
  }
}

/**
 * Render payment overview data
 * @param {Object} data - Payment overview data from API
 * @param {HTMLElement} container - Container element to render into
 */
function renderPaymentOverview(data, container) {
  const { on_track, due_soon, overdue } = data;

  let html = '';

  // Render On Track Payments
  if (on_track.count > 0) {
    html += `
      <div class="landlord-payment-status-card landlord-payment-green">
        <div class="landlord-payment-status-header">
          <div class="landlord-payment-status-indicator">
            <span class="landlord-traffic-light landlord-light-green"></span>
            <span class="landlord-payment-status-label">On Track</span>
          </div>
          <span class="landlord-payment-count">${on_track.count} payment${
      on_track.count !== 1 ? 's' : ''
    }</span>
        </div>
        <div class="landlord-payment-status-body">
          ${on_track.payments
            .slice(0, 3)
            .map(payment => renderPaymentCard(payment, 'green'))
            .join('')}
        </div>
      </div>
    `;
  }

  // Render Due Soon Payments
  if (due_soon.count > 0) {
    html += `
      <div class="landlord-payment-status-card landlord-payment-yellow">
        <div class="landlord-payment-status-header">
          <div class="landlord-payment-status-indicator">
            <span class="landlord-traffic-light landlord-light-yellow"></span>
            <span class="landlord-payment-status-label">Due Soon</span>
          </div>
          <span class="landlord-payment-count">7-14 days</span>
        </div>
        <div class="landlord-payment-status-body">
          ${due_soon.payments
            .slice(0, 3)
            .map(payment => renderPaymentCard(payment, 'yellow'))
            .join('')}
        </div>
      </div>
    `;
  }

  // Render Overdue Payments
  if (overdue.count > 0) {
    html += `
      <div class="landlord-payment-status-card landlord-payment-red">
        <div class="landlord-payment-status-header">
          <div class="landlord-payment-status-indicator">
            <span class="landlord-traffic-light landlord-light-red"></span>
            <span class="landlord-payment-status-label">Overdue</span>
          </div>
          <span class="landlord-payment-count">${
            overdue.payments[0]?.days_overdue || 0
          } days late</span>
        </div>
        <div class="landlord-payment-status-body">
          ${overdue.payments
            .slice(0, 3)
            .map(payment => renderPaymentCard(payment, 'red'))
            .join('')}
        </div>
      </div>
    `;
  }

  // Show empty state if no payments
  if (!html) {
    html = `
      <div class="landlord-payment-status-card">
        <p style="text-align: center; color: var(--text-gray); padding: 2rem;">
          No payment records found. Payments will appear here once boarders have active rentals.
        </p>
      </div>
    `;
  }

  container.innerHTML = html;

  // Inject icons after rendering
  injectIcons();

  // Attach event listeners to buttons
  attachPaymentActionListeners();
}

/**
 * Render individual payment card
 * @param {Object} payment - Payment data
 * @param {string} status - Payment status (green, yellow, red)
 * @returns {string} HTML string
 */
function renderPaymentCard(payment, status) {
  const dueDate = new Date(payment.due_date);
  const formattedDueDate = dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedAmount = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
  })
    .format(payment.total_amount)
    .replace('PHP', '₱');

  let html = `
    <div class="landlord-payment-row">
      <div class="landlord-payment-info">
        <h4 class="landlord-payment-tenant-name">${escapeHtml(payment.full_name)}</h4>
        <p class="landlord-payment-property">${escapeHtml(payment.property_title)} - ${escapeHtml(
    payment.room_title
  )}</p>
      </div>
      <div class="landlord-payment-meta">
        <span class="landlord-payment-amount">${formattedAmount}</span>
  `;

  if (status === 'red') {
    html += `<span class="landlord-payment-due">Was due: ${formattedDueDate}</span>`;
  } else {
    html += `<span class="landlord-payment-due">Due: ${formattedDueDate}</span>`;
  }

  html += `</div></div>`;

  // Add overdue notice
  if (status === 'red' && payment.late_fee > 0) {
    const formattedLateFee = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    })
      .format(payment.late_fee)
      .replace('PHP', '₱');

    html += `
      <div class="landlord-overdue-notice">
        <span
          data-icon="info"
          data-icon-width="24"
          data-icon-height="24"
          data-icon-stroke-width="2"
        ></span>
        <div>
          <strong>Late fee applied:</strong> ${formattedLateFee} | <strong>Total due:</strong> ${formattedAmount}
        </div>
      </div>
    `;
  }

  // Add action buttons for yellow and red status
  if (status === 'yellow' || status === 'red') {
    html += `
      <div class="landlord-payment-actions">
        <button class="landlord-btn landlord-btn-outline landlord-btn-sm" data-action="send-reminder" data-payment-id="${
          payment.id
        }" data-tenant-name="${escapeHtml(payment.full_name)}">
          ${status === 'yellow' ? 'Send Reminder' : 'Send Notice'}
        </button>
        <button class="landlord-btn landlord-btn-primary landlord-btn-sm" data-action="record-payment" data-payment-id="${
          payment.id
        }">
          Record Payment
        </button>
      </div>
    `;
  }

  return html;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Attach event listeners to payment action buttons
 */
function attachPaymentActionListeners() {
  const reminderButtons = document.querySelectorAll('[data-action="send-reminder"]');
  const recordPaymentButtons = document.querySelectorAll('[data-action="record-payment"]');

  reminderButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const paymentId = button.dataset.paymentId;
      const tenantName = button.dataset.tenantName;

      if (paymentId && tenantName) {
        await sendPaymentReminder(parseInt(paymentId), tenantName);
      }
    });
  });

  recordPaymentButtons.forEach(button => {
    button.addEventListener('click', () => {
      const paymentId = button.dataset.paymentId;
      if (paymentId) {
        window.location.href = `../payments/record.html?id=${paymentId}`;
      }
    });
  });
}

async function loadProperties() {
  const container = document.getElementById('properties-grid');
  if (!container) return;

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/properties`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }

    const result = await response.json();

    if (result.data && result.data.properties) {
      renderProperties(result.data.properties, container);
    } else {
      renderEmptyPropertiesState(container);
    }
  } catch (error) {
    console.error('Failed to load properties:', error);
    renderErrorPropertiesState(container);
  }
}

function renderProperties(properties, container) {
  if (!properties || properties.length === 0) {
    renderEmptyPropertiesState(container);
    return;
  }

  const html = properties.map(property => createPropertyCard(property)).join('');

  container.innerHTML = html;
  injectIcons();
}

function createPropertyCard(property) {
  const occupancyColor =
    property.status === 'full' ? 'green' : property.status === 'inactive' ? 'gray' : 'yellow';

  const locationText = property.city
    ? `${property.city}${property.province ? ', ' + property.province : ''}`
    : property.address || 'Location not set';

  const formattedRevenue = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(property.monthly_revenue || 0);

  const icon = property.total_rooms > 0 ? 'building' : 'home';

  return `
    <div class="landlord-property-card">
      <div class="landlord-property-image">
        <span
          data-icon="${icon}"
          data-icon-width="48"
          data-icon-height="48"
          data-icon-stroke-width="2"
          style="display: flex; align-items: center; justify-content: center; height: 100%;"
        ></span>
      </div>
      <div class="landlord-property-info">
        <h3 class="landlord-property-name">${escapeHtml(property.name)}</h3>
        <p class="landlord-property-location">
          <span
            data-icon="target"
            data-icon-width="16"
            data-icon-height="16"
            data-icon-stroke-width="2"
            style="display: inline-block; vertical-align: middle"
          ></span>
          ${escapeHtml(locationText)}
        </p>
        <div class="landlord-property-stats">
          <div class="landlord-property-stat">
            <span class="landlord-stat-label">Occupancy</span>
            <span class="landlord-stat-value ${occupancyColor}">${property.occupied_rooms}/${
    property.total_rooms
  } rooms</span>
          </div>
          <div class="landlord-property-stat">
            <span class="landlord-stat-label">Revenue</span>
            <span class="landlord-stat-value">${formattedRevenue}</span>
          </div>
        </div>
        <div class="landlord-property-actions">
          <button
            type="button"
            class="landlord-btn landlord-btn-outline landlord-btn-sm"
            data-action="edit-property"
            data-id="${property.id}"
          >
            Edit
          </button>
          <a
            href="boarders/index.html?propertyId=${property.id}"
            class="landlord-btn landlord-btn-outline landlord-btn-sm"
          >
            View Boarders
          </a>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyPropertiesState(container) {
  container.innerHTML = `
    <div class="landlord-empty-state" style="text-align: center; padding: 3rem; width: 100%;">
      <span
        data-icon="home"
        data-icon-width="48"
        data-icon-height="48"
        data-icon-stroke-width="1.5"
        style="display: block; margin: 0 auto 1rem; color: var(--text-gray); opacity: 0.5;"
      ></span>
      <p style="color: var(--text-gray);">No properties yet. Create your first listing to get started.</p>
      <a href="listings/create.html" class="landlord-btn landlord-btn-primary" style="margin-top: 1rem; display: inline-block;">
        Create Listing
      </a>
    </div>
  `;
  injectIcons();
}

function renderErrorPropertiesState(container) {
  container.innerHTML = `
    <div class="landlord-error-state" style="text-align: center; padding: 3rem; width: 100%;">
      <p style="color: var(--text-gray);">Unable to load properties. Please try again later.</p>
    </div>
  `;
}

let currentEditProperty = null;

function initEditPropertyModal() {
  const editModal = document.getElementById('edit-property-modal');
  if (!editModal) return;

  const closeBtn = document.getElementById('edit-modal-close');
  const cancelBtn = document.getElementById('edit-cancel');
  const overlay = editModal.querySelector('.modal-overlay');
  const form = document.getElementById('edit-property-form');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeEditModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeEditModal);
  }
  if (overlay) {
    overlay.addEventListener('click', closeEditModal);
  }
  if (form) {
    form.addEventListener('submit', savePropertyChanges);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && editModal.classList.contains('active')) {
      closeEditModal();
    }
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="edit-property"], [data-action="edit"]');
    if (btn && btn.dataset.id) {
      const propertyId = parseInt(btn.dataset.id);

      // Navigate to edit page for listings
      if (window.location.pathname.includes('/listings/')) {
        window.location.href = `edit.html?id=${propertyId}`;
        return;
      }

      openEditModal(propertyId);
    }
  });
}

async function openEditModal(propertyId) {
  const editModal = document.getElementById('edit-property-modal');
  if (!editModal) return;

  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/properties?id=${propertyId}`,
      {
        headers: getAuthHeaders(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch property');
    }

    const result = await response.json();
    const property = result.data || result;

    currentEditProperty = property;

    document.getElementById('edit-property-name').value = property.name || '';
    document.getElementById('edit-property-type').value = property.type || 'boarding-house';
    document.getElementById('edit-property-description').value = property.description || '';
    document.getElementById('edit-property-price').value = property.price || 0;
    document.getElementById('edit-property-rooms').value = property.total_rooms || 0;
    document.getElementById('edit-property-status').value = property.status || 'active';
    document.getElementById('edit-property-address').value = property.address || '';
    document.getElementById('edit-property-city').value = property.city || '';
    document.getElementById('edit-property-province').value = property.province || '';

    const amenityCheckboxes = editModal.querySelectorAll('input[name="editAmenities"]');
    const currentAmenities = property.amenities || [];
    amenityCheckboxes.forEach(checkbox => {
      checkbox.checked = currentAmenities.includes(checkbox.value);
    });

    editModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  } catch (error) {
    console.error('Failed to load property for edit:', error);
    alert('Failed to load property details. Please try again.');
  }
}

function closeEditModal() {
  const editModal = document.getElementById('edit-property-modal');
  if (!editModal) return;
  editModal.classList.remove('active');
  document.body.style.overflow = '';
  currentEditProperty = null;
}

async function savePropertyChanges(event) {
  event.preventDefault();

  if (!currentEditProperty) return;

  const form = event.target;
  const formData = new FormData(form);

  const amenityCheckboxes = form.querySelectorAll('input[name="editAmenities"]:checked');
  const selectedAmenities = Array.from(amenityCheckboxes).map(cb => cb.value);

  const updatedData = {
    name: formData.get('propertyName'),
    type: formData.get('propertyType'),
    description: formData.get('propertyDescription'),
    price: parseFloat(formData.get('propertyPrice')) || 0,
    total_rooms: parseInt(formData.get('propertyRooms')) || 0,
    status: formData.get('propertyStatus'),
    address: formData.get('propertyAddress'),
    city: formData.get('propertyCity'),
    province: formData.get('propertyProvince'),
    amenities: selectedAmenities,
  };

  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/properties?id=${currentEditProperty.id}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update property');
    }

    closeEditModal();
    loadProperties();
    alert(`Property "${updatedData.name}" has been updated successfully.`);
  } catch (error) {
    console.error('Failed to update property:', error);
    alert('Failed to update property. Please try again.');
  }
}
