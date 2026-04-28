/**
 * Boarder Find a Room Page - Authenticated Version
 * Handles property search, filtering, and application status display for logged-in boarders
 */

import { getImageUrl, getImageErrorHandler } from '../../shared/image-utils.js';
import CONFIG from '../../config.js';

/**
 * Initialize the authenticated boarder find-a-room page
 */
export function initBoarderFindARoom() {
  if (!document.querySelector('.find-room-dashboard')) {
    return;
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupBoarderFindARoom);
  } else {
    setupBoarderFindARoom();
  }
}

/**
 * Setup the boarder find-a-room page
 */
function setupBoarderFindARoom() {
  // Check authentication
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || user.role !== 'boarder') {
    // Redirect to login if not authenticated as boarder
    window.location.href = '../../public/auth/login.html';
    return;
  }

  // Initialize status banner
  initStatusBanner(user);

  // Initialize welcome banner
  initWelcomeBanner();

  // Setup search and filters
  setupSearchAndFilters();

  // Load properties and popular locations in parallel
  loadProperties();
  loadPopularLocations();
}

/**
 * Initialize status banner based on boarder status
 */
function initStatusBanner(user) {
  const statusBanner = document.getElementById('status-banner');
  const statusTitle = document.getElementById('status-banner-title');
  const statusDescription = document.getElementById('status-banner-description');
  const statusBtn = document.getElementById('status-banner-btn');

  if (!statusBanner) return;

  const boarderStatus = user.boarderStatus || 'new';

  // Show status banner
  statusBanner.style.display = 'block';

  switch (boarderStatus) {
    case 'new':
    case 'browsing':
      statusTitle.textContent = 'No Applications Yet';
      statusDescription.textContent = 'Browse properties below and submit your first application';
      statusBtn.style.display = 'none';
      statusBanner.className = 'find-room-status-banner find-room-status-banner-info';
      break;

    case 'applied_pending':
      statusTitle.textContent = 'Applications Pending';
      statusDescription.textContent = 'You have pending applications. Check your status.';
      statusBtn.style.display = 'inline-flex';
      statusBtn.textContent = 'View Applications';
      statusBanner.className = 'find-room-status-banner find-room-status-banner-warning';
      break;

    case 'pending_confirmation':
      statusTitle.textContent = 'Application Accepted!';
      statusDescription.textContent =
        'A landlord has accepted your application. Confirm your booking now.';
      statusBtn.style.display = 'inline-flex';
      statusBtn.href = '../confirm-booking/index.html';
      statusBtn.innerHTML = `Confirm Booking <span data-icon="arrowRightSimple" data-icon-width="20" data-icon-height="20"></span>`;
      statusBanner.className = 'find-room-status-banner find-room-status-banner-success';
      break;

    case 'accepted':
      statusTitle.textContent = 'You Have a Room!';
      statusDescription.textContent = 'You are currently renting a room. View your dashboard.';
      statusBtn.style.display = 'inline-flex';
      statusBtn.href = '../index.html';
      statusBtn.innerHTML = `Go to Dashboard <span data-icon="arrowRightSimple" data-icon-width="20" data-icon-height="20"></span>`;
      statusBanner.className = 'find-room-status-banner find-room-status-banner-success';
      break;

    case 'rejected':
      statusTitle.textContent = 'Application Not Accepted';
      statusDescription.textContent =
        'Your previous application was not accepted. Browse and apply to other properties.';
      statusBtn.style.display = 'none';
      statusBanner.className = 'find-room-status-banner find-room-status-banner-error';
      break;

    default:
      statusBanner.style.display = 'none';
  }
}

/**
 * Initialize welcome banner
 */
function initWelcomeBanner() {
  const welcomeBanner = document.getElementById('welcome-banner');
  const closeBtn = document.getElementById('welcome-banner-close');

  if (!welcomeBanner || !closeBtn) return;

  // Check if user has dismissed the banner before
  const dismissed = localStorage.getItem('welcomeBannerDismissed');
  if (dismissed === 'true') {
    welcomeBanner.style.display = 'none';
    return;
  }

  // Show banner for new users
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.boarderStatus === 'new' || user.boarderStatus === 'browsing') {
    welcomeBanner.style.display = 'block';
  } else {
    welcomeBanner.style.display = 'none';
  }

  // Close button handler
  closeBtn.addEventListener('click', () => {
    welcomeBanner.style.display = 'none';
    localStorage.setItem('welcomeBannerDismissed', 'true');
  });
}

/**
 * Fetch popular locations from the API and render chips dynamically
 */
async function loadPopularLocations() {
  const container = document.getElementById('location-chips');
  if (!container) return;

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/popular-locations?limit=6`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    const locations = result.data?.locations ?? [];

    if (locations.length === 0) return;

    const label = container.querySelector('.find-room-chip-label');
    container.innerHTML = '';
    if (label) container.appendChild(label);

    locations.forEach(loc => {
      const btn = document.createElement('button');
      btn.className = 'find-room-chip';
      btn.dataset.location = loc.search_value;
      btn.innerHTML = `<span data-icon="location" data-icon-width="16" data-icon-height="16"></span>${loc.name}`;
      container.appendChild(btn);
    });

    if (window.renderIcons) {
      setTimeout(() => window.renderIcons(), 50);
    }
  } catch (err) {
    console.warn('Could not load popular locations:', err.message);
  }
}

/**
 * Setup search and filter functionality
 */
function setupSearchAndFilters() {
  // Search input
  const searchInput = document.getElementById('main-search-input');
  const searchBtn = document.getElementById('main-search-btn');

  if (searchInput && searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        loadProperties({ search: query });
      }
    });

    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });
  }

  // Location chips — event delegation handles dynamically rendered chips
  const locationChipsContainer = document.getElementById('location-chips');
  if (locationChipsContainer) {
    locationChipsContainer.addEventListener('click', e => {
      const chip = e.target.closest('.find-room-chip');
      if (!chip) return;
      const location = chip.dataset.location;
      if (location && searchInput) {
        searchInput.value = location;
        loadProperties({ search: location });
      }
    });
  }

  // Price filter
  const priceFilter = document.getElementById('price-filter');
  if (priceFilter) {
    priceFilter.addEventListener('change', () => {
      loadProperties();
    });
  }

  // Room type filter
  const roomTypeFilter = document.getElementById('room-type-filter');
  if (roomTypeFilter) {
    roomTypeFilter.addEventListener('change', () => {
      loadProperties();
    });
  }

  // Distance filter
  const distanceFilter = document.getElementById('distance-filter');
  if (distanceFilter) {
    distanceFilter.addEventListener('change', () => {
      loadProperties();
    });
  }

  // Amenities
  const amenitiesPanel = document.getElementById('amenities-panel');
  if (amenitiesPanel) {
    amenitiesPanel.addEventListener('change', () => {
      loadProperties();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      loadProperties();
    });
  }

  // Reset filters
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (priceFilter) priceFilter.value = 'any';
      if (roomTypeFilter) roomTypeFilter.value = 'any';
      if (distanceFilter) distanceFilter.value = 'any';
      if (sortSelect) sortSelect.value = 'recommended';
      if (amenitiesPanel) {
        amenitiesPanel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
        });
      }
      loadProperties();
    });
  }

  // View toggle
  document.querySelectorAll('.find-room-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.find-room-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const grid = document.getElementById('properties-grid');
      if (grid) {
        if (btn.dataset.view === 'list') {
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
    loadMoreBtn.addEventListener('click', () => {
      // TODO: Implement pagination
    });
  }

  // Clear filters button
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      resetBtn?.click();
    });
  }
}

/**
 * Load properties from API
 */
async function loadProperties(options = {}) {
  const grid = document.getElementById('properties-grid');
  const resultsCount = document.getElementById('results-count');
  const resultsSubtitle = document.getElementById('results-subtitle');
  const noResults = document.getElementById('no-results');

  if (!grid) return;

  // Show loading state
  resultsSubtitle.textContent = 'Loading properties...';

  try {
    // Build query parameters
    const params = new URLSearchParams();

    if (options.search) {
      params.append('search', options.search);
    }

    const priceFilter = document.getElementById('price-filter');
    if (priceFilter && priceFilter.value !== 'any') {
      const priceRange = priceFilter.value;
      if (priceRange.includes('-')) {
        const [min, max] = priceRange.split('-');
        params.append('price_min', min);
        params.append('price_max', max);
      } else if (priceRange.endsWith('+')) {
        params.append('price_min', priceRange.replace('+', ''));
      }
    }

    const roomTypeFilter = document.getElementById('room-type-filter');
    if (roomTypeFilter && roomTypeFilter.value !== 'any') {
      params.append('room_type', roomTypeFilter.value);
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect && sortSelect.value !== 'recommended') {
      params.append('sort_by', sortSelect.value);
    }

    const amenitiesPanel = document.getElementById('amenities-panel');
    if (amenitiesPanel) {
      const checkedAmenities = Array.from(
        amenitiesPanel.querySelectorAll('input[type="checkbox"]:checked')
      ).map(cb => cb.value);
      if (checkedAmenities.length > 0) {
        params.append('amenities', checkedAmenities.join(','));
      }
    }

    // Fetch properties
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/public?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch properties');
    }

    const result = await response.json();

    if (result.success && result.data && result.data.properties) {
      const properties = result.data.properties;

      // Update results count
      if (resultsCount) {
        resultsCount.textContent = result.data.total_count || properties.length;
      }

      if (resultsSubtitle) {
        resultsSubtitle.textContent = `Showing ${properties.length} of ${
          result.data.total_count || properties.length
        } properties`;
      }

      // Render properties
      if (properties.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
      } else {
        if (noResults) noResults.style.display = 'none';
        renderProperties(properties, grid);
      }
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error loading properties:', error);
    if (resultsSubtitle) {
      resultsSubtitle.textContent = 'Failed to load properties';
    }
    grid.innerHTML = `
      <div class="find-room-error-state">
        <span data-icon="exclamationCircle" data-icon-width="80" data-icon-height="80"></span>
        <h3>Failed to Load Properties</h3>
        <p>Please try again later or refresh the page.</p>
      </div>
    `;
  }
}

/**
 * Render properties to the grid
 */
function renderProperties(properties, grid) {
  // Deduplicate properties by ID to prevent duplicate cards
  const uniqueProperties = [];
  const seenIds = new Set();

  properties.forEach(property => {
    if (!seenIds.has(property.id)) {
      seenIds.add(property.id);
      uniqueProperties.push(property);
    } else {
      console.warn(
        `Duplicate property detected and skipped: ID ${property.id}, Title: ${property.title}`
      );
    }
  });

  grid.innerHTML = uniqueProperties
    .map(
      property => `
    <div class="find-room-property-card" data-property-id="${property.id}">
      <div class="find-room-card-image-wrapper">
        <img
          src="${getImageUrl(property.image)}"
          alt="${property.title}"
          class="find-room-card-image"
          onerror="${getImageErrorHandler()}"
        />
        <div class="find-room-card-badges">
          ${
            property.is_verified
              ? '<span class="find-room-badge find-room-badge-verified"><span data-icon="badgeCheck" data-icon-width="16" data-icon-height="16"></span> Verified</span>'
              : ''
          }
        </div>
        <button class="find-room-favorite-btn" data-favorite="false" data-property-id="${
          property.id
        }">
          <span data-icon="bookmark" data-icon-width="24" data-icon-height="24"></span>
        </button>
      </div>
      <div class="find-room-card-content">
        <div class="find-room-card-header">
          <div class="find-room-card-location">
            <span data-icon="location" data-icon-width="20" data-icon-height="20"></span>
            <span class="find-room-card-distance">${property.city || property.address}</span>
          </div>
          <div class="find-room-card-rating">
            <span data-icon="starSolid" data-icon-width="16" data-icon-height="16"></span>
            <span class="find-room-card-rating-value">${property.rating || '4.5'}</span>
            <span class="find-room-card-rating-count">(${property.reviews || '0'})</span>
          </div>
        </div>
        <h3 class="find-room-card-title">${property.title}</h3>
        <p class="find-room-card-address">${property.address}</p>
        <div class="find-room-card-features">
          <span class="find-room-feature">
            <span data-icon="userCircle" data-icon-width="20" data-icon-height="20"></span>
            ${property.room_types || 'Various Types'}
          </span>
          <span class="find-room-feature">
            <span data-icon="calendar" data-icon-width="20" data-icon-height="20"></span>
            ${property.available_rooms > 0 ? 'Available Now' : 'No Availability'}
          </span>
        </div>
        <div class="find-room-card-footer">
          <div class="find-room-card-price">
            <span class="find-room-card-price-amount">₱${Number(
              property.price
            ).toLocaleString()}</span>
            <span class="find-room-card-price-period">/month</span>
          </div>
          <a href="../rooms/detail.html?id=${property.id}" class="find-room-card-btn">
            View Details
            <span data-icon="arrowRightSimple" data-icon-width="20" data-icon-height="20"></span>
          </a>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  // Re-attach event listeners
  grid.querySelectorAll('.find-room-favorite-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(btn);
    });
  });
}

/**
 * Toggle favorite button
 */
function toggleFavorite(button) {
  const isFavorite = button.dataset.favorite === 'true';
  button.dataset.favorite = (!isFavorite).toString();

  const icon = button.querySelector('[data-icon]');
  if (icon) {
    icon.dataset.icon = !isFavorite ? 'heartSolid' : 'bookmark';
  }
}
