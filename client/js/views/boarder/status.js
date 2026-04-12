/**
 * Boarder Status Module
 * Manages boarder status banners and conditional UI elements
 */

import { getIcon } from '../../shared/icons.js';
import { getBoarderStatus, updateBoarderStatus, getBasePath } from '../../shared/routing.js';

/**
 * Status banner templates
 */
const STATUS_TEMPLATES = {
  pending: {
    icon: 'clock',
    title: 'Application Pending Review',
    message: (appName, date) => `You applied to <strong>${appName}</strong> on ${date}`,
    timeline: 'Expected response within 3-5 business days',
    actions: [
      { label: 'View Application', href: './applications/index.html', type: 'outline' },
      { label: 'Continue Browsing', href: '../public/find-a-room.html', type: 'secondary' },
    ],
  },
  pending_confirmation: {
    icon: 'checkCircle',
    title: 'Confirm Your Booking',
    message: appName =>
      `A landlord has accepted your application to <strong>${appName}</strong>. Review the details and confirm your booking to secure the room.`,
    actions: [
      { label: 'Review & Confirm', href: './confirm-booking/index.html', type: 'primary' },
      { label: 'View Application', href: './applications/index.html', type: 'outline' },
    ],
  },
  rejected: {
    icon: 'xMark',
    title: 'Application Not Accepted',
    message: appName => `Your application to <strong>${appName}</strong> was not accepted.`,
    reason: reason => (reason ? `Reason: ${reason}` : ''),
    actions: [
      {
        label: 'Find Available Rooms',
        href: '../public/find-a-room.html',
        type: 'primary',
        icon: 'search',
      },
    ],
  },
};

/**
 * Render a status banner
 * @param {string} status - Boarder status
 * @param {Object} data - Additional data for the banner
 * @returns {string} HTML string for the banner
 */
function renderStatusBanner(status, data = {}) {
  const template = STATUS_TEMPLATES[status];
  if (!template) return '';

  const iconSvg = getIcon(template.icon, {
    width: 32,
    height: 32,
    className: '',
  });

  let actionsHtml = '';
  if (template.actions && template.actions.length > 0) {
    actionsHtml = `
      <div class="boarder-status-actions">
        ${template.actions
          .map(
            action => `
          <a href="${action.href}" class="btn btn-${action.type}">
            ${action.icon ? getIcon(action.icon, { width: 20, height: 20 }) : ''}
            ${action.label}
          </a>
        `
          )
          .join('')}
      </div>
    `;
  }

  let reasonHtml = '';
  if (template.reason && data.rejectionReason) {
    reasonHtml = `<p class="boarder-status-reason">${template.reason(data.rejectionReason)}</p>`;
  }

  let timelineHtml = '';
  if (template.timeline) {
    timelineHtml = `<p class="boarder-status-timeline">${template.timeline}</p>`;
  }

  return `
    <div class="boarder-status-banner ${status}">
      <div class="boarder-status-icon">
        ${iconSvg}
      </div>
      <div class="boarder-status-content">
        <h3>${template.title}</h3>
        <p>${template.message(data.appName || 'the property', data.date || '')}</p>
        ${reasonHtml}
        ${timelineHtml}
      </div>
      ${actionsHtml}
    </div>
  `;
}

/**
 * Check URL parameters for status indicators
 * @returns {Object} URL parameters
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    status: params.get('status'),
    appName: params.get('app') || '',
    rejectionReason: params.get('reason') || '',
  };
}

/**
 * Initialize boarder status banners
 */
export function initBoarderStatus() {
  const container = document.getElementById('boarder-status-banner-container');
  if (!container) return;

  // Check URL params first (e.g., ?status=rejected)
  const urlParams = getUrlParams();

  // Get status from localStorage or URL
  let currentStatus = getBoarderStatus();
  if (urlParams.status) {
    currentStatus = urlParams.status;
    updateBoarderStatus(currentStatus);
  }

  // Only show banner for pending, pending_confirmation, or rejected status
  if (
    currentStatus === 'pending' ||
    currentStatus === 'rejected' ||
    currentStatus === 'applied_pending' ||
    currentStatus === 'pending_confirmation'
  ) {
    const displayStatus = currentStatus === 'applied_pending' ? 'pending' : currentStatus;

    const bannerHtml = renderStatusBanner(displayStatus, {
      appName: urlParams.appName || 'Sunrise Dormitory',
      date: urlParams.date || 'Jan 15, 2025',
      rejectionReason: urlParams.rejectionReason,
    });

    container.innerHTML = bannerHtml;
    container.style.display = 'block';

    // Inject icons in the newly added banner
    const iconElements = container.querySelectorAll('[data-icon]');
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
  } else {
    container.style.display = 'none';
  }
}

/**
 * Update boarder status and refresh UI
 * @param {string} newStatus - New status to set
 * @param {Object} data - Additional data
 */
export function updateBoarderStatusUI(newStatus, data = {}) {
  updateBoarderStatus(newStatus);
  initBoarderStatus();
}
