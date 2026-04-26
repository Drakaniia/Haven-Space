/**
 * Landlord Applications
 *
 * Fetches and renders application review queue from API
 */
import CONFIG from '../../config.js';
import { getAuthHeaders } from '../../shared/auth-headers.js';
import { initLandlordPermissions } from '../../shared/permissions.js';

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

  // Store applications in localStorage for modal access
  localStorage.setItem('landlordApplications', JSON.stringify(applications));

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
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const icons = {
    success: 'checkCircle',
    error: 'xCircle',
    warning: 'exclamationTriangle',
    info: 'infoCircle',
  };

  toast.innerHTML = `
    <div class="toast-icon">
      <span
        data-icon="${icons[type] || icons.info}"
        data-icon-width="20"
        data-icon-height="20"
        data-icon-stroke-width="2"
      ></span>
    </div>
    <div class="toast-content">${message}</div>
    <button class="toast-close">
      <span
        data-icon="xMark"
        data-icon-width="16"
        data-icon-height="16"
        data-icon-stroke-width="2"
      ></span>
    </button>
  `;

  document.body.appendChild(toast);

  // Initialize icons in toast
  if (typeof window.initIcons === 'function') {
    window.initIcons();
  }

  // Show toast
  setTimeout(() => toast.classList.add('toast-visible'), 10);

  // Close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  });

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * Update application status
 * @param {number} applicationId - Application ID
 * @param {string} status - New status (approved/rejected)
 */
async function updateApplicationStatus(applicationId, status) {
  const statusLabels = {
    accepted: 'accept',
    approved: 'accept',
    rejected: 'reject',
  };

  // Backend expects 'accepted' or 'rejected', not 'approved'
  const backendStatus = status;
  const action = statusLabels[status] || 'update';

  try {
    const res = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/applications/${applicationId}/status`,
      {
        method: 'PATCH',
        headers: getAuthHeaders('3'),
        credentials: 'include',
        body: JSON.stringify({ status: backendStatus }),
      }
    );

    if (!res.ok) {
      if (res.status === 403) {
        // Handle verification-related 403 errors
        const errorData = await res.json().catch(() => ({}));
        if (
          errorData.code === 'VERIFICATION_REQUIRED' ||
          errorData.code === 'VERIFICATION_PENDING'
        ) {
          showToast(
            'Your account is pending verification. You cannot update applications until an admin approves your account.',
            'warning'
          );
          return;
        } else if (errorData.code === 'EMAIL_NOT_VERIFIED') {
          showToast('Please verify your email address before managing applications.', 'warning');
          return;
        }
      }
      throw new Error(`Failed to ${action} application`);
    }

    showToast(`Application ${action}ed successfully!`, 'success');

    // Refresh the list
    const applications = await fetchApplications();
    renderApplications(applications);
  } catch (error) {
    console.error('Error updating application:', error);
    showToast(`Failed to update application: ${error.message}`, 'error');
  }
}

/**
 * Show application details modal
 * @param {Object} application - Application data
 */
function showApplicationModal(application) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  overlay.style.zIndex = '1000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  // Create modal content
  const modal = document.createElement('div');
  modal.style.backgroundColor = 'white';
  modal.style.padding = '2rem';
  modal.style.borderRadius = '8px';
  modal.style.maxWidth = '600px';
  modal.style.width = '90%';
  modal.style.maxHeight = '80vh';
  modal.style.overflowY = 'auto';
  modal.style.position = 'relative';

  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '1rem';
  closeBtn.style.right = '1rem';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '1.5rem';
  closeBtn.style.cursor = 'pointer';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  // Create modal content
  const firstName = application.first_name || '';
  const lastName = application.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown Boarder';
  const email = application.email || 'No email provided';
  const roomTitle = application.room_title || 'Unknown Room';
  const roomPrice = application.room_price || 0;
  const message = application.message || 'No message provided';
  const appliedDate = application.created_at
    ? new Date(application.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  modal.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 1.5rem;">
      <div style="width: 48px; height: 48px; background-color: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; font-weight: bold;">
        ${getInitials(firstName, lastName)}
      </div>
      <div>
        <h3 style="margin: 0; font-size: 1.25rem;">${fullName}</h3>
        <p style="margin: 0.25rem 0 0 0; color: #666;">${email}</p>
      </div>
    </div>
    <div style="margin-bottom: 1.5rem;">
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #666;">Property Details</h4>
      <div style="display: flex; align-items: center; padding: 0.75rem; background-color: #f8f9fa; border-radius: 6px;">
        <span style="margin-right: 0.75rem;">🏠</span>
        <div>
          <div style="font-weight: 500;">${roomTitle}</div>
          <div style="color: #666;">₱${roomPrice.toLocaleString()}/month</div>
        </div>
      </div>
    </div>
    <div style="margin-bottom: 1.5rem;">
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #666;">Application Message</h4>
      <div style="padding: 0.75rem; background-color: #f8f9fa; border-radius: 6px; min-height: 100px;">
        ${message}
      </div>
    </div>
    <div style="margin-bottom: 1.5rem;">
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #666;">Application Details</h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
        <div>
          <div style="font-size: 0.875rem; color: #666;">Applied On:</div>
          <div style="font-weight: 500;">${appliedDate}</div>
        </div>
        <div>
          <div style="font-size: 0.875rem; color: #666;">Application ID:</div>
          <div style="font-weight: 500;">#${application.id}</div>
        </div>
        <div>
          <div style="font-size: 0.875rem; color: #666;">Status:</div>
          <div style="font-weight: 500;">${application.status}</div>
        </div>
      </div>
    </div>
  `;

  modal.appendChild(closeBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close when clicking outside modal
  overlay.onclick = e => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // View details button
  document.addEventListener('click', e => {
    if (e.target.classList.contains('view-details-btn') || e.target.closest('.view-details-btn')) {
      const button = e.target.classList.contains('view-details-btn')
        ? e.target
        : e.target.closest('.view-details-btn');
      const id = parseInt(button.dataset.id);
      const applications = JSON.parse(localStorage.getItem('landlordApplications') || '[]');
      const application = applications.find(app => app.id === id);
      if (application) {
        showApplicationModal(application);
        e.preventDefault();
        e.stopPropagation();
      }
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

  // Check landlord verification status and apply read-only restrictions if pending
  initLandlordPermissions();
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
  document.addEventListener('DOMContentLoaded', () => {
    initLandlordApplications();
  });
} else {
  initLandlordApplications();
}
