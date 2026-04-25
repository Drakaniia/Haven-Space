document.addEventListener('DOMContentLoaded', function () {
  const resetPasswordForm = document.getElementById('resetPasswordForm');

  // Get query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  const requestId = urlParams.get('request_id');

  // Form submission
  resetPasswordForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const newPassword = this.querySelector('#newPassword').value;
    const confirmPassword = this.querySelector('#confirmPassword').value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    // Send request to backend to reset password
    fetch('http://localhost:8000/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        request_id: requestId,
        new_password: newPassword,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          return;
        }

        alert('Password reset successfully! You can now log in with your new password.');
        window.location.href = 'login.html';
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Failed to reset password. Please try again.');
      });
  });
});
