/**
 * Landlord Dashboard View Controller
 * Handles landlord-specific functionality
 */

import { state, fetchWithAuth, formatDate } from '../shared/state.js';

export function initLandlordView() {
  console.log('Landlord view initialized');
  
  // Check authentication
  checkAuth();
  
  // Initialize landlord dashboard features
  setupPropertyListings();
  setupTenantManagement();
  setupNotifications();
}

function checkAuth() {
  if (!state.isAuthenticated) {
    // Redirect to login or show auth prompt
    console.log('User not authenticated');
  }
}

function setupPropertyListings() {
  const addPropertyBtn = document.querySelector('#add-property-btn');
  if (addPropertyBtn) {
    addPropertyBtn.addEventListener('click', handleAddProperty);
  }
  
  loadProperties();
}

async function loadProperties() {
  try {
    const properties = await fetchWithAuth('/landlord/properties');
    renderProperties(properties);
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

function renderProperties(properties) {
  const container = document.querySelector('#properties-list');
  if (!container) return;
  
  container.innerHTML = properties.map(property => `
    <div class="property-card" data-id="${property.id}">
      <h3>${property.name}</h3>
      <p>${property.address}</p>
      <span class="status ${property.status}">${property.status}</span>
    </div>
  `).join('');
}

function handleAddProperty(event) {
  event.preventDefault();
  // Open modal or redirect to add property page
  console.log('Add property clicked');
}

function setupTenantManagement() {
  const tenantTabs = document.querySelectorAll('.tenant-tab');
  tenantTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tenantTabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
    });
  });
}

function setupNotifications() {
  // Load and display notifications
  loadNotifications();
}

async function loadNotifications() {
  try {
    const notifications = await fetchWithAuth('/landlord/notifications');
    renderNotifications(notifications);
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }
}

function renderNotifications(notifications) {
  const container = document.querySelector('#notifications');
  if (!container) return;
  
  container.innerHTML = notifications.map(notification => `
    <div class="notification ${notification.type}">
      <p>${notification.message}</p>
      <span class="date">${formatDate(notification.date)}</span>
    </div>
  `).join('');
}
