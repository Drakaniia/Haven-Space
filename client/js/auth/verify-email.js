import { getIcon } from '../shared/icons.js';
import AIService from '../services/AIService.js';

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'error', 'success', 'warning'
 */
function showToast(message, type = 'error') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const iconMap = {
    error: 'exclamationCircle',
    success: 'checkCircle',
    warning: 'exclamationTriangle',
  };

  toast.innerHTML = `
    <div class="toast-icon">
      ${getIcon(iconMap[type] || 'exclamationCircle', { width: 20, height: 20, strokeWidth: '2' })}
    </div>
    <div class="toast-content">${message}</div>
    <button class="toast-close" aria-label="Close notification">
      ${getIcon('xMark', { width: 16, height: 16, strokeWidth: '2' })}
    </button>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto remove after 5 seconds
  const autoRemoveTimeout = setTimeout(() => {
    removeToast(toast);
  }, 5000);

  // Close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(autoRemoveTimeout);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.classList.remove('toast-visible');
  setTimeout(() => {
    toast.remove();
  }, 300);
}

/**
 * Inject icons from centralized library
 */
function injectIcons() {
  const iconElements = document.querySelectorAll('[data-icon]');
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
}

/**
 * Show specific verification state
 * @param {string} stateId - ID of the state to show
 */
function showState(stateId) {
  // Hide all states
  document.querySelectorAll('.verification-state').forEach(state => {
    state.classList.add('hidden');
  });

  // Show target state
  const targetState = document.getElementById(stateId);
  if (targetState) {
    targetState.classList.remove('hidden');
  }
}

/**
 * Verify email with token from URL
 * @param {string} token - Verification token
 * @param {string} email - Email address
 */
async function verifyEmail(token, email) {
  try {
    const result = await AIService.executeFunction('/auth/verify-email.php', 'POST', {
      token: token,
      email: email,
    });

    if (result.success) {
      // Show success state
      document.getElementById('successMessage').textContent = result.message;

      // Show next steps if provided
      if (result.nextSteps && result.nextSteps.length > 0) {
        const nextStepsContainer = document.getElementById('nextStepsContainer');
        const nextStepsList = document.getElementById('nextStepsList');

        nextStepsList.innerHTML = result.nextSteps.map(step => `<li>${step}</li>`).join('');

        nextStepsContainer.classList.remove('hidden');
      }

      if (result.alreadyVerified) {
        showState('alreadyVerifiedState');
      } else {
        showState('successState');
      }
    } else {
      // Show error state
      document.getElementById('errorMessage').textContent = result.error || 'Verification failed';
      showState('errorState');
    }
  } catch (error) {
    console.error('Verification error:', error);
    document.getElementById('errorMessage').textContent = 'Network error. Please try again.';
    showState('errorState');
  }
}

/**
 * Resend verification email
 * @param {string} email - Email address
 */
async function resendVerificationEmail(email) {
  const submitBtn = document.querySelector('#resendEmailForm button[type="submit"]');
  const originalText = submitBtn.textContent;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const result = await AIService.executeFunction('/auth/resend-verification.php', 'POST', {
      email: email,
    });

    if (result.success) {
      if (result.alreadyVerified) {
        showToast('Email is already verified. You can log in now.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } else {
        showToast('Verification email sent successfully! Please check your inbox.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 3000);
      }
    } else {
      showToast(result.error || 'Failed to send verification email', 'error');
    }
  } catch (error) {
    console.error('Resend error:', error);
    showToast('Network error. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Inject icons
  injectIcons();

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email');

  // If we have token and email, attempt verification
  if (token && email) {
    verifyEmail(token, email);
  } else {
    // No token/email provided, show resend form
    showState('resendForm');
  }

  // Handle resend button click from error state
  document.getElementById('resendBtn').addEventListener('click', () => {
    showState('resendForm');

    // Pre-fill email if available from URL
    if (email) {
      document.getElementById('email').value = email;
    }
  });

  // Handle resend form submission
  document.getElementById('resendEmailForm').addEventListener('submit', async e => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const emailValue = formData.get('email');

    if (!emailValue) {
      showToast('Please enter your email address', 'error');
      return;
    }

    await resendVerificationEmail(emailValue);
  });
});
