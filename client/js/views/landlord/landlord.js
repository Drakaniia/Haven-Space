/**
 * Landlord Dashboard Initialization
 * Handles dashboard-specific interactions and dynamic content loading
 */

import { getIcon } from '../../shared/icons.js';

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

  // Load dashboard data (placeholder for API integration)
  loadDashboardData();
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
 * Placeholder for future API integration
 */
async function loadDashboardData() {
  // TODO: Implement API calls to fetch:
  // - Occupancy rate
  // - Monthly revenue
  // - Upcoming renewals
  // - Payment alerts (yellow/red status)
  // - Recent applications
  // - Recent activity feed
  // - Property listings
  // Example structure for API integration:
  // try {
  //   const response = await fetch('/api/landlord/dashboard');
  //   const data = await response.json();
  //   updateDashboardStats(data);
  // } catch (error) {
  //   console.error('Failed to load dashboard data:', error);
  // }
}

/**
 * Update dashboard stats with fetched data
 * @param {Object} data - Dashboard data from API
 */
function updateDashboardStats(data) {
  // TODO: Update stat cards with real data
  // - Occupancy rate
  // - Monthly revenue
  // - Upcoming renewals count
  // - Payment alerts count
}

/**
 * Send payment reminder to tenant
 * @param {number} paymentId - Payment ID
 * @param {string} tenantName - Tenant's name
 */
export async function sendPaymentReminder(paymentId, tenantName) {
  // TODO: Implement API call to send payment reminder
  console.log(`Sending payment reminder to ${tenantName} (Payment ID: ${paymentId})`);

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
  console.log(`Recording payment for Payment ID: ${paymentId}`, paymentData);

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
  console.log(`Approving application ID: ${applicationId}`);

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
  console.log(`Rejecting application ID: ${applicationId}`, reason);

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
function showNotification(message, type = 'info') {
  // TODO: Implement notification toast UI
  console.log(`[${type.toUpperCase()}] ${message}`);
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
