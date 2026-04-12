/**
 * Landlord Multi-Step Signup Flow
 * Handles 5-step signup: Account → Location → Property → Payment → Review
 */

import CONFIG from '../../../config.js';
import { getIcon } from '../../../shared/icons.js';
import { getBasePath } from '../../../shared/routing.js';
import {
  initMap,
  setMarker,
  reverseGeocode,
  searchAddress,
  formatAddress,
  isValidPhilippinesLocation,
  debounce,
  getCurrentLocation,
} from '../../../shared/map-utils.js';

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

  // Click outside to close
  toast.addEventListener('click', e => {
    if (e.target === toast) {
      clearTimeout(autoRemoveTimeout);
      removeToast(toast);
    }
  });
}

/**
 * Remove toast notification
 * @param {HTMLElement} toast - Toast element to remove
 */
function removeToast(toast) {
  toast.classList.remove('toast-visible');
  setTimeout(() => {
    toast.remove();
  }, 300);
}

/**
 * Show inline error below form field
 * @param {HTMLInputElement|HTMLSelectElement} input - Form input element
 * @param {string} message - Error message to display
 */
function showInlineError(input, message) {
  // Remove existing error
  const existingError = input.parentElement.querySelector('.field-error');
  if (existingError) {
    existingError.remove();
  }

  // Add error class to input
  input.classList.add('input-error');

  // Create error element
  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.textContent = message;

  // Insert after input
  input.parentElement.appendChild(errorEl);

  // Scroll input into view if needed
  input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Clear inline error from form field
 * @param {HTMLInputElement|HTMLSelectElement} input - Form input element
 */
function clearInlineError(input) {
  input.classList.remove('input-error');
  const existingError = input.parentElement.querySelector('.field-error');
  if (existingError) {
    existingError.remove();
  }
}

/**
 * Clear all inline errors in a form
 * @param {HTMLFormElement} form - Form element
 */
function clearAllInlineErrors(form) {
  form.querySelectorAll('.input-error').forEach(input => {
    clearInlineError(input);
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
 * Inject icons from centralized library
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

/**
 * Signup state management
 */
const signupState = {
  currentStep: 1,
  step1: {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  },
  step2: {
    latitude: null,
    longitude: null,
    address: '',
  },
  step3: {
    boardingHouseName: '',
    description: '',
    propertyType: '',
    totalRooms: 0,
  },
  step4: {
    paymentMethod: null,
    accountNumber: '',
    accountName: '',
    bankName: '',
    skipped: false,
  },
};

/**
 * Load state from session storage
 */
function loadState() {
  const saved = sessionStorage.getItem('landlordSignupState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(signupState, parsed);
    } catch (e) {
      console.error('Error loading signup state:', e);
    }
  }
}

/**
 * Save state to session storage
 */
function saveState() {
  sessionStorage.setItem('landlordSignupState', JSON.stringify(signupState));
}

/**
 * Clear state from session storage
 */
function clearState() {
  sessionStorage.removeItem('landlordSignupState');
}

/**
 * Navigate to a specific step
 * @param {number} stepNumber - Step to navigate to (1-5)
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
  updateProgressIndicator(stepNumber);

  // Update state
  signupState.currentStep = stepNumber;
  saveState();

  // Step-specific initialization
  if (stepNumber === 2) {
    setTimeout(() => {
      if (!window._signupMap) {
        initializeMap();
      } else {
        window._signupMap.invalidateSize();

        // Re-enable button if location is already set
        if (signupState.step2.latitude && signupState.step2.longitude) {
          document.getElementById('step2Next').disabled = false;
        }
      }
    }, 100);
  }

  if (stepNumber === 5) {
    populateReview();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

/**
 * Update progress indicator
 * @param {number} currentStep - Current step number
 */
function updateProgressIndicator(currentStep) {
  const steps = document.querySelectorAll('.signup-progress-step');
  const lines = document.querySelectorAll('.signup-progress-line');

  steps.forEach((step, index) => {
    const stepNum = index + 1;
    step.classList.remove('active', 'completed');

    if (stepNum === currentStep) {
      step.classList.add('active');
    } else if (stepNum < currentStep) {
      step.classList.add('completed');
    }
  });

  lines.forEach((line, index) => {
    if (index + 1 < currentStep) {
      line.classList.add('completed');
    } else {
      line.classList.remove('completed');
    }
  });
}

/**
 * Initialize map for step 2
 */
function initializeMap() {
  const mapContainer = document.getElementById('signup-map');
  if (!mapContainer) return;

  const map = initMap('signup-map', {
    center: [8.1489, 125.125], // Malaybalay City, Mindanao, Philippines
    zoom: 13,
    onMapClick: handleMapClick,
  });

  window._signupMap = map;

  // Restore marker if location already set
  if (signupState.step2.latitude && signupState.step2.longitude) {
    setMarker(map, signupState.step2.latitude, signupState.step2.longitude, {
      draggable: true,
      onDragEnd: handleMarkerDrag,
    });

    // Enable next button since location is already set
    document.getElementById('step2Next').disabled = false;
  } else {
    // Try to get user's current location
    attemptGeolocation();
  }
}

/**
 * Attempt to get user's current location via Geolocation API
 */
function attemptGeolocation() {
  getCurrentLocation(
    async (lat, lng) => {
      // Validate location is in Philippines
      if (!isValidPhilippinesLocation(lat, lng)) {
        console.log('Current location is outside Philippines, using default');
        return;
      }

      // Set marker at current location
      setMarker(window._signupMap, lat, lng, {
        draggable: true,
        onDragEnd: handleMarkerDrag,
      });

      // Update UI
      document.getElementById('latitude').value = lat.toFixed(6);
      document.getElementById('longitude').value = lng.toFixed(6);

      // Reverse geocode
      try {
        const result = await reverseGeocode(lat, lng);
        const formattedAddress = result.display_name || formatAddress(result.address);

        document.getElementById('fullAddress').value = formattedAddress;

        // Update state
        signupState.step2 = {
          latitude: lat,
          longitude: lng,
          address: formattedAddress,
        };
        saveState();

        // Enable next button
        document.getElementById('step2Next').disabled = false;
      } catch (error) {
        console.error('Error getting address:', error);
        document.getElementById('fullAddress').value =
          'Unable to resolve address. Coordinates saved.';

        // Update state with coordinates even if address resolution failed
        signupState.step2 = {
          latitude: lat,
          longitude: lng,
          address: '',
        };
        saveState();

        // Enable next button - coordinates are saved even if address lookup failed
        document.getElementById('step2Next').disabled = false;
      }
    },
    error => {
      console.log('Geolocation failed:', error.message);
      // Silently fail - user can manually select location
    }
  );
}

/**
 * Handle map click event
 * @param {L.LeafletMouseEvent} e - Map click event
 */
async function handleMapClick(e) {
  const { lat, lng } = e.latlng;

  // Validate location is in Philippines
  if (!isValidPhilippinesLocation(lat, lng)) {
    alert('Please select a location within the Philippines.');
    return;
  }

  // Update UI
  document.getElementById('latitude').value = lat.toFixed(6);
  document.getElementById('longitude').value = lng.toFixed(6);

  // Set marker
  setMarker(window._signupMap, lat, lng, {
    draggable: true,
    onDragEnd: handleMarkerDrag,
  });

  // Reverse geocode
  try {
    const result = await reverseGeocode(lat, lng);
    const formattedAddress = result.display_name || formatAddress(result.address);

    document.getElementById('fullAddress').value = formattedAddress;

    // Update state
    signupState.step2 = {
      latitude: lat,
      longitude: lng,
      address: formattedAddress,
    };
    saveState();

    // Enable next button
    document.getElementById('step2Next').disabled = false;
  } catch (error) {
    console.error('Error getting address:', error);
    document.getElementById('fullAddress').value = 'Unable to resolve address. Coordinates saved.';

    // Update state with coordinates even if address resolution failed
    signupState.step2 = {
      latitude: lat,
      longitude: lng,
      address: '',
    };
    saveState();

    // Enable next button - coordinates are saved even if address lookup failed
    document.getElementById('step2Next').disabled = false;
  }
}

/**
 * Handle marker drag event
 * @param {number} lat - New latitude
 * @param {number} lng - New longitude
 */
async function handleMarkerDrag(lat, lng) {
  // Update UI
  document.getElementById('latitude').value = lat.toFixed(6);
  document.getElementById('longitude').value = lng.toFixed(6);

  // Reverse geocode
  try {
    const result = await reverseGeocode(lat, lng);
    const formattedAddress = result.display_name || formatAddress(result.address);

    document.getElementById('fullAddress').value = formattedAddress;

    // Update state
    signupState.step2 = {
      latitude: lat,
      longitude: lng,
      address: formattedAddress,
    };
    saveState();
  } catch (error) {
    console.error('Error getting address:', error);
  }
}

/**
 * Setup address search functionality
 */
function setupAddressSearch() {
  const searchInput = document.getElementById('addressSearch');
  const resultsContainer = document.querySelector('.address-search-results');

  if (!searchInput || !resultsContainer) return;

  const debouncedSearch = debounce(async query => {
    if (query.length < 3) {
      resultsContainer.classList.add('hidden');
      return;
    }

    try {
      const results = await searchAddress(query);

      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="address-search-result">No results found</div>';
        resultsContainer.classList.remove('hidden');
        return;
      }

      resultsContainer.innerHTML = results
        .map(
          (result, index) => `
        <div class="address-search-result" data-index="${index}">
          <div class="address-search-result-name">${result.display_name.split(',')[0]}</div>
          <div class="address-search-result-detail">${result.display_name}</div>
        </div>
      `
        )
        .join('');

      // Store results for click handling
      window._searchResults = results;

      // Add click handlers
      resultsContainer.querySelectorAll('.address-search-result').forEach(el => {
        el.addEventListener('click', async () => {
          const index = parseInt(el.dataset.index);
          const result = window._searchResults[index];

          // Update map view
          if (window._signupMap) {
            window._signupMap.setView([result.latitude, result.longitude], 16);

            // Trigger click handler
            setMarker(window._signupMap, result.latitude, result.longitude, {
              draggable: true,
              onDragEnd: handleMarkerDrag,
            });

            document.getElementById('latitude').value = result.latitude.toFixed(6);
            document.getElementById('longitude').value = result.longitude.toFixed(6);
            document.getElementById('fullAddress').value = result.display_name;

            // Update state
            signupState.step2 = {
              latitude: result.latitude,
              longitude: result.longitude,
              address: result.display_name,
            };
            saveState();

            document.getElementById('step2Next').disabled = false;
          }

          // Hide results
          resultsContainer.classList.add('hidden');
          searchInput.value = result.display_name.split(',')[0];
        });
      });

      resultsContainer.classList.remove('hidden');
    } catch (error) {
      console.error('Error searching address:', error);
    }
  }, 500);

  searchInput.addEventListener('input', e => {
    debouncedSearch(e.target.value);
  });

  // Hide results when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.address-search-wrapper')) {
      resultsContainer.classList.add('hidden');
    }
  });
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

  // Location
  document.getElementById('reviewAddress').textContent = signupState.step2.address || 'Not set';

  // Property details
  document.getElementById('reviewPropertyName').textContent = signupState.step3.boardingHouseName;
  document.getElementById('reviewPropertyType').textContent = signupState.step3.propertyType;
  document.getElementById('reviewRooms').textContent = `${signupState.step3.totalRooms} room(s)`;

  // Payment method
  const paymentSection = document.getElementById('reviewPaymentSection');
  if (signupState.step4.skipped) {
    document.getElementById('reviewPaymentMethod').textContent = 'Will add later';
  } else if (signupState.step4.paymentMethod) {
    let paymentText = signupState.step4.paymentMethod;
    if (signupState.step4.accountNumber) {
      // Mask account number
      const masked = maskAccountNumber(signupState.step4.accountNumber);
      paymentText += ` (${masked})`;
    }
    document.getElementById('reviewPaymentMethod').textContent = paymentText;
  } else {
    document.getElementById('reviewPaymentMethod').textContent = 'Not set';
  }
}

/**
 * Mask account number for display
 * @param {string} accountNumber - Full account number
 * @returns {string} Masked account number
 */
function maskAccountNumber(accountNumber) {
  if (accountNumber.length <= 4) return '****';
  return `**** ${accountNumber.slice(-4)}`;
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

    showToast('Account information saved. Continuing to location...', 'success');
    goToStep(2);
  });

  // Step 2: Next button
  document.getElementById('step2Next').addEventListener('click', () => {
    if (!signupState.step2.latitude || !signupState.step2.longitude) {
      showToast('Please select a location on the map', 'warning');
      return;
    }

    showToast('Location saved. Continuing to property details...', 'success');
    goToStep(3);
  });

  // Step 3: Property details form
  document.getElementById('step3Form').addEventListener('submit', e => {
    e.preventDefault();

    const form = e.target;
    let isValid = true;

    // Clear previous errors
    clearAllInlineErrors(form);

    // Boarding house name validation
    const boardingHouseName = form.boardingHouseName;
    if (!boardingHouseName.value.trim()) {
      showInlineError(boardingHouseName, 'Boarding house name is required');
      isValid = false;
    } else if (boardingHouseName.value.trim().length < 3) {
      showInlineError(boardingHouseName, 'Name must be at least 3 characters');
      isValid = false;
    }

    // Property type validation
    const propertyType = form.propertyType;
    if (!propertyType.value) {
      showInlineError(propertyType, 'Please select a property type');
      isValid = false;
    }

    // Total rooms validation
    const totalRooms = form.totalRooms;
    if (!totalRooms.value) {
      showInlineError(totalRooms, 'Number of rooms is required');
      isValid = false;
    } else if (parseInt(totalRooms.value) < 1) {
      showInlineError(totalRooms, 'Must have at least 1 room');
      isValid = false;
    }

    if (!isValid) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    const formData = new FormData(e.target);
    signupState.step3 = {
      boardingHouseName: formData.get('boardingHouseName'),
      description: formData.get('propertyDescription'),
      propertyType: formData.get('propertyType'),
      totalRooms: parseInt(formData.get('totalRooms')),
    };
    saveState();

    showToast('Property details saved. Continuing to payment...', 'success');
    goToStep(4);
  });

  // Step 4: Payment method type change
  document.getElementById('paymentMethodType').addEventListener('change', e => {
    const selectedType = e.target.value;

    // Hide all payment field groups
    document.querySelectorAll('.payment-fields-group').forEach(el => {
      el.classList.add('hidden');
    });

    // Show relevant fields based on selection
    switch (selectedType) {
      case 'GCash':
      case 'PayMaya':
        document.getElementById('ewalletFields').classList.remove('hidden');
        break;
      case 'Bank Transfer':
        document.getElementById('bankFields').classList.remove('hidden');
        break;
      case 'PayPal':
        document.getElementById('paypalFields').classList.remove('hidden');
        break;
      case 'Other':
        document.getElementById('otherFields').classList.remove('hidden');
        break;
    }
  });

  // Step 4: Payment form submission
  document.getElementById('step4Form').addEventListener('submit', e => {
    e.preventDefault();

    const form = e.target;
    const paymentType = document.getElementById('paymentMethodType').value;

    // Clear previous errors
    clearAllInlineErrors(form);

    if (!paymentType) {
      showToast('Please select a payment method type', 'error');
      const paymentMethodType = form.paymentMethodType;
      showInlineError(paymentMethodType, 'Please select a payment method');
      return;
    }

    // Validate based on payment type
    const paymentData = {
      paymentMethod: paymentType,
      accountNumber: '',
      accountName: '',
      bankName: '',
      skipped: false,
    };

    let isValid = true;

    switch (paymentType) {
      case 'GCash':
      case 'PayMaya': {
        const ewalletNumber = document.getElementById('ewalletNumber');
        const ewalletName = document.getElementById('ewalletName');

        if (!ewalletNumber.value.trim()) {
          showInlineError(ewalletNumber, 'Mobile number is required');
          isValid = false;
        } else if (!/^(\+63|0)?9\d{9}$/.test(ewalletNumber.value.replace(/\s/g, ''))) {
          showInlineError(
            ewalletNumber,
            'Enter a valid Philippine mobile number (+63 9XX XXX XXXX)'
          );
          isValid = false;
        }

        if (!ewalletName.value.trim()) {
          showInlineError(ewalletName, 'Account name is required');
          isValid = false;
        }

        if (!isValid) {
          showToast('Please fix the payment details', 'error');
          return;
        }

        paymentData.accountNumber = ewalletNumber.value;
        paymentData.accountName = ewalletName.value;
        break;
      }

      case 'Bank Transfer': {
        const bankName = document.getElementById('bankName');
        const bankAccountNumber = document.getElementById('bankAccountNumber');
        const bankAccountName = document.getElementById('bankAccountName');

        if (!bankName.value) {
          showInlineError(bankName, 'Please select a bank');
          isValid = false;
        }

        if (!bankAccountNumber.value.trim()) {
          showInlineError(bankAccountNumber, 'Account number is required');
          isValid = false;
        }

        if (!bankAccountName.value.trim()) {
          showInlineError(bankAccountName, 'Account name is required');
          isValid = false;
        }

        if (!isValid) {
          showToast('Please fix the payment details', 'error');
          return;
        }

        paymentData.bankName = bankName.value;
        paymentData.accountNumber = bankAccountNumber.value;
        paymentData.accountName = bankAccountName.value;
        break;
      }

      case 'PayPal': {
        const paypalEmail = document.getElementById('paypalEmail');

        if (!paypalEmail.value.trim()) {
          showInlineError(paypalEmail, 'PayPal email is required');
          isValid = false;
        } else if (!isValidEmail(paypalEmail.value.trim())) {
          showInlineError(paypalEmail, 'Please enter a valid email address');
          isValid = false;
        }

        if (!isValid) {
          showToast('Please fix the payment details', 'error');
          return;
        }

        paymentData.accountNumber = paypalEmail.value;
        paymentData.accountName = paypalEmail.value;
        break;
      }

      case 'Other': {
        const otherPaymentType = document.getElementById('otherPaymentType');
        const otherPaymentAccount = document.getElementById('otherPaymentAccount');
        const otherPaymentName = document.getElementById('otherPaymentName');

        if (!otherPaymentType.value.trim()) {
          showInlineError(otherPaymentType, 'Payment type name is required');
          isValid = false;
        }

        if (!otherPaymentAccount.value.trim()) {
          showInlineError(otherPaymentAccount, 'Account details are required');
          isValid = false;
        }

        if (!otherPaymentName.value.trim()) {
          showInlineError(otherPaymentName, 'Account name is required');
          isValid = false;
        }

        if (!isValid) {
          showToast('Please fix the payment details', 'error');
          return;
        }

        paymentData.paymentMethod = otherPaymentType.value;
        paymentData.accountNumber = otherPaymentAccount.value;
        paymentData.accountName = otherPaymentName.value;
        break;
      }
    }

    signupState.step4 = paymentData;
    saveState();

    showToast('Payment method saved. Continuing to review...', 'success');
    goToStep(5);
  });

  // Step 4: Skip payment
  document.getElementById('skipPaymentBtn').addEventListener('click', () => {
    signupState.step4 = {
      paymentMethod: null,
      accountNumber: '',
      accountName: '',
      bankName: '',
      skipped: true,
    };
    saveState();

    showToast('Payment setup skipped. Continuing to review...', 'success');
    goToStep(5);
  });

  // Step 5: Final submission
  document.getElementById('step5Form').addEventListener('submit', async e => {
    e.preventDefault();

    const termsChecked = e.target.terms.checked;
    if (!termsChecked) {
      showToast('Please agree to the Terms of Service to continue', 'warning');
      return;
    }

    // Submit signup data
    await submitSignup();
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

  document.getElementById('step4Back').addEventListener('click', () => {
    goToStep(3);
  });

  document.getElementById('step5Back').addEventListener('click', () => {
    goToStep(4);
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

    input.addEventListener('blur', () => {
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

  // Real-time validation for Step 3
  const step3Form = document.getElementById('step3Form');
  if (step3Form) {
    step3Form.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', () => {
        clearInlineError(input);
      });

      input.addEventListener('blur', () => {
        clearInlineError(input);
      });
    });
  }

  // Real-time validation for Step 4
  const step4Form = document.getElementById('step4Form');
  if (step4Form) {
    step4Form.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('input', () => {
        clearInlineError(input);
      });

      input.addEventListener('blur', () => {
        clearInlineError(input);
      });
    });
  }
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

  toggle.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    eyeOpen.classList.toggle('hidden');
    eyeClosed.classList.toggle('hidden');
  });
}

/**
 * Submit signup data to API
 */
async function submitSignup() {
  const submitBtn = document.querySelector('#step5Form button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';

  try {
    // Step 1: Create user account
    const userResponse = await fetch(`${CONFIG.API_BASE_URL}/auth/register.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'landlord',
        firstName: signupState.step1.firstName,
        lastName: signupState.step1.lastName,
        email: signupState.step1.email,
        password: signupState.step1.password,
      }),
    });

    const userResult = await userResponse.json();

    if (!userResponse.ok || !userResult.success) {
      throw new Error(userResult.error || 'Registration failed');
    }

    const userId = userResult.user.id;

    // Step 2: Save boarding house details (Profile must be created first before location & payment!)
    const propertyResponse = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/profile.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        boardingHouseName: signupState.step3.boardingHouseName,
        description: signupState.step3.description,
        propertyType: signupState.step3.propertyType,
        totalRooms: signupState.step3.totalRooms,
      }),
    });

    if (!propertyResponse.ok) {
      console.error('Failed to save property details');
    }

    // Step 3: Save property location
    const locationResponse = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/property-location.php`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          latitude: signupState.step2.latitude,
          longitude: signupState.step2.longitude,
          address: signupState.step2.address,
        }),
      }
    );

    if (!locationResponse.ok) {
      console.error('Failed to save property location');
    }

    // Step 4: Save payment method (if not skipped)
    if (!signupState.step4.skipped && signupState.step4.paymentMethod) {
      const paymentResponse = await fetch(
        `${CONFIG.API_BASE_URL}/api/landlord/payment-methods.php`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            methodType: signupState.step4.paymentMethod,
            accountNumber: signupState.step4.accountNumber,
            accountName: signupState.step4.accountName,
            bankName: signupState.step4.bankName,
            isPrimary: true,
          }),
        }
      );

      if (!paymentResponse.ok) {
        console.error('Failed to save payment method');
      }
    }

    // Success - clear state and redirect
    clearState();

    showToast(
      'Account created successfully! Please check your email for verification, then login to manage your property.',
      'success'
    );

    const basePath = getBasePath();
    window.location.href = `${basePath}public/auth/login.html`;
  } catch (error) {
    console.error('Error during signup:', error);
    showToast(error.message || 'An error occurred. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account & List Property';
  }
}

/**
 * Initialize signup flow
 */
document.addEventListener('DOMContentLoaded', () => {
  // Inject icons
  injectIcons();

  // Load saved state
  loadState();

  // Setup event listeners
  setupEventListeners();

  // Setup address search
  setupAddressSearch();

  // Restore to last step if state exists
  if (signupState.currentStep > 1) {
    goToStep(signupState.currentStep);

    // Restore form values
    if (signupState.step1.firstName) {
      document.getElementById('firstName').value = signupState.step1.firstName;
      document.getElementById('lastName').value = signupState.step1.lastName;
      document.getElementById('email').value = signupState.step1.email;
      document.getElementById('password').value = signupState.step1.password;
      document.getElementById('confirmPassword').value = signupState.step1.password;
    }

    if (signupState.step2.latitude) {
      document.getElementById('latitude').value = signupState.step2.latitude;
      document.getElementById('longitude').value = signupState.step2.longitude;
      document.getElementById('fullAddress').value = signupState.step2.address;
      document.getElementById('step2Next').disabled = false;
    }

    if (signupState.step3.boardingHouseName) {
      document.getElementById('boardingHouseName').value = signupState.step3.boardingHouseName;
      document.getElementById('propertyDescription').value = signupState.step3.description || '';
      document.getElementById('propertyType').value = signupState.step3.propertyType;
      document.getElementById('totalRooms').value = signupState.step3.totalRooms;
    }
  } else {
    // Start at step 1
    goToStep(1);
  }
});
