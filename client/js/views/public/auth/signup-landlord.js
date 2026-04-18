/**
 * Landlord 3-Step Signup Flow
 * Handles 3-step signup: Account → Profile → Review
 */

import CONFIG from '../../../config.js';
import { getIcon } from '../../../shared/icons.js';
import { getBasePath } from '../../../shared/routing.js';

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('error', 'success', 'warning')
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

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 5000);

  // Close button functionality
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
}

/**
 * Show inline error for form field
 * @param {HTMLElement} field - Form field element
 * @param {string} message - Error message
 */
function showInlineError(field, message) {
  clearInlineError(field);

  field.classList.add('input-error');

  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.textContent = message;

  field.parentNode.appendChild(errorDiv);
}

/**
 * Clear inline error for form field
 * @param {HTMLElement} field - Form field element
 */
function clearInlineError(field) {
  field.classList.remove('input-error');
  const errorDiv = field.parentNode.querySelector('.field-error');
  if (errorDiv) {
    errorDiv.remove();
  }
}

/**
 * Clear all inline errors in a form
 * @param {HTMLElement} form - Form element
 */
function clearAllInlineErrors(form) {
  form.querySelectorAll('.input-error').forEach(field => {
    clearInlineError(field);
  });
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Whether email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, message: string }
 */
function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }

  // Check for common weak passwords
  const weakPasswords = ['password', 'password123', '12345678', 'qwerty123', 'abcdefg'];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, message: 'Please choose a stronger password' };
  }

  return { valid: true, message: '' };
}

/**
 * Validate Philippine phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether phone number is valid
 */
function isValidPhoneNumber(phone) {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Philippine mobile number patterns:
  // +63 9XX XXX XXXX (11 digits after +63)
  // 09XX XXX XXXX (11 digits starting with 0)
  // 9XX XXX XXXX (10 digits starting with 9)

  if (cleaned.length === 12 && cleaned.startsWith('63') && cleaned.charAt(2) === '9') {
    return true; // +63 9XX XXX XXXX format (63 + 10 digit mobile)
  }

  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return true; // 09XX XXX XXXX format
  }

  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    return true; // 9XX XXX XXXX format
  }

  return false;
}

/**
 * Validate Step 1 form
 * @returns {boolean} - Whether form is valid
 */
function validateStep1() {
  const form = document.getElementById('step1Form');
  const firstName = form.firstName;
  const lastName = form.lastName;
  const email = form.email;
  const password = form.password;
  const confirmPassword = form.confirmPassword;

  let isValid = true;

  // Clear previous errors
  clearAllInlineErrors(form);

  // First name validation
  if (!firstName.value.trim()) {
    showInlineError(firstName, 'First name is required');
    isValid = false;
  } else if (firstName.value.trim().length < 2) {
    showInlineError(firstName, 'First name must be at least 2 characters');
    isValid = false;
  }

  // Last name validation
  if (!lastName.value.trim()) {
    showInlineError(lastName, 'Last name is required');
    isValid = false;
  } else if (lastName.value.trim().length < 2) {
    showInlineError(lastName, 'Last name must be at least 2 characters');
    isValid = false;
  }

  // Email validation
  if (!email.value.trim()) {
    showInlineError(email, 'Email address is required');
    isValid = false;
  } else if (!isValidEmail(email.value.trim())) {
    showInlineError(email, 'Please enter a valid email address');
    isValid = false;
  }

  // Password validation
  if (!password.value) {
    showInlineError(password, 'Password is required');
    isValid = false;
  } else {
    const passwordValidation = validatePassword(password.value);
    if (!passwordValidation.valid) {
      showInlineError(password, passwordValidation.message);
      isValid = false;
    }
  }

  // Confirm password validation
  if (!confirmPassword.value) {
    showInlineError(confirmPassword, 'Please confirm your password');
    isValid = false;
  } else if (password.value !== confirmPassword.value) {
    showInlineError(confirmPassword, 'Passwords do not match');
    isValid = false;
  }

  // Show toast if validation failed
  if (!isValid) {
    showToast('Please fix the errors in the form', 'error');
  }

  return isValid;
}

/**
 * Validate Step 2 form
 * @returns {boolean} - Whether form is valid
 */
function validateStep2() {
  const form = document.getElementById('step2Form');
  const businessName = form.businessName;
  const phoneNumber = form.phoneNumber;
  const city = form.city;
  const province = form.province;
  const idType = form.idType;
  const idNumber = form.idNumber;

  let isValid = true;

  // Clear previous errors
  clearAllInlineErrors(form);

  // Business name validation
  if (!businessName.value.trim()) {
    showInlineError(businessName, 'Business/Property name is required');
    isValid = false;
  } else if (businessName.value.trim().length < 3) {
    showInlineError(businessName, 'Business name must be at least 3 characters');
    isValid = false;
  }

  // Phone number validation
  if (!phoneNumber.value.trim()) {
    showInlineError(phoneNumber, 'Contact number is required');
    isValid = false;
  } else if (!isValidPhoneNumber(phoneNumber.value.trim())) {
    showInlineError(phoneNumber, 'Please enter a valid Philippine phone number');
    isValid = false;
  }

  // City validation
  if (!city.value.trim()) {
    showInlineError(city, 'City is required');
    isValid = false;
  } else if (city.value.trim().length < 2) {
    showInlineError(city, 'City must be at least 2 characters');
    isValid = false;
  }

  // Province validation
  if (!province.value.trim()) {
    showInlineError(province, 'Province is required');
    isValid = false;
  } else if (province.value.trim().length < 2) {
    showInlineError(province, 'Province must be at least 2 characters');
    isValid = false;
  }

  // ID type validation
  if (!idType.value) {
    showInlineError(idType, 'Please select a valid ID type');
    isValid = false;
  }

  // ID number validation
  if (!idNumber.value.trim()) {
    showInlineError(idNumber, 'ID number is required');
    isValid = false;
  }

  // Show toast if validation failed
  if (!isValid) {
    showToast('Please fix the errors in the form', 'error');
  }

  return isValid;
}

/**
 * Navigate to specific step
 * @param {number} stepNumber - Step to navigate to (1-3)
 */
function goToStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.signup-step').forEach(step => {
    step.classList.add('hidden');
  });

  // Show target step
  const targetStep = document.getElementById(`step${stepNumber}`);
  if (targetStep) {
    targetStep.classList.remove('hidden');
  }

  // Update progress indicator
  document.querySelectorAll('.signup-progress-step').forEach((step, index) => {
    if (index + 1 <= stepNumber) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });

  // Populate review if going to step 3
  if (stepNumber === 3) {
    populateReview();
  }
}

/**
 * Convert ID type value to readable format
 * @param {string} idType - ID type value (e.g., 'drivers_license')
 * @returns {string} - Readable ID type (e.g., "Driver's License")
 */
function formatIdType(idType) {
  const idTypeMap = {
    drivers_license: "Driver's License",
    passport: 'Passport',
    national_id: 'National ID (PhilID)',
    sss_id: 'SSS ID',
    tin_id: 'TIN ID',
    postal_id: 'Postal ID',
    voters_id: "Voter's ID",
  };
  return idTypeMap[idType] || idType || 'Not set';
}

/**
 * Populate review step with current state
 */
function populateReview() {
  // Account info
  document.getElementById(
    'reviewName'
  ).textContent = `${signupState.step1.firstName} ${signupState.step1.lastName}`;
  document.getElementById('reviewEmail').textContent = signupState.step1.email;

  // Landlord profile info
  document.getElementById('reviewBusinessName').textContent =
    signupState.step2.businessName || 'Not set';
  document.getElementById('reviewPhone').textContent = signupState.step2.phoneNumber || 'Not set';
  document.getElementById('reviewLocation').textContent =
    signupState.step2.city && signupState.step2.province
      ? `${signupState.step2.city}, ${signupState.step2.province}`
      : 'Not set';
  document.getElementById('reviewIdType').textContent = formatIdType(signupState.step2.idType);
}

/**
 * Save state to session storage
 */
function saveState() {
  sessionStorage.setItem('landlordSignupState', JSON.stringify(signupState));
}

/**
 * Load state from session storage
 */
function loadState() {
  const saved = sessionStorage.getItem('landlordSignupState');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  }
  return {
    step1: {},
    step2: {},
  };
}

/**
 * Clear state from session storage
 */
function clearState() {
  sessionStorage.removeItem('landlordSignupState');
}

/**
 * Setup password visibility toggle
 * @param {string} toggleId - Toggle button ID
 * @param {string} inputId - Password input ID
 */
function setupPasswordToggle(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  const eyeOpen = toggle.querySelector('.eye-open');
  const eyeClosed = toggle.querySelector('.eye-closed');

  if (!toggle || !input || !eyeOpen || !eyeClosed) return;

  toggle.addEventListener('click', () => {
    if (input.type === 'password') {
      input.type = 'text';
      eyeOpen.classList.add('hidden');
      eyeClosed.classList.remove('hidden');
    } else {
      input.type = 'password';
      eyeOpen.classList.remove('hidden');
      eyeClosed.classList.add('hidden');
    }
  });
}

/**
 * Setup event listeners for all steps
 */
function setupEventListeners() {
  // Step 1: Account form
  document.getElementById('step1Form').addEventListener('submit', e => {
    e.preventDefault();

    // Validate form
    if (!validateStep1()) {
      return; // Stop if validation fails
    }

    const formData = new FormData(e.target);

    // Save step 1 data
    signupState.step1 = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      password: formData.get('password'),
    };
    saveState();

    showToast('Account information saved. Continuing to profile...', 'success');
    goToStep(2);
  });

  // Step 2: Profile form
  document.getElementById('step2Form').addEventListener('submit', e => {
    e.preventDefault();

    // Validate form
    if (!validateStep2()) {
      return; // Stop if validation fails
    }

    const formData = new FormData(e.target);

    // Save step 2 data
    signupState.step2 = {
      businessName: formData.get('businessName'),
      businessDescription: formData.get('businessDescription'),
      phoneNumber: formData.get('phoneNumber'),
      city: formData.get('city'),
      province: formData.get('province'),
      experienceLevel: formData.get('experienceLevel'),
      idType: formData.get('idType'),
      idNumber: formData.get('idNumber'),
    };
    saveState();

    showToast('Profile information saved. Continuing to review...', 'success');
    goToStep(3);
  });

  // Step 3: Review and submit form
  document.getElementById('step3Form').addEventListener('submit', async e => {
    e.preventDefault();

    const form = e.target;

    // Check terms agreement
    const termsCheckbox = form.querySelector('input[name="terms"]');
    if (!termsCheckbox.checked) {
      showToast('Please agree to the Terms of Service to continue', 'error');
      return;
    }

    // Prepare data for submission
    const registrationData = {
      // Account info
      firstName: signupState.step1.firstName,
      lastName: signupState.step1.lastName,
      email: signupState.step1.email,
      password: signupState.step1.password,
      role: 'landlord',

      // Landlord profile
      businessName: signupState.step2.businessName,
      businessDescription: signupState.step2.businessDescription,
      phoneNumber: signupState.step2.phoneNumber,
      city: signupState.step2.city,
      province: signupState.step2.province,
      experienceLevel: signupState.step2.experienceLevel,
      idType: signupState.step2.idType,
      idNumber: signupState.step2.idNumber,
    };

    // Get button reference and save original text before try block
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating Account...';

      // Submit registration
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Clear stored state
        clearState();

        // Store user info and token for automatic login
        // Use synchronous storage to ensure data is written before redirect
        const userData = {
          id: result.user.id || result.user.user_id,
          user_id: result.user.id || result.user.user_id,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          email: result.user.email,
          role: result.user.role,
          account_status: result.user.account_status,
          email_verified: result.user.email_verified,
          verification_status: result.user.verification_status,
        };

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('user_id', String(userData.id));
        localStorage.setItem('token', result.access_token);
        localStorage.setItem('landlordStatus', 'new');

        // Force localStorage to flush (some browsers need this)
        localStorage.getItem('token');

        // Show success message
        showToast('Account created successfully! Redirecting to your dashboard...', 'success');

        // Debug: Log what we stored and routing info
        console.log('=== LANDLORD SIGNUP DEBUG ===');
        console.log('Current URL:', window.location.href);
        console.log('Stored user:', localStorage.getItem('user'));
        console.log('Stored user_id:', localStorage.getItem('user_id'));
        console.log('Stored token:', localStorage.getItem('token'));
        console.log('Token length:', localStorage.getItem('token')?.length);
        console.log('Stored landlordStatus:', localStorage.getItem('landlordStatus'));

        const basePath = getBasePath();
        const redirectUrl = `${basePath}landlord/index.html`;
        console.log('Calculated base path:', basePath);
        console.log('Full redirect URL:', redirectUrl);
        console.log('=== END DEBUG ===');

        // Redirect to landlord dashboard with sufficient delay for localStorage sync
        setTimeout(() => {
          console.log('Executing redirect to:', redirectUrl);
          // Use location.replace to avoid back button issues
          window.location.replace(redirectUrl);
        }, 1500);
      } else {
        // Handle specific error cases
        let errorMessage = result.message || result.error || 'Registration failed';

        if (response.status === 409) {
          if (errorMessage.includes('Email already exists') || errorMessage.includes('email')) {
            errorMessage =
              'This email address is already registered. Please use a different email or try logging in instead.';

            // Highlight the email field
            const emailField = document.getElementById('step1Form').email;
            showInlineError(emailField, 'This email is already registered');

            // Go back to step 1 to fix the email
            goToStep(1);
          }
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Registration error:', error);
      showToast(error.message || 'Failed to create account. Please try again.', 'error');

      // Restore button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Back buttons
  document.getElementById('step1Back')?.addEventListener('click', () => {
    window.location.href = 'signup.html';
  });

  document.getElementById('step2Back').addEventListener('click', () => {
    goToStep(1);
  });

  document.getElementById('step3Back').addEventListener('click', () => {
    goToStep(2);
  });

  // Review edit buttons
  document.querySelectorAll('.review-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const stepToEdit = parseInt(btn.dataset.editStep);
      goToStep(stepToEdit);
    });
  });

  // Password toggles
  setupPasswordToggle('passwordToggle', 'password');
  setupPasswordToggle('confirmPasswordToggle', 'confirmPassword');

  // Real-time validation - clear errors on input
  const step1Form = document.getElementById('step1Form');
  step1Form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      clearInlineError(input);
    });
  });

  const step2Form = document.getElementById('step2Form');
  step2Form.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('input', () => {
      clearInlineError(input);
    });
  });

  // Real-time password match validation
  const confirmPasswordInput = step1Form.confirmPassword;
  const passwordInput = step1Form.password;

  confirmPasswordInput.addEventListener('input', () => {
    clearInlineError(confirmPasswordInput);
    if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
      showInlineError(confirmPasswordInput, 'Passwords do not match');
    }
  });

  passwordInput.addEventListener('input', () => {
    clearInlineError(passwordInput);
    if (passwordInput.value) {
      const validation = validatePassword(passwordInput.value);
      if (!validation.valid) {
        showInlineError(passwordInput, validation.message);
      }
    }
  });
}

/**
 * Inject icons from centralized library
 */
function injectIcons() {
  const iconElements = document.querySelectorAll('[data-icon]');
  iconElements.forEach(element => {
    const iconName = element.getAttribute('data-icon');
    const width = element.getAttribute('data-icon-width') || '24';
    const height = element.getAttribute('data-icon-height') || '24';
    const strokeWidth = element.getAttribute('data-icon-stroke-width') || '1.5';

    const iconSvg = getIcon(iconName, {
      width: parseInt(width),
      height: parseInt(height),
      strokeWidth,
    });

    element.innerHTML = iconSvg;
  });
}

// Global state
const signupState = loadState();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Inject icons
  injectIcons();

  // Setup event listeners
  setupEventListeners();

  // Load saved form data if available
  if (signupState.step1.firstName) {
    const step1Form = document.getElementById('step1Form');
    step1Form.firstName.value = signupState.step1.firstName || '';
    step1Form.lastName.value = signupState.step1.lastName || '';
    step1Form.email.value = signupState.step1.email || '';
  }

  if (signupState.step2.businessName) {
    const step2Form = document.getElementById('step2Form');
    step2Form.businessName.value = signupState.step2.businessName || '';
    step2Form.businessDescription.value = signupState.step2.businessDescription || '';
    step2Form.phoneNumber.value = signupState.step2.phoneNumber || '';
    step2Form.city.value = signupState.step2.city || '';
    step2Form.province.value = signupState.step2.province || '';
    step2Form.experienceLevel.value = signupState.step2.experienceLevel || '';
    step2Form.idType.value = signupState.step2.idType || '';
    step2Form.idNumber.value = signupState.step2.idNumber || '';
  }
});
