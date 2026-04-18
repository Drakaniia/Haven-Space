/**
 * Choose Role Page
 * Handles role selection (boarder or landlord) before signup
 */

import { initIconElements } from '../shared/icons.js';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  initIconElements();
  initializeRoleSelection();
});

/**
 * Initialize role selection functionality
 */
function initializeRoleSelection() {
  const continueBtn = document.getElementById('continueBtn');
  const roleCards = document.querySelectorAll('.role-card');

  console.log('Initializing role selection...', { continueBtn, roleCards });

  // Function to update button based on selection
  function updateButton() {
    const selectedCard = document.querySelector('.role-card.selected');
    const selectedRole = selectedCard?.getAttribute('data-role');
    console.log('Selected role:', selectedRole);

    if (selectedRole) {
      continueBtn.disabled = false;

      // Update button text based on selected role
      if (selectedRole === 'boarder') {
        continueBtn.textContent = 'Apply as Boarder';
      } else if (selectedRole === 'landlord') {
        continueBtn.textContent = 'Join as Landlord';
      }
    } else {
      continueBtn.disabled = true;
      continueBtn.textContent = 'Continue';
    }
  }

  // Handle card clicks
  roleCards.forEach(card => {
    card.addEventListener('click', () => {
      const role = card.getAttribute('data-role');
      console.log('Card clicked, role:', role);

      // Remove selected class from all cards
      roleCards.forEach(c => c.classList.remove('selected'));

      // Add selected class to clicked card
      card.classList.add('selected');

      // Update the hidden radio button
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }

      updateButton();
    });
  });

  // Handle continue button click
  continueBtn.addEventListener('click', () => {
    const selectedCard = document.querySelector('.role-card.selected');
    const selectedRole = selectedCard?.getAttribute('data-role');

    if (!selectedRole) {
      console.log('No role selected');
      return;
    }

    console.log('Navigating with role:', selectedRole);

    // Navigate to appropriate signup page
    if (selectedRole === 'boarder') {
      window.location.href = 'signup.html';
    } else if (selectedRole === 'landlord') {
      window.location.href = 'signup-landlord.html';
    }
  });
}
