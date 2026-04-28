import CONFIG from '../../config.js';

let map;
let markers = [];
let userLocation = null;
let allProperties = []; // Store all fetched properties
let filteredProperties = []; // Store filtered properties

// Fetch properties from API
async function fetchProperties() {
  try {
    // Show loading state
    const container = document.getElementById('properties-list');
    if (container) {
      container.innerHTML = `
        <div class="loading-properties">
          <div class="spinner"></div>
          <p>Loading properties...</p>
        </div>
      `;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/properties/all.php`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.data && result.data.properties) {
      // Filter properties that have valid coordinates
      allProperties = result.data.properties.filter(p => p.latitude && p.longitude);

      // Transform API data to match expected format
      allProperties = allProperties.map(p => ({
        id: p.id,
        title: p.name,
        location: p.city || p.address,
        address: p.address,
        city: p.city,
        province: p.province,
        price: p.price,
        lat: p.latitude,
        lng: p.longitude,
        rating: 4.5, // Default rating
        reviewCount: 0, // Default review count
        amenities: p.amenities || [],
        type: p.type || 'boarding-house',
        phone: '',
        description: p.description || '',
        image:
          p.photos && p.photos.length > 0 ? p.photos[0] : '/assets/images/placeholder-room.svg',
        photos: p.photos || [],
        reviews: [],
        reviewSummary: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        badges: [],
        landlord_name: p.landlord_name,
        total_rooms: p.total_rooms,
        occupied_rooms: p.occupied_rooms,
        occupancy_rate: p.occupancy_rate,
      }));

      filteredProperties = [...allProperties];

      // Update UI with fetched properties
      updatePropertiesList(filteredProperties);
      addPropertyMarkers(filteredProperties);
    }
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    // Show error state
    const container = document.getElementById('properties-list');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon" data-icon="exclamationCircle" data-icon-width="48" data-icon-height="48" data-icon-stroke-width="1.5"></span>
          <h3 class="empty-state-title">Failed to load properties</h3>
          <p class="empty-state-description">Please try again later</p>
        </div>
      `;
    }
  }
}

// Initialize the map
function initMap() {
  // Default location (Malaybalay City, Mindanao, Philippines)
  const defaultLocation = [8.1489, 125.125];

  // Create map centered at default location
  map = L.map('map').setView(defaultLocation, 16);

  // Add OpenStreetMap tiles
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(map);

  // Fetch and display properties
  fetchProperties();

  // Setup event listeners
  setupEventListeners();
}

// Add property markers to map
function addPropertyMarkers(properties) {
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  // Create custom pin icon
  const pinIcon = L.icon({
    iconUrl: '../../assets/images/pin.png',
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50],
  });

  properties.forEach(property => {
    // Create custom popup content with image
    const amenitiesHtml =
      property.amenities && property.amenities.length > 0
        ? property.amenities
            .slice(0, 3)
            .map(a => `<span class="amenity-badge">${a}</span>`)
            .join('')
        : '<span class="amenity-badge">No amenities listed</span>';

    const popupContent = `
      <div class="property-popup" style="min-width: 250px;">
        <div class="property-popup-image" style="width: 100%; height: 120px; background: url('${
          property.image
        }') center/cover no-repeat; border-radius: 8px 8px 0 0; background-color: #f0f0f0;"></div>
        <div class="property-popup-content" style="padding: 12px;">
          <h3 class="property-popup-title" style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #1a1a1a;">${
            property.title
          }</h3>
          <div class="property-popup-landlord" style="font-size: 11px; color: #888; margin-bottom: 6px;">
            By ${property.landlord_name}
          </div>
          <div class="property-popup-location" style="font-size: 12px; color: #555; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            <span>📍</span>
            ${property.location}
          </div>
          <div class="property-popup-price" style="font-size: 16px; font-weight: 700; color: #4a7c23; margin-bottom: 8px;">₱${property.price.toLocaleString()}/month</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            ${property.total_rooms} rooms • ${property.occupied_rooms} occupied (${
      property.occupancy_rate
    }% full)
          </div>
          <div class="property-popup-amenities" style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
            ${amenitiesHtml}
          </div>
          <button onclick="viewProperty(${
            property.id
          })" style="width: 100%; padding: 8px; background: #4a7c23; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">View Details</button>
        </div>
      </div>
    `;

    // Create marker with pin icon
    const marker = L.marker([property.lat, property.lng], { icon: pinIcon })
      .addTo(map)
      .bindPopup(popupContent, {
        maxWidth: 280,
        className: 'custom-popup',
      });

    // Add click event to open property detail
    marker.on('click', function () {
      // Popup will open automatically, but we can also trigger detail view
    });

    markers.push(marker);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Close map button - redirect back to find-a-room page
  const closeBtn = document.getElementById('close-map');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Always redirect to public find-a-room page
      window.location.href = './find-a-room.html';
    });
  } else {
    console.error('Close button not found!');
  }

  // Locate me button
  const locateBtn = document.getElementById('locate-me');
  if (locateBtn) {
    locateBtn.addEventListener('click', getUserLocation);
  }

  // Zoom controls
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  if (zoomInBtn) zoomInBtn.addEventListener('click', () => map.zoomIn());
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => map.zoomOut());
}

// Update properties list (simplified - no filters)
function updatePropertiesList(properties) {
  const container = document.getElementById('properties-list');
  if (!container) return;

  if (properties.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon" data-icon="building" data-icon-width="48" data-icon-height="48" data-icon-stroke-width="1.5"></span>
        <h3 class="empty-state-title">No properties found</h3>
        <p class="empty-state-description">Try adjusting your search area</p>
      </div>
    `;
    return;
  }

  container.innerHTML = properties
    .map(
      property => `
    <div class="property-card" data-id="${property.id}" onclick="viewProperty(${property.id})">
      <div class="property-card-image" style="background: url('${
        property.image
      }') center/cover no-repeat; background-color: #f0f0f0;"></div>
      <div class="property-card-content">
        <div class="property-card-header">
          <h3 class="property-card-title">${property.title}</h3>
          <div class="property-card-rating">
            <span data-icon="starSolid" data-icon-width="14" data-icon-height="14" style="color: #f59e0b;"></span>
            ${property.rating}
          </div>
        </div>
        <div class="property-card-location">
          <span data-icon="location" data-icon-width="12" data-icon-height="12" data-icon-stroke-width="2"></span>
          ${property.location}
        </div>
        <div class="property-card-footer">
          <div class="property-card-price">₱${property.price.toLocaleString()}<span>/month</span></div>
          <button class="property-card-btn" onclick="event.stopPropagation(); viewProperty(${
            property.id
          })">View</button>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

// Get user location
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Center map on user location
        map.setView([userLocation.lat, userLocation.lng], 16);

        // Add user location marker
        L.marker([userLocation.lat, userLocation.lng])
          .addTo(map)
          .bindPopup('You are here')
          .openPopup();
      },
      _error => {
        alert('Unable to get your location. Please enable location permissions.');
      }
    );
  } else {
    alert('Geolocation is not supported by your browser.');
  }
}

// Global function for viewing property details
window.viewProperty = function (propertyId) {
  // Navigate to room detail page
  window.location.href = `./room-detail.html?id=${propertyId}`;
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  initMap();
});
