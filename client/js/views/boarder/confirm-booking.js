/**
 * Confirm Booking Page
 * Handles the final confirmation step when a boarder's application has been accepted
 */

import { getIcon } from '../../shared/icons.js';
import { updateBoarderStatus, getBoarderStatus } from '../../shared/routing.js';

/**
 * Initialize the confirm booking page
 */
export function initConfirmBooking() {
  // Get accepted application from localStorage or URL params
  const application = getAcceptedApplication();

  if (!application) {
    // No accepted application found - show error instead of silent redirect
    console.error('No application data found for confirm-booking page');
    showMissingDataError();
    return;
  }

  // Check if boarder already accepted a landlord
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.boarderStatus === 'accepted') {
    // Already confirmed a booking - cancel other applications and redirect to dashboard
    cancelOtherApplications(application.id);
    window.location.href = '../index.html';
    return;
  }

  // Populate property details
  populateApplicationDetails(application);

  // Populate payment details
  populatePaymentDetails(application);

  // Setup terms checkbox
  const termsCheckbox = document.getElementById('terms-agreement');
  const acceptBtn = document.getElementById('confirm-accept-btn');

  if (termsCheckbox && acceptBtn) {
    termsCheckbox.addEventListener('change', () => {
      acceptBtn.disabled = !termsCheckbox.checked;
    });
  }

  // Setup payment method selection
  setupPaymentMethodSelection();

  // Setup accept button
  if (acceptBtn) {
    acceptBtn.addEventListener('click', async () => {
      await handleAcceptBooking(application);
    });
  }

  // Setup decline button
  const declineBtn = document.getElementById('confirm-decline-btn');
  if (declineBtn) {
    declineBtn.addEventListener('click', () => {
      handleDeclineBooking(application);
    });
  }

  // Setup success modal done button
  const doneBtn = document.getElementById('modal-done-btn');
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
  }
}

/**
 * Show error message when application data is missing
 */
function showMissingDataError() {
  const container = document.querySelector('.confirm-booking-container');
  if (!container) return;

  container.innerHTML = `
    <div class="confirm-booking-error">
      ${getIcon('exclamation-triangle', {
        width: 64,
        height: 64,
        className: 'confirm-booking-error-icon',
      })}
      <h2>Application Data Not Found</h2>
      <p>We couldn't find the application details. Please try again from the Find a Room page.</p>
      <a href="../../public/find-a-room.html" class="confirm-booking-error-btn">
        ${getIcon('arrow-left', { width: 20, height: 20 })}
        <span>Back to Find a Room</span>
      </a>
    </div>
  `;
}

/**
 * Get the accepted application from URL params or localStorage
 * @returns {Object|null} Application object or null
 */
function getAcceptedApplication() {
  // Check URL params first
  const urlParams = new URLSearchParams(window.location.search);
  const appId = urlParams.get('applicationId');

  if (appId) {
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const application = applications.find(app => app.id === parseInt(appId));

    if (application) {
      console.log('Application found in localStorage:', application);
      return application;
    }

    // Fallback: Try to reconstruct from URL params if not found in localStorage
    console.warn(
      'Application not found in localStorage, attempting to reconstruct from URL params'
    );
    return reconstructApplicationFromParams(appId);
  }

  // Fallback: get from localStorage (single accepted application)
  return JSON.parse(localStorage.getItem('acceptedApplication') || 'null');
}

/**
 * Reconstruct application object from URL parameters
 * @param {string} appId - Application ID
 * @returns {Object|null} Reconstructed application or null
 */
function reconstructApplicationFromParams(appId) {
  const urlParams = new URLSearchParams(window.location.search);
  const title = urlParams.get('title') || urlParams.get('property');
  const price = urlParams.get('price') || urlParams.get('monthlyRent');
  const address = urlParams.get('address') || urlParams.get('location');

  if (!title && !price) {
    console.error('Cannot reconstruct application - missing required params');
    return null;
  }

  const reconstructed = {
    id: parseInt(appId),
    propertyId: parseInt(appId),
    title: title || 'Unknown Property',
    address: address || 'Address not available',
    price: price ? parseInt(price) : 0,
    monthlyRent: price ? parseInt(price) : 0,
    status: 'pending_confirmation',
    appliedDate: new Date().toISOString().split('T')[0],
  };

  console.log('Reconstructed application:', reconstructed);
  return reconstructed;
}

/**
 * Populate the application details in the UI
 * @param {Object} app - Application object
 */
function populateApplicationDetails(app) {
  const propertyName = document.getElementById('confirm-property-name');
  const roomType = document.getElementById('confirm-room-type');
  const monthlyRent = document.getElementById('confirm-monthly-rent');
  const acceptedDate = document.getElementById('confirm-accepted-date');
  const landlordName = document.getElementById('confirm-landlord-name');

  // Use available data with fallbacks
  if (propertyName) propertyName.textContent = app.title || app.propertyName || 'Property Name';
  if (roomType) roomType.textContent = app.roomType || 'Standard Room';
  // Support both price and monthlyRent fields
  const rent = app.monthlyRent || app.price || 5000;
  if (monthlyRent) monthlyRent.textContent = `₱${rent.toLocaleString()}`;
  if (acceptedDate)
    acceptedDate.textContent = formatDate(app.acceptedDate || app.appliedDate || new Date());
  if (landlordName) landlordName.textContent = app.landlordName || 'Property Owner';

  console.log('Populated application details:', {
    title: app.title,
    rent,
    status: app.status,
  });
}

/**
 * Populate payment details in the UI
 * @param {Object} app - Application object
 */
function populatePaymentDetails(app) {
  const rent = app.monthlyRent || app.price || 5000;
  const securityDeposit = rent; // 1 month deposit
  const totalDue = securityDeposit + rent;

  // Update payment breakdown
  const securityDepositEl = document.getElementById('security-deposit');
  const firstMonthRentEl = document.getElementById('first-month-rent');
  const totalDueEl = document.getElementById('total-due');

  if (securityDepositEl) securityDepositEl.textContent = `₱${securityDeposit.toLocaleString()}`;
  if (firstMonthRentEl) firstMonthRentEl.textContent = `₱${rent.toLocaleString()}`;
  if (totalDueEl) totalDueEl.textContent = `₱${totalDue.toLocaleString()}`;

  // Set payment due date (14 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  const paymentDueDateEl = document.getElementById('payment-due-date');
  if (paymentDueDateEl) {
    paymentDueDateEl.textContent = formatDate(dueDate);
  }

  console.log('Populated payment details:', {
    securityDeposit,
    firstMonthRent: rent,
    totalDue,
    dueDate: dueDate.toISOString(),
  });
}

/**
 * Setup payment method selection UI
 */
function setupPaymentMethodSelection() {
  const methodOptions = document.querySelectorAll('.confirm-payment-method-option');

  methodOptions.forEach(option => {
    const radio = option.querySelector('.confirm-payment-method-input');
    if (!radio) return;

    option.addEventListener('click', e => {
      // Remove selected state from all options
      methodOptions.forEach(opt => opt.classList.remove('selected'));

      // Add selected state to clicked option
      option.classList.add('selected');

      // Check the radio button
      radio.checked = true;
    });
  });

  // Select first option by default
  if (methodOptions.length > 0) {
    methodOptions[0].classList.add('selected');
    const firstRadio = methodOptions[0].querySelector('.confirm-payment-method-input');
    if (firstRadio) firstRadio.checked = true;
  }
}

/**
 * Handle accepting the booking
 * @param {Object} application - Application object
 */
async function handleAcceptBooking(application) {
  try {
    // Validate terms agreement
    const termsCheckbox = document.getElementById('terms-agreement');
    if (!termsCheckbox || !termsCheckbox.checked) {
      alert('Please accept the rental agreement terms to continue.');
      return;
    }

    // Get selected payment method
    const selectedMethod = document.querySelector('input[name="payment-method"]:checked');
    if (!selectedMethod) {
      alert('Please select a payment method.');
      return;
    }

    // Show loading state
    const acceptBtn = document.getElementById('confirm-accept-btn');
    const originalText = acceptBtn.innerHTML;
    acceptBtn.disabled = true;
    acceptBtn.innerHTML =
      '<span data-icon="loading" data-icon-width="20" data-icon-height="20"></span> Confirming...';

    // Get payment details
    const rent = application.monthlyRent || application.price || 5000;
    const securityDeposit = rent;
    const totalDue = securityDeposit + rent;

    // Store booking confirmation in localStorage
    const booking = {
      applicationId: application.id,
      propertyId: application.propertyId,
      propertyName: application.title || application.propertyName,
      roomType: application.roomType || 'Standard Room',
      monthlyRent: rent,
      securityDeposit: securityDeposit,
      totalPaid: totalDue,
      paymentMethod: selectedMethod.value,
      moveInDate: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };

    localStorage.setItem('confirmedBooking', JSON.stringify(booking));

    // TODO: Call API to confirm booking
    // await fetch(`${API_BASE_URL}/bookings/confirm.php`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     applicationId: application.id,
    //     paymentMethod: selectedMethod.value
    //   })
    // });

    // Cancel other applications
    cancelOtherApplications(application.id);

    // Update status to 'accepted'
    updateBoarderStatus('accepted');

    // Show success modal
    showSuccessModal(booking);
  } catch (error) {
    console.error('Failed to confirm booking:', error);
    showErrorMessage();
  }
}

/**
 * Show success modal with booking details
 * @param {Object} booking - Booking object
 */
function showSuccessModal(booking) {
  const modal = document.getElementById('success-modal');
  const modalPropertyName = document.getElementById('modal-property-name');
  const modalMoveinDate = document.getElementById('modal-movein-date');
  const modalTotalPaid = document.getElementById('modal-total-paid');

  if (!modal) return;

  // Populate modal with booking details
  if (modalPropertyName) modalPropertyName.textContent = booking.propertyName;
  if (modalMoveinDate) modalMoveinDate.textContent = formatDate(new Date());
  if (modalTotalPaid) modalTotalPaid.textContent = `₱${booking.totalPaid.toLocaleString()}`;

  // Show modal
  modal.style.display = 'flex';
  modal.classList.add('show');
}

/**
 * Handle declining the booking (return to browsing)
 * @param {Object} application - Application object
 */
function handleDeclineBooking(application) {
  // Keep status as 'pending_confirmation' or revert to 'applied_pending'
  // User can continue browsing rooms
  window.location.href = '../../public/find-a-room.html';
}

/**
 * Show error message and reset button state
 */
function showErrorMessage() {
  const acceptBtn = document.getElementById('confirm-accept-btn');
  if (acceptBtn) {
    acceptBtn.disabled = false;
    acceptBtn.textContent = 'Confirm Booking';
    alert('Failed to confirm booking. Please try again.');
  }
}

/**
 * Format a date string for display
 * @param {Date|string} dateString - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Update UI based on application status (pending vs accepted)
 * @param {Object} application - Application object
 */
function updateUIForStatus(application) {
  const title = document.querySelector('.confirm-booking-title');
  const subtitle = document.querySelector('.confirm-booking-subtitle');
  const acceptBtn = document.getElementById('confirm-accept-btn');
  const termsSection = document.querySelector('.confirm-booking-terms');

  if (application.status === 'pending') {
    // Pending application - show waiting message
    if (title) {
      title.textContent = 'Application Pending';
    }
    if (subtitle) {
      subtitle.textContent =
        'Your application is still under review. Please wait for the landlord to respond.';
    }

    // Disable accept button and hide terms section for pending applications
    if (acceptBtn) {
      acceptBtn.disabled = true;
      acceptBtn.textContent = 'Waiting for Landlord';
    }
    if (termsSection) {
      termsSection.style.display = 'none';
    }
  } else if (application.status === 'accepted') {
    // Accepted application - show confirmation UI
    if (title) {
      title.textContent = "You've Been Accepted!";
    }
    if (subtitle) {
      subtitle.textContent =
        'The landlord has accepted your application. Ready to make it official?';
    }

    // Enable accept button (subject to terms checkbox)
    if (acceptBtn) {
      acceptBtn.textContent = 'Confirm Booking';
    }
    if (termsSection) {
      termsSection.style.display = 'block';
    }
  }
}

/**
 * Cancel all other applications when a boarder confirms a booking
 * @param {number} confirmedApplicationId - ID of the confirmed application
 */
function cancelOtherApplications(confirmedApplicationId) {
  const applications = JSON.parse(localStorage.getItem('applications') || '[]');

  const updatedApplications = applications.map(app => {
    if (
      app.id !== confirmedApplicationId &&
      (app.status === 'pending' || app.status === 'accepted')
    ) {
      return { ...app, status: 'cancelled' };
    }
    return app;
  });

  localStorage.setItem('applications', JSON.stringify(updatedApplications));
}
