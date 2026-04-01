/**
 * Public Views Entry Point
 *
 * Initializes homepage components (logo cloud, floating header)
 */

import { initLogoCloud } from '../../components/logo-cloud.js';

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
 * Initialize Public Views
 * Sets up homepage components (logo cloud, floating header)
 */
export function initPublicViews() {
  // Wait for DOM and images to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublicComponents);
  } else {
    initPublicComponents();
  }

  console.log('PublicViews: Initialized');
}

/**
 * Initialize public components after DOM is ready
 */
function initPublicComponents() {
  // Initialize floating header (homepage only)
  initFloatingHeader();

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
}
