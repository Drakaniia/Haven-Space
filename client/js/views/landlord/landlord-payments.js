/**
 * Landlord Payments Page
 *
 * Handles payment tracking with dynamic color-coding based on due dates:
 * - 🔴 Red: Overdue/missed payments
 * - 🟠 Orange: Due within 7 days (upcoming)
 * - 🟢 Green: Paid or due date > 7 days away
 */

import CONFIG from '../../config.js';

// Payment data - loaded dynamically from API
let paymentsData = [];

// Payment activity data - loaded dynamically from API
let paymentActivityData = [];

/**
 * Calculate payment status based on due date
 * @param {string} dueDate - Due date in YYYY-MM-DD format
 * @param {string|null} paidDate - Paid date in YYYY-MM-DD format or null
 * @returns {Object} Status object with color, label, and days info
 */
function calculatePaymentStatus(dueDate, paidDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  // If paid, always return green status
  if (paidDate) {
    return {
      color: 'green',
      rowClass: 'row-green',
      badgeClass: 'status-green',
      label: 'Paid',
      daysInfo: null,
    };
  }

  // Calculate days difference
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Overdue (negative days = past due date)
  if (diffDays < 0) {
    return {
      color: 'red',
      rowClass: 'row-red',
      badgeClass: 'status-red',
      label: 'Overdue',
      daysInfo: `${Math.abs(diffDays)} days late`,
    };
  }

  // Due within 7 days (upcoming)
  if (diffDays <= 7) {
    return {
      color: 'orange',
      rowClass: 'row-orange',
      badgeClass: 'status-orange',
      label: 'Due Soon',
      daysInfo: `${diffDays} days remaining`,
    };
  }

  // Due date > 7 days away
  return {
    color: 'green',
    rowClass: 'row-green',
    badgeClass: 'status-green',
    label: 'On Track',
    daysInfo: `${diffDays} days remaining`,
  };
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Format date for display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-PH', options);
}

/**
 * Create a table row for a payment
 * @param {Object} payment - Payment data object
 * @returns {string} HTML string for table row
 */
function createPaymentRow(payment) {
  const status = calculatePaymentStatus(payment.dueDate, payment.paidDate);
  const statusDotClass = `dot-${status.color}`;

  let daysInfoHtml = '';
  if (status.daysInfo) {
    daysInfoHtml = `<span class="days-remaining" style="color: var(--dashboard-${status.color})">${status.daysInfo}</span>`;
  }

  return `
    <tr class="${status.rowClass}" data-payment-id="${payment.id}">
      <td>
        <div class="payment-boarder-info">
          <div class="payment-boarder-avatar">${payment.boarderInitials}</div>
          <div class="payment-boarder-details">
            <div class="payment-boarder-name">${payment.boarderName}</div>
            <div class="payment-boarder-email">${payment.boarderEmail}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="payment-property-cell">
          <div class="payment-property-name">${payment.property}</div>
          <div class="payment-room-number">${payment.room}</div>
        </div>
      </td>
      <td>
        <div class="payment-amount-cell">${formatCurrency(payment.amount)}</div>
      </td>
      <td>
        <div class="payment-date-cell">
          ${formatDate(payment.dueDate)}
          ${daysInfoHtml}
        </div>
      </td>
      <td>
        <span class="payment-status-badge ${status.badgeClass}">
          <span class="payment-status-dot ${statusDotClass}"></span>
          ${status.label}
        </span>
      </td>
      <td>
        <div class="payment-actions">
          <button class="landlord-btn landlord-btn-outline landlord-btn-sm view-payment-btn" data-payment-id="${
            payment.id
          }">
            View
          </button>
          ${
            payment.paidDate === null
              ? `<button class="landlord-btn landlord-btn-primary landlord-btn-sm record-payment-btn" data-payment-id="${payment.id}">Record</button>`
              : ''
          }
        </div>
      </td>
    </tr>
  `;
}

/**
 * Load payments from API
 */
async function loadPayments() {
  const tableBody = document.getElementById('paymentsTableBody');
  if (!tableBody) {
    return;
  }

  try {
    tableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6" style="text-align: center; padding: 2rem">Loading payments...</td>
      </tr>
    `;

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payments.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payments');
    }

    const result = await response.json();

    if (result.data && Array.isArray(result.data)) {
      // Transform API data to match frontend format
      paymentsData = result.data.map(payment => ({
        id: payment.id,
        boarderName: `${payment.boarder_first_name} ${payment.boarder_last_name}`,
        boarderEmail: payment.boarder_email,
        boarderInitials: `${payment.boarder_first_name[0]}${payment.boarder_last_name[0]}`,
        property: payment.property_title,
        room: payment.room_title,
        amount: parseFloat(payment.amount) + parseFloat(payment.late_fee || 0),
        dueDate: payment.due_date,
        paidDate: payment.paid_date,
        status: payment.status,
        paymentMethod: payment.payment_method,
        referenceNumber: payment.reference_number,
        notes: payment.notes,
      }));

      renderPayments();
      populatePropertyFilter();
    } else {
      renderEmptyPaymentsState();
    }
  } catch (error) {
    console.error('Failed to load payments:', error);
    renderPaymentsError();
  }
}

/**
 * Render all payments to the table
 */
function renderPayments() {
  const tableBody = document.getElementById('paymentsTableBody');
  if (!tableBody) {
    return;
  }

  if (paymentsData.length === 0) {
    renderEmptyPaymentsState();
    return;
  }

  tableBody.innerHTML = paymentsData.map(payment => createPaymentRow(payment)).join('');
}

/**
 * Render empty state when no payments
 */
function renderEmptyPaymentsState() {
  const tableBody = document.getElementById('paymentsTableBody');
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = `
    <tr class="empty-row">
      <td colspan="6" style="text-align: center; padding: 2rem">
        No payments found. Payments will appear here when boarders are accepted.
      </td>
    </tr>
  `;
}

/**
 * Render error state when API fails
 */
function renderPaymentsError() {
  const tableBody = document.getElementById('paymentsTableBody');
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = `
    <tr class="error-row">
      <td colspan="6" style="text-align: center; padding: 2rem; color: var(--dashboard-error)">
        Failed to load payments. Please try again later.
      </td>
    </tr>
  `;
}

/**
 * Load recent payment activity from API
 */
async function loadPaymentActivity() {
  const activityList = document.getElementById('paymentActivityList');
  if (!activityList) {
    return;
  }

  try {
    activityList.innerHTML = `
      <div class="payment-activity-loading">
        <p class="payment-activity-text">Loading payment activity...</p>
      </div>
    `;

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/activity.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment activity');
    }

    const result = await response.json();

    if (result.data && result.data.activities) {
      paymentActivityData = result.data.activities.filter(
        activity => activity.type === 'payment_received' || activity.type === 'payment_reminder'
      );
      renderPaymentActivity(activityList);
    } else {
      renderEmptyActivityState(activityList);
    }
  } catch (error) {
    console.error('Failed to load payment activity:', error);
    renderActivityError(activityList);
  }
}

/**
 * Render payment activity list
 */
function renderPaymentActivity(container) {
  if (!paymentActivityData || paymentActivityData.length === 0) {
    renderEmptyActivityState(container);
    return;
  }

  container.innerHTML = paymentActivityData
    .map(activity => createPaymentActivityItem(activity))
    .join('');
}

/**
 * Create payment activity item HTML
 */
function createPaymentActivityItem(activity) {
  const isPayment = activity.type === 'payment_received';
  const iconClass = isPayment ? 'icon-green' : 'icon-orange';
  const iconSvg = isPayment
    ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>`;

  return `
    <div class="payment-activity-item">
      <div class="payment-activity-icon ${iconClass}">
        ${iconSvg}
      </div>
      <div class="payment-activity-content">
        <div class="payment-activity-text">${activity.description}</div>
        <div class="payment-activity-meta">${activity.time_ago}</div>
      </div>
      ${
        activity.amount
          ? `<div class="payment-activity-amount">${formatCurrency(activity.amount)}</div>`
          : ''
      }
    </div>
  `;
}

/**
 * Render empty state when no activities
 */
function renderEmptyActivityState(container) {
  container.innerHTML = `
    <div class="payment-activity-empty">
      <p class="payment-activity-text">
        No recent payment activity. Payment activities will appear here when boarders make payments or receive reminders.
      </p>
    </div>
  `;
}

/**
 * Render error state when API fails
 */
function renderActivityError(container) {
  container.innerHTML = `
    <div class="payment-activity-error">
      <p class="payment-activity-text">
        Unable to load payment activity. Please try again later.
      </p>
    </div>
  `;
}

/**
 * Filter payments by status
 * @param {string} status - Status to filter by
 */
function filterByStatus(status) {
  const rows = document.querySelectorAll('#paymentsTableBody tr');

  rows.forEach(row => {
    const paymentId = parseInt(row.dataset.paymentId);
    const payment = paymentsData.find(p => p.id === paymentId);

    if (!payment) {
      return;
    }

    const statusInfo = calculatePaymentStatus(payment.dueDate, payment.paidDate);

    if (status === 'all') {
      row.style.display = '';
    } else if (status === 'paid' && payment.status === 'paid') {
      row.style.display = '';
    } else if (
      status === 'upcoming' &&
      payment.status === 'pending' &&
      statusInfo.color === 'orange'
    ) {
      row.style.display = '';
    } else if (status === 'overdue' && payment.status === 'overdue') {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Filter payments by property
 * @param {string} propertyName - Property name to filter by
 */
function filterByProperty(propertyName) {
  const rows = document.querySelectorAll('#paymentsTableBody tr');

  rows.forEach(row => {
    const paymentId = parseInt(row.dataset.paymentId);
    const payment = paymentsData.find(p => p.id === paymentId);

    if (!payment) {
      return;
    }

    if (
      propertyName === 'all' ||
      payment.property.toLowerCase().includes(propertyName.toLowerCase())
    ) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Populate property filter dropdown with unique properties
 */
function populatePropertyFilter() {
  const propertyFilter = document.getElementById('propertyFilter');
  if (!propertyFilter || paymentsData.length === 0) {
    return;
  }

  // Get unique properties
  const properties = [...new Set(paymentsData.map(p => p.property))];

  // Keep "All Properties" option and add unique properties
  const currentValue = propertyFilter.value;
  propertyFilter.innerHTML = '<option value="all">All Properties</option>';

  properties.forEach(property => {
    const option = document.createElement('option');
    option.value = property.toLowerCase().replace(/\s+/g, '-');
    option.textContent = property;
    propertyFilter.appendChild(option);
  });

  // Restore previous selection if it exists
  if (currentValue) {
    propertyFilter.value = currentValue;
  }
}

/**
 * Show payment details in modal
 * @param {number} paymentId - Payment ID to show details for
 */
function showPaymentDetails(paymentId) {
  const payment = paymentsData.find(p => p.id === paymentId);
  if (!payment) {
    return;
  }

  const status = calculatePaymentStatus(payment.dueDate, payment.paidDate);
  const modalBody = document.getElementById('modalBody');
  const modal = document.getElementById('paymentModal');

  if (!modalBody || !modal) {
    return;
  }

  modalBody.innerHTML = `
    <div class="payment-detail-row">
      <span class="payment-detail-label">Boarder</span>
      <span class="payment-detail-value">${payment.boarderName}</span>
    </div>
    <div class="payment-detail-row">
      <span class="payment-detail-label">Email</span>
      <span class="payment-detail-value">${payment.boarderEmail}</span>
    </div>
    <div class="payment-detail-row">
      <span class="payment-detail-label">Property</span>
      <span class="payment-detail-value">${payment.property}</span>
    </div>
    <div class="payment-detail-row">
      <span class="payment-detail-label">Room</span>
      <span class="payment-detail-value">${payment.room}</span>
    </div>
    <div class="payment-detail-row">
      <span class="payment-detail-label">Amount Due</span>
      <span class="payment-detail-value highlight">${formatCurrency(payment.amount)}</span>
    </div>
    <div class="payment-detail-row">
      <span class="payment-detail-label">Due Date</span>
      <span class="payment-detail-value">${formatDate(payment.dueDate)}</span>
    </div>
    ${
      payment.paidDate
        ? `<div class="payment-detail-row">
      <span class="payment-detail-label">Paid Date</span>
      <span class="payment-detail-value">${formatDate(payment.paidDate)}</span>
    </div>`
        : ''
    }
    <div class="payment-detail-row">
      <span class="payment-detail-label">Status</span>
      <span class="payment-status-badge ${status.badgeClass}">
        <span class="payment-status-dot dot-${status.color}"></span>
        ${status.label}
      </span>
    </div>
    ${
      status.daysInfo
        ? `<div class="payment-detail-row">
      <span class="payment-detail-label">Days Info</span>
      <span class="payment-detail-value" style="color: var(--dashboard-${status.color})">${status.daysInfo}</span>
    </div>`
        : ''
    }
  `;

  modal.classList.add('active');
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Status filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', e => {
      filterByStatus(e.target.value);
    });
  }

  // Property filter
  const propertyFilter = document.getElementById('propertyFilter');
  if (propertyFilter) {
    propertyFilter.addEventListener('change', e => {
      filterByProperty(e.target.value);
    });
  }

  // Export button
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      alert('Export functionality would generate a CSV/PDF report of all payments.');
    });
  }

  // Modal close buttons
  const closeModal = document.getElementById('closeModal');
  const cancelModal = document.getElementById('cancelModal');
  const paymentModal = document.getElementById('paymentModal');

  if (closeModal) {
    closeModal.addEventListener('click', () => {
      paymentModal?.classList.remove('active');
    });
  }

  if (cancelModal) {
    cancelModal.addEventListener('click', () => {
      paymentModal?.classList.remove('active');
    });
  }

  // Close modal on overlay click
  if (paymentModal) {
    paymentModal.addEventListener('click', e => {
      if (e.target === paymentModal) {
        paymentModal.classList.remove('active');
      }
    });
  }

  // Record payment button in modal
  const recordPaymentBtn = document.getElementById('recordPaymentBtn');
  if (recordPaymentBtn) {
    recordPaymentBtn.addEventListener('click', () => {
      // Pass selected payment ID if available
      const selectedPaymentId = window.__selectedPaymentId;
      if (selectedPaymentId) {
        window.location.href = `record.html?paymentId=${selectedPaymentId}`;
      } else {
        window.location.href = 'record.html';
      }
    });
  }

  // View and Record payment buttons (delegated event)
  document.addEventListener('click', e => {
    if (e.target.classList.contains('view-payment-btn')) {
      const paymentId = parseInt(e.target.dataset.paymentId);
      // Store selected payment ID for the record page
      window.__selectedPaymentId = paymentId;
      showPaymentDetails(paymentId);
    }

    if (e.target.classList.contains('record-payment-btn')) {
      const paymentId = parseInt(e.target.dataset.paymentId);
      const payment = paymentsData.find(p => p.id === paymentId);
      if (payment) {
        // Pass the payment ID to the record page with pre-filled data
        window.location.href = `record.html?paymentId=${paymentId}`;
      }
    }
  });
}

/**
 * Reload payments after recording
 */
async function reloadPayments() {
  await loadPayments();
  await loadPaymentSummary();
}

/**
 * Load payment summary statistics
 */
async function loadPaymentSummary() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payment-summary.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment summary');
    }

    const result = await response.json();

    if (result.data) {
      updateSummaryCards(result.data);
    }
  } catch (error) {
    console.error('Failed to load payment summary:', error);
  }
}

/**
 * Update summary cards with real data
 */
function updateSummaryCards(summary) {
  // Paid on time
  const paidOnTimeValue = document.querySelector('.payment-summary-green .payment-summary-value');
  if (paidOnTimeValue) {
    paidOnTimeValue.textContent = summary.paid_on_time || 0;
  }

  // Due soon
  const dueSoonValue = document.querySelector('.payment-summary-orange .payment-summary-value');
  if (dueSoonValue) {
    dueSoonValue.textContent = summary.due_soon || 0;
  }

  // Overdue
  const overdueValue = document.querySelector('.payment-summary-red .payment-summary-value');
  if (overdueValue) {
    overdueValue.textContent = summary.overdue || 0;
  }

  // Total revenue
  const revenueValue = document.querySelector('.payment-summary-blue .payment-summary-value');
  if (revenueValue) {
    revenueValue.textContent = formatCurrency(summary.total_revenue || 0);
  }
}

/**
 * Initialize the payments page
 */
function initPaymentsPage() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadPayments();
      loadPaymentSummary();
      loadPaymentActivity();
      initEventListeners();
    });
  } else {
    loadPayments();
    loadPaymentSummary();
    loadPaymentActivity();
    initEventListeners();
  }
}

// Export for use in main.js
export { initPaymentsPage, reloadPayments };

// Auto-initialize if this script is loaded directly
initPaymentsPage();
