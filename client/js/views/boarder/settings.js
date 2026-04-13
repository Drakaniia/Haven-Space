/**
 * Boarder Settings Page Logic
 */

/**
 * Initialize settings page
 */
export function initSettingsPage() {
  initSettingsTabs();
  initProfileForm();
  initNotificationSettings();
  initPasswordForm();
  initAvatarUpload();
}

document.addEventListener('DOMContentLoaded', () => {
  // Only run if we're on the settings page
  if (window.location.pathname.includes('settings')) {
    initSettingsPage();
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

      // TODO: Integrate with backend API
      // await fetch(`${CONFIG.API_BASE_URL}/api/profile/update`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     firstName: document.getElementById('first-name').value,
      //     lastName: document.getElementById('last-name').value,
      //     phone: document.getElementById('phone').value,
      //   }),
      // });

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

        // TODO: Upload to backend
        // const formData = new FormData();
        // formData.append('avatar', file);
        // await fetch(`${CONFIG.API_BASE_URL}/api/profile/avatar`, {
        //   method: 'POST',
        //   body: formData,
        // });
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
