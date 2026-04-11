import CONFIG from '../config.js';

document.addEventListener('DOMContentLoaded', function () {
  const passwordToggle = document.getElementById('passwordToggle');
  const passwordInput = document.getElementById('password');
  const eyeOpen = passwordToggle.querySelector('.eye-open');
  const eyeClosed = passwordToggle.querySelector('.eye-closed');
  const loginForm = document.getElementById('loginForm');

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
        // Store user info (token is now in httpOnly cookie)
        localStorage.setItem('user', JSON.stringify(result.user));

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

        if (result.user.role === 'landlord') {
          window.location.href = `${basePath}landlord/index.html`;
        } else {
          window.location.href = `${basePath}boarder/index.html`;
        }
      } else {
        alert(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Error during login:', error);
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
    console.log('Apple login clicked');
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
