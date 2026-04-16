/**
 * Landlord Payment Record Page
 *
 * Handles recording payments received from boarders via various payment methods
 * including GCash, Bank Transfer, Credit Card, and Cash.
 */

import CONFIG from '../../config.js';

// Payment data - loaded dynamically from API
let pendingPaymentsData = [];

// State management
let selectedPaymentId = null;
let selectedPaymentMethod = 'gcash';
const uploadedFiles = {
  gcash: [],
  bank: [],
  card: [],
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-PH', options);
}

/**
 * Format date for input field
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Date in YYYY-MM-DD format for input
 */
function _formatDateForInput(dateString) {
  return dateString;
}

/**
 * Load pending payments from API
 */
async function loadPendingPayments() {
  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/payments.php?status=pending`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch pending payments');
    }

    const result = await response.json();

    if (result.data && Array.isArray(result.data)) {
      // Transform API data to match frontend format
      pendingPaymentsData = result.data.map(payment => ({
        id: payment.id,
        boarderName: `${payment.boarder_first_name} ${payment.boarder_last_name}`,
        boarderEmail: payment.boarder_email,
        boarderInitials: `${payment.boarder_first_name[0]}${payment.boarder_last_name[0]}`,
        property: payment.property_title,
        room: payment.room_title,
        amount: parseFloat(payment.amount) + parseFloat(payment.late_fee || 0),
        baseRent: parseFloat(payment.amount),
        utilities: 0,
        wifi: 0,
        dueDate: payment.due_date,
        period: formatPeriod(payment.due_date),
        status: payment.status,
      }));

      populateBoarderDropdown();
    }
  } catch (error) {
    console.error('Failed to load pending payments:', error);
  }
}

/**
 * Format period from due date
 * @param {string} dueDate - Due date in YYYY-MM-DD format
 * @returns {string} Formatted period (e.g., "January 2025")
 */
function formatPeriod(dueDate) {
  const date = new Date(dueDate);
  const options = { year: 'numeric', month: 'long' };
  return date.toLocaleDateString('en-PH', options);
}

/**
 * Populate boarder payment dropdown
 */
function populateBoarderDropdown() {
  const select = document.getElementById('boarderPaymentSelect');
  if (!select) {
    return;
  }

  // Filter out already recorded payments
  const availablePayments = pendingPaymentsData.filter(p => p.status !== 'paid');

  if (availablePayments.length === 0) {
    select.innerHTML = '<option value="">-- No pending payments --</option>';
    return;
  }

  select.innerHTML =
    '<option value="">-- Select a payment to record --</option>' +
    availablePayments
      .map(
        payment => `
      <option value="${payment.id}">
        ${payment.boarderName} - ${payment.property} (${payment.period}) - ${formatCurrency(
          payment.amount
        )}
      </option>
    `
      )
      .join('');
}

/**
 * Display selected payment information
 * @param {number} paymentId - Selected payment ID
 */
function displaySelectedPayment(paymentId) {
  const payment = pendingPaymentsData.find(p => p.id === parseInt(paymentId));
  if (!payment) {
    return;
  }

  selectedPaymentId = payment.id;

  // Show selected payment info
  const selectedInfo = document.getElementById('selectedPaymentInfo');
  const selectedBoarder = document.getElementById('selectedBoarder');
  const selectedProperty = document.getElementById('selectedProperty');
  const selectedAmount = document.getElementById('selectedAmount');
  const selectedDueDate = document.getElementById('selectedDueDate');

  if (selectedInfo) {
    selectedInfo.style.display = 'block';
  }

  if (selectedBoarder) {
    selectedBoarder.textContent = `${payment.boarderName} (${payment.boarderEmail})`;
  }

  if (selectedProperty) {
    selectedProperty.textContent = `${payment.property} - ${payment.room}`;
  }

  if (selectedAmount) {
    selectedAmount.textContent = formatCurrency(payment.amount);
  }

  if (selectedDueDate) {
    selectedDueDate.textContent = formatDate(payment.dueDate);
  }

  // Update payment summary
  updatePaymentSummary(payment);

  // Auto-fill amount
  const paymentAmount = document.getElementById('paymentAmount');
  if (paymentAmount) {
    paymentAmount.value = payment.amount.toFixed(2);
  }

  // Check if boarder already submitted payment and pre-fill details
  // TODO: Implement when boarder payment submission is available
  /*
  if (payment.boarderSubmittedPayment && payment.boarderSubmittedPayment.submitted) {
    prefillBoarderPaymentDetails(payment);
  }
  */

  // Set default payment date to today
  setDefaultPaymentDate();
}

/**
 * Update payment summary card
 * @param {Object} payment - Payment data
 */
function updatePaymentSummary(payment) {
  const elements = {
    paymentPeriod: document.getElementById('paymentPeriod'),
    baseRent: document.getElementById('baseRent'),
    utilities: document.getElementById('utilities'),
    wifi: document.getElementById('wifi'),
    totalAmount: document.getElementById('totalAmount'),
  };

  if (elements.paymentPeriod) {
    elements.paymentPeriod.textContent = payment.period;
  }

  if (elements.baseRent) {
    elements.baseRent.textContent = formatCurrency(payment.baseRent);
  }

  if (elements.utilities) {
    elements.utilities.textContent = formatCurrency(payment.utilities);
  }

  if (elements.wifi) {
    elements.wifi.textContent = formatCurrency(payment.wifi);
  }

  if (elements.totalAmount) {
    elements.totalAmount.textContent = formatCurrency(payment.amount);
  }
}

/**
 * Prefill payment details from boarder's submission
 * TODO: This connects to the boarder's payment submission
 * @param {Object} payment - Payment data with boarderSubmittedPayment
 */
function prefillBoarderPaymentDetails(payment) {
  const submission = payment.boarderSubmittedPayment;

  if (!submission) {
    return;
  }

  // Prefill based on payment method
  if (submission.paymentMethod === 'gcash') {
    const refNumber = document.getElementById('gcashReferenceNumber');
    const payerNumber = document.getElementById('gcashPayerNumber');
    const paymentDate = document.getElementById('gcashPaymentDate');

    if (refNumber) {
      refNumber.value = submission.referenceNumber || '';
    }
    if (payerNumber) {
      payerNumber.value = submission.payerNumber || '';
    }
    if (paymentDate) {
      paymentDate.value = submission.paymentDate || '';
    }

    // Switch to GCash method
    selectPaymentMethod('gcash');
  } else if (submission.paymentMethod === 'bank') {
    const refNumber = document.getElementById('bankReferenceNumber');
    const bankName = document.getElementById('bankName');
    const paymentDate = document.getElementById('bankPaymentDate');

    if (refNumber) {
      refNumber.value = submission.referenceNumber || '';
    }
    if (bankName) {
      bankName.value = submission.bankName || '';
    }
    if (paymentDate) {
      paymentDate.value = submission.paymentDate || '';
    }

    // Switch to Bank Transfer method
    selectPaymentMethod('bank');
  }

  // Show notification that boarder already submitted
  showBoarderSubmissionNotification(payment);
}

/**
 * Show notification about boarder's payment submission
 * @param {Object} payment - Payment data
 */
function showBoarderSubmissionNotification(payment) {
  // Create notification banner
  const notification = document.createElement('div');
  notification.className = 'boarder-submission-notification';
  notification.style.cssText = `
    background-color: rgba(34, 197, 94, 0.1);
    border: 1px solid var(--dashboard-success);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: start;
    gap: 12px;
  `;
  notification.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24" style="color: var(--dashboard-success); flex-shrink: 0;">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div>
      <h4 style="font-size: 14px; font-weight: 600; color: var(--dashboard-text-primary); margin-bottom: 4px;">
        Boarder has already submitted payment details
      </h4>
      <p style="font-size: 13px; color: var(--dashboard-text-secondary);">
        ${payment.boarderName} submitted their payment via ${
    payment.boarderSubmittedPayment.paymentMethod === 'gcash' ? 'GCash' : 'Bank Transfer'
  }. 
        Reference number has been pre-filled for your convenience.
      </p>
    </div>
  `;

  // Insert after page header
  const header = document.querySelector('.payment-record-header');
  if (header) {
    header.parentNode.insertBefore(notification, header.nextSibling);
  }
}

/**
 * Set default payment date to today
 */
function setDefaultPaymentDate() {
  const today = new Date().toISOString().split('T')[0];

  const dateInputs = ['gcashPaymentDate', 'bankPaymentDate', 'cardPaymentDate', 'cashPaymentDate'];

  dateInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.value = today;
    }
  });
}

/**
 * Select payment method and show corresponding form
 * @param {string} method - Payment method (gcash, bank, card, cash)
 */
function selectPaymentMethod(method) {
  selectedPaymentMethod = method;

  // Update method selection UI
  const methodOptions = document.querySelectorAll('.payment-method-option');
  methodOptions.forEach(option => {
    if (option.dataset.method === method) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });

  // Show/hide payment detail forms
  const detailForms = {
    gcash: document.getElementById('gcashPaymentDetails'),
    bank: document.getElementById('bankPaymentDetails'),
    card: document.getElementById('cardPaymentDetails'),
    cash: document.getElementById('cashPaymentDetails'),
  };

  Object.keys(detailForms).forEach(key => {
    if (detailForms[key]) {
      detailForms[key].style.display = key === method ? 'block' : 'none';
    }
  });
}

/**
 * Handle file upload
 * @param {string} method - Payment method
 * @param {FileList} files - Uploaded files
 */
function handleFileUpload(method, files) {
  const previewContainer = document.getElementById(`${method}FilePreview`);
  if (!previewContainer) {
    return;
  }

  Array.from(files).forEach(file => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(`File ${file.name} exceeds 5MB limit.`);
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert(`File ${file.name} is not a valid format. Please upload PNG, JPG, or PDF.`);
      return;
    }

    // Add to uploaded files
    uploadedFiles[method].push(file);

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        const previewItem = document.createElement('div');
        previewItem.className = 'payment-file-preview-item';
        previewItem.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}" />
          <button class="remove-file" onclick="removeFile('${method}', '${file.name}')">&times;</button>
        `;
        previewContainer.appendChild(previewItem);
      };
      reader.readAsDataURL(file);
    } else {
      // PDF preview
      const previewItem = document.createElement('div');
      previewItem.className = 'payment-file-preview-item';
      previewItem.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: var(--bg-cream); font-size: 12px; text-align: center; padding: 4px;">
          📄 ${file.name}
        </div>
        <button class="remove-file" onclick="removeFile('${method}', '${file.name}')">&times;</button>
      `;
      previewContainer.appendChild(previewItem);
    }
  });
}

/**
 * Remove uploaded file
 * @param {string} method - Payment method
 * @param {string} fileName - File name to remove
 */
function _removeFile(method, fileName) {
  uploadedFiles[method] = uploadedFiles[method].filter(f => f.name !== fileName);

  const previewContainer = document.getElementById(`${method}FilePreview`);
  if (previewContainer) {
    previewContainer.innerHTML = '';
    // Re-add remaining previews
    uploadedFiles[method].forEach(file => {
      // Re-create preview (simplified version)
      handleFileUpload(method, [file]);
    });
  }
}

/**
 * Validate payment form
 * @returns {Object} Validation result with isValid and errors
 */
function validateForm() {
  const errors = [];

  // Check if payment is selected
  if (!selectedPaymentId) {
    errors.push('Please select a boarder payment to record.');
  }

  // Get required fields based on payment method
  if (selectedPaymentMethod === 'gcash') {
    const refNumber = document.getElementById('gcashReferenceNumber')?.value.trim();
    const payerNumber = document.getElementById('gcashPayerNumber')?.value.trim();
    const paymentDate = document.getElementById('gcashPaymentDate')?.value;

    if (!refNumber) {
      errors.push('GCash reference number is required.');
    }
    if (!payerNumber) {
      errors.push('GCash payer number is required.');
    }
    if (!paymentDate) {
      errors.push('Payment date is required.');
    }
  } else if (selectedPaymentMethod === 'bank') {
    const refNumber = document.getElementById('bankReferenceNumber')?.value.trim();
    const bankName = document.getElementById('bankName')?.value;
    const paymentDate = document.getElementById('bankPaymentDate')?.value;

    if (!refNumber) {
      errors.push('Bank reference number is required.');
    }
    if (!bankName) {
      errors.push('Bank name is required.');
    }
    if (!paymentDate) {
      errors.push('Payment date is required.');
    }
  } else if (selectedPaymentMethod === 'card') {
    const refNumber = document.getElementById('cardReferenceNumber')?.value.trim();
    const cardType = document.getElementById('cardType')?.value;
    const paymentDate = document.getElementById('cardPaymentDate')?.value;

    if (!refNumber) {
      errors.push('Transaction reference number is required.');
    }
    if (!cardType) {
      errors.push('Card type is required.');
    }
    if (!paymentDate) {
      errors.push('Payment date is required.');
    }
  } else if (selectedPaymentMethod === 'cash') {
    const receivedBy = document.getElementById('cashReceivedBy')?.value.trim();
    const paymentDate = document.getElementById('cashPaymentDate')?.value;

    if (!receivedBy) {
      errors.push('Received by name is required.');
    }
    if (!paymentDate) {
      errors.push('Payment date is required.');
    }
  }

  // Check amount
  const amount = document.getElementById('paymentAmount')?.value;
  if (!amount || parseFloat(amount) <= 0) {
    errors.push('Please enter a valid payment amount.');
  }

  // Check terms acceptance
  const termsAccept = document.getElementById('termsAccept')?.checked;
  if (!termsAccept) {
    errors.push('You must confirm the payment information is correct.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get payment data from form
 * @returns {Object} Payment data
 */
function getPaymentData() {
  const payment = pendingPaymentsData.find(p => p.id === selectedPaymentId);
  if (!payment) {
    return null;
  }

  const baseData = {
    paymentId: selectedPaymentId,
    boarderName: payment.boarderName,
    boarderEmail: payment.boarderEmail,
    property: payment.property,
    room: payment.room,
    amount: parseFloat(document.getElementById('paymentAmount')?.value || 0),
    paymentDate: document.getElementById(`${selectedPaymentMethod}PaymentDate`)?.value,
    paymentMethod: selectedPaymentMethod,
    notes: document.getElementById('paymentNotes')?.value.trim() || '',
    recordedDate: new Date().toISOString(),
  };

  // Add method-specific data
  if (selectedPaymentMethod === 'gcash') {
    baseData.referenceNumber = document.getElementById('gcashReferenceNumber')?.value.trim();
    baseData.payerNumber = document.getElementById('gcashPayerNumber')?.value.trim();
  } else if (selectedPaymentMethod === 'bank') {
    baseData.referenceNumber = document.getElementById('bankReferenceNumber')?.value.trim();
    baseData.bankName = document.getElementById('bankName')?.value;
  } else if (selectedPaymentMethod === 'card') {
    baseData.referenceNumber = document.getElementById('cardReferenceNumber')?.value.trim();
    baseData.cardType = document.getElementById('cardType')?.value;
  } else if (selectedPaymentMethod === 'cash') {
    baseData.receivedBy = document.getElementById('cashReceivedBy')?.value.trim();
    baseData.cashNotes = document.getElementById('cashNotes')?.value.trim();
  }

  baseData.attachments = uploadedFiles[selectedPaymentMethod];

  return baseData;
}

/**
 * Submit payment record
 */
async function submitPayment() {
  // Validate form
  const validation = validateForm();
  if (!validation.isValid) {
    alert('Please correct the following errors:\n\n' + validation.errors.join('\n'));
    return;
  }

  // Get payment data
  const paymentData = getPaymentData();
  if (!paymentData) {
    alert('Error: Payment data not found.');
    return;
  }

  try {
    // Submit to backend API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payments.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        payment_id: paymentData.paymentId,
        paid_date: paymentData.paymentDate,
        payment_method: paymentData.paymentMethod,
        reference_number: paymentData.referenceNumber,
        notes: paymentData.notes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to record payment');
    }

    const result = await response.json();

    if (result.success) {
      // Update local data
      const paymentIndex = pendingPaymentsData.findIndex(p => p.id === selectedPaymentId);
      if (paymentIndex !== -1) {
        pendingPaymentsData[paymentIndex].status = 'paid';
        pendingPaymentsData[paymentIndex].recordedPayment = paymentData;
      }

      // Show confirmation modal
      showConfirmationModal(paymentData);
    } else {
      throw new Error('Failed to record payment');
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    alert('Failed to record payment: ' + error.message);
  }
}

/**
 * Show payment confirmation modal
 * @param {Object} paymentData - Recorded payment data
 */
function showConfirmationModal(paymentData) {
  const modal = document.getElementById('paymentConfirmationModal');
  const detailsContainer = document.getElementById('confirmationDetails');

  if (!modal || !detailsContainer) {
    return;
  }

  const methodLabels = {
    gcash: 'GCash',
    bank: 'Bank Transfer',
    card: 'Credit/Debit Card',
    cash: 'Cash',
  };

  detailsContainer.innerHTML = `
    <div class="confirmation-row">
      <span class="confirmation-label">Boarder</span>
      <span class="confirmation-value">${paymentData.boarderName}</span>
    </div>
    <div class="confirmation-row">
      <span class="confirmation-label">Property</span>
      <span class="confirmation-value">${paymentData.property} - ${paymentData.room}</span>
    </div>
    <div class="confirmation-row">
      <span class="confirmation-label">Payment Method</span>
      <span class="confirmation-value">${methodLabels[paymentData.paymentMethod]}</span>
    </div>
    ${
      paymentData.referenceNumber
        ? `
    <div class="confirmation-row">
      <span class="confirmation-label">Reference Number</span>
      <span class="confirmation-value">${paymentData.referenceNumber}</span>
    </div>
    `
        : ''
    }
    <div class="confirmation-row">
      <span class="confirmation-label">Payment Date</span>
      <span class="confirmation-value">${formatDate(paymentData.paymentDate)}</span>
    </div>
    <div class="confirmation-row">
      <span class="confirmation-label">Amount Received</span>
      <span class="confirmation-value highlight">${formatCurrency(paymentData.amount)}</span>
    </div>
  `;

  modal.classList.add('active');
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Boarder payment selection
  const boarderSelect = document.getElementById('boarderPaymentSelect');
  if (boarderSelect) {
    boarderSelect.addEventListener('change', e => {
      if (e.target.value) {
        displaySelectedPayment(e.target.value);
      } else {
        selectedPaymentId = null;
        const selectedInfo = document.getElementById('selectedPaymentInfo');
        if (selectedInfo) {
          selectedInfo.style.display = 'none';
        }
      }
    });
  }

  // Payment method selection
  const methodOptions = document.querySelectorAll('.payment-method-option');
  methodOptions.forEach(option => {
    option.addEventListener('click', () => {
      const method = option.dataset.method;
      selectPaymentMethod(method);
    });
  });

  // File uploads
  const fileInputs = {
    gcash: document.getElementById('gcashProofUpload'),
    bank: document.getElementById('bankProofUpload'),
    card: document.getElementById('cardProofUpload'),
  };

  Object.keys(fileInputs).forEach(method => {
    const input = fileInputs[method];
    if (input) {
      input.addEventListener('change', e => {
        handleFileUpload(method, e.target.files);
      });
    }
  });

  // Submit payment button
  const submitBtn = document.getElementById('submitPaymentBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitPayment);
  }

  // Modal close buttons
  const doneBtn = document.getElementById('doneBtn');
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }

  const printReceiptBtn = document.getElementById('printReceiptBtn');
  if (printReceiptBtn) {
    printReceiptBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Download QR button
  const downloadQRBtn = document.getElementById('downloadQRBtn');
  if (downloadQRBtn) {
    downloadQRBtn.addEventListener('click', () => {
      alert('QR code download functionality would generate and download the QR code image.');
      // TODO: Implement QR code download using canvas or library
    });
  }
}

/**
 * Initialize the payment record page
 */
function initPaymentRecordPage() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await loadPendingPayments();
      initEventListeners();
      setDefaultPaymentDate();
      // Default to GCash
      selectPaymentMethod('gcash');
      // Check for paymentId in URL
      handleURLParameters();
    });
  } else {
    loadPendingPayments().then(() => {
      initEventListeners();
      setDefaultPaymentDate();
      selectPaymentMethod('gcash');
      handleURLParameters();
    });
  }
}

/**
 * Handle URL parameters (e.g., ?paymentId=1)
 * This allows the payments page to pass the selected payment to this page
 */
function handleURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentId = urlParams.get('paymentId');

  if (paymentId) {
    const select = document.getElementById('boarderPaymentSelect');
    if (select) {
      select.value = paymentId;
      // Trigger change event to populate payment details
      const event = new Event('change');
      select.dispatchEvent(event);
    }
  }
}

// Export for use in main.js
export { initPaymentRecordPage };

// Auto-initialize if this script is loaded directly
initPaymentRecordPage();
