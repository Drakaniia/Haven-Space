import CONFIG from '../config.js';
import { getIcon } from '../shared/icons.js';
import { getBasePath, getBoarderRedirectPath, updateBoarderStatus } from '../shared/routing.js';

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
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const continueBtn = document.getElementById('continueBtn');
  const headerLinkContainer = document.getElementById('headerLinkContainer');
  const headerLinkText = document.getElementById('headerLinkText');
  const headerRoleLink = document.getElementById('headerRoleLink');
  const roleTitleText = document.getElementById('roleTitleText');
  const step2Title = document.getElementById('step2Title');
  const emailLabel = document.getElementById('emailLabel');
  const roleCards = document.querySelectorAll('.role-card');
  const passwordToggle = document.getElementById('passwordToggle');
  const passwordInput = document.getElementById('password');
  const eyeOpen = passwordToggle.querySelector('.eye-open');
  const eyeClosed = passwordToggle.querySelector('.eye-closed');
  const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const confirmEyeOpen = confirmPasswordToggle.querySelector('.eye-open');
  const confirmEyeClosed = confirmPasswordToggle.querySelector('.eye-closed');

  let selectedRole = null;

  // Inject icons from centralized library
  injectIcons();

  // Check for pending Google OAuth signup
  const urlParams = new URLSearchParams(window.location.search);
  const oauthStatus = urlParams.get('oauth');
  const oauthPending = oauthStatus === 'pending';
  const oauthNew = oauthStatus === 'new';

  if (oauthPending || oauthNew) {
    // Fetch pending user data from session
    fetch(`${CONFIG.API_BASE_URL}/auth/google/get-pending-user.php`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(result => {
        if (!result.success || !result.data) {
          // No pending user data - user might already exist, redirect to login
          console.warn('No pending user data found, redirecting to login');
          window.location.href = 'login.html?error=Session%20expired.%20Please%20login%20again.';
          return;
        }

        const pendingUser = result.data;

        if (oauthPending) {
          // User is coming from Google OAuth signup (with role), skip to step 2
          step1.classList.add('hidden');
          step2.classList.remove('hidden');
          headerLinkContainer.classList.remove('hidden');
        } else if (oauthNew) {
          // User is coming from Google OAuth login (no account), show step 1 for role selection
          // Keep step 1 visible, hide step 2
          step1.classList.remove('hidden');
          step2.classList.add('hidden');
          headerLinkContainer.classList.add('hidden');
        }

        // Pre-fill form if on step 2
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

  // Role selection - handle both card click and radio change
  roleCards.forEach(card => {
    const input = card.querySelector('input[type="radio"]');

    // Listen for radio button change (works for native label clicking)
    input.addEventListener('change', function () {
      if (this.checked) {
        selectedRole = this.value;

        // Update visual state
        roleCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Enable continue button
        continueBtn.disabled = false;

        // Update button text based on role
        if (selectedRole === 'landlord') {
          continueBtn.textContent = 'Join as a Landlord';
        } else {
          continueBtn.textContent = 'Apply as a Boarder';
        }
      }
    });

    // Also handle card click for better UX
    card.addEventListener('click', function (e) {
      // Prevent double-triggering if clicking directly on radio
      if (e.target !== input) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // Continue to step 2 or redirect for landlords
  continueBtn.addEventListener('click', function () {
    if (selectedRole) {
      // Redirect landlords to multi-step signup flow
      if (selectedRole === 'landlord') {
        window.location.href = 'signup-landlord.html';
        return;
      }

      // Boarders continue to step 2 (original flow)
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      headerLinkContainer.classList.remove('hidden');

      // Check if this is an OAuth user to pre-fill form
      const isOAuthUser = oauthPending || oauthNew;

      // Update title and header link based on role
      if (selectedRole === 'landlord') {
        roleTitleText.textContent = 'great boarders';
        step2Title.innerHTML = 'Sign up to find <span id="roleTitleText">great boarders</span>';
        headerLinkText.textContent = 'Here to find a room? ';
        headerRoleLink.textContent = 'Join as a Boarder';
        emailLabel.textContent = 'Work email';
        headerRoleLink.onclick = function (e) {
          e.preventDefault();
          switchRole('boarder');
        };
      } else {
        roleTitleText.textContent = 'your perfect room';
        step2Title.innerHTML = 'Sign up to find <span id="roleTitleText">your perfect room</span>';
        headerLinkText.textContent = 'Here to list your property? ';
        headerRoleLink.textContent = 'Apply as a Landlord';
        emailLabel.textContent = 'Email';
        headerRoleLink.onclick = function (e) {
          e.preventDefault();
          switchRole('landlord');
        };
      }

      // If OAuth user, fetch and pre-fill data after showing step 2
      if (isOAuthUser) {
        fetch(`${CONFIG.API_BASE_URL}/auth/google/get-pending-user.php`, {
          credentials: 'include',
        })
          .then(res => res.json())
          .then(result => {
            if (result.success && result.data) {
              const pendingUser = result.data;
              if (pendingUser.first_name) {
                document.getElementById('firstName').value = pendingUser.first_name;
              }
              if (pendingUser.last_name) {
                document.getElementById('lastName').value = pendingUser.last_name;
              }
              if (pendingUser.email) {
                document.getElementById('email').value = pendingUser.email;
                document.getElementById('email').readOnly = true;
              }
            }
          })
          .catch(err => {
            console.error('Error fetching pending user data:', err);
          });
      }
    }
  });

  // Function to switch role and reload form
  function switchRole(newRole) {
    selectedRole = newRole;

    // Update role cards visual state
    roleCards.forEach(card => {
      card.classList.remove('selected');
      const input = card.querySelector('input[type="radio"]');
      if (input.value === newRole) {
        card.classList.add('selected');
        input.checked = true;
      }
    });

    // Update header link and title
    if (selectedRole === 'landlord') {
      roleTitleText.textContent = 'great boarders';
      step2Title.innerHTML = 'Sign up to find <span id="roleTitleText">great boarders</span>';
      headerLinkText.textContent = 'Here to find a room? ';
      headerRoleLink.textContent = 'Join as a Boarder';
      emailLabel.textContent = 'Work email';
      headerRoleLink.onclick = function (e) {
        e.preventDefault();
        switchRole('boarder');
      };
      continueBtn.textContent = 'Join as a Landlord';
    } else {
      roleTitleText.textContent = 'your perfect room';
      step2Title.innerHTML = 'Sign up to find <span id="roleTitleText">your perfect room</span>';
      headerLinkText.textContent = 'Here to list your property? ';
      headerRoleLink.textContent = 'Apply as a Landlord';
      emailLabel.textContent = 'Email';
      headerRoleLink.onclick = function (e) {
        e.preventDefault();
        switchRole('landlord');
      };
      continueBtn.textContent = 'Apply as a Boarder';
    }
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

  // Google OAuth signup - works from step 1 or step 2
  document.querySelectorAll('.social-btn-google').forEach(btn => {
    btn.addEventListener('click', function () {
      // If on step 1 and no role selected, prompt user
      if (!step1.classList.contains('hidden') && !selectedRole) {
        alert('Please select your role first (Boarder or Landlord)');
        return;
      }

      // If user selected role on step 1, include it in the OAuth flow
      const roleForOAuth = selectedRole || '';

      // Redirect to Google OAuth authorize endpoint with role preference
      const authUrl = `${CONFIG.API_BASE_URL}/auth/google/authorize.php?action=signup&role=${roleForOAuth}`;
      window.location.href = authUrl;
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
      showToast(
        'Please agree to the Terms of Service, including the User Agreement and Privacy Policy to continue.',
        'warning'
      );
      return;
    }

    // Validate password confirmation
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
      alert('Passwords do not match. Please try again.');
      e.target.confirmPassword.focus();
      return;
    }

    // Check if this is a Google OAuth pending user completing signup
    if (oauthPending) {
      // Complete Google OAuth signup with role selection
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/google/finalize-signup.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            role: selectedRole,
            country: e.target.country.value,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Store user info
          localStorage.setItem('user', JSON.stringify(result.user));

          // Redirect based on role
          const basePath = getBasePath();

          if (result.user.role === 'landlord') {
            window.location.href = `${basePath}landlord/index.html`;
          } else {
            // New boarder - redirect to find a room page
            window.location.href = `${basePath}public/find-a-room.html`;
          }
        } else {
          alert(result.error || 'Signup failed');
        }
      } catch (error) {
        console.error('Error during Google OAuth signup:', error);
        alert('An error occurred. Please try again.');
      }
      return;
    }

    // Regular email/password signup
    const formData = new FormData(this);
    const data = {
      role: selectedRole,
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      password: formData.get('password'),
      country: formData.get('country'),
      terms: formData.get('terms') === 'on',
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Auto-login boarders and redirect based on conditional routing
        if (selectedRole === 'boarder') {
          // Store user info to auto-login
          const userInfo = {
            ...result.user,
            boarderStatus: 'new', // New signup, set to 'new'
          };
          localStorage.setItem('user', JSON.stringify(userInfo));
          updateBoarderStatus('new');

          // Redirect using conditional routing logic
          const redirectPath = getBoarderRedirectPath(userInfo);
          window.location.href = redirectPath;
        } else {
          // Landlord: auto-login and redirect to dashboard
          const loginResponse = await fetch(`${CONFIG.API_BASE_URL}/auth/login.php`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              email: data.email,
              password: data.password,
            }),
          });

          if (loginResponse.ok) {
            const loginResult = await loginResponse.json();
            localStorage.setItem('user', JSON.stringify(loginResult.user));

            // Mark as new landlord for welcome message display
            localStorage.setItem('landlordStatus', 'new');

            // Redirect to landlord dashboard
            const basePath = getBasePath();
            window.location.href = `${basePath}landlord/index.html`;
          } else {
            // Fallback: redirect to login if auto-login fails
            const basePath = getBasePath();
            alert('Registration successful! Please login to continue.');
            window.location.href = `${basePath}public/auth/login.html`;
          }
        }
      } else {
        alert(result.error || 'Registration failed');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  });
});
