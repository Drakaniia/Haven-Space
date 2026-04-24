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
  const googleOAuthMessage = document.getElementById('googleOAuthMessage');

  console.log('Initializing role selection...', { continueBtn, roleCards });

  // Check if user came from Google OAuth
  const urlParams = new URLSearchParams(window.location.search);
  const isGoogleOAuth = urlParams.get('oauth') === 'google';

  // Show Google OAuth message if applicable
  if (isGoogleOAuth && googleOAuthMessage) {
    googleOAuthMessage.style.display = 'block';
  }

  // Function to update button based on selection
  function updateButton() {
    const selectedCard = document.querySelector('.role-card.selected');
    const selectedRole = selectedCard?.getAttribute('data-role');
    console.log('Selected role:', selectedRole);

    if (selectedRole) {
      continueBtn.disabled = false;

      // Update button text based on selected role and OAuth status
      if (isGoogleOAuth) {
        if (selectedRole === 'boarder') {
          continueBtn.textContent = 'Complete Registration as Boarder';
        } else if (selectedRole === 'landlord') {
          continueBtn.textContent = 'Complete Registration as Landlord';
        }
      } else {
        if (selectedRole === 'boarder') {
          continueBtn.textContent = 'Apply as Boarder';
        } else if (selectedRole === 'landlord') {
          continueBtn.textContent = 'Join as Landlord';
        }
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
  continueBtn.addEventListener('click', async () => {
    const selectedCard = document.querySelector('.role-card.selected');
    const selectedRole = selectedCard?.getAttribute('data-role');

    if (!selectedRole) {
      console.log('No role selected');
      return;
    }

    console.log('Navigating with role:', selectedRole);

    if (isGoogleOAuth) {
      // Complete Google OAuth registration with selected role
      try {
        continueBtn.disabled = true;
        continueBtn.textContent = 'Completing Registration...';

        const response = await fetch('/api/auth/google/complete-registration.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: selectedRole,
            token: urlParams.get('token') ?? undefined,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Use the redirect URL from the response if available (includes auth data)
          if (result.redirect_url) {
            window.location.href = result.redirect_url;
          } else {
            // Fallback to default redirects
            if (selectedRole === 'admin') {
              window.location.href = '/views/admin/index.html';
            } else if (selectedRole === 'landlord') {
              window.location.href = '/views/landlord/index.html';
            } else {
              window.location.href = '/views/boarder/index.html';
            }
          }
        } else {
          throw new Error(result.message || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
        continueBtn.disabled = false;
        updateButton();
      }
    } else {
      // Navigate to appropriate signup page (normal flow)
      if (selectedRole === 'boarder') {
        window.location.href = 'signup.html';
      } else if (selectedRole === 'landlord') {
        window.location.href = 'signup-landlord.html';
      }
    }
  });
}
