/**
 * Dashboard Map - Boarder Dashboard
 * Initializes an interactive Leaflet map with property pins on the boarder dashboard
 */

import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';

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

  // Fetch properties from API and add markers
  fetchNearbyProperties().then(properties => {
    addDashboardPropertyMarkers(properties);
    updateDashboardMapStats(properties);
  });
}

/**
 * Fetch nearby properties from the public API
 * @returns {Promise<Array>} Array of property objects with lat/lng
 */
async function fetchNearbyProperties() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/public`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const rooms = result.data?.rooms || result.data?.properties || [];

    // Filter to only properties that have coordinates
    return rooms
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        id: r.id,
        title: r.name || r.title || 'Property',
        location: [r.address, r.city].filter(Boolean).join(', '),
        price: r.price || r.monthly_rate || 0,
        rating: r.rating || 0,
        distance: r.distance || 0,
        amenities: Array.isArray(r.amenities) ? r.amenities.slice(0, 3) : [],
        lat: parseFloat(r.latitude),
        lng: parseFloat(r.longitude),
      }));
  } catch (error) {
    console.error('Failed to fetch nearby properties for map:', error);
    return [];
  }
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
