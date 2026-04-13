/**
 * Public Views Entry Point
 *
 * Initializes homepage components (logo cloud, floating header, FAQ accordion)
 */

import { initLogoCloud } from '../../components/logo-cloud.js';
import { initPublicFindARoom } from './public-find-a-room.js';

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
  let activeCategory = 'all';

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

      // Update active category
      activeCategory = category;

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

  console.log('PublicViews: Initialized');
}

/**
 * Initialize public components after DOM is ready
 */
function initPublicComponents() {
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
}
