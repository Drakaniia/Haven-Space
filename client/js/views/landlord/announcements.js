/**
 * Landlord Announcements Management
 * Handles creating, editing, and managing announcements
 */

import CONFIG from '../../config.js';
import { showToast } from '../../shared/toast.js';

let currentEditingId = null;
let landlordProperties = [];

/**
 * Initialize announcements management
 */
export function initAnnouncements() {
  initCreateAnnouncementForm();
  setDefaultPublishDate();
  loadLandlordProperties();
  loadAnnouncements();
}

/**
 * Load landlord properties for targeting
 */
async function loadLandlordProperties() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/properties`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }

    const result = await response.json();
    if (result.success !== false && result.data) {
      landlordProperties = result.data.properties || [];
      updatePropertyCheckboxes();
    }
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

/**
 * Update property checkboxes with real data
 */
function updatePropertyCheckboxes() {
  const checkboxGroup = document.querySelector('.landlord-checkbox-group');
  if (!checkboxGroup) {
    return;
  }

  // Keep "All Properties" checkbox
  const allCheckbox = checkboxGroup.querySelector('input[value="all"]');
  const allLabel = allCheckbox?.parentElement;

  // Clear other checkboxes
  checkboxGroup.innerHTML = '';

  // Re-add "All Properties"
  if (allLabel) {
    checkboxGroup.appendChild(allLabel);
  }

  // Add real properties
  landlordProperties.forEach(property => {
    const label = document.createElement('label');
    label.className = 'landlord-checkbox';
    label.innerHTML = `
      <input type="checkbox" name="properties" value="${property.id}" />
      <span>${property.name}</span>
    `;
    checkboxGroup.appendChild(label);
  });

  // Re-attach "All Properties" toggle behavior
  if (allCheckbox) {
    allCheckbox.addEventListener('change', handleAllPropertiesToggle);
  }
}

/**
 * Handle "All Properties" checkbox toggle
 */
function handleAllPropertiesToggle(e) {
  const checkboxes = document.querySelectorAll('input[name="properties"]:not([value="all"])');
  checkboxes.forEach(cb => {
    cb.disabled = e.target.checked;
    if (e.target.checked) {
      cb.checked = false;
    }
  });
}

/**
 * Load announcements from API
 */
async function loadAnnouncements() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/announcements`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }

    const result = await response.json();
    if (result.success !== false && result.data) {
      renderAnnouncements(result.data.announcements || []);
    }
  } catch (error) {
    console.error('Failed to load announcements:', error);
    showToast('Failed to load announcements', 'error');
  }
}

/**
 * Render announcements list
 */
function renderAnnouncements(announcements) {
  const listContainer = document.getElementById('announcements-list');
  if (!listContainer) {
    return;
  }

  if (announcements.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 48px 24px; color: #6b7280;">
        <p style="font-size: 16px; margin-bottom: 8px;">No announcements yet</p>
        <p style="font-size: 14px;">Create your first announcement to notify your boarders</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = announcements
    .map(announcement => {
      const categoryClass = `landlord-badge-${announcement.category}`;
      const priorityClass = `landlord-badge-${announcement.priority}`;
      const date = new Date(announcement.publish_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      let targetDisplay = announcement.target_property;
      if (announcement.target_properties && announcement.target_properties.length > 1) {
        targetDisplay = `${announcement.target_properties.length} Properties`;
      }

      return `
      <div class="landlord-announcement-card" data-announcement-id="${announcement.id}">
        <div class="landlord-announcement-card-header">
          <div class="landlord-announcement-card-info">
            <div class="landlord-announcement-badges">
              <span class="landlord-badge ${categoryClass}">${announcement.category}</span>
              <span class="landlord-badge ${priorityClass}">${announcement.priority}</span>
            </div>
            <h3 class="landlord-announcement-card-title">${announcement.title}</h3>
          </div>
          <div class="landlord-announcement-card-actions">
            <button class="landlord-icon-btn" title="Edit" data-action="edit" data-id="${announcement.id}">
              <span
                data-icon="edit"
                data-icon-width="24"
                data-icon-height="24"
                data-icon-stroke-width="2"
              ></span>
            </button>
            <button class="landlord-icon-btn" title="Delete" data-action="delete" data-id="${announcement.id}">
              <span
                data-icon="trash"
                data-icon-width="24"
                data-icon-height="24"
                data-icon-stroke-width="2"
              ></span>
            </button>
          </div>
        </div>
        <div class="landlord-announcement-card-body">
          <p class="landlord-announcement-card-text">${announcement.description}</p>
        </div>
        <div class="landlord-announcement-card-footer">
          <div class="landlord-announcement-card-meta">
            <span class="landlord-announcement-date">
              <span
                data-icon="calendarDays"
                data-icon-width="24"
                data-icon-height="24"
                data-icon-stroke-width="2"
              ></span>
              ${date}
            </span>
            <span class="landlord-announcement-target">
              <span
                data-icon="building"
                data-icon-width="24"
                data-icon-height="24"
                data-icon-stroke-width="2"
              ></span>
              ${targetDisplay}
            </span>
          </div>
          <div class="landlord-announcement-stats">
            <span class="landlord-announcement-views">
              <span
                data-icon="eye"
                data-icon-width="24"
                data-icon-height="24"
                data-icon-stroke-width="2"
              ></span>
              ${announcement.view_count} views
            </span>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  // Re-attach event listeners
  initAnnouncementActions();
}

/**
 * Initialize create announcement form toggle
 */
function initCreateAnnouncementForm() {
  const createBtn = document.getElementById('create-announcement-btn');
  const modalOverlay = document.getElementById('announcement-modal-overlay');
  const closeBtn = document.getElementById('close-form-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const form = document.getElementById('announcement-form');

  // Show modal
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      currentEditingId = null;
      document.getElementById('modal-title').textContent = 'Create New Announcement';
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
      currentEditingId = null;
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

  // Form submission
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
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
 * Handle form submission (create or update)
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = {
    title: document.getElementById('announcement-title').value,
    category: document.getElementById('announcement-category').value,
    priority: document.getElementById('announcement-priority').value,
    description: document.getElementById('announcement-description').value,
    publish_date: document.getElementById('announcement-date').value,
    properties: getSelectedProperties(),
  };

  try {
    let response;
    if (currentEditingId) {
      // Update existing announcement
      response = await fetch(
        `${CONFIG.API_BASE_URL}/api/landlord/announcements/${currentEditingId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData),
        }
      );
      if (response.ok) {
        showToast('Announcement updated successfully!', 'success');
      }
    } else {
      // Create new announcement
      response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        showToast('Announcement published successfully!', 'success');
      }
    }

    if (!response.ok) {
      throw new Error('Failed to save announcement');
    }

    // Hide modal and reset
    const modalOverlay = document.getElementById('announcement-modal-overlay');
    modalOverlay.classList.remove('active');
    setTimeout(() => {
      e.target.reset();
      setDefaultPublishDate();
      currentEditingId = null;
    }, 300);

    // Reload announcements
    loadAnnouncements();
  } catch (error) {
    console.error('Failed to save announcement:', error);
    showToast('Failed to save announcement', 'error');
  }
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
  const editButtons = document.querySelectorAll('[data-action="edit"]');
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const announcementId = btn.dataset.id;
      handleEditAnnouncement(announcementId);
    });
  });

  // Initialize delete buttons
  const deleteButtons = document.querySelectorAll('[data-action="delete"]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const announcementId = btn.dataset.id;
      handleDeleteAnnouncement(announcementId);
    });
  });
}

/**
 * Handle edit announcement
 */
async function handleEditAnnouncement(announcementId) {
  try {
    // Get announcement data
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/announcements`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }

    const result = await response.json();
    if (result.success !== false && result.data) {
      const announcement = result.data.announcements.find(a => a.id === parseInt(announcementId));
      if (!announcement) {
        showToast('Announcement not found', 'error');
        return;
      }

      // Populate form
      currentEditingId = announcementId;
      document.getElementById('modal-title').textContent = 'Edit Announcement';
      document.getElementById('announcement-title').value = announcement.title;
      document.getElementById('announcement-category').value = announcement.category;
      document.getElementById('announcement-priority').value = announcement.priority;
      document.getElementById('announcement-description').value = announcement.description;
      document.getElementById('announcement-date').value = announcement.publish_date;

      // Set property checkboxes
      const allCheckbox = document.querySelector('input[name="properties"][value="all"]');
      const propertyCheckboxes = document.querySelectorAll(
        'input[name="properties"]:not([value="all"])'
      );

      // Uncheck all first
      allCheckbox.checked = false;
      propertyCheckboxes.forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
      });

      // Check appropriate boxes
      if (!announcement.target_properties || announcement.target_properties.length === 0) {
        allCheckbox.checked = true;
        propertyCheckboxes.forEach(cb => (cb.disabled = true));
      } else {
        announcement.target_properties.forEach(prop => {
          const checkbox = document.querySelector(`input[name="properties"][value="${prop.id}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      }

      showModal();
    }
  } catch (error) {
    console.error('Failed to load announcement:', error);
    showToast('Failed to load announcement', 'error');
  }
}

/**
 * Handle delete announcement
 */
async function handleDeleteAnnouncement(announcementId) {
  const confirmed = confirm('Are you sure you want to delete this announcement?');
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/announcements/${announcementId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete announcement');
    }

    showToast('Announcement deleted successfully', 'success');
    loadAnnouncements();
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    showToast('Failed to delete announcement', 'error');
  }
}
