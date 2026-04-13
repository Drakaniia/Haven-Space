/**
 * Landlord Payments Page
 *
 * Handles payment tracking with dynamic color-coding based on due dates:
 * - 🔴 Red: Overdue/missed payments
 * - 🟠 Orange: Due within 7 days (upcoming)
 * - 🟢 Green: Paid or due date > 7 days away
 */

// Sample payment data - In production, this would come from an API
const paymentsData = [
  {
    id: 1,
    boarderName: 'Maria Santos',
    boarderEmail: 'maria.santos@email.com',
    boarderInitials: 'MS',
    property: 'Sunrise Dormitory',
    room: 'Room 201',
    amount: 5500,
    dueDate: '2025-02-15',
    paidDate: '2025-02-10',
    status: 'paid',
  },
  {
    id: 2,
    boarderName: 'Jose Reyes',
    boarderEmail: 'jose.reyes@email.com',
    boarderInitials: 'JR',
    property: 'Green Valley',
    room: 'Room 105',
    amount: 4500,
    dueDate: '2025-02-05',
    paidDate: null,
    status: 'upcoming',
  },
  {
    id: 3,
    boarderName: 'Pedro Cruz',
    boarderEmail: 'pedro.cruz@email.com',
    boarderInitials: 'PC',
    property: 'Metro Boarding',
    room: 'Room 302',
    amount: 5000,
    dueDate: '2025-01-20',
    paidDate: null,
    status: 'overdue',
  },
  {
    id: 4,
    boarderName: 'Ana Garcia',
    boarderEmail: 'ana.garcia@email.com',
    boarderInitials: 'AG',
    property: 'Sunrise Dormitory',
    room: 'Room 305',
    amount: 6000,
    dueDate: '2025-02-28',
    paidDate: null,
    status: 'upcoming',
  },
  {
    id: 5,
    boarderName: 'Luis Torres',
    boarderEmail: 'luis.torres@email.com',
    boarderInitials: 'LT',
    property: 'Green Valley',
    room: 'Room 210',
    amount: 4800,
    dueDate: '2025-02-01',
    paidDate: '2025-02-01',
    status: 'paid',
  },
  {
    id: 6,
    boarderName: 'Carmen Lopez',
    boarderEmail: 'carmen.lopez@email.com',
    boarderInitials: 'CL',
    property: 'Metro Boarding',
    room: 'Room 108',
    amount: 5200,
    dueDate: '2025-01-25',
    paidDate: null,
    status: 'overdue',
  },
  {
    id: 7,
    boarderName: 'Ramon Diaz',
    boarderEmail: 'ramon.diaz@email.com',
    boarderInitials: 'RD',
    property: 'Sunrise Dormitory',
    room: 'Room 402',
    amount: 5500,
    dueDate: '2025-03-01',
    paidDate: null,
    status: 'upcoming',
  },
  {
    id: 8,
    boarderName: 'Elena Ramos',
    boarderEmail: 'elena.ramos@email.com',
    boarderInitials: 'ER',
    property: 'Green Valley',
    room: 'Room 315',
    amount: 4700,
    dueDate: '2025-02-10',
    paidDate: '2025-02-08',
    status: 'paid',
  },
];

// Recent payment activity data
const recentActivityData = [
  {
    id: 1,
    boarderName: 'Maria Santos',
    property: 'Sunrise Dormitory',
    amount: 5500,
    type: 'paid',
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    boarderName: 'Luis Torres',
    property: 'Green Valley',
    amount: 4800,
    type: 'paid',
    timestamp: '5 hours ago',
  },
  {
    id: 3,
    boarderName: 'Jose Reyes',
    property: 'Green Valley',
    amount: 4500,
    type: 'reminder_sent',
    timestamp: '1 day ago',
  },
  {
    id: 4,
    boarderName: 'Pedro Cruz',
    property: 'Metro Boarding',
    amount: 5000,
    type: 'overdue_notice',
    timestamp: '2 days ago',
  },
  {
    id: 5,
    boarderName: 'Elena Ramos',
    property: 'Green Valley',
    amount: 4700,
    type: 'paid',
    timestamp: '3 days ago',
  },
];

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
 * Create activity item HTML
 * @param {Object} activity - Activity data object
 * @returns {string} HTML string for activity item
 */
function createActivityItem(activity) {
  let iconClass = 'icon-blue';
  let iconSvg = '';
  let activityText = '';

  switch (activity.type) {
    case 'paid':
      iconClass = 'icon-green';
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
      activityText = `<strong>${activity.boarderName}</strong> paid for ${activity.property}`;
      break;
    case 'reminder_sent':
      iconClass = 'icon-orange';
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      `;
      activityText = `Reminder sent to <strong>${activity.boarderName}</strong>`;
      break;
    case 'overdue_notice':
      iconClass = 'icon-red';
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
      activityText = `Overdue notice for <strong>${activity.boarderName}</strong>`;
      break;
    default:
      iconClass = 'icon-blue';
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `;
      activityText = `Activity for <strong>${activity.boarderName}</strong>`;
  }

  return `
    <div class="payment-activity-item">
      <div class="payment-activity-icon ${iconClass}">
        ${iconSvg}
      </div>
      <div class="payment-activity-content">
        <div class="payment-activity-text">${activityText}</div>
        <div class="payment-activity-meta">${activity.timestamp}</div>
      </div>
      <div class="payment-activity-amount">${formatCurrency(activity.amount)}</div>
    </div>
  `;
}

/**
 * Render all payments to the table
 */
function renderPayments() {
  const tableBody = document.getElementById('paymentsTableBody');
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = paymentsData.map(payment => createPaymentRow(payment)).join('');
}

/**
 * Render recent payment activity
 */
function renderActivity() {
  const activityList = document.getElementById('paymentActivityList');
  if (!activityList) {
    return;
  }

  activityList.innerHTML = recentActivityData
    .map(activity => createActivityItem(activity))
    .join('');
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
    } else if (status === 'paid' && payment.paidDate) {
      row.style.display = '';
    } else if (status === 'upcoming' && !payment.paidDate && statusInfo.color === 'orange') {
      row.style.display = '';
    } else if (status === 'overdue' && !payment.paidDate && statusInfo.color === 'red') {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Filter payments by property
 * @param {string} property - Property to filter by
 */
function filterByProperty(property) {
  const rows = document.querySelectorAll('#paymentsTableBody tr');

  rows.forEach(row => {
    const paymentId = parseInt(row.dataset.paymentId);
    const payment = paymentsData.find(p => p.id === paymentId);

    if (!payment) {
      return;
    }

    if (property === 'all' || payment.property.toLowerCase().includes(property)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
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
 * Initialize the payments page
 */
function initPaymentsPage() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderPayments();
      renderActivity();
      initEventListeners();
    });
  } else {
    renderPayments();
    renderActivity();
    initEventListeners();
  }
}

// Export for use in main.js
export { initPaymentsPage };

// Auto-initialize if this script is loaded directly
initPaymentsPage();
