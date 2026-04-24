/**
 * Landlord Settings Page Logic
 */

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
export function initLandlordSettings() {
  initSettingsTabs();
  initProfileForm();
  initNotificationSettings();
  initPasswordForm();
  initAvatarUpload();
  initWelcomeMessageEditor();
  initDocumentUpload();

  // Load and display current profile data
  loadAndDisplayProfile();
}

document.addEventListener('DOMContentLoaded', () => {
  // Only run if we're on the settings page
  if (window.location.pathname.includes('settings')) {
    initLandlordSettings();
  }
});

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
 * Initialize profile form
 */
function initProfileForm() {
  const profileForm = document.getElementById('profile-form');

  if (profileForm) {
    profileForm.addEventListener('submit', async e => {
      e.preventDefault();

      const formData = {
        firstName: document.getElementById('first-name').value,
        lastName: document.getElementById('last-name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        company: document.getElementById('company').value,
      };

      // TODO: Integrate with backend API
      showToast('Profile updated successfully', 'success');
    });
  }
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

      const _currentPassword = document.getElementById('current-password').value;
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
      showToast('Password updated successfully', 'success');
      passwordForm.reset();
    });
  }

  const enable2faBtn = document.getElementById('enable-2fa');
  if (enable2faBtn) {
    enable2faBtn.addEventListener('click', () => {
      showToast('2FA setup coming soon', 'info');
    });
  }
}

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

    avatarInput.addEventListener('change', e => {
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
      }
    });
  }
}

/**
 * Initialize welcome message editor
 */
function initWelcomeMessageEditor() {
  const textarea = document.getElementById('welcome-message-textarea');
  const charCount = document.getElementById('char-count');
  const previewBtn = document.getElementById('preview-message-btn');
  const saveBtn = document.getElementById('save-message-btn');
  const selectFileBtn = document.getElementById('select-file-btn');
  const fileInput = document.getElementById('house-rules-file');
  const filePreview = document.getElementById('file-preview');
  const fileNameDisplay = document.getElementById('file-name-display');
  const fileSizeDisplay = document.getElementById('file-size-display');
  const removeFileBtn = document.getElementById('remove-file-btn');

  let selectedFile = null;

  // Load existing welcome message and file
  loadWelcomeSettings();

  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });
  }

  // File selection
  if (selectFileBtn && fileInput) {
    selectFileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          showToast('File must be less than 10MB', 'error');
          fileInput.value = '';
          return;
        }

        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedTypes.includes(file.type)) {
          showToast('Only PDF, DOC, and DOCX files are allowed', 'error');
          fileInput.value = '';
          return;
        }

        selectedFile = file;
        displayFilePreview(file);
      }
    });
  }

  // Remove file
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      selectedFile = null;
      fileInput.value = '';
      filePreview.style.display = 'none';
    });
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const message = textarea?.value || '';
      const previewMessage = replaceVariables(message);
      showToast('Preview: ' + previewMessage.substring(0, 100) + '...', 'info');
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const message = textarea?.value || '';

      if (!message.trim()) {
        showToast('Please enter a welcome message', 'error');
        return;
      }

      await saveWelcomeSettings(message, selectedFile);
    });
  }

  function displayFilePreview(file) {
    if (fileNameDisplay && fileSizeDisplay && filePreview) {
      fileNameDisplay.textContent = file.name;
      fileSizeDisplay.textContent = formatFileSize(file.size);
      filePreview.style.display = 'flex';
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function replaceVariables(message) {
    return message
      .replace(/{boarder_name}/g, 'John')
      .replace(/{house_name}/g, 'Sample Boarding House')
      .replace(/{move_in_date}/g, new Date().toLocaleDateString())
      .replace(/{room_number}/g, 'TBD');
  }
}

/**
 * Load welcome settings from backend
 */
async function loadWelcomeSettings() {
  try {
    const response = await fetch('/api/landlord/welcome-settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      const textarea = document.getElementById('welcome-message-textarea');
      const charCount = document.getElementById('char-count');
      const filePreview = document.getElementById('file-preview');
      const fileNameDisplay = document.getElementById('file-name-display');
      const fileSizeDisplay = document.getElementById('file-size-display');

      if (data.data && textarea) {
        textarea.value = data.data.welcome_message || '';
        if (charCount) {
          charCount.textContent = textarea.value.length;
        }

        // Display existing file if present
        if (data.data.house_rules_file_name && filePreview && fileNameDisplay && fileSizeDisplay) {
          fileNameDisplay.textContent = data.data.house_rules_file_name;
          fileSizeDisplay.textContent = formatFileSize(data.data.house_rules_file_size || 0);
          filePreview.style.display = 'flex';
        }
      }
    }
  } catch (error) {
    console.error('Failed to load welcome settings:', error);
  }
}

/**
 * Save welcome settings to backend
 */
async function saveWelcomeSettings(message, file) {
  try {
    const formData = new FormData();
    formData.append('welcome_message', message);

    if (file) {
      formData.append('house_rules_file', file);
    }

    const response = await fetch('/api/landlord/welcome-settings', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (response.ok) {
      showToast('Welcome message and house rules saved successfully', 'success');
    } else {
      const error = await response.json();
      showToast(error.error || 'Failed to save settings', 'error');
    }
  } catch (error) {
    console.error('Failed to save welcome settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Initialize document upload
 */
function initDocumentUpload() {
  const uploadBtn = document.getElementById('upload-document-btn');
  const modal = document.getElementById('upload-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const submitBtn = document.getElementById('upload-submit-btn');
  const form = document.getElementById('upload-form');

  if (uploadBtn && modal) {
    // Open modal
    uploadBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      form?.reset();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      form?.reset();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async e => {
      e.preventDefault();

      const category = document.getElementById('document-category')?.value;
      const fileInput = document.getElementById('document-file');
      const file = fileInput?.files[0];
      const autoSend = document.getElementById('auto-send-toggle')?.checked;

      if (!file) {
        showToast('Please select a file to upload', 'error');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showToast('File must be less than 10MB', 'error');
        return;
      }

      // Validate file type
      if (file.type !== 'application/pdf') {
        showToast('Only PDF files are allowed', 'error');
        return;
      }

      // TODO: Integrate with backend API
      showToast('Document uploaded successfully', 'success');
      modal.style.display = 'none';
      form?.reset();
    });
  }

  // Close modal on outside click
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.style.display = 'none';
        form?.reset();
      }
    });
  }

  // Load documents
  loadDocuments();
}

/**
 * Load documents list
 */
function loadDocuments() {
  const container = document.getElementById('landlord-documents-list');
  if (!container) return;

  // TODO: Fetch from backend API
  // For now, show sample data
  const documents = [
    {
      id: 1,
      title: 'House Rules',
      category: 'House Rules',
      uploadedAt: 'Jan 15, 2025',
      autoSend: true,
    },
    {
      id: 2,
      title: 'Community Guidelines',
      category: 'Community Guidelines',
      uploadedAt: 'Jan 10, 2025',
      autoSend: true,
    },
    {
      id: 3,
      title: 'Emergency Contacts',
      category: 'Emergency Contacts',
      uploadedAt: 'Dec 20, 2024',
      autoSend: false,
    },
  ];

  renderDocuments(container, documents);

  // Setup category filters
  setupCategoryFilters();
}

/**
 * Render documents list
 */
function renderDocuments(container, documents) {
  container.innerHTML = documents
    .map(
      doc => `
    <div class="document-item" data-category="${doc.category}">
      <div class="document-item-left">
        <div class="document-icon-box">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div class="document-info">
          <h4 class="document-title">${doc.title}</h4>
          <p class="document-meta">Uploaded on ${doc.uploadedAt} • PDF ${
        doc.autoSend ? '• Auto-sent to new boarders' : ''
      }</p>
        </div>
      </div>
      <div class="document-actions">
        <button class="btn btn-outline btn-sm document-edit-btn" data-id="${doc.id}">
          Edit
        </button>
        <button class="btn btn-outline btn-sm document-delete-btn" data-id="${
          doc.id
        }" style="color: #dc3545; border-color: #dc3545;">
          Delete
        </button>
      </div>
    </div>
  `
    )
    .join('');

  // Add event listeners for edit and delete buttons
  setupDocumentActions();
}

/**
 * Setup category filters
 */
function setupCategoryFilters() {
  const categoryTabs = document.querySelectorAll('.category-tab');
  const documentItems = document.querySelectorAll('.document-item');

  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;

      // Update active tab
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Filter documents
      documentItems.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/**
 * Setup document actions (edit, delete)
 */
function setupDocumentActions() {
  const editBtns = document.querySelectorAll('.document-edit-btn');
  const deleteBtns = document.querySelectorAll('.document-delete-btn');

  editBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const docId = btn.dataset.id;
      showToast('Edit feature coming soon', 'info');
    });
  });

  deleteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const docId = btn.dataset.id;
      if (confirm('Are you sure you want to delete this document?')) {
        // TODO: Integrate with backend API
        btn.closest('.document-item')?.remove();
        showToast('Document deleted successfully', 'success');
      }
    });
  });
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
