/**
 * Boarder Payment Process - GCash Integration
 *
 * Handles payment form, GCash QR code generation, and payment confirmation
 */

import { getIcon } from '../../shared/icons.js';

// Payment state
const paymentState = {
  selectedMethod: 'gcash',
  amount: 5500.0,
  period: 'January 2025',
  qrTimer: null,
  qrTimeRemaining: 15 * 60, // 15 minutes in seconds
};

/**
 * Initialize Payment Page
 * Sets up event listeners and initializes components
 */
export async function initPaymentPage() {
  // Initialize sidebar and navbar
  await initializeNavigation();

  // Set up payment method selection
  setupPaymentMethodSelection();

  // Set up form interactions
  setupFormInteractions();

  // Initialize QR timer
  startQRTimer();

  // Set default payment date to today
  setDefaultPaymentDate();
}

/**
 * Initialize Navigation (Sidebar & Navbar)
 */
async function initializeNavigation() {
  const CONFIG = (await import('../../config.js')).default;

  function loginPath() {
    const pathname = window.location.pathname;
    if (pathname.includes('github.io')) {
      return '/Haven-Space/client/views/public/auth/login.html';
    }
    if (pathname.includes('/views/')) {
      return '/views/public/auth/login.html';
    }
    return '/views/public/auth/login.html';
  }

  function initialsFrom(user) {
    const a = (user.first_name || '').trim().charAt(0);
    const b = (user.last_name || '').trim().charAt(0);
    return (a + b || 'B').toUpperCase();
  }

  let user;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, { credentials: 'include' });
    if (!res.ok) {
      window.location.href = loginPath();
      return;
    }
    const data = await res.json();
    user = data.user;
  } catch {
    window.location.href = loginPath();
    return;
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Boarder';
  const initials = initialsFrom(user);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    import('../../components/sidebar.js').then(({ initSidebar }) => {
      initSidebar({
        role: 'boarder',
        user: {
          name,
          initials,
          role: 'Boarder',
          email: user.email || '',
        },
      });
    });
  }

  // Initialize navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    import('../../components/navbar.js').then(({ initNavbar }) => {
      initNavbar({
        user: {
          name,
          initials,
          avatarUrl: user.avatar_url || '',
          email: user.email || '',
        },
        notificationCount: 3,
      });
    });
  }
}

/**
 * Set up Payment Method Selection
 */
function setupPaymentMethodSelection() {
  const methodOptions = document.querySelectorAll('.payment-method-option');

  methodOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected from all options
      methodOptions.forEach(opt => opt.classList.remove('selected'));

      // Add selected to clicked option
      option.classList.add('selected');

      // Update selected method
      paymentState.selectedMethod = option.dataset.method;

      // Show corresponding payment form
      showPaymentForm(paymentState.selectedMethod);
    });
  });
}

/**
 * Show Payment Form based on selected method
 * @param {string} method - Payment method (gcash, bank, card)
 */
function showPaymentForm(method) {
  const gcashForm = document.getElementById('gcashPaymentForm');
  const bankForm = document.getElementById('bankPaymentForm');
  const cardForm = document.getElementById('cardPaymentForm');

  // Hide all forms
  if (gcashForm) {
    gcashForm.style.display = 'none';
  }
  if (bankForm) {
    bankForm.style.display = 'none';
  }
  if (cardForm) {
    cardForm.style.display = 'none';
  }

  // Show selected form
  if (method === 'gcash' && gcashForm) {
    gcashForm.style.display = 'block';
  } else if (method === 'bank' && bankForm) {
    bankForm.style.display = 'block';
  } else if (method === 'card' && cardForm) {
    cardForm.style.display = 'block';
  }
}

/**
 * Set up Form Interactions
 */
function setupFormInteractions() {
  // Copy phone number button
  const copyPhoneBtn = document.getElementById('copyPhoneBtn');
  if (copyPhoneBtn) {
    copyPhoneBtn.addEventListener('click', handleCopyPhoneNumber);
  }

  // Refresh QR button
  const refreshQRBtn = document.getElementById('refreshQRBtn');
  if (refreshQRBtn) {
    refreshQRBtn.addEventListener('click', handleRefreshQR);
  }

  // Download QR button
  const downloadQRBtn = document.getElementById('downloadQRBtn');
  if (downloadQRBtn) {
    downloadQRBtn.addEventListener('click', handleDownloadQR);
  }

  // File upload preview
  const proofUpload = document.getElementById('proofUpload');
  if (proofUpload) {
    proofUpload.addEventListener('change', handleFileUpload);
  }

  // Cancel button
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', handleCancel);
  }

  // Submit payment button
  const submitPaymentBtn = document.getElementById('submitPaymentBtn');
  if (submitPaymentBtn) {
    submitPaymentBtn.addEventListener('click', handleSubmitPayment);
  }

  // Success modal buttons
  const doneBtn = document.getElementById('doneBtn');
  if (doneBtn) {
    doneBtn.addEventListener('click', handleDone);
  }

  const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
  if (downloadReceiptBtn) {
    downloadReceiptBtn.addEventListener('click', handleDownloadReceipt);
  }

  // Error modal buttons
  const cancelErrorBtn = document.getElementById('cancelErrorBtn');
  if (cancelErrorBtn) {
    cancelErrorBtn.addEventListener('click', () => hideErrorModal());
  }

  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', handleRetry);
  }
}

/**
 * Handle Copy Phone Number
 */
function handleCopyPhoneNumber() {
  const phoneNumber = '0917-123-4567';
  navigator.clipboard
    .writeText(phoneNumber)
    .then(() => {
      showToast('Phone number copied to clipboard');
    })
    .catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy phone number', 'error');
    });
}

/**
 * Handle Refresh QR Code
 */
function handleRefreshQR() {
  // Reset timer
  paymentState.qrTimeRemaining = 15 * 60;
  updateTimerDisplay();

  // TODO: Generate new QR code from backend
  showToast('QR Code refreshed successfully');
}

/**
 * Handle Download QR Code
 */
function handleDownloadQR() {
  // TODO: Generate actual QR code and download
  // For now, show a message
  showToast('QR Code download initiated');
}

/**
 * Handle File Upload
 * @param {Event} event - File input change event
 */
function handleFileUpload(event) {
  const file = event.target.files[0];
  const filePreview = document.getElementById('filePreview');

  if (file) {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      event.target.value = '';
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a valid file (PNG, JPG, or PDF)', 'error');
      event.target.value = '';
      return;
    }

    // Show file preview
    if (filePreview) {
      filePreview.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
      filePreview.classList.add('has-file');
    }

    showToast('File uploaded successfully');
  }
}

/**
 * Format File Size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Handle Cancel
 */
function handleCancel() {
  if (confirm('Are you sure you want to cancel this payment?')) {
    window.history.back();
  }
}

/**
 * Handle Submit Payment
 */
async function handleSubmitPayment() {
  // Validate form
  const isValid = validatePaymentForm();
  if (!isValid) {
    return;
  }

  // Get form values
  const referenceNumber = document.getElementById('referenceNumber').value.trim();
  const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
  const paymentDate = document.getElementById('paymentDate').value;
  document.getElementById('termsAccept').checked;

  // Disable submit button
  const submitBtn = document.getElementById('submitPaymentBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Processing...
    `;
  }

  // TODO: Integrate with backend API for payment processing
  // Simulate API call
  try {
    await simulatePaymentProcessing();

    // Show success modal
    showSuccessModal({
      referenceNumber,
      amount: paymentAmount,
      method: paymentState.selectedMethod === 'gcash' ? 'GCash' : 'Bank Transfer',
      date: new Date(paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
    showErrorModal('There was an error processing your payment. Please try again.');
  } finally {
    // Re-enable submit button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        ${getIcon('check', { strokeWidth: '2' })}
        Submit Payment
      `;
    }
  }
}

/**
 * Validate Payment Form
 * @returns {boolean} Is form valid
 */
function validatePaymentForm() {
  const referenceNumber = document.getElementById('referenceNumber').value.trim();
  const paymentAmount = document.getElementById('paymentAmount').value;
  const paymentDate = document.getElementById('paymentDate').value;
  const termsAccepted = document.getElementById('termsAccept').checked;

  // Validate reference number
  if (!referenceNumber) {
    showToast('Please enter GCash reference number', 'error');
    document.getElementById('referenceNumber').focus();
    return false;
  }

  if (referenceNumber.length < 6) {
    showToast('Reference number must be at least 6 characters', 'error');
    document.getElementById('referenceNumber').focus();
    return false;
  }

  // Validate payment amount
  if (!paymentAmount) {
    showToast('Please enter payment amount', 'error');
    document.getElementById('paymentAmount').focus();
    return false;
  }

  if (parseFloat(paymentAmount) <= 0) {
    showToast('Payment amount must be greater than 0', 'error');
    document.getElementById('paymentAmount').focus();
    return false;
  }

  // Validate payment date
  if (!paymentDate) {
    showToast('Please select payment date', 'error');
    document.getElementById('paymentDate').focus();
    return false;
  }

  // Validate terms acceptance
  if (!termsAccepted) {
    showToast('Please accept the terms to continue', 'error');
    return false;
  }

  return true;
}

/**
 * Simulate Payment Processing (Replace with actual API call)
 * @returns {Promise<void>}
 */
function simulatePaymentProcessing() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate 90% success rate
      if (Math.random() > 0.1) {
        resolve();
      } else {
        reject(new Error('Simulated payment failure'));
      }
    }, 2000);
  });
}

/**
 * Show Success Modal
 * @param {Object} paymentData - Payment details
 */
function showSuccessModal(paymentData) {
  const modal = document.getElementById('successModal');
  const refNumberEl = document.getElementById('modalRefNumber');
  const amountEl = document.getElementById('modalAmount');
  const methodEl = document.getElementById('modalMethod');
  const dateEl = document.getElementById('modalDate');

  if (refNumberEl) {
    refNumberEl.textContent = paymentData.referenceNumber;
  }
  if (amountEl) {
    amountEl.textContent = `₱${paymentData.amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
    })}`;
  }
  if (methodEl) {
    methodEl.textContent = paymentData.method;
  }
  if (dateEl) {
    dateEl.textContent = paymentData.date;
  }

  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Hide Success Modal
 */
function hideSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Show Error Modal
 * @param {string} message - Error message
 */
function showErrorModal(message = 'There was an error processing your payment. Please try again.') {
  const modal = document.getElementById('errorModal');
  const messageEl = document.getElementById('errorMessage');

  if (messageEl) {
    messageEl.textContent = message;
  }

  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Hide Error Modal
 */
function hideErrorModal() {
  const modal = document.getElementById('errorModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Handle Done (from success modal)
 */
function handleDone() {
  hideSuccessModal();
  // Navigate back to payments page
  window.location.href = 'index.html';
}

/**
 * Handle Download Receipt
 */
function handleDownloadReceipt() {
  // TODO: Generate and download receipt PDF
  showToast('Receipt download initiated');
}

/**
 * Handle Retry (from error modal)
 */
function handleRetry() {
  hideErrorModal();
  // Re-submit payment
  handleSubmitPayment();
}

/**
 * Start QR Timer
 */
function startQRTimer() {
  const timerElement = document.getElementById('qrTimer');

  if (!timerElement) {
    return;
  }

  // Clear existing timer
  if (paymentState.qrTimer) {
    clearInterval(paymentState.qrTimer);
  }

  // Update timer every second
  paymentState.qrTimer = setInterval(() => {
    if (paymentState.qrTimeRemaining > 0) {
      paymentState.qrTimeRemaining--;
      updateTimerDisplay();
    } else {
      // Timer expired
      handleQRExpired();
    }
  }, 1000);
}

/**
 * Update Timer Display
 */
function updateTimerDisplay() {
  const timerElement = document.getElementById('qrTimer');
  if (!timerElement) {
    return;
  }

  const minutes = Math.floor(paymentState.qrTimeRemaining / 60);
  const seconds = paymentState.qrTimeRemaining % 60;

  timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  // Change color when less than 2 minutes remaining
  if (paymentState.qrTimeRemaining < 120) {
    timerElement.style.color = 'var(--payment-process-red)';
  }
}

/**
 * Handle QR Expired
 */
function handleQRExpired() {
  clearInterval(paymentState.qrTimer);
  showToast('QR Code has expired. Please refresh.', 'error');

  // Auto-refresh QR code after 3 seconds
  setTimeout(() => {
    handleRefreshQR();
  }, 3000);
}

/**
 * Set Default Payment Date to Today
 */
function setDefaultPaymentDate() {
  const dateInput = document.getElementById('paymentDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

/**
 * Show Toast Notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error)
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  if (!toast || !toastMessage) {
    return;
  }

  // Set message and type
  toastMessage.textContent = message;
  toast.className = `payment-toast ${type}`;

  // Show toast
  toast.style.display = 'flex';

  // Hide after 3 seconds
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

/**
 * Cleanup on page unload
 */
function cleanup() {
  if (paymentState.qrTimer) {
    clearInterval(paymentState.qrTimer);
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanup);
