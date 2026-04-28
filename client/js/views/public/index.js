/**
 * Public Views Entry Point
 *
 * Initializes homepage components (logo cloud, floating header, FAQ accordion)
 * Handles authenticated user state for logged-in boarders
 */

import { initLogoCloud } from '../../components/logo-cloud.js';
import { initPublicFindARoom } from './public-find-a-room.js';
import { getState } from '../../shared/state.js';
import { getIcon, initIconElements } from '../../shared/icons.js';
import { setupAuthenticatedNavigation } from '../../shared/routing.js';
import { showToast } from '../../shared/toast.js';

/**
 * Floating Header - Scroll-triggered transition
 * Transitions header from full-width to floating pill on scroll
 */
function initFloatingHeader() {
  const navbar = document.querySelector('.navbar');
  const scrollThreshold = 50;

  if (!navbar) {
    console.warn('FloatingHeader: Navbar element not found');
    return;
  }

  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollY = window.scrollY || window.pageYOffset;
        const isScrolled = scrollY > scrollThreshold;
        const wasScrolled = navbar.classList.contains('navbar-scrolled');

        if (isScrolled !== wasScrolled) {
          if (isScrolled) {
            navbar.classList.add('navbar-scrolled');
          } else {
            navbar.classList.remove('navbar-scrolled');
          }
        }
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/**
 * FAQ Accordion - Toggle expand/collapse
 * Only one item can be open at a time with smooth animation
 */
function initFAQAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  const faqTabs = document.querySelectorAll('.faq-tab');

  if (faqItems.length === 0) {
    return;
  }

  // Handle tab clicks
  faqTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const category = tab.dataset.category;

      // Update active tab
      faqTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Filter FAQ items
      faqItems.forEach(item => {
        const itemCategory = item.dataset.category;
        const shouldShow = category === 'all' || itemCategory === category;

        if (shouldShow) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
          // Close the item if it's open
          item.classList.remove('active');
          const question = item.querySelector('.faq-question');
          if (question) {
            question.setAttribute('aria-expanded', 'false');
          }
        }
      });
    });
  });

  // Handle accordion clicks
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all items first
        faqItems.forEach(otherItem => {
          otherItem.classList.remove('active');
          const otherQuestion = otherItem.querySelector('.faq-question');
          if (otherQuestion) {
            otherQuestion.setAttribute('aria-expanded', 'false');
          }
        });

        // If the clicked item wasn't active, open it
        if (!isActive) {
          item.classList.add('active');
          question.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });
}

/**
 * Initialize Public Views
 * Sets up homepage components (logo cloud, floating header, FAQ accordion)
 */
export function initPublicViews() {
  // Wait for DOM and images to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublicComponents);
  } else {
    initPublicComponents();
  }
}

/**
 * Update navigation for authenticated users
 * Shows user menu instead of login/signup buttons
 */
function updateNavigationForAuthenticatedUser() {
  const state = getState();

  if (!state.isAuthenticated || !state.user) {
    return; // User not logged in, keep default login buttons
  }

  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const user = state.user;
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  const initials = (user.first_name?.[0] || user.last_name?.[0] || 'U').toUpperCase();

  // Replace login/signup buttons with user avatar dropdown
  // Determine dropdown content based on user role
  const isBoarder = user.role === 'boarder';

  const boarderMenuItems = isBoarder
    ? `
    <a href="../boarder/applications/index.html" class="nav-user-menu-item">
      <span data-icon="documentText" data-icon-width="18" data-icon-height="18"></span>
      My Applications
    </a>
    <a href="../boarder/payments/index.html" class="nav-user-menu-item">
      <span data-icon="creditCard" data-icon-width="18" data-icon-height="18"></span>
      Payments
    </a>
    <div class="nav-user-divider"></div>
  `
    : '';

  navActions.innerHTML = `
    <div class="nav-user-menu">
      <button class="nav-user-button" id="nav-user-btn" aria-label="User menu">
        <div class="nav-user-avatar">${initials}</div>
        <span class="nav-user-name">${userName.split(' ')[0]}</span>
        <span data-icon="chevronDown" data-icon-width="16" data-icon-height="16" data-icon-stroke-width="2" class="nav-chevron"></span>
      </button>
      <div class="nav-user-dropdown" id="nav-user-dropdown">
        <div class="nav-user-info">
          <div class="nav-user-info-name">${userName}</div>
          <div class="nav-user-info-email">${user.email || ''}</div>
          <div class="nav-user-info-role">${user.role || 'Boarder'}</div>
        </div>
        <div class="nav-user-divider"></div>
        ${boarderMenuItems}
        <button class="nav-user-menu-item nav-user-logout" id="nav-logout-btn">
          <span data-icon="arrowRightOnRectangle" data-icon-width="18" data-icon-height="18"></span>
          Logout
        </button>
      </div>
    </div>
  `;

  // Inject icons
  navActions.querySelectorAll('[data-icon]').forEach(iconElement => {
    const iconName = iconElement.dataset.icon;
    const options = {
      width: parseInt(iconElement.dataset.iconWidth) || 24,
      height: parseInt(iconElement.dataset.iconHeight) || 24,
      strokeWidth: parseInt(iconElement.dataset.iconStrokeWidth) || 1.5,
      className: iconElement.className,
    };
    iconElement.outerHTML = getIcon(iconName, options);
  });

  // Setup dropdown toggle
  const userBtn = document.getElementById('nav-user-btn');
  const dropdown = document.getElementById('nav-user-dropdown');

  if (userBtn && dropdown) {
    userBtn.addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
  }

  // Setup logout button
  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        // Import logout function from auth-check.js
        const { logout } = await import('../../shared/auth-check.js');

        // Call the proper logout function which handles Appwrite session deletion
        await logout();
      } catch (error) {
        console.error('Logout failed:', error);

        // Fallback: clear local storage and redirect manually
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Store logout message in sessionStorage to display after redirect
        sessionStorage.setItem('logoutToast', 'You have successfully logged out');
        sessionStorage.setItem('logoutToastType', 'success');

        // Redirect to login page
        window.location.href = 'auth/login.html';
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (dropdown && !dropdown.contains(e.target) && userBtn && !userBtn.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
}

/**
 * Initialize public components after DOM is ready
 */
function initPublicComponents() {
  // Show logout toast if redirected from logout
  const logoutToastMsg = sessionStorage.getItem('logoutToast');
  if (logoutToastMsg) {
    const toastType = sessionStorage.getItem('logoutToastType') || 'success';
    sessionStorage.removeItem('logoutToast');
    sessionStorage.removeItem('logoutToastType');
    showToast(logoutToastMsg, toastType, 5000);
  }

  // Check if user is authenticated and update navigation
  updateNavigationForAuthenticatedUser();

  // Initialize data-icon elements (footer social icons, etc.)
  initIconElements();

  // Setup authentication-aware navigation for find-a-room links
  setupAuthenticatedNavigation();

  // Initialize floating header (homepage only)
  initFloatingHeader();

  // Initialize FAQ accordion
  initFAQAccordion();

  // Initialize find-a-room page (only if elements exist)
  if (document.querySelector('.find-room-main')) {
    initPublicFindARoom();
  }

  // Initialize logo cloud (homepage only)
  const logoSlider = document.getElementById('logoSlider');
  if (logoSlider) {
    // Wait for images to load before calculating dimensions
    const images = logoSlider.querySelectorAll('img');
    let loadedCount = 0;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === images.length) {
        setTimeout(() => {
          initLogoCloud();
        }, 100);
      }
    };

    if (images.length > 0) {
      images.forEach(img => {
        if (img.complete) {
          checkAllLoaded();
        } else {
          img.addEventListener('load', checkAllLoaded);
          img.addEventListener('error', checkAllLoaded); // Continue even if image fails
        }
      });
    } else {
      initLogoCloud();
    }
  }

  // Initialize find-room-description animation
  const findRoomDescription = document.getElementById('find-room-description');
  if (findRoomDescription) {
    import('./find-room-description.js').then(module => {
      module.initFindRoomDescriptionAnimation();
    });
  }
}
