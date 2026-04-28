import { getIcon } from '../shared/icons.js';
import { getBoarderRedirectPath, updateBoarderStatus } from '../shared/routing.js';
import { showToast } from '../shared/toast.js';
import CONFIG from '../config.js';

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

// Ensure DOM is ready and modules are loaded
function initializeLogin() {
  // Show logout toast if redirected from logout
  const logoutToastMsg = sessionStorage.getItem('logoutToast');
  if (logoutToastMsg) {
    const toastType = sessionStorage.getItem('logoutToastType') || 'success';
    sessionStorage.removeItem('logoutToast');
    sessionStorage.removeItem('logoutToastType');
    showToast(logoutToastMsg, toastType, 5000);
  }

  const passwordToggle = document.getElementById('passwordToggle');
  const passwordInput = document.getElementById('password');
  const eyeOpen = passwordToggle?.querySelector('.eye-open');
  const eyeClosed = passwordToggle?.querySelector('.eye-closed');
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');

  if (!loginForm) {
    console.error('Login form not found');
    return;
  }

  // Inject icons from centralized library
  injectIcons();

  // Password visibility toggle
  if (passwordToggle && passwordInput && eyeOpen && eyeClosed) {
    passwordToggle.addEventListener('click', function () {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      eyeOpen.classList.toggle('hidden');
      eyeClosed.classList.toggle('hidden');
    });
  }

  // Check email on blur to detect Google OAuth accounts
  if (emailInput) {
    emailInput.addEventListener('blur', async function () {
      const email = this.value.trim();
      if (!email || !email.includes('@')) return;

      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/check-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          const data = await response.json();
          handleEmailCheckResult(data);
        }
      } catch (error) {
        console.error('Email check error:', error);
        // Silently fail - don't disrupt user experience
      }
    });
  }

  // Form submission
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      // Make direct HTTP request to login endpoint
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed. Please check your credentials.');
      }

      const phpData = await response.json();
      const phpUser = phpData.user;
      const role = phpUser.role ?? 'boarder';

      // Build a user object compatible with the rest of the app
      const userRecord = {
        id: phpUser.id,
        first_name: phpUser.first_name || '',
        last_name: phpUser.last_name || '',
        name: [phpUser.first_name, phpUser.last_name].filter(Boolean).join(' ') || phpUser.email,
        email: phpUser.email,
        role,
        boarder_status: phpUser.boarder_status ?? 'new',
      };

      // Persist to localStorage so auth-check.js / routing.js keep working
      localStorage.setItem('user', JSON.stringify(userRecord));
      // Store the PHP JWT so auth-headers.js / me.php can authenticate
      localStorage.setItem('token', phpData.access_token);

      // Redirect based on role
      const pathname = window.location.pathname;
      const basePath = pathname.includes('github.io') ? '/Haven-Space/client/views/' : '/views/';

      if (role === 'admin') {
        window.location.href = `${basePath}admin/index.html`;
      } else if (role === 'landlord') {
        window.location.href = `${basePath}landlord/index.html`;
      } else {
        // Boarder: check status and redirect conditionally
        updateBoarderStatus(userRecord.boarder_status);
        const redirectPath = getBoarderRedirectPath(userRecord);
        window.location.href = redirectPath;
      }
    } catch (error) {
      const msg = error?.message ?? 'An error occurred. Please try again.';
      showToast(msg, 'error');
    }
  });

  // Mark that the module handler has been attached
  loginForm.setAttribute('data-module-handler-attached', 'true');

  // Google OAuth login
  document.querySelector('.social-btn-google')?.addEventListener('click', async function () {
    try {
      // Direct URL approach for both local and production
      const authUrl = `${CONFIG.API_BASE_URL}/auth/google/authorize.php?action=login`;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google OAuth error:', error);
      alert('Failed to initiate Google login. Please try again.');
    }
  });

  // Apple login button (placeholder for future implementation)
  document.querySelector('.social-btn-apple')?.addEventListener('click', function () {
    // TODO: Implement Apple OAuth
    alert('Apple login to be implemented');
  });

  // Check for OAuth error in URL
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  if (error) {
    alert('Login error: ' + decodeURIComponent(error));
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/**
 * Handle the result of email check and update UI accordingly
 */
function handleEmailCheckResult(data) {
  const passwordGroup = document.querySelector('.form-group:has(#password)');
  const socialLogin = document.querySelector('.social-login');
  const authDivider = document.querySelector('.auth-divider');

  if (!passwordGroup) return;

  // Remove any existing Google notice
  const existingNotice = document.querySelector('.google-account-notice');
  if (existingNotice) {
    existingNotice.remove();
  }

  if (data.exists && data.is_google_account) {
    // Hide password field and social buttons
    passwordGroup.style.display = 'none';
    if (socialLogin) socialLogin.style.display = 'none';
    if (authDivider) authDivider.style.display = 'none';

    // Create Google account notice
    const notice = document.createElement('div');
    notice.className = 'google-account-notice';
    notice.innerHTML = `
      <div class="google-notice-content">
        <p class="google-notice-text">This account was created with Google. Please sign in with Google.</p>
        <button type="button" class="auth-btn-primary google-signin-btn">
          <img src="../../../assets/svg/google-icon-logo.svg" alt="Google" style="width: 18px; height: 18px; margin-right: 8px;">
          Continue with Google
        </button>
        <button type="button" class="set-password-link">Set a password</button>
      </div>
    `;

    // Insert notice after email field
    const emailGroup = document.querySelector('.form-group:has(#email)');
    if (emailGroup) {
      emailGroup.insertAdjacentElement('afterend', notice);
    }

    // Add event listeners
    const googleSigninBtn = notice.querySelector('.google-signin-btn');
    const setPasswordBtn = notice.querySelector('.set-password-link');

    googleSigninBtn?.addEventListener('click', function () {
      const authUrl = `${CONFIG.API_BASE_URL}/auth/google/authorize.php?action=login`;
      window.location.href = authUrl;
    });

    setPasswordBtn?.addEventListener('click', function () {
      triggerPasswordReset();
    });
  } else {
    // Show normal login form
    passwordGroup.style.display = 'block';
    if (socialLogin) socialLogin.style.display = 'block';
    if (authDivider) authDivider.style.display = 'block';
  }
}

/**
 * Trigger password reset for Google account
 */
async function triggerPasswordReset() {
  const emailInput = document.getElementById('email');
  const email = emailInput?.value.trim();

  if (!email) {
    showToast('Please enter your email address', 'error');
    return;
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast('Password reset instructions sent to your email', 'success');
    } else {
      showToast(data.error || 'Failed to send password reset email', 'error');
    }
  } catch (error) {
    console.error('Password reset error:', error);
    showToast('Failed to send password reset email', 'error');
  }
}

// Initialize when DOM is ready and modules are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLogin);
} else {
  // DOM is already ready
  initializeLogin();
}
