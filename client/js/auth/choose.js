/**
 * Choose Role Page
 * Handles role selection (boarder or landlord) before signup
 */

import { loadIcons } from '../shared/icons.js';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadIcons();
  initializeRoleSelection();
});

/**
 * Initialize role selection functionality
 */
function initializeRoleSelection() {
  const continueBtn = document.getElementById('continueBtn');
  const roleRadios = document.querySelectorAll('input[name="role"]');

  // Enable continue button when a role is selected
  roleRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      continueBtn.disabled = false;
    });
  });

  // Handle continue button click
  continueBtn.addEventListener('click', () => {
    const selectedRole = document.querySelector('input[name="role"]:checked');

    if (!selectedRole) {
      return;
    }

    const role = selectedRole.value;

    // Navigate to appropriate signup page
    if (role === 'boarder') {
      window.location.href = 'signup.html';
    } else if (role === 'landlord') {
      window.location.href = 'signup-landlord.html';
    }
  });

  // Allow clicking on card to select role
  const cards = document.querySelectorAll('.choose-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    });
  });
}
