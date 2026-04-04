/**
 * Landlord Announcements Management
 * Handles creating, editing, and managing announcements
 */

/**
 * Initialize announcements management
 */
export function initAnnouncements() {
  initCreateAnnouncementForm();
  initAnnouncementActions();
  setDefaultPublishDate();
}

/**
 * Initialize create announcement form toggle
 */
function initCreateAnnouncementForm() {
  const createBtn = document.getElementById('create-announcement-btn');
  const modalOverlay = document.getElementById('announcement-modal-overlay');
  const formContainer = document.getElementById('announcement-form-container');
  const closeBtn = document.getElementById('close-form-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const form = document.getElementById('announcement-form');

  // Show modal
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      showModal();
    });
  }

  // Hide modal function
  const hideModal = () => {
    modalOverlay.classList.remove('active');
    // Wait for animation to complete before resetting form
    setTimeout(() => {
      form.reset();
      setDefaultPublishDate();
    }, 300);
  };

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', hideModal);
  }

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideModal);
  }

  // Close modal when clicking on overlay (outside form)
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) {
        hideModal();
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
      hideModal();
    }
  });
}

/**
 * Show modal
 */
function showModal() {
  const modalOverlay = document.getElementById('announcement-modal-overlay');
  if (modalOverlay) {
    modalOverlay.classList.add('active');
    // Focus on the first input field
    setTimeout(() => {
      const firstInput = document.getElementById('announcement-title');
      if (firstInput) {
        firstInput.focus();
      }
    }, 300);
  }
}

/**
 * Set default publish date to today
 */
function setDefaultPublishDate() {
  const dateInput = document.getElementById('announcement-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

/**
 * Initialize announcement form submission
 */
function initAnnouncementFormSubmission() {
  const form = document.getElementById('announcement-form');
  const modalOverlay = document.getElementById('announcement-modal-overlay');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const formData = {
      title: document.getElementById('announcement-title').value,
      category: document.getElementById('announcement-category').value,
      priority: document.getElementById('announcement-priority').value,
      description: document.getElementById('announcement-description').value,
      publishDate: document.getElementById('announcement-date').value,
      properties: getSelectedProperties(),
    };

    // TODO: Connect to backend API
    // For now, just log and show success message
    console.log('Announcement data:', formData);

    // Show success notification
    showNotification('Announcement published successfully!', 'success');

    // Hide modal and reset
    modalOverlay.classList.remove('active');
    setTimeout(() => {
      form.reset();
      setDefaultPublishDate();
    }, 300);

    // In a real implementation, you would:
    // 1. Send data to backend
    // 2. Add the new announcement to the list
    // 3. Update the UI
  });
}

/**
 * Get selected properties from checkboxes
 * @returns {Array} Selected property values
 */
function getSelectedProperties() {
  const checkboxes = document.querySelectorAll('input[name="properties"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Initialize announcement action buttons (edit, delete)
 */
function initAnnouncementActions() {
  // Initialize edit buttons
  const editButtons = document.querySelectorAll('[title="Edit"]');
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // TODO: Implement edit functionality
      showNotification('Edit functionality coming soon', 'info');
    });
  });

  // Initialize delete buttons
  const deleteButtons = document.querySelectorAll('[title="Delete"]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // TODO: Implement delete functionality
      const confirmed = confirm('Are you sure you want to delete this announcement?');
      if (confirmed) {
        showNotification('Delete functionality coming soon', 'info');
      }
    });
  });

  // Initialize form submission
  initAnnouncementFormSubmission();
}

/**
 * Show notification toast
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
  // TODO: Implement proper notification toast UI
  // For now, using console.log
  console.log(`[${type.toUpperCase()}] ${message}`);

  // Simple alert for now - will be replaced with toast component
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  // Create toast element
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background-color: ${colors[type]};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Add CSS animations for toast notifications
 */
function injectToastStyles() {
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
  `;
  document.head.appendChild(style);
}

/**
 * Initialize all components
 * Called from initLandlordDashboardEntry() in index.js
 */
// No DOMContentLoaded listener needed - called from index.js
