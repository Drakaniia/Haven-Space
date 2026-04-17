/**
 * Find a Room Page - Boarder Dashboard
 * Handles property search, filtering, and display
 */

import { getIcon, getSolidIcon } from '../../shared/icons.js';
import { updateBoarderStatus } from '../../shared/routing.js';
import CONFIG from '../../config.js';

// State management
const state = {
  filters: {
    search: '',
    price: 'any',
    roomType: 'any',
    distance: 'any',
    amenities: [],
  },
  view: 'grid',
  sort: 'recommended',
  loadedProperties: 4,
  map: null,
  markers: [],
  mapVisible: false,
  currentProperty: null,
  properties: [], // Store fetched properties
  isLoading: false,
};

/**
 * Fetch properties from API
 */
async function fetchProperties() {
  if (state.isLoading) return;

  state.isLoading = true;

  try {
    // Build query parameters
    const params = new URLSearchParams();

    if (state.filters.search) {
      params.append('search', state.filters.search);
    }

    if (state.filters.price !== 'any') {
      const priceRange = state.filters.price;
      if (priceRange.includes('-')) {
        const [min, max] = priceRange.split('-');
        params.append('price_min', min);
        params.append('price_max', max);
      } else if (priceRange.endsWith('+')) {
        params.append('price_min', priceRange.replace('+', ''));
      }
    }

    if (state.filters.roomType !== 'any') {
      params.append('room_type', state.filters.roomType);
    }

    if (state.sort !== 'recommended') {
      params.append('sort_by', state.sort);
    }

    // Fetch from API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/public?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }

    const result = await response.json();

    if (result.success && result.data && result.data.properties) {
      // Transform API data to match expected format
      state.properties = result.data.properties.map(prop => ({
        id: prop.id,
        title: prop.title,
        address: prop.address,
        location: prop.city || prop.address,
        distance: 0, // Calculate if needed
        price: prop.price,
        rating: prop.rating || 4.5,
        reviews: prop.reviews || 0,
        type: prop.roomTypes || 'single',
        amenities: Array.isArray(prop.amenities) ? prop.amenities : [],
        image: prop.image || '../../assets/images/placeholder-room.svg',
        badges: prop.badges || [],
        available: 'Now',
        roomTypes: prop.roomTypes || 'Available',
        lat: prop.latitude,
        lng: prop.longitude,
        phone: prop.phone || '',
        locationCode: '',
        propertyType: prop.propertyType || 'Boarding House',
        photos: prop.images || [prop.image],
        reviewsList: [],
      }));

      return state.properties;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching properties:', error);
    state.properties = [];
    return [];
  } finally {
    state.isLoading = false;
  }
}

/**
 * Initialize the Find a Room page
 */
export function initFindARoom() {
  if (!document.querySelector('.find-room-dashboard')) {
    return;
  }

  // Update boarder status to 'browsing' when accessing find-a-room page
  updateBoarderStatus('browsing');

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await loadInitialData();
      setupEventListeners();
    });
  } else {
    loadInitialData().then(() => {
      setupEventListeners();
    });
  }
}

/**
 * Load initial property data
 */
async function loadInitialData() {
  await fetchProperties();
  applyFilters();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('main-search-input');
  const searchBtn = document.getElementById('main-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        applyFilters();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', applyFilters);
  }

  // Location chips
  document.querySelectorAll('.find-room-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const location = chip.dataset.location;
      if (location && searchInput) {
        searchInput.value = location;
        applyFilters();
      }
    });
  });

  // Filter selects
  const priceFilter = document.getElementById('price-filter');
  const roomTypeFilter = document.getElementById('room-type-filter');
  const distanceFilter = document.getElementById('distance-filter');
  const sortSelect = document.getElementById('sort-select');

  if (priceFilter) {
    priceFilter.addEventListener('change', handleFilterChange);
  }
  if (roomTypeFilter) {
    roomTypeFilter.addEventListener('change', handleFilterChange);
  }
  if (distanceFilter) {
    distanceFilter.addEventListener('change', handleFilterChange);
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', handleSortChange);
  }

  // Amenities dropdown
  const amenitiesToggle = document.getElementById('amenities-toggle');
  const amenitiesPanel = document.getElementById('amenities-panel');

  if (amenitiesToggle && amenitiesPanel) {
    amenitiesToggle.addEventListener('click', e => {
      e.stopPropagation();
      amenitiesToggle.classList.toggle('active');
      amenitiesPanel.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', e => {
      if (!amenitiesToggle.contains(e.target) && !amenitiesPanel.contains(e.target)) {
        amenitiesToggle.classList.remove('active');
        amenitiesPanel.classList.remove('active');
      }
    });

    // Handle amenity checkbox changes
    amenitiesPanel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', handleAmenityChange);
    });
  }

  // Reset filters
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetFilters);
  }

  // View toggle
  document.querySelectorAll('.find-room-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.find-room-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.view = btn.dataset.view;

      const grid = document.getElementById('properties-grid');
      if (grid) {
        if (state.view === 'list') {
          grid.classList.add('list-view');
        } else {
          grid.classList.remove('list-view');
        }
      }
    });
  });

  // Load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', handleLoadMore);
  }

  // Clear filters button (no results state)
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', resetFilters);
  }

  // Favorite buttons
  document.querySelectorAll('.find-room-favorite-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(btn);
    });
  });

  // Property card clicks
  document.querySelectorAll('.find-room-property-card').forEach(card => {
    card.addEventListener('click', () => {
      const propertyId = card.dataset.propertyId;
      if (propertyId) {
        window.location.href = `../rooms/detail.html?id=${propertyId}`;
      }
    });
  });

  // Map toggle button
  const mapToggleBtn = document.getElementById('map-toggle-btn');
  const mapCloseBtn = document.getElementById('map-close-btn');

  if (mapToggleBtn) {
    mapToggleBtn.addEventListener('click', () => {
      openMapView();
    });
  }

  if (mapCloseBtn) {
    mapCloseBtn.addEventListener('click', () => {
      closeMapView();
    });
  }

  // Detail panel close button
  const detailPanelCloseBtn = document.getElementById('detail-panel-close-btn');
  if (detailPanelCloseBtn) {
    detailPanelCloseBtn.addEventListener('click', () => {
      closeDetailPanel();
    });
  }

  // Detail tabs
  document.querySelectorAll('.detail-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchDetailTab(tab.dataset.tab);
    });
  });
}

/**
 * Open map view
 */
async function openMapView() {
  const mapView = document.getElementById('map-view');
  if (mapView) {
    mapView.style.display = 'flex';
    state.mapVisible = true;

    // Initialize map if not already done
    if (!state.map) {
      await initMap();
    } else {
      // Invalidate size to ensure proper rendering
      setTimeout(() => {
        state.map.invalidateSize();
        // Update markers with current properties
        addPropertyMarkers(state.properties);
      }, 100);
    }
  }
}

/**
 * Close map view
 */
function closeMapView() {
  const mapView = document.getElementById('map-view');
  const detailPanel = document.getElementById('detail-panel');
  if (mapView) {
    mapView.style.display = 'none';
    state.mapVisible = false;

    // Close detail panel if open
    if (detailPanel) {
      detailPanel.style.display = 'none';
    }
  }
}

/**
 * Initialize Leaflet map
 */
async function initMap() {
  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error('Leaflet is not loaded');
    return;
  }

  // Ensure we have properties loaded
  if (state.properties.length === 0) {
    await fetchProperties();
  }

  // Calculate center point from properties with coordinates
  const propertiesWithCoords = state.properties.filter(p => p.lat && p.lng);
  let centerLat = 8.1489; // Default: Malaybalay City
  let centerLng = 125.125;
  let zoom = 13;

  if (propertiesWithCoords.length > 0) {
    // Calculate average position
    const avgLat =
      propertiesWithCoords.reduce((sum, p) => sum + p.lat, 0) / propertiesWithCoords.length;
    const avgLng =
      propertiesWithCoords.reduce((sum, p) => sum + p.lng, 0) / propertiesWithCoords.length;
    centerLat = avgLat;
    centerLng = avgLng;
    zoom = 12;
  }

  // Create map centered at calculated position
  state.map = L.map('find-room-map').setView([centerLat, centerLng], zoom);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(state.map);

  // Add property markers
  addPropertyMarkers(state.properties);
}

/**
 * Add property markers to map
 */
function addPropertyMarkers(propertiesList) {
  if (!state.map) return;

  // Clear existing markers
  state.markers.forEach(marker => state.map.removeLayer(marker));
  state.markers = [];

  // Filter properties that have valid coordinates
  const validProperties = propertiesList.filter(
    property => property.lat && property.lng && !isNaN(property.lat) && !isNaN(property.lng)
  );

  if (validProperties.length === 0) {
    console.warn('No properties with valid coordinates to display on map');
    return;
  }

  validProperties.forEach(property => {
    // Create custom icon
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background: var(--primary-green);
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">₱</div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });

    // Create marker
    const marker = L.marker([property.lat, property.lng], { icon })
      .addTo(state.map)
      .bindPopup(createPropertyPopup(property));

    // Add click event to navigate to maps.html
    marker.on('click', () => {
      window.location.href = '../../views/public/maps.html?property=' + property.id;
    });

    state.markers.push(marker);
  });

  // Fit map bounds to show all markers if there are multiple properties
  if (validProperties.length > 1) {
    const bounds = L.latLngBounds(validProperties.map(p => [p.lat, p.lng]));
    state.map.fitBounds(bounds, { padding: [50, 50] });
  }
}

/**
 * Create property popup content
 */
function createPropertyPopup(property) {
  const amenitiesHtml = Array.isArray(property.amenities)
    ? property.amenities
        .slice(0, 3)
        .map(a => `<span class="amenity-badge">${a}</span>`)
        .join('')
    : '';

  return `
    <div class="property-popup">
      <div class="property-popup-image" style="background-image: url('${
        property.image
      }'); background-size: cover; background-position: center;"></div>
      <div class="property-popup-content">
        <h3 class="property-popup-title">${property.title}</h3>
        <div class="property-popup-location">
          ${getIcon('location', { width: 12, height: 12 })}
          ${property.address}
        </div>
        <div class="property-popup-meta">
          ${
            property.distance
              ? `<span class="popup-distance">📍 ${property.distance} km away</span>`
              : ''
          }
          <span class="popup-rating">⭐ ${property.rating} (${property.reviews})</span>
        </div>
        <div class="property-popup-price">₱${property.price.toLocaleString()}/month</div>
        ${amenitiesHtml ? `<div class="property-popup-amenities">${amenitiesHtml}</div>` : ''}
        <div class="property-popup-actions">
          <button class="popup-btn popup-btn-primary" onclick="window.openDetailPanelById(${
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
 * Open detail panel for a property
 */
function openDetailPanel(property) {
  const detailPanel = document.getElementById('detail-panel');
  if (detailPanel) {
    detailPanel.style.display = 'block';
    state.currentProperty = property;

    // Populate detail panel
    populateDetailPanel(property);
  }
}

/**
 * Close detail panel
 */
function closeDetailPanel() {
  const detailPanel = document.getElementById('detail-panel');
  if (detailPanel) {
    detailPanel.style.display = 'none';
    state.currentProperty = null;
  }
}

/**
 * Switch detail panel tab
 */
function switchDetailTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.detail-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    }
  });

  // Update tab content
  document.querySelectorAll('.detail-tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const activeContent = document.getElementById(`${tabName}-tab`);
  if (activeContent) {
    activeContent.classList.add('active');
  }
}

/**
 * Populate detail panel with property data
 */
function populateDetailPanel(property) {
  // Set property image
  const propertyImage = document.getElementById('detail-property-image');
  if (propertyImage) {
    propertyImage.src = property.image || '../../assets/images/placeholder-room.svg';
    propertyImage.alt = property.title;
    propertyImage.onerror = function () {
      this.src = '../../assets/images/placeholder-room.svg';
    };
  }

  // Set property title
  const propertyTitle = document.getElementById('detail-property-title');
  if (propertyTitle) {
    propertyTitle.textContent = property.title;
  }

  // Set rating
  const ratingValue = document.getElementById('detail-rating-value');
  if (ratingValue) {
    ratingValue.textContent = property.rating;
  }

  // Set rating stars
  const ratingStars = document.getElementById('detail-rating-stars');
  if (ratingStars) {
    ratingStars.innerHTML = generateStarRating(property.rating);
  }

  // Set review count
  const ratingCount = document.getElementById('detail-rating-count');
  if (ratingCount) {
    ratingCount.textContent = `(${property.reviews})`;
  }

  // Set property type
  const propertyType = document.getElementById('detail-property-type');
  if (propertyType) {
    propertyType.textContent = property.propertyType;
  }

  // Set address
  const address = document.getElementById('detail-address');
  if (address) {
    address.textContent = property.address;
  }

  // Set phone
  const phone = document.getElementById('detail-phone');
  if (phone) {
    phone.textContent = property.phone;
  }

  // Set location code
  const locationCode = document.getElementById('detail-location-code');
  if (locationCode) {
    locationCode.textContent = property.locationCode;
  }

  // Set photos
  const photosContainer = document.getElementById('detail-photos');
  if (photosContainer) {
    photosContainer.innerHTML = `
      <div class="detail-photo-item active">
        <img src="${property.photos[0]}" alt="All" />
        <span>All</span>
      </div>
      <div class="detail-photo-item">
        <img src="${property.photos[1] || property.photos[0]}" alt="Rooms" />
        <span>Rooms</span>
      </div>
      <div class="detail-photo-item">
        <img src="${property.photos[2] || property.photos[0]}" alt="Videos" />
        <span>Videos</span>
      </div>
    `;
  }

  // Set rating number
  const ratingNumber = document.getElementById('detail-rating-number');
  if (ratingNumber) {
    ratingNumber.textContent = property.rating;
  }

  // Set rating stars large
  const ratingStarsLarge = document.getElementById('detail-rating-stars-large');
  if (ratingStarsLarge) {
    ratingStarsLarge.innerHTML = generateStarRating(property.rating, 20);
  }

  // Set review count
  const reviewCount = document.getElementById('detail-review-count');
  if (reviewCount) {
    reviewCount.textContent = `${property.reviews} reviews`;
  }

  // Set reviews
  const reviewsContainer = document.getElementById('detail-reviews-container');
  if (reviewsContainer) {
    reviewsContainer.innerHTML = property.reviewsList
      .map(
        review => `
      <div class="detail-review-item">
        <div class="detail-review-header">
          <div class="detail-review-avatar">${review.initials}</div>
          <div class="detail-review-user-info">
            <p class="detail-review-username">${review.username}</p>
            <p class="detail-review-meta">${review.reviewsCount} reviews · ${
          review.photosCount
        } photos</p>
          </div>
        </div>
        <div class="detail-review-rating">
          ${generateStarRating(review.rating, 14)}
          <span class="detail-review-time">${review.time}</span>
        </div>
        <p class="detail-review-text">${review.text}</p>
      </div>
    `
      )
      .join('');
  }
}

/**
 * Generate star rating HTML
 */
function generateStarRating(rating, size = 16) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHtml = '';

  for (let i = 0; i < fullStars; i++) {
    starsHtml += getSolidIcon('starSolid');
  }

  if (hasHalfStar) {
    starsHtml += getSolidIcon('starHalf');
  }

  for (let i = 0; i < emptyStars; i++) {
    starsHtml += getIcon('star', { width: size, height: size });
  }

  return starsHtml;
}

/**
 * Global function to open detail panel by property ID
 */
window.openDetailPanelById = function (propertyId) {
  const property = state.properties.find(p => p.id === parseInt(propertyId));
  if (property) {
    openDetailPanel(property);
  }
};

/**
 * Handle search input
 */
function handleSearchInput(e) {
  state.filters.search = e.target.value.toLowerCase();
  debounce(applyFilters, 300)();
}

/**
 * Handle filter change
 */
function handleFilterChange(e) {
  const filterType = e.target.id.replace('-filter', '');

  switch (filterType) {
    case 'price':
      state.filters.price = e.target.value;
      break;
    case 'room-type':
      state.filters.roomType = e.target.value;
      break;
    case 'distance':
      state.filters.distance = e.target.value;
      break;
  }

  // Refetch properties with new filters
  fetchProperties().then(() => {
    applyFilters();
  });
}

/**
 * Handle amenity checkbox change
 */
function handleAmenityChange(e) {
  const amenity = e.target.value;
  const isChecked = e.target.checked;

  if (isChecked) {
    if (!state.filters.amenities.includes(amenity)) {
      state.filters.amenities.push(amenity);
    }
  } else {
    state.filters.amenities = state.filters.amenities.filter(a => a !== amenity);
  }

  updateActiveFilters();
  applyFilters();
}

/**
 * Handle sort change
 */
function handleSortChange(e) {
  state.sort = e.target.value;
  // Refetch properties with new sort
  fetchProperties().then(() => {
    applyFilters();
  });
}

/**
 * Apply all filters to properties
 */
function applyFilters() {
  const filtered = filterProperties();
  const sorted = sortProperties(filtered);
  renderProperties(sorted.slice(0, state.loadedProperties));
  updateResultsCount(sorted.length);
  toggleNoResults(sorted.length === 0);
}

/**
 * Filter properties based on current state
 */
function filterProperties() {
  return state.properties.filter(property => {
    // Search filter
    if (state.filters.search) {
      const searchTerms = [
        property.title.toLowerCase(),
        property.address.toLowerCase(),
        property.location.toLowerCase(),
      ].join(' ');

      if (!searchTerms.includes(state.filters.search)) {
        return false;
      }
    }

    // Distance filter (client-side)
    if (state.filters.distance !== 'any' && property.distance) {
      const maxDistance = parseInt(state.filters.distance);
      if (property.distance > maxDistance) {
        return false;
      }
    }

    // Amenities filter (client-side)
    if (state.filters.amenities.length > 0 && Array.isArray(property.amenities)) {
      const hasAllAmenities = state.filters.amenities.every(amenity =>
        property.amenities.includes(amenity)
      );

      if (!hasAllAmenities) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort properties based on current sort state
 */
function sortProperties(propertiesList) {
  const sorted = [...propertiesList];

  switch (state.sort) {
    case 'price-low':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'distance':
      sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      break;
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      // Assuming newer properties have higher IDs
      sorted.sort((a, b) => b.id - a.id);
      break;
    case 'recommended':
    default:
      // Recommended: prioritize verified, then rating, then price
      sorted.sort((a, b) => {
        const aScore =
          (a.badges && a.badges.includes('verified') ? 10 : 0) + a.rating * 2 - a.price / 1000;
        const bScore =
          (b.badges && b.badges.includes('verified') ? 10 : 0) + b.rating * 2 - b.price / 1000;
        return bScore - aScore;
      });
      break;
  }

  return sorted;
}

/**
 * Render properties to the grid
 */
function renderProperties(propertiesList) {
  const grid = document.getElementById('properties-grid');
  if (!grid) {
    return;
  }

  if (propertiesList.length === 0) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = propertiesList
    .map(
      property => `
    <div class="find-room-property-card" data-property-id="${property.id}">
      <div class="find-room-card-image-wrapper">
        <img
          src="${property.image}"
          alt="${property.title}"
          class="find-room-card-image"
          onerror="this.src='../../assets/images/placeholder-room.svg'"
        />
        <div class="find-room-card-badges">
          ${
            property.badges && Array.isArray(property.badges)
              ? property.badges
                  .map(
                    badge => `
          <span class="find-room-badge find-room-badge-${badge}">
            ${badge === 'verified' ? badgeIcon() : ''}
            ${capitalizeFirstLetter(badge)}
          </span>
          `
                  )
                  .join('')
              : ''
          }
        </div>
        <button class="find-room-favorite-btn" data-favorite="false">
          ${heartIcon(false)}
        </button>
        <div class="find-room-card-amenities-preview">
          ${
            property.amenities && Array.isArray(property.amenities)
              ? property.amenities
                  .slice(0, 3)
                  .map(amenity => getAmenityIcon(amenity))
                  .join('')
              : ''
          }
          ${
            property.amenities && property.amenities.length > 3
              ? `<span class="find-room-amenity-more">+${property.amenities.length - 3}</span>`
              : ''
          }
        </div>
      </div>
      <div class="find-room-card-content">
        <div class="find-room-card-header">
          <div class="find-room-card-location">
            ${locationIcon()}
            <span class="find-room-card-distance">${
              property.distance
                ? `${property.distance} km from ${property.location.split(' ')[0]}`
                : property.location
            }</span>
          </div>
          <div class="find-room-card-rating">
            ${starIcon()}
            <span class="find-room-card-rating-value">${property.rating}</span>
            <span class="find-room-card-rating-count">(${property.reviews})</span>
          </div>
        </div>
        <h3 class="find-room-card-title">${property.title}</h3>
        <p class="find-room-card-address">${property.address}</p>
        <div class="find-room-card-features">
          <span class="find-room-feature">
            ${userIcon()}
            ${property.roomTypes}
          </span>
          <span class="find-room-feature">
            ${clockIcon()}
            Available ${property.available}
          </span>
        </div>
        <div class="find-room-card-footer">
          <div class="find-room-card-price">
            <span class="find-room-card-price-amount">₱${property.price.toLocaleString()}</span>
            <span class="find-room-card-price-period">/month</span>
          </div>
          <a href="../rooms/detail.html?id=${property.id}" class="find-room-card-btn">
            View Details
            ${arrowIcon()}
          </a>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  // Re-attach event listeners to new cards
  grid.querySelectorAll('.find-room-favorite-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(btn);
    });
  });

  grid.querySelectorAll('.find-room-property-card').forEach(card => {
    card.addEventListener('click', () => {
      const propertyId = card.dataset.propertyId;
      if (propertyId) {
        window.location.href = `../rooms/detail.html?id=${propertyId}`;
      }
    });
  });
}

/**
 * Update results count
 */
function updateResultsCount(count) {
  const countEl = document.getElementById('results-count');
  const subtitleEl = document.getElementById('results-subtitle');

  if (countEl) {
    countEl.textContent = count;
  }

  if (subtitleEl) {
    if (count === 0) {
      subtitleEl.textContent = 'No properties match your criteria';
    } else if (count === 1) {
      subtitleEl.textContent = 'Showing 1 property';
    } else {
      subtitleEl.textContent = `Showing ${count} properties`;
    }
  }
}

/**
 * Toggle no results state
 */
function toggleNoResults(show) {
  const noResults = document.getElementById('no-results');
  const grid = document.getElementById('properties-grid');
  const loadMore = document.querySelector('.find-room-load-more');

  if (noResults) {
    noResults.style.display = show ? 'block' : 'none';
  }

  if (grid) {
    grid.style.display = show ? 'none' : 'grid';
  }

  if (loadMore) {
    loadMore.style.display = show ? 'none' : 'block';
  }
}

/**
 * Update active filter tags
 */
function updateActiveFilters() {
  const container = document.getElementById('active-filters-container');
  if (!container) {
    return;
  }

  const tags = [];

  if (state.filters.price !== 'any') {
    tags.push(createFilterTag('price', `Price: ${state.filters.price}`));
  }

  if (state.filters.roomType !== 'any') {
    tags.push(
      createFilterTag('roomType', `Type: ${capitalizeFirstLetter(state.filters.roomType)}`)
    );
  }

  if (state.filters.distance !== 'any') {
    tags.push(createFilterTag('distance', `Distance: ${state.filters.distance} km`));
  }

  state.filters.amenities.forEach(amenity => {
    tags.push(createFilterTag(`amenity-${amenity}`, capitalizeFirstLetter(amenity)));
  });

  container.innerHTML = tags.join('');

  // Add event listeners to remove buttons
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const filterKey = btn.dataset.filterKey;
      removeFilter(filterKey);
    });
  });
}

/**
 * Create a filter tag HTML
 */
function createFilterTag(key, label) {
  return `
    <span class="find-room-filter-tag">
      ${label}
      <button data-filter-key="${key}" aria-label="Remove filter">
        ${closeIcon()}
      </button>
    </span>
  `;
}

/**
 * Remove a specific filter
 */
function removeFilter(key) {
  if (key === 'price') {
    state.filters.price = 'any';
    const priceFilter = document.getElementById('price-filter');
    if (priceFilter) {
      priceFilter.value = 'any';
    }
  } else if (key === 'roomType') {
    state.filters.roomType = 'any';
    const roomTypeFilter = document.getElementById('room-type-filter');
    if (roomTypeFilter) {
      roomTypeFilter.value = 'any';
    }
  } else if (key === 'distance') {
    state.filters.distance = 'any';
    const distanceFilter = document.getElementById('distance-filter');
    if (distanceFilter) {
      distanceFilter.value = 'any';
    }
  } else if (key.startsWith('amenity-')) {
    const amenity = key.replace('amenity-', '');
    state.filters.amenities = state.filters.amenities.filter(a => a !== amenity);
    const checkbox = document.querySelector(`#amenities-panel input[value="${amenity}"]`);
    if (checkbox) {
      checkbox.checked = false;
    }
  }

  updateActiveFilters();
  applyFilters();
}

/**
 * Reset all filters
 */
function resetFilters() {
  state.filters = {
    search: '',
    price: 'any',
    roomType: 'any',
    distance: 'any',
    amenities: [],
  };

  // Reset UI
  const searchInput = document.getElementById('main-search-input');
  const priceFilter = document.getElementById('price-filter');
  const roomTypeFilter = document.getElementById('room-type-filter');
  const distanceFilter = document.getElementById('distance-filter');

  if (searchInput) {
    searchInput.value = '';
  }
  if (priceFilter) {
    priceFilter.value = 'any';
  }
  if (roomTypeFilter) {
    roomTypeFilter.value = 'any';
  }
  if (distanceFilter) {
    distanceFilter.value = 'any';
  }

  document.querySelectorAll('#amenities-panel input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  updateActiveFilters();
  applyFilters();
}

/**
 * Handle load more
 */
function handleLoadMore() {
  state.loadedProperties += 4;
  const filtered = filterProperties();
  const sorted = sortProperties(filtered);
  renderProperties(sorted.slice(0, state.loadedProperties));

  // Hide load more button if all properties are loaded
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn && state.loadedProperties >= sorted.length) {
    loadMoreBtn.style.display = 'none';
  }
}

/**
 * Toggle favorite status
 */
function toggleFavorite(btn) {
  const isFavorite = btn.dataset.favorite === 'true';
  btn.dataset.favorite = (!isFavorite).toString();
  btn.innerHTML = heartIcon(!isFavorite);
}

// Utility functions

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Icon helpers

function badgeIcon() {
  return getIcon('badgeCheck', { strokeWidth: '2' });
}

function heartIcon(filled) {
  if (filled) {
    return getSolidIcon('heartSolid');
  }
  return getIcon('heart', { strokeWidth: '2' });
}

function locationIcon() {
  return getIcon('target', { strokeWidth: '2' });
}

function starIcon() {
  return getSolidIcon('starSolid');
}

function userIcon() {
  return getIcon('userCircle', { strokeWidth: '2' });
}

function clockIcon() {
  return getIcon('history', { strokeWidth: '2' });
}

function arrowIcon() {
  return getIcon('chevronRight', { strokeWidth: '2' });
}

function closeIcon() {
  return getIcon('xMark', { strokeWidth: '2' });
}

function getAmenityIcon(amenity) {
  const icons = {
    wifi: getIcon('wifi', { strokeWidth: '2' }),
    ac: getIcon('airConditioner', { strokeWidth: '2' }),
    parking: getIcon('check', { strokeWidth: '2' }),
    laundry: getIcon('laundryMachine', { strokeWidth: '2' }),
    kitchen: getIcon('list', { strokeWidth: '2' }),
    security: getIcon('shieldCheck', { strokeWidth: '2' }),
    cctv: getIcon('cctvCamera', { strokeWidth: '2' }),
    furnished: getIcon('square', { strokeWidth: '2' }),
  };

  return `<span class="find-room-amenity-icon" title="${capitalizeFirstLetter(amenity)}">${
    icons[amenity] || ''
  }</span>`;
}

// Initialize on module load for single-page apps
if (typeof window !== 'undefined') {
  window.initFindARoom = initFindARoom;
}

// Import and initialize enhanced features (map view, floating header, etc.)
import { initFindARoomEnhanced } from '../public/find-a-room.js';

// Initialize enhanced features when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initFindARoomEnhanced();
  });
} else {
  initFindARoomEnhanced();
}
