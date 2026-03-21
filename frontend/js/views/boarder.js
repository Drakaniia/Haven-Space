/**
 * Boarder Dashboard View Controller
 * Handles boarder-specific functionality
 */

import { state, fetchWithAuth, formatDate } from '../shared/state.js';

export function initBoarderView() {
  console.log('Boarder view initialized');
  
  // Check authentication
  checkAuth();
  
  // Initialize boarder dashboard features
  setupSearchProperties();
  setupBookings();
  setupFavorites();
}

function checkAuth() {
  if (!state.isAuthenticated) {
    console.log('User not authenticated');
  }
}

function setupSearchProperties() {
  const searchForm = document.querySelector('#property-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', handleSearch);
  }
  
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadProperties(e.target.dataset.filter);
    });
  });
}

async function handleSearch(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const searchParams = Object.fromEntries(formData.entries());
  
  try {
    const properties = await fetchWithAuth('/properties/search', {
      method: 'POST',
      body: JSON.stringify(searchParams),
    });
    renderProperties(properties);
  } catch (error) {
    console.error('Search failed:', error);
  }
}

async function loadProperties(filter = 'all') {
  try {
    const properties = await fetchWithAuth(`/properties?filter=${filter}`);
    renderProperties(properties);
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

function renderProperties(properties) {
  const container = document.querySelector('#properties-grid');
  if (!container) return;
  
  container.innerHTML = properties.map(property => `
    <div class="property-card" data-id="${property.id}">
      <img src="${property.image}" alt="${property.name}">
      <h3>${property.name}</h3>
      <p class="price">$${property.price}/month</p>
      <p class="location">${property.location}</p>
      <button class="book-btn" data-id="${property.id}">Book Now</button>
      <button class="favorite-btn" data-id="${property.id}">♡</button>
    </div>
  `).join('');
  
  // Attach event listeners to new buttons
  document.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', handleBookProperty);
  });
  
  document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', handleToggleFavorite);
  });
}

function setupBookings() {
  loadBookings();
}

async function loadBookings() {
  try {
    const bookings = await fetchWithAuth('/boarder/bookings');
    renderBookings(bookings);
  } catch (error) {
    console.error('Failed to load bookings:', error);
  }
}

function renderBookings(bookings) {
  const container = document.querySelector('#bookings-list');
  if (!container) return;
  
  container.innerHTML = bookings.map(booking => `
    <div class="booking-card" data-id="${booking.id}">
      <h4>${booking.propertyName}</h4>
      <p>Check-in: ${formatDate(booking.checkIn)}</p>
      <p>Status: <span class="status ${booking.status}">${booking.status}</span></p>
    </div>
  `).join('');
}

function handleBookProperty(event) {
  event.preventDefault();
  const propertyId = event.currentTarget.dataset.id;
  // Open booking modal or redirect
  console.log('Book property:', propertyId);
}

function handleToggleFavorite(event) {
  event.preventDefault();
  const propertyId = event.currentTarget.dataset.id;
  // Toggle favorite status
  console.log('Toggle favorite:', propertyId);
}

function setupFavorites() {
  loadFavorites();
}

async function loadFavorites() {
  try {
    const favorites = await fetchWithAuth('/boarder/favorites');
    renderFavorites(favorites);
  } catch (error) {
    console.error('Failed to load favorites:', error);
  }
}

function renderFavorites(favorites) {
  const container = document.querySelector('#favorites-list');
  if (!container) return;
  
  container.innerHTML = favorites.map(favorite => `
    <div class="favorite-card" data-id="${favorite.id}">
      <img src="${favorite.image}" alt="${favorite.name}">
      <h4>${favorite.name}</h4>
    </div>
  `).join('');
}
