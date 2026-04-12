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
  const acceptedApplication = getAcceptedApplication();

  if (!acceptedApplication) {
    // No accepted application, redirect to applications page
    window.location.href = '../applications/';
    return;
  }

  // Populate property details
  populateApplicationDetails(acceptedApplication);

  // Setup terms checkbox
  const termsCheckbox = document.getElementById('terms-agreement');
  const acceptBtn = document.getElementById('confirm-accept-btn');

  if (termsCheckbox && acceptBtn) {
    termsCheckbox.addEventListener('change', () => {
      acceptBtn.disabled = !termsCheckbox.checked;
    });
  }

  // Setup accept button
  if (acceptBtn) {
    acceptBtn.addEventListener('click', async () => {
      await handleAcceptBooking(acceptedApplication);
    });
  }

  // Setup decline button
  const declineBtn = document.getElementById('confirm-decline-btn');
  if (declineBtn) {
    declineBtn.addEventListener('click', () => {
      handleDeclineBooking(acceptedApplication);
    });
  }
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
    return applications.find(app => app.id === appId && app.status === 'accepted');
  }

  // Fallback: get from localStorage (single accepted application)
  return JSON.parse(localStorage.getItem('acceptedApplication') || 'null');
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

  if (propertyName) propertyName.textContent = app.propertyName || app.title || 'Property Name';
  if (roomType) roomType.textContent = app.roomType || 'Standard Room';
  if (monthlyRent) monthlyRent.textContent = `₱${(app.monthlyRent || 5000).toLocaleString()}`;
  if (acceptedDate) acceptedDate.textContent = formatDate(app.acceptedDate || new Date());
  if (landlordName) landlordName.textContent = app.landlordName || 'Property Owner';
}

/**
 * Handle accepting the booking
 * @param {Object} application - Application object
 */
async function handleAcceptBooking(application) {
  try {
    // Show loading state
    const acceptBtn = document.getElementById('confirm-accept-btn');
    const originalText = acceptBtn.textContent;
    acceptBtn.disabled = true;
    acceptBtn.textContent = 'Confirming...';

    // TODO: Call API to confirm booking
    // await fetch(`${API_BASE_URL}/bookings/confirm.php`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ applicationId: application.id })
    // });

    // Update status to 'accepted'
    updateBoarderStatus('accepted');

    // Show success message
    showSuccessMessage();

    // Redirect to dashboard after delay
    setTimeout(() => {
      window.location.href = '../';
    }, 2000);
  } catch (error) {
    console.error('Failed to confirm booking:', error);
    showErrorMessage();
  }
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
 * Show success message on the accept button
 */
function showSuccessMessage() {
  const acceptBtn = document.getElementById('confirm-accept-btn');
  if (acceptBtn) {
    acceptBtn.textContent = '✓ Booking Confirmed!';
    acceptBtn.style.background = 'var(--dark-green)';
    acceptBtn.style.borderColor = 'var(--dark-green)';
  }
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
