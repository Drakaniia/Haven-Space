/**
 * Landlord Applications Page
 * Full-featured application management for landlords
 */

import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';

// Application state
const state = {
  applications: [],
  filteredApplications: [],
  currentFilter: 'all',
  currentSort: 'newest',
  searchQuery: '',
};

/**
 * Initialize the applications page
 */
document.addEventListener('DOMContentLoaded', async () => {
  await loadApplications();
  initializeEventListeners();
  initializeIcons();
});

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      await loadApplications();
      refreshBtn.disabled = false;
    });
  }

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      state.searchQuery = e.target.value.toLowerCase();
      filterAndRenderApplications();
    });
  }

  // Status filter
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', e => {
      state.currentFilter = e.target.value;
      filterAndRenderApplications();
    });
  }

  // Sort filter
  const sortFilter = document.getElementById('sortFilter');
  if (sortFilter) {
    sortFilter.addEventListener('change', e => {
      state.currentSort = e.target.value;
      filterAndRenderApplications();
    });
  }

  // Modal close
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', closeModal);
  }

  // Delegate event listeners for dynamic buttons
  document.addEventListener('click', handleDynamicClicks);
}

/**
 * Handle clicks on dynamically created elements
 */
function handleDynamicClicks(e) {
  const target = e.target.closest('button');
  if (!target) return;

  // View details button
  if (target.classList.contains('view-details-btn')) {
    const id = parseInt(target.dataset.id);
    openApplicationModal(id);
  }

  // Approve button
  if (target.classList.contains('approve-btn')) {
    const id = parseInt(target.dataset.id);
    updateApplicationStatus(id, 'approved');
  }

  // Reject button
  if (target.classList.contains('reject-btn')) {
    const id = parseInt(target.dataset.id);
    updateApplicationStatus(id, 'rejected');
  }

  // Under review button
  if (target.classList.contains('review-btn')) {
    const id = parseInt(target.dataset.id);
    updateApplicationStatus(id, 'under_review');
  }

  // Modal action buttons
  if (target.classList.contains('modal-approve-btn')) {
    const id = parseInt(target.dataset.id);
    updateApplicationStatus(id, 'approved');
    closeModal();
  }

  if (target.classList.contains('modal-reject-btn')) {
    const id = parseInt(target.dataset.id);
    updateApplicationStatus(id, 'rejected');
    closeModal();
  }
}

/**
 * Load applications from API
 */
async function loadApplications() {
  try {
    showLoadingState();

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/applications`, {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '../../auth/login.html';
        return;
      }
      throw new Error('Failed to fetch applications');
    }

    const data = await response.json();
    state.applications = data.data || [];
    state.filteredApplications = [...state.applications];

    updateStats();
    filterAndRenderApplications();
  } catch (error) {
    console.error('Error loading applications:', error);
    showErrorState();
  }
}

/**
 * Filter and render applications based on current filters
 */
function filterAndRenderApplications() {
  let filtered = [...state.applications];

  // Apply status filter
  if (state.currentFilter !== 'all') {
    filtered = filtered.filter(app => app.status === state.currentFilter);
  }

  // Apply search filter
  if (state.searchQuery) {
    filtered = filtered.filter(app => {
      const fullName = `${app.first_name || ''} ${app.last_name || ''}`.toLowerCase();
      const roomTitle = (app.room_title || '').toLowerCase();
      return fullName.includes(state.searchQuery) || roomTitle.includes(state.searchQuery);
    });
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (state.currentSort) {
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'oldest':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'property':
        return (a.room_title || '').localeCompare(b.room_title || '');
      default:
        return 0;
    }
  });

  state.filteredApplications = filtered;
  renderApplications();
}

/**
 * Update statistics
 */
function updateStats() {
  const pending = state.applications.filter(app => app.status === 'pending').length;
  const approved = state.applications.filter(app => app.status === 'approved').length;
  const rejected = state.applications.filter(app => app.status === 'rejected').length;
  const total = state.applications.length;

  document.getElementById('pendingCount').textContent = pending;
  document.getElementById('approvedCount').textContent = approved;
  document.getElementById('rejectedCount').textContent = rejected;
  document.getElementById('totalCount').textContent = total;
}

/**
 * Render applications list
 */
function renderApplications() {
  const container = document.getElementById('applicationsList');
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const errorState = document.getElementById('errorState');

  // Hide all states
  loadingState.style.display = 'none';
  emptyState.style.display = 'none';
  errorState.style.display = 'none';

  // Clear container
  container.innerHTML = '';

  // Show empty state if no applications
  if (state.filteredApplications.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }

  // Render each application
  state.filteredApplications.forEach(app => {
    const card = createApplicationCard(app);
    container.appendChild(card);
  });

  // Re-initialize icons
  initializeIcons();
}

/**
 * Create application card element
 */
function createApplicationCard(app) {
  const card = document.createElement('div');
  card.className = 'application-card';
  card.dataset.applicationId = app.id;

  const firstName = app.first_name || '';
  const lastName = app.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown Boarder';
  const email = app.email || 'No email provided';
  const roomTitle = app.room_title || 'Unknown Room';
  const roomPrice = app.room_price || 0;
  const message = app.message || 'No message provided';
  const appliedDate = app.created_at
    ? new Date(app.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Recently';

  const statusBadge = getStatusBadge(app.status);

  card.innerHTML = `
    <div class="application-card-header">
      <div class="application-card-avatar">
        <div class="application-avatar-circle">
          ${getInitials(firstName, lastName)}
        </div>
      </div>
      <div class="application-card-info">
        <h3 class="application-card-name">${fullName}</h3>
        <p class="application-card-email">
          <span
            data-icon="envelope"
            data-icon-width="14"
            data-icon-height="14"
            data-icon-stroke-width="2"
          ></span>
          ${email}
        </p>
      </div>
      ${statusBadge}
    </div>

    <div class="application-card-body">
      <div class="application-card-property">
        <span
          data-icon="home"
          data-icon-width="18"
          data-icon-height="18"
          data-icon-stroke-width="2"
        ></span>
        <div class="application-property-info">
          <div class="application-property-name">${roomTitle}</div>
          <div class="application-property-price">₱${roomPrice.toLocaleString()}/month</div>
        </div>
      </div>

      <div class="application-card-message">
        <div class="application-message-label">Message:</div>
        <div class="application-message-text">${message}</div>
      </div>

      <div class="application-card-meta">
        <div class="application-meta-item">
          <span
            data-icon="calendar"
            data-icon-width="16"
            data-icon-height="16"
            data-icon-stroke-width="2"
          ></span>
          Applied on ${appliedDate}
        </div>
      </div>
    </div>

    <div class="application-card-actions">
      <button class="landlord-btn landlord-btn-outline landlord-btn-sm view-details-btn" data-id="${
        app.id
      }">
        <span
          data-icon="eye"
          data-icon-width="18"
          data-icon-height="18"
          data-icon-stroke-width="2"
        ></span>
        View Details
      </button>
      ${getActionButtons(app.status, app.id)}
    </div>
  `;

  return card;
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const badges = {
    pending: {
      class: 'application-status-badge status-pending',
      label: 'Pending',
    },
    under_review: {
      class: 'application-status-badge status-review',
      label: 'Under Review',
    },
    approved: {
      class: 'application-status-badge status-approved',
      label: 'Approved',
    },
    rejected: {
      class: 'application-status-badge status-rejected',
      label: 'Rejected',
    },
  };

  const badge = badges[status] || badges.pending;
  return `<span class="${badge.class}">${badge.label}</span>`;
}

/**
 * Get action buttons based on status
 */
function getActionButtons(status, id) {
  if (status === 'approved' || status === 'rejected') {
    return '';
  }

  return `
    <button class="landlord-btn landlord-btn-success landlord-btn-sm approve-btn" data-id="${id}">
      <span
        data-icon="check"
        data-icon-width="18"
        data-icon-height="18"
        data-icon-stroke-width="2"
      ></span>
      Approve
    </button>
    <button class="landlord-btn landlord-btn-danger landlord-btn-sm reject-btn" data-id="${id}">
      <span
        data-icon="xMark"
        data-icon-width="18"
        data-icon-height="18"
        data-icon-stroke-width="2"
      ></span>
      Reject
    </button>
  `;
}

/**
 * Get initials from name
 */
function getInitials(firstName, lastName) {
  const first = (firstName || '').trim().charAt(0).toUpperCase();
  const last = (lastName || '').trim().charAt(0).toUpperCase();
  return first + last || '?';
}

/**
 * Update application status
 */
async function updateApplicationStatus(id, status) {
  const statusLabels = {
    approved: 'approve',
    rejected: 'reject',
    under_review: 'mark as under review',
  };

  const action = statusLabels[status] || 'update';

  if (!confirm(`Are you sure you want to ${action} this application?`)) {
    return;
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/applications/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update application status');
    }

    showToast(`Application ${action}d successfully!`, 'success');
    await loadApplications();
  } catch (error) {
    console.error('Error updating application:', error);
    showToast(`Failed to ${action} application. Please try again.`, 'error');
  }
}

/**
 * Open application detail modal
 */
function openApplicationModal(id) {
  const app = state.applications.find(a => a.id === id);
  if (!app) return;

  const modal = document.getElementById('applicationModal');
  const modalBody = document.getElementById('modalBody');

  const firstName = app.first_name || '';
  const lastName = app.last_name || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown Boarder';
  const email = app.email || 'No email provided';
  const roomTitle = app.room_title || 'Unknown Room';
  const roomPrice = app.room_price || 0;
  const message = app.message || 'No message provided';
  const appliedDate = app.created_at
    ? new Date(app.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  const statusBadge = getStatusBadge(app.status);

  modalBody.innerHTML = `
    <div class="modal-application-header">
      <div class="modal-application-avatar">
        ${getInitials(firstName, lastName)}
      </div>
      <div class="modal-application-info">
        <h3 class="modal-application-name">${fullName}</h3>
        <p class="modal-application-email">${email}</p>
        ${statusBadge}
      </div>
    </div>

    <div class="modal-application-section">
      <h4 class="modal-section-title">Property Details</h4>
      <div class="modal-property-card">
        <span
          data-icon="home"
          data-icon-width="24"
          data-icon-height="24"
          data-icon-stroke-width="2"
        ></span>
        <div class="modal-property-info">
          <div class="modal-property-name">${roomTitle}</div>
          <div class="modal-property-price">₱${roomPrice.toLocaleString()}/month</div>
        </div>
      </div>
    </div>

    <div class="modal-application-section">
      <h4 class="modal-section-title">Application Message</h4>
      <div class="modal-message-box">
        ${message}
      </div>
    </div>

    <div class="modal-application-section">
      <h4 class="modal-section-title">Application Details</h4>
      <div class="modal-details-grid">
        <div class="modal-detail-item">
          <span class="modal-detail-label">Applied On:</span>
          <span class="modal-detail-value">${appliedDate}</span>
        </div>
        <div class="modal-detail-item">
          <span class="modal-detail-label">Application ID:</span>
          <span class="modal-detail-value">#${app.id}</span>
        </div>
        <div class="modal-detail-item">
          <span class="modal-detail-label">Status:</span>
          <span class="modal-detail-value">${app.status}</span>
        </div>
      </div>
    </div>

    ${
      app.status !== 'approved' && app.status !== 'rejected'
        ? `
    <div class="modal-application-actions">
      <button class="landlord-btn landlord-btn-success modal-approve-btn" data-id="${app.id}">
        <span
          data-icon="check"
          data-icon-width="20"
          data-icon-height="20"
          data-icon-stroke-width="2"
        ></span>
        Approve Application
      </button>
      <button class="landlord-btn landlord-btn-danger modal-reject-btn" data-id="${app.id}">
        <span
          data-icon="xMark"
          data-icon-width="20"
          data-icon-height="20"
          data-icon-stroke-width="2"
        ></span>
        Reject Application
      </button>
    </div>
    `
        : ''
    }
  `;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Re-initialize icons
  initializeIcons();
}

/**
 * Close modal
 */
function closeModal() {
  const modal = document.getElementById('applicationModal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

/**
 * Show loading state
 */
function showLoadingState() {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const errorState = document.getElementById('errorState');
  const container = document.getElementById('applicationsList');

  loadingState.style.display = 'flex';
  emptyState.style.display = 'none';
  errorState.style.display = 'none';
  container.innerHTML = '';
}

/**
 * Show error state
 */
function showErrorState() {
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const errorState = document.getElementById('errorState');
  const container = document.getElementById('applicationsList');

  loadingState.style.display = 'none';
  emptyState.style.display = 'none';
  errorState.style.display = 'flex';
  container.innerHTML = '';
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
  initializeIcons();

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
 * Initialize icons
 */
function initializeIcons() {
  if (typeof window.initIcons === 'function') {
    window.initIcons();
  }
}

// Export functions for external use
export { loadApplications, updateApplicationStatus, openApplicationModal };
