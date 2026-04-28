/**
 * Confirm Booking Page
 * Handles the final confirmation step when a boarder's application has been accepted
 */

import { getIcon } from '../../shared/icons.js';
import { updateBoarderStatus } from '../../shared/routing.js';

/**
 * Initialize the confirm booking page
 */
export function initConfirmBooking() {
  // Check user role first - only boarders should access this page
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.role === 'landlord') {
    alert('This page is for boarders only. Redirecting to landlord dashboard...');
    window.location.href = '../../landlord/index.html';
    return;
  } else if (!user.role || user.role !== 'boarder') {
    alert('Please log in as a boarder to access this page.');
    window.location.href = '../../public/auth/login.html';
    return;
  }

  // Get application data from URL params or localStorage
  const application = getApplicationData();

  if (!application) {
    // No application data found - show error instead of silent redirect
    console.error('No application data found for confirm-booking page');
    showMissingDataError();
    return;
  }

  // Check if this is a new application (from Apply Now) or accepted application
  const isNewApplication = !application.status || application.status === 'new';

  if (isNewApplication) {
    // User came from "Apply Now" - show moving date setup
    showMovingDateSetup(application);
  } else {
    // Check if boarder already accepted a landlord
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.boarderStatus === 'accepted') {
      // Already confirmed a booking - cancel other applications and redirect to dashboard
      cancelOtherApplications(application.id);
      window.location.href = '../index.html';
      return;
    }

    // Populate property details for accepted application
    populateApplicationDetails(application);
    populatePaymentDetails(application);
    setupAcceptedApplicationFlow(application);
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
 * Get application data from URL params or localStorage
 * @returns {Object|null} Application object or null
 */
function getApplicationData() {
  // Check URL params first
  const urlParams = new URLSearchParams(window.location.search);
  const appId = urlParams.get('id');
  const title = urlParams.get('title');
  const price = urlParams.get('price');

  // If we have URL params, this is likely a new application from "Apply Now"
  if (appId && title) {
    return {
      id: parseInt(appId),
      propertyId: parseInt(appId),
      title: title,
      address: urlParams.get('address') || '',
      price: price ? parseInt(price) : 0,
      monthlyRent: price ? parseInt(price) : 0,
      landlordName: urlParams.get('landlordName') || 'Property Owner',
      roomType: urlParams.get('roomType') || 'Standard Room',
      status: 'new', // Mark as new application
      appliedDate: new Date().toISOString().split('T')[0],
    };
  }

  // Check for accepted application in localStorage
  const applicationId = urlParams.get('applicationId');
  if (applicationId) {
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const application = applications.find(app => app.id === parseInt(applicationId));
    if (application) {
      return application;
    }
  }

  // Fallback: get from localStorage (single accepted application)
  return JSON.parse(localStorage.getItem('acceptedApplication') || 'null');
}

/**
 * Show moving date setup for new applications
 * @param {Object} application - Application object
 */
function showMovingDateSetup(application) {
  const container = document.querySelector('.confirm-booking-container');
  if (!container) return;

  // Update page title and header
  document.title = 'Set Moving Date - Haven Space';

  container.innerHTML = `
    <div class="confirm-booking-header">
      <div class="confirm-booking-header-content">
        <h1 class="confirm-booking-title">Set Your Moving Date</h1>
        <p class="confirm-booking-subtitle">
          Choose your preferred moving date to complete your application
        </p>
      </div>
    </div>

    <!-- Property Summary Card -->
    <div class="confirm-booking-card confirm-property-card">
      <div class="confirm-card-header">
        <h2 class="confirm-card-title">
          <span data-icon="home" data-icon-width="24" data-icon-height="24"></span>
          Property Summary
        </h2>
      </div>
      <div class="confirm-property-details">
        <div class="confirm-property-row">
          <span class="confirm-property-label">Property Name:</span>
          <span class="confirm-property-value">${application.title}</span>
        </div>
        <div class="confirm-property-row">
          <span class="confirm-property-label">Room Type:</span>
          <span class="confirm-property-value">${application.roomType}</span>
        </div>
        <div class="confirm-property-row">
          <span class="confirm-property-label">Monthly Rent:</span>
          <span class="confirm-property-value confirm-property-price">₱${application.monthlyRent.toLocaleString()}</span>
        </div>
        <div class="confirm-property-row">
          <span class="confirm-property-label">Location:</span>
          <span class="confirm-property-value">${
            application.address || 'Contact landlord for details'
          }</span>
        </div>
      </div>
    </div>

    <!-- Moving Date Selection -->
    <div class="confirm-booking-card">
      <div class="confirm-card-header">
        <h2 class="confirm-card-title">
          <span data-icon="calendar" data-icon-width="24" data-icon-height="24"></span>
          Preferred Moving Date
        </h2>
      </div>
      <div class="moving-date-content">
        <div class="moving-date-info">
          <p>Select your preferred moving date. This will be included in your application to help the landlord understand your timeline.</p>
        </div>
        <div class="moving-date-input-group">
          <label for="moving-date-input" class="moving-date-label">Moving Date:</label>
          <input type="date" id="moving-date-input" class="moving-date-input" min="${
            new Date().toISOString().split('T')[0]
          }" />
        </div>
        <div class="moving-date-note">
          <span data-icon="informationCircle" data-icon-width="20" data-icon-height="20"></span>
          <span>You can discuss and adjust this date with the landlord after your application is submitted.</span>
        </div>
      </div>
    </div>

    <!-- Additional Message -->
    <div class="confirm-booking-card">
      <div class="confirm-card-header">
        <h2 class="confirm-card-title">
          <span data-icon="chatBubbleLeft" data-icon-width="24" data-icon-height="24"></span>
          Message to Landlord (Optional)
        </h2>
      </div>
      <div class="message-content">
        <textarea 
          id="application-message" 
          class="application-message-input" 
          placeholder="Tell the landlord a bit about yourself, your occupation, or any questions you have about the property..."
          rows="4"
        ></textarea>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="confirm-booking-actions">
      <button class="confirm-btn confirm-btn-secondary" id="back-to-search-btn">
        <span data-icon="arrowLeft" data-icon-width="20" data-icon-height="20"></span>
        Back to Search
      </button>
      <button class="confirm-btn confirm-btn-primary" id="submit-application-btn" disabled>
        <span data-icon="paperAirplane" data-icon-width="20" data-icon-height="20"></span>
        Submit Application
      </button>
    </div>
  `;

  // Setup event listeners for moving date setup
  setupMovingDateEventListeners(application);
}

/**
 * Setup event listeners for moving date setup
 * @param {Object} application - Application object
 */
function setupMovingDateEventListeners(application) {
  const movingDateInput = document.getElementById('moving-date-input');
  const submitBtn = document.getElementById('submit-application-btn');
  const backBtn = document.getElementById('back-to-search-btn');

  // Enable submit button when date is selected
  if (movingDateInput && submitBtn) {
    movingDateInput.addEventListener('change', () => {
      submitBtn.disabled = !movingDateInput.value;
    });
  }

  // Submit application
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      await handleSubmitApplication(application);
    });
  }

  // Back to search
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '../../public/find-a-room.html';
    });
  }
}

/**
 * Handle submitting the application with moving date
 * @param {Object} application - Application object
 */
async function handleSubmitApplication(application) {
  const movingDateInput = document.getElementById('moving-date-input');
  const messageInput = document.getElementById('application-message');
  const submitBtn = document.getElementById('submit-application-btn');

  if (!movingDateInput || !movingDateInput.value) {
    alert('Please select a moving date.');
    return;
  }

  try {
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span data-icon="loading" data-icon-width="20" data-icon-height="20"></span> Submitting...';

    // Get user authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }

    // Validate user role - must be a boarder to submit applications
    if (user.role !== 'boarder') {
      if (user.role === 'landlord') {
        alert(
          'You are logged in as a landlord. Please log in as a boarder to submit applications.'
        );
        window.location.href = '../../public/auth/login.html';
        return;
      } else {
        throw new Error('Invalid user role. Please log in as a boarder.');
      }
    }

    // First, fetch the property details to get landlord_id and room_id
    const CONFIG = (await import('../../config.js')).default;
    const propertyResponse = await fetch(
      `${CONFIG.API_BASE_URL}/api/rooms/detail?id=${application.propertyId || application.id}`
    );

    if (!propertyResponse.ok) {
      throw new Error('Failed to fetch property details');
    }

    const propertyData = await propertyResponse.json();
    const property = propertyData.data;

    // Find the matching room or use the first available room
    let selectedRoom = null;
    if (property.rooms && property.rooms.length > 0) {
      // Try to match by room type or use first available room
      selectedRoom = property.rooms.find(r => r.status === 'available') || property.rooms[0];
    }

    if (!selectedRoom) {
      throw new Error('No available rooms found for this property');
    }

    // Prepare application data for API
    const apiApplicationData = {
      room_id: selectedRoom.id,
      landlord_id: property.landlord.id,
      property_id: property.id,
      message: `Moving Date: ${movingDateInput.value}\n\n${
        messageInput ? messageInput.value : 'No additional message provided.'
      }`,
    };

    // Submit application to backend API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify(apiApplicationData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit application');
    }

    // Update boarder status to applied_pending
    updateBoarderStatus('applied_pending');

    // Prepare display data for success message
    const displayData = {
      ...application,
      movingDate: movingDateInput.value,
      message: messageInput ? messageInput.value : '',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      applicationId: result.data?.id,
    };

    // Show success and redirect to dashboard
    showApplicationSubmittedSuccess(displayData);
  } catch (error) {
    console.error('Failed to submit application:', error);
    submitBtn.disabled = false;
    submitBtn.innerHTML =
      '<span data-icon="paperAirplane" data-icon-width="20" data-icon-height="20"></span> Submit Application';

    // Check for specific error types and provide better messages
    if (error.message.includes('Forbidden') || error.message.includes('permission')) {
      // Check if user is logged in as wrong role
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.role === 'landlord') {
        alert(
          'You are logged in as a landlord. Please log in as a boarder to submit applications.'
        );
        // Redirect to login page
        window.location.href = '../../public/auth/login.html';
        return;
      } else if (!user.role) {
        alert('Please log in to submit an application.');
        window.location.href = '../../public/auth/login.html';
        return;
      }
    }

    alert(error.message || 'Failed to submit application. Please try again.');
  }
}

/**
 * Show application submitted success message
 * @param {Object} application - Application object
 */
function showApplicationSubmittedSuccess(application) {
  const container = document.querySelector('.confirm-booking-container');
  if (!container) return;

  container.innerHTML = `
    <div class="application-success">
      <div class="application-success-icon">
        <span data-icon="checkCircle" data-icon-width="64" data-icon-height="64"></span>
      </div>
      <h2 class="application-success-title">Application Submitted!</h2>
      <p class="application-success-message">
        Your application for <strong>${application.title}</strong> has been sent to the landlord.
      </p>
      <div class="application-success-details">
        <div class="success-detail-item">
          <span class="success-detail-label">Moving Date:</span>
          <span class="success-detail-value">${formatDate(application.movingDate)}</span>
        </div>
        <div class="success-detail-item">
          <span class="success-detail-label">Monthly Rent:</span>
          <span class="success-detail-value">₱${application.monthlyRent.toLocaleString()}</span>
        </div>
      </div>
      <div class="application-success-next">
        <h3>What's Next?</h3>
        <p>The landlord will review your application and respond within 1-3 business days. You'll receive a notification when they make a decision.</p>
      </div>
      <div class="application-success-actions">
        <button class="confirm-btn confirm-btn-secondary" onclick="window.location.href='../../public/find-a-room.html'">
          <span data-icon="search" data-icon-width="20" data-icon-height="20"></span>
          Browse More Properties
        </button>
        <button class="confirm-btn confirm-btn-primary" onclick="window.location.href='../applications-dashboard/index.html'">
          <span data-icon="home" data-icon-width="20" data-icon-height="20"></span>
          Go to Dashboard
        </button>
      </div>
    </div>
  `;

  // Auto-redirect to applications dashboard after 5 seconds
  setTimeout(() => {
    window.location.href = '../applications-dashboard/index.html';
  }, 5000);
}

/**
 * Setup the accepted application flow (original functionality)
 * @param {Object} application - Application object
 */
function setupAcceptedApplicationFlow(application) {
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
      // Check if user is now fully accepted, if so go to main dashboard
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.boarderStatus === 'accepted') {
        window.location.href = '../index.html';
      } else {
        // Otherwise go to applications dashboard
        window.location.href = '../applications-dashboard/index.html';
      }
    });
  }
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
}

/**
 * Setup payment method selection UI
 */
function setupPaymentMethodSelection() {
  const methodOptions = document.querySelectorAll('.confirm-payment-method-option');

  methodOptions.forEach(option => {
    const radio = option.querySelector('.confirm-payment-method-input');
    if (!radio) return;

    option.addEventListener('click', _e => {
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
 */
function handleDeclineBooking(_application) {
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
