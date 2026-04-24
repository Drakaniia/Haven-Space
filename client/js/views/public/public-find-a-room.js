import { getIcon, getSolidIcon } from '../../shared/icons.js';
import { initFindARoomEnhanced } from './find-a-room.js';
<<<<<<< HEAD
import { redirectAuthenticatedUsers } from '../../shared/routing.js';
=======
>>>>>>> didigzz/feat/room-availability-management

const state = {
  view: 'grid',
};

export function initPublicFindARoom() {
  // Redirect authenticated boarders to the authenticated find-a-room page
  if (redirectAuthenticatedUsers()) {
    return; // Stop execution if redirect happened
  }

  if (!document.querySelector('.find-room-main')) {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
<<<<<<< HEAD
=======
      // Initialize enhanced features after basic setup
>>>>>>> didigzz/feat/room-availability-management
      initFindARoomEnhanced();
    });
  } else {
    setupEventListeners();
<<<<<<< HEAD
=======
    // Initialize enhanced features after basic setup
>>>>>>> didigzz/feat/room-availability-management
    initFindARoomEnhanced();
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('main-search-input');
  const searchBtn = document.getElementById('main-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        searchInput.dispatchEvent(new CustomEvent('apply-filters'));
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      searchInput.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }

  // Location chips — event delegation handles dynamically rendered chips
  // (chips are populated by loadPopularLocations in find-a-room.js)
  const guestChips = document.getElementById('guest-location-chips');
  const authChips = document.getElementById('auth-location-chips');
  [guestChips, authChips].forEach(container => {
    if (!container) return;
    container.addEventListener('click', e => {
      const chip = e.target.closest('.find-room-chip');
      if (!chip) return;
      const location = chip.dataset.location;
      if (location && searchInput) {
        searchInput.value = location;
        searchInput.dispatchEvent(new CustomEvent('apply-filters'));
      }
    });
  });

  const priceFilter = document.getElementById('price-filter');
  const roomTypeFilter = document.getElementById('room-type-filter');
  const distanceFilter = document.getElementById('distance-filter');
  const sortSelect = document.getElementById('sort-select');

  if (priceFilter) {
    priceFilter.addEventListener('change', () => {
      priceFilter.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }
  if (roomTypeFilter) {
    roomTypeFilter.addEventListener('change', () => {
      roomTypeFilter.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }
  if (distanceFilter) {
    distanceFilter.addEventListener('change', () => {
      distanceFilter.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortSelect.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }

  const amenitiesToggle = document.getElementById('amenities-toggle');
  const amenitiesPanel = document.getElementById('amenities-panel');

  if (amenitiesToggle && amenitiesPanel) {
    amenitiesToggle.addEventListener('click', e => {
      e.stopPropagation();
      amenitiesToggle.classList.toggle('active');
      amenitiesPanel.classList.toggle('active');
    });

    document.addEventListener('click', e => {
      if (!amenitiesToggle.contains(e.target) && !amenitiesPanel.contains(e.target)) {
        amenitiesToggle.classList.remove('active');
        amenitiesPanel.classList.remove('active');
      }
    });

    amenitiesPanel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        amenitiesPanel.dispatchEvent(new CustomEvent('apply-filters'));
      });
    });
  }

  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetBtn.dispatchEvent(new CustomEvent('reset-filters'));
    });
  }

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

  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      loadMoreBtn.dispatchEvent(new CustomEvent('load-more'));
    });
  }

  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      clearFiltersBtn.dispatchEvent(new CustomEvent('reset-filters'));
    });
  }
}

function handleSearchInput(e) {
<<<<<<< HEAD
  const searchInput = e.target;
=======
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

>>>>>>> didigzz/feat/room-availability-management
  if (searchInput) {
    searchInput.dispatchEvent(new CustomEvent('apply-filters'));
  }
}

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

if (typeof window !== 'undefined') {
  window.initPublicFindARoom = initPublicFindARoom;
}
