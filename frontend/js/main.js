import { initLogoCloud } from './components/logo-cloud.js';
import { initSidebar } from './components/sidebar.js';

// Initialize components
document.addEventListener('DOMContentLoaded', () => {
  initLogoCloud();
  initFloatingHeader();
  initSidebar({
    role: 'boarder',
    user: {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      role: 'Boarder',
    },
  });
});

/**
 * Floating Header - Scroll-triggered transition
 * Transitions header from full-width to floating pill on scroll
 */
function initFloatingHeader() {
  const navbar = document.querySelector('.navbar');
  const scrollThreshold = 50; // px to trigger floating state

  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > scrollThreshold) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  // Add scroll listener
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Initial check in case page loads mid-scroll
  handleScroll();

  // Cleanup function (for SPA navigation or component unmounting)
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}
