import CONFIG from '../config.js';
import { getIcon } from '../shared/icons.js';
import { getBoarderRedirectPath, updateBoarderStatus } from '../shared/routing.js';

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
 * Inject icons from centralized library into elements with data-icon attributes
 * Replaces inline SVGs with centralized icon library calls
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

document.addEventListener('DOMContentLoaded', function () {
  const passwordToggle = document.getElementById('passwordToggle');
  const passwordInput = document.getElementById('password');
  const eyeOpen = passwordToggle.querySelector('.eye-open');
  const eyeClosed = passwordToggle.querySelector('.eye-closed');
  const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const confirmEyeOpen = confirmPasswordToggle.querySelector('.eye-open');
  const confirmEyeClosed = confirmPasswordToggle.querySelector('.eye-closed');
  const termsOverlay = document.getElementById('termsOverlay');
  const termsOverlayClose = termsOverlay?.querySelector('.terms-overlay-close');
  const termsOverlayOk = document.getElementById('termsOverlayOk');

  // Inject icons from centralized library
  injectIcons();

  // Terms overlay handlers
  function showTermsOverlay() {
    if (termsOverlay) {
      termsOverlay.classList.add('active');
    }
  }

  function hideTermsOverlay() {
    if (termsOverlay) {
      termsOverlay.classList.remove('active');
      // Focus the terms checkbox after closing
      const termsCheckbox = document.querySelector('#signupForm input[name="terms"]');
      if (termsCheckbox) {
        termsCheckbox.focus();
      }
    }
  }

  if (termsOverlayClose) {
    termsOverlayClose.addEventListener('click', hideTermsOverlay);
  }

  if (termsOverlayOk) {
    termsOverlayOk.addEventListener('click', hideTermsOverlay);
  }

  // Close overlay on backdrop click
  if (termsOverlay) {
    termsOverlay.addEventListener('click', function (e) {
      if (e.target === termsOverlay) {
        hideTermsOverlay();
      }
    });
  }

  // Check for pending Google OAuth signup
  const urlParams = new URLSearchParams(window.location.search);
  const oauthStatus = urlParams.get('oauth');
  const oauthPending = oauthStatus === 'pending';
  const oauthNew = oauthStatus === 'new';

  if (oauthPending || oauthNew) {
    // Fetch pending user data from session
    fetch(`${CONFIG.API_BASE_URL}/auth/google/get-pending-user.php`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(result => {
        if (!result.success || !result.data) {
          // No pending user data - user might already exist, redirect to login
          console.warn('No pending user data found, redirecting to login');
          window.location.href = 'login.html?error=Session%20expired.%20Please%20login%20again.';
          return;
        }

        const pendingUser = result.data;

        // Pre-fill form with Google OAuth data
        if (pendingUser.first_name) {
          document.getElementById('firstName').value = pendingUser.first_name;
        }
        if (pendingUser.last_name) {
          document.getElementById('lastName').value = pendingUser.last_name;
        }
        if (pendingUser.email) {
          document.getElementById('email').value = pendingUser.email;
          document.getElementById('email').readOnly = true; // Email from Google is verified
        }
      })
      .catch(err => {
        console.error('Error fetching pending user data:', err);
        window.location.href =
          'login.html?error=Error%20loading%20signup%20data.%20Please%20try%20again.';
      });
  }

  // Password visibility toggle
  passwordToggle.addEventListener('click', function () {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeOpen.classList.toggle('hidden');
    eyeClosed.classList.toggle('hidden');
  });

  // Confirm password visibility toggle
  confirmPasswordToggle.addEventListener('click', function () {
    const isPassword = confirmPasswordInput.type === 'password';
    confirmPasswordInput.type = isPassword ? 'text' : 'password';
    confirmEyeOpen.classList.toggle('hidden');
    confirmEyeClosed.classList.toggle('hidden');
  });

  // Google OAuth signup for boarders
  document.querySelectorAll('.social-btn-google').forEach(btn => {
    btn.addEventListener('click', async function () {
      // Redirect to Google OAuth authorize endpoint for boarder signup
      try {
        if (CONFIG.isProduction()) {
          // In production with Appwrite Functions, call the function execution endpoint
          const response = await fetch(`${CONFIG.API_BASE_URL}/functions/api-function/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              path: '/auth/google/authorize.php',
              action: 'signup',
              role: 'boarder',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.redirect_url) {
              window.location.href = data.redirect_url;
              return;
            }
          }
          // Fallback to direct URL if function call fails
          throw new Error('Function call failed');
        }

        // For local development, use direct URL
        const authUrl = `${CONFIG.API_BASE_URL}/auth/google/authorize.php?action=signup&role=boarder`;
        window.location.href = authUrl;
      } catch (error) {
        console.error('Google OAuth error:', error);
        alert('Failed to initiate Google signup. Please try again.');
      }
    });
  });

  // Apple signup button (placeholder for future implementation)
  document.querySelector('.social-btn-apple')?.addEventListener('click', function () {
    // TODO: Implement Apple OAuth
    alert('Apple signup to be implemented');
  });

  // Form submission
  document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Validate terms checkbox
    const termsCheckbox = e.target.terms;
    if (!termsCheckbox.checked) {
      showTermsOverlay();
      return;
    }

    // Validate password confirmation
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please try again.', 'error');
      e.target.confirmPassword.focus();
      return;
    }

    // Check if this is a Google OAuth pending user completing signup
    if (oauthPending) {
      // Complete Google OAuth signup for boarder
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/google/finalize-signup.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'boarder',
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Store user info and token
          localStorage.setItem('user', JSON.stringify(result.user));
          if (result.access_token) {
            localStorage.setItem('token', result.access_token);
          }

          // New boarder via Google OAuth — route based on status
          updateBoarderStatus(result.user.boarder_status || 'new');
          const redirectPath = getBoarderRedirectPath(result.user);
          window.location.href = redirectPath;
        } else {
          showToast(result.error || 'Signup failed', 'error');
        }
      } catch (error) {
        console.error('Error during Google OAuth signup:', error);
        showToast('An error occurred. Please try again.', 'error');
      }
      return;
    }

    // Regular email/password signup for boarders
    const formData = new FormData(this);
    const data = {
      role: 'boarder',
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      password: formData.get('password'),
      terms: formData.get('terms') === 'on',
    };

    // Disable submit button and show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    try {
      // Make direct HTTP request to registration endpoint
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store user info and token
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.access_token) {
          localStorage.setItem('token', result.access_token);
        }

        // New boarder has no application yet — route to find-a-room
        updateBoarderStatus('new');
        const redirectPath = getBoarderRedirectPath(result.user);
        window.location.href = redirectPath;
      } else {
        // Handle specific error cases
        let errorMessage = result.error || result.message || 'Registration failed';

        if (response.status === 409) {
          if (errorMessage.includes('Email already exists') || errorMessage.includes('email')) {
            errorMessage =
              'This email address is already registered. Please use a different email or try logging in instead.';

            // Focus the email field
            const emailField = document.getElementById('email');
            if (emailField) {
              emailField.focus();
              emailField.style.borderColor = '#ef4444';
              setTimeout(() => {
                emailField.style.borderColor = '';
              }, 3000);
            }
          }
        }

        showToast(errorMessage, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Registration error:', error);
      showToast('An error occurred. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
});
