/**
 * Accepted Applications Overlay
 * Shows when a boarder has accepted applications and lets them choose one
 */

import { getIcon } from '../shared/icons.js';
import { fetchAcceptedApplications } from '../shared/notifications.js';
import { showToast } from '../shared/toast.js';
import CONFIG from '../config.js';
import { getAuthHeaders } from '../shared/auth-headers.js';

/**
 * Open the "Choose Your Boarding House" overlay
 * Fetches accepted applications and renders the modal
 */
export async function openAcceptedApplicationsOverlay() {
  try {
    const applications = await fetchAcceptedApplications();

    if (!applications || applications.length === 0) {
      return;
    }

    // If only one accepted application, go straight to confirmation
    if (applications.length === 1) {
      openConfirmationStep(applications[0]);
      return;
    }

    // Multiple accepted applications — show the selection overlay
    renderSelectionOverlay(applications);
  } catch (error) {
    console.error('Failed to load accepted applications:', error);
  }
}

/**
 * Render the selection overlay with all accepted applications
 * @param {Array} applications
 */
function renderSelectionOverlay(applications) {
  // Remove existing overlay if any
  const existing = document.querySelector('.accepted-applications-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'accepted-applications-overlay';

  const cardsHtml = applications
    .map(
      app => `
    <div class="accepted-app-card" data-application-id="${app.application_id}" data-property-id="${
        app.property_id
      }">
      <div class="accepted-app-card-image">
        <div class="accepted-app-card-image-placeholder">
          ${getIcon('buildingOffice', {
            width: 40,
            height: 40,
            className: 'accepted-app-card-icon',
          })}
        </div>
      </div>
      <div class="accepted-app-card-content">
        <h3 class="accepted-app-card-title">${escapeHtml(app.property_name)}</h3>
        <p class="accepted-app-card-address">${escapeHtml(app.address)}</p>
        <p class="accepted-app-card-price">P${Number(app.room_price).toLocaleString()}/month</p>
      </div>
      <div class="accepted-app-card-actions">
        <button class="accepted-app-btn accepted-app-btn-select" data-action="select" data-application-id="${
          app.application_id
        }">
          Yes, Select
        </button>
        <button class="accepted-app-btn accepted-app-btn-decline" data-action="decline" data-application-id="${
          app.application_id
        }">
          No
        </button>
      </div>
    </div>
  `
    )
    .join('');

  overlay.innerHTML = `
    <div class="accepted-app-modal">
      <div class="accepted-app-modal-header">
        <h2 class="accepted-app-modal-title">Choose Your Boarding House</h2>
        <button class="accepted-app-modal-close" aria-label="Close">
          ${getIcon('xMark', { width: 24, height: 24 })}
        </button>
      </div>
      <div class="accepted-app-modal-body">
        <p class="accepted-app-modal-description">
          Multiple landlords have accepted your application. Please select one boarding house to proceed.
        </p>
        <div class="accepted-app-cards">
          ${cardsHtml}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => overlay.classList.add('accepted-app-overlay-visible'));

  // Bind events
  bindOverlayEvents(overlay, applications);
}

/**
 * Bind event listeners for the overlay
 * @param {HTMLElement} overlay
 * @param {Array} applications
 */
function bindOverlayEvents(overlay, applications) {
  // Close button
  const closeBtn = overlay.querySelector('.accepted-app-modal-close');
  closeBtn.addEventListener('click', () => closeOverlay(overlay));

  // Click outside to close
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeOverlay(overlay);
  });

  // Select button
  overlay.querySelectorAll('[data-action="select"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const appId = parseInt(btn.dataset.applicationId);
      const app = applications.find(a => a.application_id === appId);
      if (app) {
        closeOverlay(overlay);
        openConfirmationStep(app);
      }
    });
  });

  // Decline button
  overlay.querySelectorAll('[data-action="decline"]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove the card from the overlay
      const card = btn.closest('.accepted-app-card');
      card.style.opacity = '0';
      card.style.transform = 'translateX(20px)';
      setTimeout(() => {
        card.remove();
        // If no more cards, close overlay
        const remaining = overlay.querySelectorAll('.accepted-app-card');
        if (remaining.length === 0) {
          closeOverlay(overlay);
        }
      }, 300);
    });
  });

  // Escape key to close
  const handleEscape = e => {
    if (e.key === 'Escape') {
      closeOverlay(overlay);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Close the overlay
 * @param {HTMLElement} overlay
 */
function closeOverlay(overlay) {
  overlay.classList.remove('accepted-app-overlay-visible');
  setTimeout(() => overlay.remove(), 300);
}

/**
 * Open the confirmation step for a selected application
 * @param {Object} app
 */
function openConfirmationStep(app) {
  // Remove existing confirmation if any
  const existing = document.querySelector('.confirmation-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'confirmation-overlay';

  overlay.innerHTML = `
    <div class="confirmation-modal">
      <div class="confirmation-modal-header">
        <h2 class="confirmation-modal-title">Confirm Your Selection</h2>
        <button class="confirmation-modal-close" aria-label="Close">
          ${getIcon('xMark', { width: 24, height: 24 })}
        </button>
      </div>
      <div class="confirmation-modal-body">
        <div class="confirmation-property-card">
          <div class="confirmation-property-image">
            <div class="confirmation-property-image-placeholder">
              ${getIcon('buildingOffice', {
                width: 48,
                height: 48,
                className: 'confirmation-property-icon',
              })}
            </div>
          </div>
          <div class="confirmation-property-details">
            <h3 class="confirmation-property-name">${escapeHtml(app.property_name)}</h3>
            <p class="confirmation-property-address">${escapeHtml(app.address)}</p>
            <p class="confirmation-property-room">${escapeHtml(app.room_title)}</p>
            <p class="confirmation-property-price">P${Number(
              app.room_price
            ).toLocaleString()}/month</p>
          </div>
        </div>
        <div class="confirmation-actions">
          <button class="confirmation-btn confirmation-btn-confirm" data-action="confirm">
            ${getIcon('check', { width: 20, height: 20 })}
            Confirm Booking
          </button>
          <button class="confirmation-btn confirmation-btn-cancel" data-action="cancel">
            Go Back
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('confirmation-overlay-visible'));

  // Bind events
  const closeBtn = overlay.querySelector('.confirmation-modal-close');
  closeBtn.addEventListener('click', () => closeConfirmationOverlay(overlay));

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeConfirmationOverlay(overlay);
  });

  const cancelBtn = overlay.querySelector('[data-action="cancel"]');
  cancelBtn.addEventListener('click', () => {
    closeConfirmationOverlay(overlay);
    // Re-open the selection overlay
    openAcceptedApplicationsOverlay();
  });

  const confirmBtn = overlay.querySelector('[data-action="confirm"]');
  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Confirming...';

    try {
      // Call API to confirm the booking
      const paymentMethod =
        overlay.querySelector('input[name="payment-method"]:checked')?.value || 'GCash';

      const response = await fetch(
        `${CONFIG.API_BASE_URL}/api/boarder/applications/${app.application_id}/confirm`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            payment_method: paymentMethod,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to confirm booking');
      }

      closeConfirmationOverlay(overlay);
      showToast('Booking confirmed! Welcome to your new boarding house.', 'success');

      // Redirect to dashboard or messages
      setTimeout(() => {
        window.location.href = '../dashboard/index.html';
      }, 1500);
    } catch (error) {
      console.error('Failed to confirm booking:', error);
      showToast('Failed to confirm booking. Please try again.', 'error');
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `${getIcon('check', { width: 20, height: 20 })} Confirm Booking`;
    }
  });

  const handleEscape = e => {
    if (e.key === 'Escape') {
      closeConfirmationOverlay(overlay);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

/**
 * Close the confirmation overlay
 * @param {HTMLElement} overlay
 */
function closeConfirmationOverlay(overlay) {
  overlay.classList.remove('confirmation-overlay-visible');
  setTimeout(() => overlay.remove(), 300);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
