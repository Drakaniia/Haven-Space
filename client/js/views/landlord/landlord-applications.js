/**
 * Landlord Applications
 *
 * Fetches and renders application review queue from API
 */

import CONFIG from '../../config.js';
import { getAuthHeaders } from '../../shared/auth-headers.js';

/**
 * Fetch applications from API
 * @returns {Promise<Array>} Applications array
 */
async function fetchApplications() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/applications`, {
      headers: getAuthHeaders('3'),
      credentials: 'include',
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn('Applications API returned 401 - user may not be authenticated yet');
        // Don't redirect here - let the main dashboard handle authentication
        return [];
      }
      throw new Error('Failed to fetch applications');
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
}

/**
 * Get status badge class based on application status
 * @param {string} status - Application status
 * @returns {string} CSS class name
 */
function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'landlord-status-new';
    case 'under_review':
    case 'review':
      return 'landlord-status-review';
    case 'accepted':
    case 'approved':
      return 'landlord-status-approved';
    case 'rejected':
      return 'landlord-status-rejected';
    default:
      return 'landlord-status-new';
  }
}

/**
 * Get display label for status
 * @param {string} status - Application status
 * @returns {string} Display label
 */
function getStatusLabel(status) {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'New';
    case 'under_review':
      return 'Under Review';
    case 'accepted':
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return status || 'Unknown';
  }
}

/**
 * Get initials from name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Initials
 */
function getInitials(firstName, lastName) {
  const a = (firstName || '').trim().charAt(0);
  const b = (lastName || '').trim().charAt(0);
  return (a + b || '?').toUpperCase();
}

/**
 * Create application card HTML
 * @param {Object} application - Application data
 * @returns {string} HTML string
 */
function createApplicationCard(application) {
  const firstName = application.first_name || '';
  const lastName = application.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown';
  const initials = getInitials(firstName, lastName);
  const statusClass = getStatusBadgeClass(application.status);
  const statusLabel = getStatusLabel(application.status);
  const roomTitle = application.room_title || 'Unknown Room';
  const roomPrice = application.room_price || 0;
  const appliedDate = application.created_at
    ? new Date(application.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  return `
    <div class="landlord-application-card" data-application-id="${application.id}">
      <div class="landlord-application-header">
        <div class="landlord-application-info">
          <h3 class="landlord-application-name">${fullName}</h3>
          <p class="landlord-application-property">
            <span
              data-icon="building"
              data-icon-width="16"
              data-icon-height="16"
              data-icon-stroke-width="2"
              style="display: inline-block; vertical-align: middle"
            ></span>
            ${roomTitle}
          </p>
        </div>
        <span class="landlord-status-badge ${statusClass}">${statusLabel}</span>
      </div>
      <div class="landlord-application-meta">
        <div class="landlord-meta-item">
          <span
            data-icon="user"
            data-icon-width="16"
            data-icon-height="16"
            data-icon-stroke-width="2"
          ></span>
          <span>Applied ${appliedDate}</span>
        </div>
        <div class="landlord-meta-item">
          <span
            data-icon="currencyDollar"
            data-icon-width="16"
            data-icon-height="16"
            data-icon-stroke-width="2"
          ></span>
          <span>₱${roomPrice.toLocaleString()}/month</span>
        </div>
      </div>
      <div class="landlord-application-actions">
        <button class="landlord-btn landlord-btn-outline landlord-btn-sm view-details-btn" data-id="${
          application.id
        }">
          View Details
        </button>
        <button class="landlord-btn landlord-btn-success landlord-btn-sm approve-btn" data-id="${
          application.id
        }">
          Approve
        </button>
        <button class="landlord-btn landlord-btn-danger landlord-btn-sm reject-btn" data-id="${
          application.id
        }">
          Reject
        </button>
      </div>
    </div>
  `;
}

/**
 * Render applications to container
 * @param {Array} applications - Applications array
 */
function renderApplications(applications) {
  const container = document.getElementById('applicationQueueContainer');
  if (!container) {
    return;
  }

  const queueHeader = container.querySelector('.landlord-application-queue');
  if (!queueHeader) {
    return;
  }

  // Clear existing cards (keep header)
  const existingCards = container.querySelectorAll('.landlord-application-card');
  existingCards.forEach(card => card.remove());

  if (!applications || applications.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'landlord-application-card';
    emptyState.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 2rem; color: var(--text-gray);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 48px; height: 48px; margin: 0 auto 1rem; opacity: 0.4;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style="font-size: 1rem; font-weight: 500; margin-bottom: 0.25rem;">No applications yet</p>
        <p style="font-size: 0.875rem; opacity: 0.7;">Applications from boarders will appear here</p>
      </div>
    `;
    queueHeader.appendChild(emptyState);
    return;
  }

  // Render each application
  applications.forEach(app => {
    const card = document.createElement('div');
    card.innerHTML = createApplicationCard(app);
    queueHeader.appendChild(card.firstElementChild);
  });

  // Re-initialize icons for new content
  if (typeof window.initIcons === 'function') {
    window.initIcons();
  }
}

/**
 * Update application status
 * @param {number} applicationId - Application ID
 * @param {string} status - New status (approved/rejected)
 */
async function updateApplicationStatus(applicationId, status) {
  if (!confirm(`Are you sure you want to ${status} this application?`)) {
    return;
  }

  try {
    const res = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/applications/${applicationId}/status`,
      {
        method: 'PATCH',
        headers: getAuthHeaders('3'),
        credentials: 'include',
        body: JSON.stringify({ status }),
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to ${status} application`);
    }

    alert(`Application ${status} successfully!`);

    // Refresh the list
    const applications = await fetchApplications();
    renderApplications(applications);
  } catch (error) {
    console.error('Error updating application:', error);
    alert(`Failed to update application: ${error.message}`);
  }
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // View details button
  document.addEventListener('click', e => {
    if (e.target.classList.contains('view-details-btn')) {
      const id = e.target.dataset.id;
      window.location.href = `applications/detail.html?id=${id}`;
    }
  });

  // Approve button
  document.addEventListener('click', e => {
    if (e.target.classList.contains('approve-btn')) {
      const id = parseInt(e.target.dataset.id);
      updateApplicationStatus(id, 'accepted');
    }
  });

  // Reject button
  document.addEventListener('click', e => {
    if (e.target.classList.contains('reject-btn')) {
      const id = parseInt(e.target.dataset.id);
      updateApplicationStatus(id, 'rejected');
    }
  });
}

/**
 * Initialize landlord applications
 */
export async function initLandlordApplications() {
  // Fetch and render applications
  const applications = await fetchApplications();
  renderApplications(applications);
  initEventListeners();
}

/**
 * Re-fetch and render applications (for refreshing)
 */
export async function refreshApplications() {
  const applications = await fetchApplications();
  renderApplications(applications);
}

// Auto-initialize if loaded directly
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLandlordApplications);
} else {
  initLandlordApplications();
}
