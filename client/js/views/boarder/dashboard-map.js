/**
 * Dashboard Map - Boarder Dashboard
 * Initializes an interactive Leaflet map with property pins on the boarder dashboard
 */

import { getIcon } from '../../shared/icons.js';

// Sample property data (replace with API calls in production)
const dashboardMapProperties = [
  {
    id: 1,
    title: 'Sunrise Dormitory',
    location: 'Sampaloc, Manila',
    price: 5500,
    rating: 4.5,
    distance: 0.5,
    amenities: ['wifi', 'ac', 'laundry'],
    lat: 8.15,
    lng: 125.126,
  },
  {
    id: 2,
    title: 'Green Valley Boarding House',
    location: 'Diliman, Quezon City',
    price: 4500,
    rating: 4.3,
    distance: 1.2,
    amenities: ['wifi', 'kitchen', 'parking'],
    lat: 8.148,
    lng: 125.124,
  },
  {
    id: 3,
    title: 'Cozy Student Dorm',
    location: 'Near University Ave',
    price: 6000,
    rating: 4.7,
    distance: 2.1,
    amenities: ['wifi', 'ac', 'security'],
    lat: 8.151,
    lng: 125.127,
  },
];

let dashboardMap = null;
let dashboardMarkers = [];

/**
 * Initialize the dashboard map with property pins
 */
export function initDashboardMap() {
  // Check if map container exists
  const mapContainer = document.getElementById('dashboard-map');
  if (!mapContainer) {
    return;
  }

  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error('Leaflet library not loaded');
    return;
  }

  // Default location (Malaybalay City, Mindanao, Philippines)
  const defaultLocation = [8.1489, 125.125];

  // Initialize map
  dashboardMap = L.map('dashboard-map', {
    zoomControl: true,
    attributionControl: true,
  }).setView(defaultLocation, 14);

  // Add tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(dashboardMap);

  // Add property markers
  addDashboardPropertyMarkers(dashboardMapProperties);

  // Update stats
  updateDashboardMapStats(dashboardMapProperties);
}

/**
 * Add property markers to the dashboard map
 */
function addDashboardPropertyMarkers(properties) {
  // Clear existing markers
  dashboardMarkers.forEach(marker => {
    if (dashboardMap.hasLayer(marker)) {
      dashboardMap.removeLayer(marker);
    }
  });
  dashboardMarkers = [];

  properties.forEach(property => {
    // Create custom icon
    const icon = createDashboardMarkerIcon();

    // Create marker
    const marker = L.marker([property.lat, property.lng], { icon })
      .addTo(dashboardMap)
      .bindPopup(createDashboardPropertyPopup(property));

    dashboardMarkers.push(marker);
  });
}

/**
 * Create custom marker icon for dashboard map
 */
function createDashboardMarkerIcon() {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: #4a7c23;
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

/**
 * Create popup content for dashboard property markers
 */
function createDashboardPropertyPopup(property) {
  return `
    <div class="property-popup">
      <div class="property-popup-content">
        <h3 class="property-popup-title">${property.title}</h3>
        <div class="property-popup-location">
          ${getIcon('target', { width: 12, height: 12 })}
          ${property.location}
        </div>
        <div class="property-popup-meta">
          <span class="popup-distance">📍 ${property.distance} km</span>
          <span class="popup-rating">⭐ ${property.rating}</span>
        </div>
        <div class="property-popup-price">₱${property.price.toLocaleString()}/month</div>
        <div class="property-popup-amenities">
          ${property.amenities
            .slice(0, 3)
            .map(a => `<span class="amenity-badge">${a}</span>`)
            .join('')}
        </div>
        <div class="property-popup-actions">
          <button class="popup-btn popup-btn-primary" onclick="window.viewPropertyFromDashboard(${
            property.id
          })">
            View Details
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Update dashboard map statistics
 */
function updateDashboardMapStats(properties) {
  const statsContainer = document.querySelector('.boarder-map-stats');
  if (!statsContainer) {
    return;
  }

  // Calculate stats
  const totalProperties = properties.length;
  const avgDistance = (
    properties.reduce((sum, p) => sum + p.distance, 0) / properties.length
  ).toFixed(1);

  // Update stats HTML
  statsContainer.innerHTML = `
    <div class="boarder-map-stat">
      <span class="boarder-map-stat-value">${totalProperties}</span>
      <span class="boarder-map-stat-label">Properties nearby</span>
    </div>
    <div class="boarder-map-stat">
      <span class="boarder-map-stat-value">${avgDistance}km</span>
      <span class="boarder-map-stat-label">Average distance</span>
    </div>
  `;
}

/**
 * Global function to view property from dashboard map popup
 */
window.viewPropertyFromDashboard = function (propertyId) {
  // Navigate to rooms page with property ID
  window.location.href = `../rooms/index.html?id=${propertyId}`;
};
