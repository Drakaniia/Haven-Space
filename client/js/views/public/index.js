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

  const handleScroll = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    const isScrolled = scrollY > scrollThreshold;
    const wasScrolled = navbar.classList.contains('scrolled');

    if (isScrolled !== wasScrolled) {
      if (isScrolled) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('wheel', handleScroll, { passive: true });
  handleScroll();
}

/**
 * Initialize Public Views
 * Sets up homepage components (logo cloud, floating header)
 */
export function initPublicViews() {
  // Initialize logo cloud (homepage only)
  const logoSlider = document.getElementById('logoSlider');
  if (logoSlider) {
    initLogoCloud();
  }

  // Initialize floating header (homepage only)
  initFloatingHeader();

  console.log('PublicViews: Initialized');
}
