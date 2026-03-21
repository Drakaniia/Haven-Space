/**
 * Landing Page View Controller
 * Handles landing page specific functionality
 */

import { state, fetchWithAuth } from '../shared/state.js';

export function initLandingView() {
  console.log('Landing view initialized');
  
  // Initialize landing page specific features
  setupHeroSection();
  setupFeatures();
  setupCallToAction();
}

function setupHeroSection() {
  const heroCta = document.querySelector('.hero-cta');
  if (heroCta) {
    heroCta.addEventListener('click', handleHeroCtaClick);
  }
}

function setupFeatures() {
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.classList.add('active');
    });
    card.addEventListener('mouseleave', () => {
      card.classList.remove('active');
    });
  });
}

function setupCallToAction() {
  const ctaButtons = document.querySelectorAll('.cta-button');
  ctaButtons.forEach(button => {
    button.addEventListener('click', handleCtaClick);
  });
}

function handleHeroCtaClick(event) {
  event.preventDefault();
  const action = event.currentTarget.dataset.action;
  
  if (action === 'register') {
    window.location.href = '/views/landlord/index.html';
  } else if (action === 'login') {
    // Show login modal or redirect
    console.log('Login clicked');
  }
}

function handleCtaClick(event) {
  event.preventDefault();
  const target = event.currentTarget.dataset.target;
  if (target) {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  }
}
