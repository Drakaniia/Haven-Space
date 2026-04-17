import CONFIG from '../config.js';
import { getIcon } from '../shared/icons.js';
import { getBoarderRedirectPath, updateBoarderStatus } from '../shared/routing.js';
import { showToast } from '../shared/toast.js';

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
  const eyeOpen = passwordToggle.querySelector('.eye-open');
  const eyeClosed = passwordToggle.querySelector('.eye-closed');
  const loginForm = document.getElementById('loginForm');

  // Inject icons from centralized library
  injectIcons();

  // Password visibility toggle
  passwordToggle.addEventListener('click', function () {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeOpen.classList.toggle('hidden');
    eyeClosed.classList.toggle('hidden');
  });

  // Form submission
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Store user info and token
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.access_token) {
          localStorage.setItem('token', result.access_token);
        }

        // Redirect based on role - detect Apache setup vs GitHub Pages
        const pathname = window.location.pathname;
        let basePath;

        if (pathname.includes('github.io')) {
          // GitHub Pages deployment
          basePath = '/Haven-Space/client/views/';
        } else {
          // Apache setup: document root points to client folder
          // OR local development with Apache
          basePath = '/views/';
        }

        if (result.user.role === 'admin') {
          window.location.href = `${basePath}admin/index.html`;
        } else if (result.user.role === 'landlord') {
          window.location.href = `${basePath}landlord/index.html`;
        } else {
          // Boarder: check status and redirect conditionally
          const boarderStatus = result.user.boarder_status || 'new';
          updateBoarderStatus(boarderStatus);

          const redirectPath = getBoarderRedirectPath(result.user);
          window.location.href = redirectPath;
        }
      } else {
        alert(result.error || 'Login failed');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  });

  // Google OAuth login
  document.querySelector('.social-btn-google')?.addEventListener('click', function () {
    // Redirect to Google OAuth authorize endpoint
    const authUrl = `${CONFIG.API_BASE_URL}/auth/google/authorize.php?action=login`;
    window.location.href = authUrl;
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
});
