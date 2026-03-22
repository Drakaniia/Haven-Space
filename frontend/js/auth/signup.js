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

  // Role selection
  roleCards.forEach(card => {
    card.addEventListener('click', function () {
      const input = this.querySelector('input[type="radio"]');
      input.checked = true;
      selectedRole = input.value;

      // Update visual state
      roleCards.forEach(c => c.classList.remove('selected'));
      this.classList.add('selected');

      // Enable continue button
      continueBtn.disabled = false;

      // Update button text based on role
      if (selectedRole === 'landlord') {
        continueBtn.textContent = 'Join as a Landlord';
      } else {
        continueBtn.textContent = 'Apply as a Boarder';
      }
    });
  });

  // Continue to step 2
  continueBtn.addEventListener('click', function () {
    if (selectedRole) {
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      headerLinkContainer.classList.remove('hidden');

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

  // Form submission
  document.getElementById('signupForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = {
      role: selectedRole,
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      password: formData.get('password'),
      country: formData.get('country'),
      newsletter: formData.get('newsletter') === 'on',
      terms: formData.get('terms') === 'on',
    };

    console.log('Signup data:', data);
    // TODO: Send to backend
    alert('Signup functionality to be implemented with backend');
  });
});
