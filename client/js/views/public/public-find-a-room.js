/**
 * Find a Room Page - Public Version
 * Handles property search, filtering, and display
 */

import { getIcon, getSolidIcon } from '../../shared/icons.js';

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
};

// Sample property data (replace with API calls in production)
const properties = [
  {
    id: 1,
    title: 'Sunrise Dormitory',
    address: 'Katipunan Avenue, Quezon City, Metro Manila',
    location: 'University of the Philippines',
    distance: 0.5,
    price: 4500,
    rating: 4.8,
    reviews: 24,
    type: 'single',
    amenities: ['wifi', 'ac', 'parking', 'laundry', 'security', 'cctv'],
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    badges: ['verified', 'new'],
    available: 'Now',
    roomTypes: 'Single & Shared',
  },
  {
    id: 2,
    title: 'Campus View Residences',
    address: 'Loyola Heights, Quezon City, Metro Manila',
    location: 'Ateneo de Manila',
    distance: 1.2,
    price: 6500,
    rating: 4.6,
    reviews: 18,
    type: 'studio',
    amenities: ['wifi', 'furnished', 'parking', 'cctv'],
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    badges: ['verified'],
    available: 'Sept 1',
    roomTypes: 'Studio & 1 BHK',
  },
  {
    id: 3,
    title: 'Greenfield Boarding House',
    address: 'Commonwealth Avenue, Quezon City, Metro Manila',
    location: 'Miriam College',
    distance: 2.1,
    price: 3200,
    rating: 4.5,
    reviews: 32,
    type: 'shared',
    amenities: ['wifi', 'laundry', 'kitchen', 'parking'],
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    badges: ['promo'],
    available: 'Now',
    roomTypes: 'Shared Rooms',
  },
  {
    id: 4,
    title: 'Metro Plaza Apartments',
    address: 'Roxas Boulevard, Quezon City, Metro Manila',
    location: 'University of the Philippines',
    distance: 0.8,
    price: 7800,
    rating: 4.9,
    reviews: 41,
    type: '1bhk',
    amenities: ['wifi', 'ac', 'security', 'cctv', 'parking', 'laundry', 'furnished', 'kitchen'],
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    badges: ['verified', 'new'],
    available: 'Aug 15',
    roomTypes: '1 BHK & Studio',
  },
];

/**
 * Initialize the Find a Room page
 */
export function initPublicFindARoom() {
  if (!document.querySelector('.find-room-main')) {
    return;
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
  } else {
    setupEventListeners();
  }
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
        // Redirect to login for public users
        window.location.href = 'auth/login.html';
      }
    });
  });
}

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

  applyFilters();
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
  applyFilters();
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
  return properties.filter(property => {
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

    // Price filter
    if (state.filters.price !== 'any') {
      const priceRange = state.filters.price.split('-');
      const minPrice = parseInt(priceRange[0]);
      const maxPrice = priceRange[1] ? parseInt(priceRange[1]) : Infinity;

      if (property.price < minPrice || property.price > maxPrice) {
        return false;
      }
    }

    // Room type filter
    if (state.filters.roomType !== 'any') {
      if (property.type !== state.filters.roomType) {
        return false;
      }
    }

    // Distance filter
    if (state.filters.distance !== 'any') {
      const maxDistance = parseInt(state.filters.distance);
      if (property.distance > maxDistance) {
        return false;
      }
    }

    // Amenities filter
    if (state.filters.amenities.length > 0) {
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
      sorted.sort((a, b) => a.distance - b.distance);
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
        const aScore = (a.badges.includes('verified') ? 10 : 0) + a.rating * 2 - a.price / 1000;
        const bScore = (b.badges.includes('verified') ? 10 : 0) + b.rating * 2 - b.price / 1000;
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
        />
        <div class="find-room-card-badges">
          ${property.badges
            .map(
              badge => `
          <span class="find-room-badge find-room-badge-${badge}">
            ${badge === 'verified' ? badgeIcon() : ''}
            ${capitalizeFirstLetter(badge)}
          </span>
          `
            )
            .join('')}
        </div>
        <button class="find-room-favorite-btn" data-favorite="false">
          ${heartIcon(false)}
        </button>
        <div class="find-room-card-amenities-preview">
          ${property.amenities
            .slice(0, 3)
            .map(amenity => getAmenityIcon(amenity))
            .join('')}
          ${
            property.amenities.length > 3
              ? `<span class="find-room-amenity-more">+${property.amenities.length - 3}</span>`
              : ''
          }
        </div>
      </div>
      <div class="find-room-card-content">
        <div class="find-room-card-header">
          <div class="find-room-card-location">
            ${locationIcon()}
            <span class="find-room-card-distance">${property.distance} km from ${
        property.location.split(' ')[0]
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
          <a href="auth/login.html" class="find-room-card-btn">
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
        window.location.href = 'auth/login.html';
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
  window.initPublicFindARoom = initPublicFindARoom;
}
