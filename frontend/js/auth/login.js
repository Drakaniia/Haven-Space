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
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    console.log('Login data:', data);
    // TODO: Send to backend
    alert('Login functionality to be implemented with backend');
  });

  // Social login buttons
  document.querySelector('.social-btn-google')?.addEventListener('click', function () {
    console.log('Google login clicked');
    // TODO: Implement Google OAuth
    alert('Google login to be implemented');
  });

  document.querySelector('.social-btn-apple')?.addEventListener('click', function () {
    console.log('Apple login clicked');
    // TODO: Implement Apple OAuth
    alert('Apple login to be implemented');
  });
});
