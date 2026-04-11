import CONFIG from '../config.js';

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

  let selectedRole = null;

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

  // Continue to step 2
  continueBtn.addEventListener('click', function () {
    if (selectedRole) {
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
    console.log('Apple signup clicked');
    // TODO: Implement Apple OAuth
    alert('Apple signup to be implemented');
  });

  // Form submission
  document.getElementById('signupForm').addEventListener('submit', async function (e) {
    e.preventDefault();

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
        alert('Registration successful! Please login.');
        window.location.href = 'login.html';
      } else {
        alert(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Error during signup:', error);
      alert('An error occurred. Please try again.');
    }
  });
});
