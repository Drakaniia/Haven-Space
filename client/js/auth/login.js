import { getIcon } from '../shared/icons.js';
import { getBoarderRedirectPath, updateBoarderStatus } from '../shared/routing.js';
import { showToast } from '../shared/toast.js';
import { account } from '../appwrite.js';

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
      // Create Appwrite session
      await account.createEmailPasswordSession({ email: data.email, password: data.password });

      // Fetch the authenticated user (includes labels for role)
      const user = await account.get();

      // Role is stored as the first label on the Appwrite user
      // e.g. labels: ['boarder'] | ['landlord'] | ['admin']
      const role = user.labels?.[0] ?? 'boarder';

      // Build a user object compatible with the rest of the app
      const userRecord = {
        id: user.$id,
        name: user.name,
        email: user.email,
        role,
        boarder_status: user.prefs?.boarder_status ?? 'new',
      };

      // Persist to localStorage so auth-check.js / routing.js keep working
      localStorage.setItem('user', JSON.stringify(userRecord));
      // Store the Appwrite session JWT so auth-headers.js can attach it
      const session = await account.getSession({ sessionId: 'current' });
      localStorage.setItem('token', session.providerAccessToken || session.$id);

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

  // Google OAuth login
  document.querySelector('.social-btn-google')?.addEventListener('click', function () {
    // Determine base path dynamically based on current URL structure
    const isAppwriteHosted = window.location.hostname.includes('appwrite.network');
    const successPath = isAppwriteHosted
      ? window.location.origin + '/boarder/index.html'
      : window.location.origin + '/views/boarder/index.html';
    account.createOAuth2Session({
      provider: 'google',
      success: successPath,
      failure: window.location.href,
    });
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
