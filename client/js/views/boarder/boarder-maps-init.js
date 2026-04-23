/**
 * Boarder Maps Initialization
 * Handles map display with real property data from landlords
 */

import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { getState } from '../../shared/state.js';
import { initIconElements } from '../../shared/icons.js';
import CONFIG from '../../config.js';

let map;
let markers = [];
let userLocation = null;
let currentUser = null;
let savedRooms = [];
let appliedRooms = [];
let currentDistanceFilter = 500; // meters
let allProperties = [];
let filteredProperties = [];
let radiusCircle = null; // Store the current radius circle

/**
 * Draw radius circle around current location
 */
function drawRadiusCircle(radius) {
  // Remove existing circle
  if (radiusCircle) {
    map.removeLayer(radiusCircle);
    radiusCircle = null;
  }

  // Get current location (user location or default)
  const location = userLocation || currentUser?.location || { lat: 8.1569, lng: 125.1297 };
  
  // Draw new circle
  radiusCircle = L.circle([location.lat, location.lng], {
    color: '#4a7c23',
    fillColor: '#4a7c23',
    fillOpacity: 0.1,
    radius: radius,
    weight: 2,
    dashArray: '5, 5'
  }).addTo(map);

  console.log(`Drew radius circle: ${radius}m around location:`, location);
}

/**
 * Initialize the boarder maps page
 */
export function initBoarderMaps() {
  // Get current user from state
  const stateUser = getState().user;
  currentUser = (stateUser && stateUser.name) ? stateUser : {
    name: 'Juan Dela Cruz',
    university: 'Bukidnon State University',
    location: { lat: 8.1569, lng: 125.1297 }, // Default to Malaybalay, Bukidnon
  };

  // Initialize sidebar
  initSidebar({
    role: 'boarder',
    user: {
      name: currentUser.name.split(' ')[0],
      initials: currentUser.name
        .split(' ')
        .map(n => n[0])
        .join(''),
      role: 'Boarder',
    },
  });

  // Initialize navbar
  initNavbar({
    user: {
      name: currentUser.name,
      initials: currentUser.name
        .split(' ')
        .map(n => n[0])
        .join(''),
      avatarUrl: '',
    },
    notificationCount: 3,
  });

  // Update university subtitle
  const universitySubtitle = document.getElementById('university-subtitle');
  if (universitySubtitle) {
    universitySubtitle.textContent = `Near ${currentUser.university || 'Bukidnon State University'}`;
  }

  // Initialize map
  initMap();

  // Setup event listeners
  setupEventListeners();

  // Load user data (saved rooms, applications)
  loadUserData();

  // Load properties from API
  loadProperties();

  // Initialize icons
  setTimeout(() => {
    initIconElements();
    // Make initIconElements available globally for dynamic content
    window.initIconElements = initIconElements;
  }, 100);
}

/**
 * Initialize the Leaflet map
 */
async function initMap() {
  const defaultLocation = currentUser?.location
    ? [currentUser.location.lat, currentUser.location.lng]
    : [8.1569, 125.1297]; // Default to Malaybalay, Bukidnon

  // Create map centered at user's location
  map = L.map('map').setView(defaultLocation, 13);

  // Add OpenStreetMap tiles
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Add user location marker
  L.marker(defaultLocation)
    .addTo(map)
    .bindPopup('<strong>Your Location</strong><br>Malaybalay, Bukidnon')
    .openPopup();

  // Draw initial radius circle (500m by default)
  drawRadiusCircle(currentDistanceFilter);

  console.log('Map initialized at:', defaultLocation);
}

/**
 * Load properties from the API
 */
async function loadProperties() {
  try {
    console.log('Loading properties from API...');

    // Show loading state
    updatePropertiesList([]);
    document.getElementById('results-count').textContent = 'Loading...';

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('API Response:', result);

    const properties = result.data?.properties || [];
    console.log(`Loaded ${properties.length} properties`);

    // Filter properties that have location data
    allProperties = properties
      .filter(p => p.latitude && p.longitude)
      .map(p => ({
        id: p.id,
        title: p.title || 'Property',
        location: [p.address, p.city].filter(Boolean).join(', '),
        price: p.price || 0,
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
        rating: p.rating || 4.5,
        amenities: Array.isArray(p.amenities) ? p.amenities : [],
        type: mapPropertyType(p.roomTypes),
        distance: 0,
        image: p.image || '/assets/images/placeholder-room.svg',
        availableRooms: p.availableRooms || 0,
        totalRooms: p.totalRooms || 1,
        landlord: p.landlord || { name: 'Landlord' },
        city: p.city || '',
        province: p.province || '',
      }));

    console.log(`Filtered to ${allProperties.length} properties with location data`);

    // Calculate distances from user location
    if (currentUser?.location) {
      allProperties.forEach(property => {
        property.distance = calculateDistance(
          currentUser.location.lat,
          currentUser.location.lng,
          property.lat,
          property.lng
        );
      });
    }

    // Sort by distance
    allProperties.sort((a, b) => a.distance - b.distance);

    // Update UI
    filteredProperties = [...allProperties];
    addPropertyMarkers(filteredProperties);
    updatePropertiesList(filteredProperties);

    console.log('Properties loaded and displayed successfully');
  } catch (error) {
    console.error('Failed to load properties:', error);

    // Show error state
    const container = document.getElementById('properties-list');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-icon" data-icon="alertCircle" data-icon-width="48" data-icon-height="48" data-icon-stroke-width="1.5"></span>
          <h3 class="empty-state-title">Failed to load properties</h3>
          <p class="empty-state-description">Please check your connection and try again</p>
          <button class="search-panel-btn" onclick="window.location.reload()">Retry</button>
        </div>
      `;
    }

    document.getElementById('results-count').textContent = '0';
  }
}

/**
 * Map property type from API to frontend format
 */
function mapPropertyType(roomTypes) {
  if (!roomTypes) return 'boarding-house';

  const type = roomTypes.toLowerCase();
  if (type.includes('single')) return 'single-room';
  if (type.includes('shared')) return 'shared-room';
  if (type.includes('apartment')) return 'apartment';
  if (type.includes('dorm')) return 'dormitory';
  return 'boarding-house';
}

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}

/**
 * Load user data (saved rooms, applications)
 */
async function loadUserData() {
  try {
    const [savedRes, appliedRes] = await Promise.all([
      fetch(`${CONFIG.API_BASE_URL}/api/boarder/saved-rooms`, {
        credentials: 'include',
      }).catch(() => null),
      fetch(`${CONFIG.API_BASE_URL}/api/boarder/applications`, {
        credentials: 'include',
      }).catch(() => null),
    ]);

    if (savedRes && savedRes.ok) {
      const savedData = await savedRes.json();
      savedRooms = (savedData.data?.rooms || []).map(r => r.id);
    }

    if (appliedRes && appliedRes.ok) {
      const appliedData = await appliedRes.json();
      appliedRooms = (appliedData.data?.applications || []).map(a => a.property_id || a.room_id);
    }

    console.log('User data loaded:', { savedRooms, appliedRooms });
  } catch (error) {
    console.warn('Failed to load user data:', error);
  }

  // Update badge counts
  const savedCountEl = document.getElementById('saved-count');
  const appliedCountEl = document.getElementById('applied-count');

  if (savedCountEl) savedCountEl.textContent = savedRooms.length;
  if (appliedCountEl) appliedCountEl.textContent = appliedRooms.length;

  // Re-render markers with user data
  if (filteredProperties.length > 0) {
    addPropertyMarkers(filteredProperties);
    updatePropertiesList(filteredProperties);
  }
}

/**
 * Add property markers to the map
 */
function addPropertyMarkers(properties) {
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  console.log(`Adding ${properties.length} markers to map`);

  properties.forEach(property => {
    // Determine marker type
    let markerType = 'available';
    if (savedRooms.includes(property.id)) markerType = 'saved';
    if (appliedRooms.includes(property.id)) markerType = 'applied';

    // Create custom icon based on marker type
    const icon = createCustomIcon(markerType);

    // Create custom popup content
    const popupContent = createPropertyPopup(property, markerType);

    // Create marker
    const marker = L.marker([property.lat, property.lng], { icon })
      .addTo(map)
      .bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
      });

    markers.push(marker);
  });

  console.log(`Added ${markers.length} markers to map`);
}

/**
 * Create custom marker icon
 */
function createCustomIcon(type) {
  const colors = {
    available: '#4a7c23',
    saved: '#f59e0b',
    applied: '#3b82f6',
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${colors[type]};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
}

/**
 * Create property popup content
 */
function createPropertyPopup(property, markerType) {
  const statusBadge = {
    available: '',
    saved: '<span class="popup-status-badge saved">★ Saved</span>',
    applied: '<span class="popup-status-badge applied">📄 Applied</span>',
  };

  const actionButton =
    markerType === 'applied'
      ? `<button class="popup-btn" onclick="window.viewApplication(${property.id})">View Application</button>`
      : `<button class="popup-btn popup-btn-primary" onclick="window.viewProperty(${property.id})">View Details</button>`;

  const saveButtonText = savedRooms.includes(property.id) ? 'Unsave' : 'Save';
  const saveButtonIcon = savedRooms.includes(property.id) ? 'bookmarkFilled' : 'bookmark';

  return `
    <div class="property-popup">
      <div class="property-popup-image" style="background-image: url('${
        property.image
      }'); background-size: cover; background-position: center;"></div>
      <div class="property-popup-content">
        ${statusBadge[markerType] || ''}
        <h3 class="property-popup-title">${property.title}</h3>
        <div class="property-popup-location">
          <span data-icon="location" data-icon-width="12" data-icon-height="12" data-icon-stroke-width="1.5"></span>
          ${property.location}
        </div>
        <div class="property-popup-meta">
          <span class="popup-distance">📍 ${property.distance}m from you</span>
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
          <button class="popup-btn popup-btn-outline" onclick="window.saveProperty(${property.id})">
            <span data-icon="${saveButtonIcon}" data-icon-width="16" data-icon-height="16" data-icon-stroke-width="1.5"></span>
            ${saveButtonText}
          </button>
          ${actionButton}
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Search button
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
  }

  // Search input enter key
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') performSearch();
    });
  }

  // Locate me button
  const locateBtn = document.getElementById('locate-me');
  if (locateBtn) {
    locateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      getUserLocation();
    });
  }

  // Zoom controls
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (map) map.zoomIn();
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (map) map.zoomOut();
    });
  }

  // Filter changes
  const priceFilter = document.getElementById('price-filter');
  const typeFilter = document.getElementById('type-filter');
  if (priceFilter) priceFilter.addEventListener('change', updateFilterTags);
  if (typeFilter) typeFilter.addEventListener('change', updateFilterTags);

  document.querySelectorAll('.amenity-checkbox input').forEach(cb => {
    cb.addEventListener('change', updateFilterTags);
  });

  // Sort change
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', sortProperties);
  }

  // Quick filter buttons
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentDistanceFilter = parseInt(e.currentTarget.dataset.distance);
      
      // Draw radius circle around current location
      drawRadiusCircle(currentDistanceFilter);
      
      performSearch();
    });
  });

  // Results tabs
  document.querySelectorAll('.results-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      document.querySelectorAll('.results-tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      filterByTab(e.currentTarget.dataset.tab);
    });
  });

  console.log('Event listeners setup complete');
}

/**
 * Perform search with filters
 */
function performSearch() {
  const searchTerm = document.getElementById('search-input')?.value || '';
  const priceRange = document.getElementById('price-filter')?.value || '';
  const propertyType = document.getElementById('type-filter')?.value || '';
  const amenities = Array.from(document.querySelectorAll('.amenity-checkbox input:checked')).map(
    cb => cb.value
  );

  console.log('Performing search with filters:', {
    searchTerm,
    priceRange,
    propertyType,
    amenities,
    currentDistanceFilter,
  });

  // Start with all properties
  let filtered = [...allProperties];

  // Apply distance filter
  filtered = filtered.filter(p => p.distance <= currentDistanceFilter);

  // Apply search term filter
  if (searchTerm) {
    filtered = filtered.filter(
      p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.province.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Apply price range filter
  if (priceRange) {
    const [min, max] = priceRange
      .split('-')
      .map(v => (v === '+' ? Infinity : parseInt(v.replace(/[^\d]/g, ''))));
    filtered = filtered.filter(p => p.price >= min && p.price <= (max || Infinity));
  }

  // Apply property type filter
  if (propertyType) {
    filtered = filtered.filter(p => p.type === propertyType);
  }

  // Apply amenities filter
  if (amenities.length > 0) {
    filtered = filtered.filter(p =>
      amenities.every(a => p.amenities.some(pa => pa.toLowerCase().includes(a.toLowerCase())))
    );
  }

  console.log(`Filtered to ${filtered.length} properties`);

  // Update results
  filteredProperties = filtered;
  updatePropertiesList(filtered);
  addPropertyMarkers(filtered);
}

/**
 * Filter by tab (all/saved/applied)
 */
function filterByTab(tab) {
  let filtered = [...allProperties];

  if (tab === 'saved') {
    filtered = filtered.filter(p => savedRooms.includes(p.id));
  } else if (tab === 'applied') {
    filtered = filtered.filter(p => appliedRooms.includes(p.id));
  }

  console.log(`Tab filter '${tab}': ${filtered.length} properties`);

  filteredProperties = filtered;
  updatePropertiesList(filtered);
  addPropertyMarkers(filtered);
}

/**
 * Update filter tags display
 */
function updateFilterTags() {
  const tagsContainer = document.getElementById('filter-tags');
  if (!tagsContainer) return;

  const tags = [];

  const priceFilter = document.getElementById('price-filter')?.value;
  if (priceFilter) {
    tags.push({ label: `Price: ${priceFilter}`, type: 'price', value: priceFilter });
  }

  const typeFilter = document.getElementById('type-filter')?.value;
  if (typeFilter) {
    tags.push({ label: `Type: ${typeFilter}`, type: 'type', value: typeFilter });
  }

  document.querySelectorAll('.amenity-checkbox input:checked').forEach(cb => {
    tags.push({
      label: cb.parentElement.querySelector('span').textContent,
      type: 'amenity',
      value: cb.value,
    });
  });

  tagsContainer.innerHTML = tags
    .map(
      tag => `
      <div class="filter-tag active" data-type="${tag.type}" data-value="${tag.value}">
        ${tag.label}
        <span class="remove-icon" data-icon="close" data-icon-width="16" data-icon-height="16" data-icon-stroke-width="1.5"></span>
      </div>
    `
    )
    .join('');

  // Add remove handlers
  tagsContainer.querySelectorAll('.filter-tag').forEach(tag => {
    tag
      .querySelector('.remove-icon')
      .addEventListener('click', () => removeFilter(tag.dataset.type, tag.dataset.value));
  });
}

/**
 * Remove a filter
 */
function removeFilter(type, value) {
  if (type === 'price') {
    const priceFilter = document.getElementById('price-filter');
    if (priceFilter) priceFilter.value = '';
  } else if (type === 'type') {
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter) typeFilter.value = '';
  } else if (type === 'amenity') {
    const cb = document.querySelector(`.amenity-checkbox input[value="${value}"]`);
    if (cb) cb.checked = false;
  }
  updateFilterTags();
  performSearch();
}

/**
 * Update properties list
 */
function updatePropertiesList(properties) {
  const container = document.getElementById('properties-list');
  const countEl = document.getElementById('results-count');

  if (!container || !countEl) return;

  countEl.textContent = properties.length;

  if (properties.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon" data-icon="grid2x2" data-icon-width="48" data-icon-height="48" data-icon-stroke-width="1.5"></span>
        <h3 class="empty-state-title">No properties found</h3>
        <p class="empty-state-description">Try adjusting your filters or search area</p>
      </div>
    `;
    return;
  }

  container.innerHTML = properties
    .map(property => {
      const isSaved = savedRooms.includes(property.id);
      const isApplied = appliedRooms.includes(property.id);
      const statusClass = isApplied ? ' applied' : isSaved ? ' saved' : '';
      const statusBadge = isApplied
        ? '<span class="card-status-badge applied">📄 Applied</span>'
        : isSaved
        ? '<span class="card-status-badge saved">★ Saved</span>'
        : '';

      return `
        <div class="property-card${statusClass}" data-id="${property.id}">
          <div class="property-card-image" style="background-image: url('${
            property.image
          }'); background-size: cover; background-position: center;"></div>
          <div class="property-card-content">
            ${statusBadge}
            <div class="property-card-header">
              <h3 class="property-card-title">${property.title}</h3>
              <div class="property-card-rating">
                <span data-icon="starSolid" data-icon-width="14" data-icon-height="14" style="color: #f59e0b;"></span>
                ${property.rating}
              </div>
            </div>
            <div class="property-card-location">
              <span data-icon="location" data-icon-width="12" data-icon-height="12" data-icon-stroke-width="1.5"></span>
              ${property.location}
            </div>
            <div class="property-card-meta">
              <span class="card-distance">📍 ${property.distance}m from you</span>
              <span style="color: #555; font-size: 12px;">${property.availableRooms}/${
        property.totalRooms
      } available</span>
            </div>
            <div class="property-card-footer">
              <div class="property-card-price">₱${property.price.toLocaleString()}<span>/month</span></div>
              <button class="property-card-btn" onclick="window.viewProperty(${
                property.id
              })">View</button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Re-initialize icons after updating content
  if (window.initIconElements) {
    window.initIconElements();
  }
}

/**
 * Sort properties
 */
function sortProperties() {
  const sortBy = document.getElementById('sort-select')?.value || 'distance';
  const sorted = [...filteredProperties];

  switch (sortBy) {
    case 'price-low':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case 'distance':
    default:
      sorted.sort((a, b) => a.distance - b.distance);
      break;
  }

  filteredProperties = sorted;
  updatePropertiesList(sorted);
  addPropertyMarkers(sorted);
}

/**
 * Get user location
 */
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        console.log('User location obtained:', userLocation);

        // Center map on user location
        map.setView([userLocation.lat, userLocation.lng], 15);

        // Add user location marker
        L.marker([userLocation.lat, userLocation.lng])
          .addTo(map)
          .bindPopup('<strong>Your Current Location</strong>')
          .openPopup();

        // Redraw radius circle at new location
        drawRadiusCircle(currentDistanceFilter);

        // Recalculate distances
        allProperties.forEach(property => {
          property.distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            property.lat,
            property.lng
          );
        });

        // Re-sort and update
        performSearch();
      },
      error => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enable location permissions.');
      }
    );
  } else {
    alert('Geolocation is not supported by your browser.');
  }
}

// Global functions for popup and card buttons
window.viewProperty = id => {
  console.log('View property:', id);
  window.location.href = `../rooms/detail.html?id=${id}`;
};

window.viewApplication = id => {
  console.log('View application:', id);
  window.location.href = `../applications/index.html?id=${id}`;
};

window.saveProperty = async id => {
  console.log('Toggle save property:', id);

  try {
    const isSaved = savedRooms.includes(id);
    const method = isSaved ? 'DELETE' : 'POST';
    const url = `${CONFIG.API_BASE_URL}/api/boarder/saved-rooms${isSaved ? `/${id}` : ''}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: isSaved ? null : JSON.stringify({ property_id: id }),
    });

    if (response.ok) {
      // Update local state
      if (isSaved) {
        savedRooms = savedRooms.filter(roomId => roomId !== id);
      } else {
        savedRooms.push(id);
      }

      // Update UI
      loadUserData();
      performSearch();
    } else {
      console.error('Failed to save/unsave property');
    }
  } catch (error) {
    console.error('Error saving property:', error);
  }
};
