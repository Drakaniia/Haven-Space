/**
 * Boarder Payments - Dynamic Payment Status Color Coding
 *
 * Automatically assigns colors to payment due dates:
 * - Red: Overdue/missed payments
 * - Orange: Due within 7 days (upcoming)
 * - Green: Paid or due date > 7 days away
 */

/**
 * Calculate payment status based on due date and paid date
 * @param {string|Date} dueDate - The payment due date
 * @param {string|Date|null} paidDate - The payment paid date (null if unpaid)
 * @returns {Object} Status object with color, label, and days information
 */
export function getPaymentStatus(dueDate, paidDate = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  // If paid, always return green
  if (paidDate) {
    return {
      status: 'paid',
      color: 'green',
      label: 'Paid',
      days: null,
      cssClass: 'status-paid',
    };
  }

  // If overdue (past due date)
  if (daysUntilDue < 0) {
    return {
      status: 'overdue',
      color: 'red',
      label: 'Overdue',
      days: Math.abs(daysUntilDue),
      cssClass: 'status-overdue',
    };
  }

  // If due today
  if (daysUntilDue === 0) {
    return {
      status: 'due-today',
      color: 'orange',
      label: 'Due Today',
      days: 0,
      cssClass: 'status-due-today',
    };
  }

  // If due within 7 days
  if (daysUntilDue <= 7) {
    return {
      status: 'upcoming',
      color: 'orange',
      label: 'Due Soon',
      days: daysUntilDue,
      cssClass: 'status-upcoming',
    };
  }

  // If due date is more than 7 days away
  return {
    status: 'current',
    color: 'green',
    label: 'On Track',
    days: daysUntilDue,
    cssClass: 'status-current',
  };
}

/**
 * Format days remaining into human-readable string
 * @param {number} days - Number of days
 * @returns {string} Formatted string
 */
export function formatDaysRemaining(days) {
  if (days === null) return '';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days <= 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  if (remainingDays === 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
  return `${weeks} week${weeks > 1 ? 's' : ''}, ${remainingDays} day${
    remainingDays > 1 ? 's' : ''
  }`;
}

/**
 * Apply payment status colors to a specific element
 * @param {HTMLElement} element - The element to update
 * @param {Object} status - Status object from getPaymentStatus()
 */
export function applyStatusToElement(element, status) {
  if (!element || !status) return;

  // Remove all status classes
  element.classList.remove(
    'status-paid',
    'status-overdue',
    'status-due-today',
    'status-upcoming',
    'status-current',
    'status-red',
    'status-orange',
    'status-green'
  );

  // Add the appropriate status class
  element.classList.add(status.cssClass);

  // Also add color-specific class for more granular control
  element.classList.add(`status-${status.color}`);

  // Update text content if it's a status label element
  if (
    element.classList.contains('current-bill-status') ||
    element.classList.contains('timeline-status') ||
    element.classList.contains('bill-status-badge')
  ) {
    const statusText =
      status.days !== null && status.status !== 'paid'
        ? `${status.label} (${formatDaysRemaining(status.days)})`
        : status.label;
    element.textContent = statusText;
  }

  // Update time remaining text if present
  const timeRemainingEl = element
    .closest('.current-bill-date-item')
    ?.querySelector('.current-bill-date-value');
  if (timeRemainingEl && status.days !== null && status.status !== 'paid') {
    const iconSvg = timeRemainingEl.querySelector('svg');
    timeRemainingEl.innerHTML = `${iconSvg?.outerHTML || ''}${formatDaysRemaining(status.days)}`;
  }
}

/**
 * Apply payment status colors to all payment elements on the page
 */
export function applyPaymentStatusColors() {
  // Handle current bill card
  const currentBillCard = document.querySelector('.payments-current-bill-card');
  if (currentBillCard) {
    const dueDateEl = currentBillCard.querySelector('[data-due-date]');
    const paidDateEl = currentBillCard.querySelector('[data-paid-date]');
    const statusEl = currentBillCard.querySelector('.current-bill-status');

    if (dueDateEl) {
      const dueDate = dueDateEl.dataset.dueDate;
      const paidDate = paidDateEl?.dataset.paidDate || null;
      const status = getPaymentStatus(dueDate, paidDate);

      if (statusEl) {
        applyStatusToElement(statusEl, status);
      }

      // Update the warning class on the time remaining item
      const timeRemainingItem = currentBillCard.querySelector('.current-bill-date-item.warning');
      if (timeRemainingItem) {
        timeRemainingItem.classList.remove('warning');
        if (
          status.status === 'overdue' ||
          status.status === 'due-today' ||
          status.status === 'upcoming'
        ) {
          timeRemainingItem.classList.add('warning');
        }
      }

      // Update time remaining text
      const timeRemainingText = currentBillCard.querySelector('.time-remaining-text');
      if (timeRemainingText && status.days !== null) {
        const iconSvg = timeRemainingText.parentElement.querySelector('svg');
        if (status.status === 'paid') {
          timeRemainingText.textContent = 'Paid';
        } else if (status.status === 'overdue') {
          timeRemainingText.textContent = `${formatDaysRemaining(status.days)} overdue`;
        } else {
          timeRemainingText.textContent = formatDaysRemaining(status.days);
        }
        if (iconSvg) {
          timeRemainingText.parentElement.insertBefore(iconSvg, timeRemainingText);
        }
      }
    }
  }

  // Handle payment history timeline items
  const timelineItems = document.querySelectorAll('.timeline-item[data-due-date]');
  timelineItems.forEach(item => {
    const dueDate = item.dataset.dueDate;
    const paidDate = item.dataset.paidDate || null;
    const statusEl = item.querySelector('.timeline-status');
    const markerEl = item.querySelector('.timeline-marker');

    const status = getPaymentStatus(dueDate, paidDate);

    if (statusEl) {
      applyStatusToElement(statusEl, status);
    }

    // Update marker color
    if (markerEl) {
      markerEl.classList.remove('completed', 'overdue', 'upcoming', 'current');

      if (status.status === 'paid') {
        markerEl.classList.add('completed');
      } else if (status.status === 'overdue') {
        markerEl.classList.add('overdue');
      } else if (status.status === 'upcoming' || status.status === 'due-today') {
        markerEl.classList.add('upcoming');
      } else {
        markerEl.classList.add('current');
      }
    }
  });

  // Handle financial overview cards (Next Payment card)
  const nextPaymentCard = document.querySelector('.financial-card-gradient-2');
  if (nextPaymentCard) {
    const trendEl = nextPaymentCard.querySelector('.financial-card-trend');
    const dueDateAttr = nextPaymentCard.dataset.dueDate;

    if (trendEl && dueDateAttr) {
      const status = getPaymentStatus(dueDateAttr);
      trendEl.textContent =
        status.status === 'paid' ? 'Paid' : `Due in ${formatDaysRemaining(status.days)}`;

      // Update card border based on status
      nextPaymentCard.classList.remove('status-red', 'status-orange', 'status-green');
      nextPaymentCard.classList.add(`status-${status.color}`);
    }
  }
}

/**
 * Initialize payment status tracking
 * Call this on DOMContentLoaded
 */
export function initPaymentStatus() {
  // Apply colors on page load
  applyPaymentStatusColors();

  // Re-apply every minute to keep status updated
  setInterval(applyPaymentStatusColors, 60000);
}

/**
 * Create a status badge element
 * @param {Object} status - Status object from getPaymentStatus()
 * @returns {HTMLElement} Status badge element
 */
export function createStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = `status-badge status-${status.color}`;
  badge.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      ${
        status.status === 'paid'
          ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
          : status.status === 'overdue'
          ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
          : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />'
      }
    </svg>
    ${status.label}${
    status.days !== null && status.status !== 'paid' ? ` (${formatDaysRemaining(status.days)})` : ''
  }
  `;
  return badge;
}
