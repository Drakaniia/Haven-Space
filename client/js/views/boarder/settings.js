/**
 * Boarder Settings Page Logic
 */

import { authenticatedFetch, getState, setState } from '../../shared/state.js';
import {
  getDisplayName,
  getUserInitials,
  getAvatarUrl,
  fetchAndUpdateProfile,
} from '../../shared/profile-utils.js';
import CONFIG from '../../config.js';

/**
 * Initialize settings page
 */
export function initSettingsPage() {
  initSettingsTabs();
  initProfileForms();
  initNotificationSettings();
  initPasswordForm();
  initAvatarUpload();
  initLoadProfileButton();

  // Load and display current profile data
  loadAndDisplayProfile();
}

document.addEventListener('DOMContentLoaded', () => {
  // Only run if we're on the settings page
  if (window.location.pathname.includes('settings')) {
    initSettingsPage();
  }
});

/**
 * Load and display current profile data
 */
async function loadAndDisplayProfile() {
  try {
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Update avatar preview with current data
    updateAvatarPreview(currentUser);

    // Fetch fresh profile data from API
    const updatedUser = await fetchAndUpdateProfile(CONFIG.API_BASE_URL);

    if (updatedUser) {
      // Update avatar preview with fresh data
      updateAvatarPreview(updatedUser);
    }
  } catch (error) {
    console.error('Error loading profile data:', error);
  }
}

/**
 * Update avatar preview with user data
 */
function updateAvatarPreview(user) {
  const avatarPreview = document.getElementById('profile-avatar-preview');
  if (avatarPreview && user) {
    avatarPreview.src = getAvatarUrl(user);
    avatarPreview.alt = `${getDisplayName(user)} Avatar`;
  }
}

/**
 * Initialize load profile button
 */
function initLoadProfileButton() {
  // Add load profile button to basic info section
  const basicInfoForm = document.getElementById('basic-info-form');
  if (basicInfoForm) {
    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.className = 'btn btn-outline btn-sm';
    loadButton.id = 'load-profile-btn';
    loadButton.innerHTML =
      '<span class="icon-placeholder" data-icon="arrowPath"></span> Load My Current Information';
    loadButton.style.marginBottom = '16px';

    // Insert before the form actions
    const formActions = basicInfoForm.querySelector('.form-actions');
    if (formActions) {
      basicInfoForm.insertBefore(loadButton, formActions);
    }

    loadButton.addEventListener('click', loadUserProfile);
  }
}

/**
 * Load user profile data from API
 */
async function loadUserProfile() {
  const loadButton = document.getElementById('load-profile-btn');
  if (loadButton) {
    loadButton.disabled = true;
    loadButton.innerHTML =
      '<span class="icon-placeholder" data-icon="arrowPath"></span> Loading...';
  }

  try {
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/users/profile`);

    if (response.ok) {
      const data = await response.json();
      populateProfileForms(data.user);
      showToast('Profile information loaded successfully', 'success');
    } else {
      console.warn('Failed to load profile data, using localStorage fallback');
      // Fallback to localStorage data
      const state = getState();
      if (state.user) {
        populateProfileForms(state.user);
        showToast('Profile information loaded from cache', 'info');
      } else {
        showToast('No profile data found', 'warning');
      }
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    // Fallback to localStorage data
    const state = getState();
    if (state.user) {
      populateProfileForms(state.user);
      showToast('Profile information loaded from cache', 'info');
    } else {
      showToast('Failed to load profile information', 'error');
    }
  } finally {
    if (loadButton) {
      loadButton.disabled = false;
      loadButton.innerHTML =
        '<span class="icon-placeholder" data-icon="arrowPath"></span> Load My Current Information';
    }
  }
}

/**
 * Populate form fields with user data
 */
function populateProfileForms(user) {
  // Basic Information
  if (user.first_name) document.getElementById('first-name').value = user.first_name;
  if (user.last_name) document.getElementById('last-name').value = user.last_name;
  if (user.date_of_birth) document.getElementById('date-of-birth').value = user.date_of_birth;
  if (user.gender) document.getElementById('gender').value = user.gender;
  if (user.bio) document.getElementById('bio').value = user.bio;
  if (user.avatar_url) document.getElementById('profile-avatar-preview').src = user.avatar_url;

  // Contact Details
  if (user.email) document.getElementById('email').value = user.email;
  if (user.phone) document.getElementById('phone').value = user.phone;
  if (user.alt_phone) document.getElementById('alt-phone').value = user.alt_phone;
  if (user.current_address) document.getElementById('current-address').value = user.current_address;

  // Employment Information
  if (user.employment_status)
    document.getElementById('employment-status').value = user.employment_status;
  if (user.company_name) document.getElementById('company-name').value = user.company_name;
  if (user.job_title) document.getElementById('job-title').value = user.job_title;
  if (user.monthly_income) document.getElementById('monthly-income').value = user.monthly_income;
  if (user.work_schedule) document.getElementById('work-schedule').value = user.work_schedule;
  if (user.company_address) document.getElementById('company-address').value = user.company_address;

  // Emergency Contact
  if (user.emergency_contact_name)
    document.getElementById('emergency-name').value = user.emergency_contact_name;
  if (user.emergency_contact_relationship)
    document.getElementById('emergency-relationship').value = user.emergency_contact_relationship;
  if (user.emergency_contact_phone)
    document.getElementById('emergency-phone').value = user.emergency_contact_phone;
  if (user.emergency_contact_alt_phone)
    document.getElementById('emergency-alt-phone').value = user.emergency_contact_alt_phone;
  if (user.emergency_contact_address)
    document.getElementById('emergency-address').value = user.emergency_contact_address;
}

/**
 * Initialize settings tabs
 */
function initSettingsTabs() {
  const tabs = document.querySelectorAll('.settings-tab');
  const panels = document.querySelectorAll('.settings-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Remove active class from all tabs and panels
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Show corresponding panel
      const panel = document.getElementById(`${tabName}-panel`);
      if (panel) {
        panel.classList.add('active');
      }
    });
  });
}

/**
 * Initialize profile forms
 */
function initProfileForms() {
  // Add clear form buttons to each form
  addClearFormButtons();

  // Basic Information Form
  const basicInfoForm = document.getElementById('basic-info-form');
  if (basicInfoForm) {
    basicInfoForm.addEventListener('submit', async e => {
      e.preventDefault();

      // Validate required fields
      const firstName = document.getElementById('first-name').value.trim();
      const lastName = document.getElementById('last-name').value.trim();

      if (!firstName || !lastName) {
        showToast('First name and last name are required', 'error');
        return;
      }

      await updateProfile('basic-info', {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: document.getElementById('date-of-birth').value || null,
        gender: document.getElementById('gender').value || null,
        bio: document.getElementById('bio').value.trim() || null,
      });
    });
  }

  // Contact Details Form
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();

      // Validate phone number format (Philippine format)
      const phone = document.getElementById('phone').value.trim();
      const altPhone = document.getElementById('alt-phone').value.trim();

      if (phone && !isValidPhoneNumber(phone)) {
        showToast('Please enter a valid Philippine phone number (+63 9XX XXX XXXX)', 'error');
        return;
      }

      if (altPhone && !isValidPhoneNumber(altPhone)) {
        showToast('Please enter a valid alternative phone number', 'error');
        return;
      }

      await updateProfile('contact', {
        phone: phone || null,
        alt_phone: altPhone || null,
        current_address: document.getElementById('current-address').value.trim() || null,
      });
    });
  }

  // Employment Information Form
  const employmentForm = document.getElementById('employment-form');
  if (employmentForm) {
    employmentForm.addEventListener('submit', async e => {
      e.preventDefault();
      await updateProfile('employment', {
        employment_status: document.getElementById('employment-status').value || null,
        company_name: document.getElementById('company-name').value.trim() || null,
        job_title: document.getElementById('job-title').value.trim() || null,
        monthly_income: document.getElementById('monthly-income').value || null,
        work_schedule: document.getElementById('work-schedule').value || null,
        company_address: document.getElementById('company-address').value.trim() || null,
      });
    });
  }

  // Emergency Contact Form
  const emergencyForm = document.getElementById('emergency-contact-form');
  if (emergencyForm) {
    emergencyForm.addEventListener('submit', async e => {
      e.preventDefault();

      // Validate required emergency contact fields
      const emergencyName = document.getElementById('emergency-name').value.trim();
      const emergencyRelationship = document.getElementById('emergency-relationship').value;
      const emergencyPhone = document.getElementById('emergency-phone').value.trim();

      if (emergencyName || emergencyRelationship || emergencyPhone) {
        // If any emergency contact field is filled, require all essential fields
        if (!emergencyName) {
          showToast('Emergency contact name is required', 'error');
          return;
        }
        if (!emergencyRelationship) {
          showToast('Emergency contact relationship is required', 'error');
          return;
        }
        if (!emergencyPhone) {
          showToast('Emergency contact phone is required', 'error');
          return;
        }
        if (!isValidPhoneNumber(emergencyPhone)) {
          showToast('Please enter a valid emergency contact phone number', 'error');
          return;
        }
      }

      const altEmergencyPhone = document.getElementById('emergency-alt-phone').value.trim();
      if (altEmergencyPhone && !isValidPhoneNumber(altEmergencyPhone)) {
        showToast('Please enter a valid alternative emergency contact phone number', 'error');
        return;
      }

      await updateProfile('emergency', {
        emergency_contact_name: emergencyName || null,
        emergency_contact_relationship: emergencyRelationship || null,
        emergency_contact_phone: emergencyPhone || null,
        emergency_contact_alt_phone: altEmergencyPhone || null,
        emergency_contact_address:
          document.getElementById('emergency-address').value.trim() || null,
      });
    });
  }
}

/**
 * Add clear form buttons to each form
 */
function addClearFormButtons() {
  const forms = [
    { id: 'basic-info-form', name: 'Basic Information' },
    { id: 'contact-form', name: 'Contact Details' },
    { id: 'employment-form', name: 'Employment Information' },
    { id: 'emergency-contact-form', name: 'Emergency Contact' },
  ];

  forms.forEach(formInfo => {
    const form = document.getElementById(formInfo.id);
    if (form) {
      const formActions = form.querySelector('.form-actions');
      if (formActions) {
        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'btn btn-outline';
        clearButton.textContent = `Clear ${formInfo.name}`;
        clearButton.addEventListener('click', () => clearForm(formInfo.id));

        // Insert before the save button
        formActions.insertBefore(clearButton, formActions.firstChild);
      }
    }
  });
}

/**
 * Clear form fields
 */
function clearForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    // Clear all input and textarea fields
    const inputs = form.querySelectorAll('input:not([type="file"]), textarea, select');
    inputs.forEach(input => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.checked = false;
      } else {
        input.value = '';
      }
    });

    showToast('Form cleared', 'info');
  }
}

/**
 * Validate Philippine phone number format
 */
function isValidPhoneNumber(phone) {
  // Philippine phone number patterns
  const patterns = [
    /^\+63\s?9\d{2}\s?\d{3}\s?\d{4}$/, // +63 9XX XXX XXXX
    /^09\d{2}\s?\d{3}\s?\d{4}$/, // 09XX XXX XXXX
    /^9\d{9}$/, // 9XXXXXXXXX
  ];

  return patterns.some(pattern => pattern.test(phone.replace(/\s/g, '')));
}

/**
 * Update user profile via API
 */
async function updateProfile(section, data) {
  try {
    const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();

      // Update localStorage with new user data
      const currentState = getState();
      setState({
        user: { ...currentState.user, ...result.user },
      });

      // Trigger UI updates across the app
      window.dispatchEvent(
        new CustomEvent('userProfileUpdated', {
          detail: result.user,
        })
      );

      showToast(`${getSectionName(section)} updated successfully`, 'success');
    } else {
      const error = await response.json();
      showToast(error.error || 'Failed to update profile', 'error');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast('Failed to update profile. Please try again.', 'error');
  }
}

/**
 * Get human-readable section name
 */
function getSectionName(section) {
  const names = {
    'basic-info': 'Basic Information',
    contact: 'Contact Details',
    employment: 'Employment Information',
    emergency: 'Emergency Contact',
  };
  return names[section] || 'Profile';
}

/**
 * Initialize notification settings
 */
function initNotificationSettings() {
  const saveButton = document.getElementById('save-notifications');

  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      const toggles = document.querySelectorAll('.toggle-switch input');
      const preferences = {};

      toggles.forEach(toggle => {
        preferences[toggle.dataset.setting] = toggle.checked;
      });

      // TODO: Integrate with backend API
      // await fetch(`${CONFIG.API_BASE_URL}/api/notifications/preferences`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(preferences),
      // });

      showToast('Notification preferences saved', 'success');
    });
  }
}

/**
 * Initialize password form
 */
function initPasswordForm() {
  const passwordForm = document.getElementById('password-form');

  if (passwordForm) {
    passwordForm.addEventListener('submit', async e => {
      e.preventDefault();

      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      // Validate passwords
      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
      }

      if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
      }

      // TODO: Integrate with backend API
      // await fetch(`${CONFIG.API_BASE_URL}/api/auth/change-password`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ currentPassword, newPassword }),
      // });

      showToast('Password updated successfully', 'success');
      passwordForm.reset();
    });
  }

  const enable2faBtn = document.getElementById('enable-2fa');
  if (enable2faBtn) {
    enable2faBtn.addEventListener('click', () => {
      // TODO: Implement 2FA setup flow
      showToast('2FA setup coming soon', 'info');
    });
  }
}

/**
 * Initialize avatar upload
 */
function initAvatarUpload() {
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('profile-avatar-preview');

  if (changeAvatarBtn && avatarInput && avatarPreview) {
    changeAvatarBtn.addEventListener('click', () => {
      avatarInput.click();
    });

    avatarInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
          showToast('Image must be less than 2MB', 'error');
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          showToast('Please select a valid image file', 'error');
          return;
        }

        // Preview the image
        const reader = new FileReader();
        reader.onload = e => {
          avatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Upload to backend
        try {
          const formData = new FormData();
          formData.append('avatar', file);

          const response = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/users/avatar`, {
            method: 'POST',
            body: formData,
            headers: {}, // Don't set Content-Type for FormData
          });

          if (response.ok) {
            const result = await response.json();

            // Update localStorage with new avatar URL
            const currentState = getState();
            setState({
              user: { ...currentState.user, avatar_url: result.avatar_url },
            });

            // Trigger UI updates across the app
            window.dispatchEvent(
              new CustomEvent('userProfileUpdated', {
                detail: { avatar_url: result.avatar_url },
              })
            );

            showToast('Profile picture updated successfully', 'success');
          } else {
            const error = await response.json();
            showToast(error.error || 'Failed to upload image', 'error');
          }
        } catch (error) {
          console.error('Error uploading avatar:', error);
          showToast('Failed to upload image. Please try again.', 'error');
        }
      }
    });
  }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type: success, error, warning, info
 */
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add styles if not already present
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .toast-success { background-color: #4a7c23; }
      .toast-error { background-color: #dc3545; }
      .toast-warning { background-color: #f59e0b; }
      .toast-info { background-color: #3b82f6; }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // Add to DOM
  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
