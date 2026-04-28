/**
 * Landlord Settings Page Logic
 */

import { getDisplayName, getAvatarUrl, fetchAndUpdateProfile } from '../../shared/profile-utils.js';
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
  loadAndDisplayProfile();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('settings')) {
    initLandlordSettings();
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAuthHeaders(json = true) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function initSettingsTabs() {
  const tabs = document.querySelectorAll('.settings-tab');
  const panels = document.querySelectorAll('.settings-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(`${tabName}-panel`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ─── Profile ─────────────────────────────────────────────────────────────────

async function loadAndDisplayProfile() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    populateProfileForm(currentUser);
    updateAvatarPreview(currentUser);

    const updatedUser = await fetchAndUpdateProfile(CONFIG.API_BASE_URL);
    if (updatedUser) {
      populateProfileForm(updatedUser);
      updateAvatarPreview(updatedUser);
    }
  } catch (error) {
    console.error('Error loading profile data:', error);
  }
}

function populateProfileForm(user) {
  if (!user) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== null) el.value = val;
  };
  set('first-name', user.first_name);
  set('last-name', user.last_name);
  set('email', user.email);
  set('phone', user.phone_number);
}

function updateAvatarPreview(user) {
  const avatarPreview = document.getElementById('profile-avatar-preview');
  if (avatarPreview && user) {
    avatarPreview.src = getAvatarUrl(user);
    avatarPreview.alt = `${getDisplayName(user)} Avatar`;
  }
}

function initProfileForm() {
  const profileForm = document.getElementById('profile-form');
  if (!profileForm) return;

  profileForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = profileForm.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const body = {
      first_name: document.getElementById('first-name')?.value?.trim(),
      last_name: document.getElementById('last-name')?.value?.trim(),
      phone_number: document.getElementById('phone')?.value?.trim(),
    };

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        // Update localStorage with fresh data
        const existing = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...existing, ...data.user }));
        showToast('Profile updated successfully', 'success');
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      showToast('Failed to update profile', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function initAvatarUpload() {
  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('profile-avatar-preview');

  if (!changeAvatarBtn || !avatarInput || !avatarPreview) return;

  changeAvatarBtn.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    // Preview immediately
    const reader = new FileReader();
    reader.onload = ev => {
      avatarPreview.src = ev.target.result;
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${CONFIG.API_BASE_URL}/api/users/avatar`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        // Update localStorage
        const existing = JSON.parse(localStorage.getItem('user') || '{}');
        existing.avatar_url = data.avatar_url;
        localStorage.setItem('user', JSON.stringify(existing));
        showToast('Profile photo updated', 'success');
      } else {
        showToast(data.error || 'Failed to upload photo', 'error');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast('Failed to upload photo', 'error');
    }
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

function initNotificationSettings() {
  // Load saved preferences from localStorage
  const saved = JSON.parse(localStorage.getItem('notification_preferences') || '{}');
  const toggles = document.querySelectorAll('.toggle-switch input[data-setting]');
  toggles.forEach(toggle => {
    const key = toggle.dataset.setting;
    if (key in saved) toggle.checked = saved[key];
  });

  const saveButton = document.getElementById('save-notifications');
  if (!saveButton) return;

  saveButton.addEventListener('click', () => {
    const preferences = {};
    toggles.forEach(toggle => {
      preferences[toggle.dataset.setting] = toggle.checked;
    });
    localStorage.setItem('notification_preferences', JSON.stringify(preferences));
    showToast('Notification preferences saved', 'success');
  });
}

// ─── Password ─────────────────────────────────────────────────────────────────

function initPasswordForm() {
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = passwordForm.querySelector('[type="submit"]');

      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
      }
      if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/change-password`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast('Password updated successfully', 'success');
          passwordForm.reset();
        } else {
          showToast(data.error || 'Failed to update password', 'error');
        }
      } catch (err) {
        console.error('Password change error:', err);
        showToast('Failed to update password', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  const enable2faBtn = document.getElementById('enable-2fa');
  if (enable2faBtn) {
    enable2faBtn.addEventListener('click', () => {
      showToast('2FA setup coming soon', 'info');
    });
  }
}

// ─── Welcome Message ──────────────────────────────────────────────────────────

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

  loadWelcomeSettings();

  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });
  }

  if (selectFileBtn && fileInput) {
    selectFileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        showToast('File must be less than 10MB', 'error');
        fileInput.value = '';
        return;
      }

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
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (filePreview) filePreview.style.display = 'none';
    });
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const message = textarea?.value || '';
      const previewMessage = replaceVariables(message);
      showToast(
        'Preview: ' + previewMessage.substring(0, 100) + (previewMessage.length > 100 ? '...' : ''),
        'info'
      );
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

  function replaceVariables(message) {
    return message
      .replace(/{boarder_name}/g, 'John')
      .replace(/{house_name}/g, 'Sample Boarding House')
      .replace(/{move_in_date}/g, new Date().toLocaleDateString())
      .replace(/{room_number}/g, 'TBD');
  }
}

async function loadWelcomeSettings() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/welcome-settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) return;

    const data = await res.json();
    const textarea = document.getElementById('welcome-message-textarea');
    const charCount = document.getElementById('char-count');
    const filePreview = document.getElementById('file-preview');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileSizeDisplay = document.getElementById('file-size-display');

    if (data.data && textarea) {
      textarea.value = data.data.welcome_message || '';
      if (charCount) charCount.textContent = textarea.value.length;

      if (data.data.house_rules_file_name && filePreview && fileNameDisplay && fileSizeDisplay) {
        fileNameDisplay.textContent = data.data.house_rules_file_name;
        fileSizeDisplay.textContent = formatFileSize(data.data.house_rules_file_size || 0);
        filePreview.style.display = 'flex';
      }
    }
  } catch (error) {
    console.error('Failed to load welcome settings:', error);
  }
}

async function saveWelcomeSettings(message, file) {
  try {
    const formData = new FormData();
    formData.append('welcome_message', message);
    if (file) formData.append('house_rules_file', file);

    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/welcome-settings`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Welcome message saved successfully', 'success');
    } else {
      showToast(data.error || 'Failed to save settings', 'error');
    }
  } catch (error) {
    console.error('Failed to save welcome settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

// ─── Documents ────────────────────────────────────────────────────────────────

function initDocumentUpload() {
  const uploadBtn = document.getElementById('upload-document-btn');
  const modal = document.getElementById('upload-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const submitBtn = document.getElementById('upload-submit-btn');
  const form = document.getElementById('upload-form');

  const openModal = () => {
    if (modal) modal.style.display = 'flex';
  };
  const closeModal = () => {
    if (modal) modal.style.display = 'none';
    form?.reset();
  };

  uploadBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  submitBtn?.addEventListener('click', async e => {
    e.preventDefault();

    const category = document.getElementById('document-category')?.value;
    const fileInput = document.getElementById('document-file');
    const file = fileInput?.files[0];
    const autoSend = document.getElementById('auto-send-toggle')?.checked;

    if (!file) {
      showToast('Please select a file to upload', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File must be less than 10MB', 'error');
      return;
    }
    if (file.type !== 'application/pdf') {
      showToast('Only PDF files are allowed', 'error');
      return;
    }

    submitBtn.disabled = true;

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('category', category);
      formData.append('auto_send', autoSend ? 'true' : 'false');

      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/documents`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Document uploaded successfully', 'success');
        closeModal();
        loadDocuments();
      } else {
        showToast(data.error || 'Failed to upload document', 'error');
      }
    } catch (err) {
      console.error('Document upload error:', err);
      showToast('Failed to upload document', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  loadDocuments();
}

async function loadDocuments() {
  const container = document.getElementById('landlord-documents-list');
  if (!container) return;

  container.innerHTML = '<div class="loading-state">Loading documents...</div>';

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/documents`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = '<div class="empty-state">Failed to load documents.</div>';
      return;
    }

    const documents = data.data || [];

    if (documents.length === 0) {
      container.innerHTML = '<div class="empty-state">No documents uploaded yet.</div>';
      setupCategoryFilters();
      return;
    }

    renderDocuments(container, documents);
    setupCategoryFilters();
  } catch (err) {
    console.error('Load documents error:', err);
    container.innerHTML = '<div class="empty-state">Failed to load documents.</div>';
  }
}

function renderDocuments(container, documents) {
  container.innerHTML = documents
    .map(doc => {
      const uploadedAt = doc.created_at
        ? new Date(doc.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Unknown date';
      const category = doc.category || doc.document_type || 'Custom';
      const autoSend = doc.auto_send_to_new_boarders || doc.auto_send || false;

      return `
    <div class="document-item" data-category="${category}" data-id="${doc.id}">
      <div class="document-item-left">
        <div class="document-icon-box">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div class="document-info">
          <h4 class="document-title">${escapeHtml(doc.title || doc.file_name || 'Document')}</h4>
          <p class="document-meta">Uploaded on ${uploadedAt} • PDF${
        autoSend ? ' • Auto-sent to new boarders' : ''
      }</p>
        </div>
      </div>
      <div class="document-actions">
        <button class="btn btn-outline btn-sm document-delete-btn" data-id="${
          doc.id
        }" style="color: #dc3545; border-color: #dc3545;">
          Delete
        </button>
      </div>
    </div>`;
    })
    .join('');

  setupDocumentActions();
}

function setupCategoryFilters() {
  const categoryTabs = document.querySelectorAll('.category-tab');
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.document-item').forEach(item => {
        item.style.display =
          category === 'all' || item.dataset.category === category ? 'flex' : 'none';
      });
    });
  });
}

function setupDocumentActions() {
  document.querySelectorAll('.document-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const docId = btn.dataset.id;
      if (!confirm('Are you sure you want to delete this document?')) return;

      btn.disabled = true;
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/documents/${docId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          credentials: 'include',
        });

        const data = await res.json();
        if (res.ok) {
          btn.closest('.document-item')?.remove();
          showToast('Document deleted', 'success');
          const container = document.getElementById('landlord-documents-list');
          if (container && !container.querySelector('.document-item')) {
            container.innerHTML = '<div class="empty-state">No documents uploaded yet.</div>';
          }
        } else {
          showToast(data.error || 'Failed to delete document', 'error');
          btn.disabled = false;
        }
      } catch (err) {
        console.error('Delete document error:', err);
        showToast('Failed to delete document', 'error');
        btn.disabled = false;
      }
    });
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

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

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
