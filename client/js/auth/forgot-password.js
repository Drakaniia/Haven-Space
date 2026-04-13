document.addEventListener('DOMContentLoaded', function () {
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const verificationForm = document.getElementById('verificationForm');
  const backBtn = document.getElementById('backBtn');
  const emailDisplay = document.getElementById('emailDisplay');
  const resendLink = document.getElementById('resendLink');
  const resendTimer = document.getElementById('resendTimer');
  const codeInputs = document.querySelectorAll('.code-input');

  // Step 1: Send reset code
  forgotPasswordForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = this.querySelector('#email').value;
    emailDisplay.textContent = email;

    // Reset code will be sent to backend to generate and email

    // Switch to step 2
    step1.classList.add('hidden');
    step2.classList.remove('hidden');

    // Focus first code input
    setTimeout(() => codeInputs[0].focus(), 100);

    // Start resend timer
    startResendTimer();
  });

  // Back button
  backBtn.addEventListener('click', function () {
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
  });

  // Code input handling
  codeInputs.forEach((input, index) => {
    input.addEventListener('input', function (e) {
      const value = e.target.value;

      // Only allow numbers
      if (!/^\d*$/.test(value)) {
        e.target.value = '';
        return;
      }

      // Move to next input if value entered
      if (value.length === 1 && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }

      // Check if all inputs are filled
      Array.from(codeInputs).every(input => input.value.length === 1);
    });

    input.addEventListener('keydown', function (e) {
      // Move to previous input on backspace
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        codeInputs[index - 1].focus();
      }

      // Handle paste
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          const digits = text.replace(/\D/g, '').slice(0, 6).split('');
          digits.forEach((digit, i) => {
            if (codeInputs[i]) {
              codeInputs[i].value = digit;
              if (i < codeInputs.length - 1) {
                codeInputs[i + 1].focus();
              }
            }
          });
        });
      }
    });

    input.addEventListener('focus', function () {
      this.select();
    });
  });

  // Verification form submission
  verificationForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const code = Array.from(codeInputs)
      .map(input => input.value)
      .join('');

    if (code.length !== 6) {
      alert('Please enter the complete 6-digit code');
      return;
    }

    // TODO: Send to backend to verify code

    alert('Code verification to be implemented with backend. Redirect to reset password page...');
    // Redirect to reset password page
    // window.location.href = '/reset-password?code=' + code;
  });

  // Resend code
  resendLink.addEventListener('click', function (e) {
    e.preventDefault();

    // TODO: Send to backend to resend code

    alert('Reset code resent!');
    startResendTimer();
  });

  // Resend timer
  function startResendTimer() {
    resendLink.classList.add('hidden');
    resendTimer.classList.remove('hidden');

    let seconds = 30;
    const timerSpan = resendTimer.querySelector('span');

    const interval = setInterval(() => {
      seconds--;
      timerSpan.textContent = seconds;

      if (seconds <= 0) {
        clearInterval(interval);
        resendTimer.classList.add('hidden');
        resendLink.classList.remove('hidden');
      }
    }, 1000);
  }
});
