/**
 * Find a Room Page - Enhanced Features
 * Handles floating smart header, status dropdown, map view, and modals
 */

import { getIcon } from '../../shared/icons.js';
import { loadState, getState } from '../../shared/state.js';

// State management for enhanced features
const enhancedState = {
  headerVisible: true,
  headerHideTimer: null,
  lastMouseMove: Date.now(),
  applications: [],
  selectedApplication: null,
  rejectedProperties: new Set(),
  selectedProperty: null,
  currentStatusFilter: 'all',
  currentProperty: null,
  properties: [], // Will be loaded from backend
  isLoading: false,
  hasMore: true,
  limit: 20,
  offset: 0,
  filters: {
    search: '',
    priceMin: null,
    priceMax: null,
    roomType: '',
    amenities: [],
    sortBy: 'recommended',
  },
};

// API configuration
const API_BASE_URL = window.location.origin.includes('github.io')
  ? 'https://havenspace.com/server/api'
  : '/server/api';

/**
 * Fetch properties from backend API
 */
async function fetchProperties(reset = false) {
  if (enhancedState.isLoading) return;

  if (reset) {
    enhancedState.offset = 0;
    enhancedState.properties = [];
    enhancedState.hasMore = true;
  }

  enhancedState.isLoading = true;

  try {
    const params = new URLSearchParams();
    params.append('limit', enhancedState.limit);
    params.append('offset', enhancedState.offset);

    if (enhancedState.filters.search) {
      params.append('search', enhancedState.filters.search);
    }
    if (enhancedState.filters.priceMin !== null) {
      params.append('price_min', enhancedState.filters.priceMin);
    }
    if (enhancedState.filters.priceMax !== null) {
      params.append('price_max', enhancedState.filters.priceMax);
    }
    if (enhancedState.filters.roomType && enhancedState.filters.roomType !== 'any') {
      params.append('room_type', enhancedState.filters.roomType);
    }
    if (enhancedState.filters.sortBy && enhancedState.filters.sortBy !== 'recommended') {
      params.append('sort_by', enhancedState.filters.sortBy);
    }
    if (enhancedState.filters.amenities.length > 0) {
      params.append('amenities', enhancedState.filters.amenities.join(','));
    }

    const response = await fetch(`${API_BASE_URL}/rooms/public?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.data && result.data.properties) {
      const newProperties = result.data.properties;
      enhancedState.properties = reset
        ? newProperties
        : [...enhancedState.properties, ...newProperties];

      enhancedState.offset += newProperties.length;
      enhancedState.hasMore = newProperties.length === enhancedState.limit;

      renderProperties(newProperties, reset);
      updateResultsCount(result.data.total_count);
    }
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    showErrorState();
  } finally {
    enhancedState.isLoading = false;
  }
}

/**
 * Render properties to the grid
 */
function renderProperties(properties, reset = false) {
  const grid = document.getElementById('properties-grid');
  if (!grid) return;

  if (reset) {
    grid.innerHTML = '';
  }

  if (properties.length === 0 && reset) {
    showNoResultsState();
    return;
  }

  hideNoResultsState();

  properties.forEach(property => {
    const card = createPropertyCard(property);
    grid.appendChild(card);
  });

  if (window.renderIcons) {
    setTimeout(() => window.renderIcons(), 100);
  }
}

/**
 * Create a property card element
 */
function createPropertyCard(property) {
  const card = document.createElement('div');
  card.className = 'find-room-property-card';
  card.dataset.propertyId = property.id;

  const badgesHtml = property.badges
    .map(badge => {
      if (badge === 'verified') {
        return `<span class="find-room-badge find-room-badge-verified">
        <span data-icon="badgeCheck" data-icon-width="16" data-icon-height="16"></span>
        Verified
      </span>`;
      } else if (badge === 'new') {
        return `<span class="find-room-badge find-room-badge-new">New</span>`;
      } else if (badge === 'promo') {
        return `<span class="find-room-badge find-room-badge-promo">Promo</span>`;
      }
      return '';
    })
    .join('');

  const amenityIcons = {
    wifi: 'sparkles',
    ac: 'computerDesktop',
    parking: 'checkSimple',
    laundry: 'wrench',
    security: 'shieldCheck',
    cctv: 'cctvCamera',
    kitchen: 'wrench',
    furnished: 'checkSimple',
  };

  const amenitiesPreview = property.amenities
    .slice(0, 3)
    .map(amenity => {
      const icon = amenityIcons[amenity] || 'checkSimple';
      return `<span class="find-room-amenity-icon" title="${amenity}">
      <span data-icon="${icon}" data-icon-width="20" data-icon-height="20"></span>
    </span>`;
    })
    .join('');

  const moreCount = Math.max(0, property.amenities.length - 3);
  const moreHtml = moreCount > 0 ? `<span class="find-room-amenity-more">+${moreCount}</span>` : '';

  card.innerHTML = `
    <div class="find-room-card-image-wrapper">
      <img
        src="${property.image}"
        alt="${property.title}"
        class="find-room-card-image"
        onerror="this.src='../../assets/images/placeholder-room.jpg'"
      />
      <div class="find-room-card-badges">
        ${badgesHtml}
      </div>
      <button class="find-room-favorite-btn" data-favorite="false" data-property-id="${
        property.id
      }">
        <span data-icon="bookmark" data-icon-width="24" data-icon-height="24"></span>
      </button>
      <div class="find-room-card-amenities-preview">
        ${amenitiesPreview}
        ${moreHtml}
      </div>
    </div>
    <div class="find-room-card-content">
      <div class="find-room-card-header">
        <div class="find-room-card-location">
          <span data-icon="location" data-icon-width="20" data-icon-height="20"></span>
          <span class="find-room-card-distance">${property.city || property.address}</span>
        </div>
        <div class="find-room-card-rating">
          <span data-icon="starSolid" data-icon-width="16" data-icon-height="16"></span>
          <span class="find-room-card-rating-value">${property.rating}</span>
          <span class="find-room-card-rating-count">(${property.reviews})</span>
        </div>
      </div>
      <h3 class="find-room-card-title">${property.title}</h3>
      <p class="find-room-card-address">${property.address}</p>
      <div class="find-room-card-features">
        <span class="find-room-feature">
          <span data-icon="userCircle" data-icon-width="20" data-icon-height="20"></span>
          ${property.roomTypes}
        </span>
        <span class="find-room-feature">
          <span data-icon="calendar" data-icon-width="20" data-icon-height="20"></span>
          ${property.availableRooms > 0 ? 'Available Now' : 'No Availability'}
        </span>
      </div>
      <div class="find-room-card-footer">
        <div class="find-room-card-price">
          <span class="find-room-card-price-amount">₱${property.price.toLocaleString()}</span>
          <span class="find-room-card-price-period">/month</span>
        </div>
        <a href="./rooms/detail.html?id=${property.id}" class="find-room-card-btn">
          View Details
          <span data-icon="arrowRightSimple" data-icon-width="20" data-icon-height="20"></span>
        </a>
      </div>
    </div>
  `;

  card.addEventListener('click', e => {
    // Don't open detail panel if clicking the View Details button (it's a link)
    if (e.target.closest('.find-room-card-btn')) return;
    if (e.target.closest('.find-room-favorite-btn')) return;
    openDetailPanel(property);
  });

  const favoriteBtn = card.querySelector('.find-room-favorite-btn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(property.id, favoriteBtn);
    });
  }

  return card;
}

/**
 * Toggle favorite for a property
 */
function toggleFavorite(propertyId, button) {
  const isFavorite = button.dataset.favorite === 'true';
  const newState = !isFavorite;
  button.dataset.favorite = newState.toString();

  const icon = button.querySelector('[data-icon]');
  if (icon) {
    icon.dataset.icon = newState ? 'heartSolid' : 'bookmark';
  }

  console.log(`Property ${propertyId} favorite: ${newState}`);
}

/**
 * Update results count display
 */
function updateResultsCount(totalCount) {
  const countEl = document.getElementById('results-count');
  const subtitleEl = document.getElementById('results-subtitle');

  if (countEl) {
    countEl.textContent = totalCount;
  }
  if (subtitleEl) {
    subtitleEl.textContent = `Showing ${enhancedState.properties.length} of ${totalCount} properties`;
  }
}

/**
 * Show no results state
 */
function showNoResultsState() {
  const noResults = document.getElementById('no-results');
  const grid = document.getElementById('properties-grid');
  const loadMore = document.querySelector('.find-room-load-more');

  if (noResults) noResults.style.display = 'block';
  if (grid) grid.innerHTML = '';
  if (loadMore) loadMore.style.display = 'none';
}

/**
 * Hide no results state
 */
function hideNoResultsState() {
  const noResults = document.getElementById('no-results');
  if (noResults) noResults.style.display = 'none';
}

/**
 * Show error state
 */
function showErrorState() {
  const grid = document.getElementById('properties-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="find-room-error-state">
        <span data-icon="exclamationCircle" data-icon-width="80" data-icon-height="80"></span>
        <h3>Failed to Load Properties</h3>
        <p>Please try again later or refresh the page.</p>
        <button class="find-room-btn find-room-btn-primary" id="retry-btn">
          Retry
        </button>
      </div>
    `;

    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        fetchProperties(true);
      });
    }

    if (window.renderIcons) {
      setTimeout(() => window.renderIcons(), 100);
    }
  }
}

/**
 * Setup filter and search event listeners
 */
function setupFilterListeners() {
  // Search input
  const searchInput = document.getElementById('main-search-input');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        enhancedState.filters.search = searchInput.value;
        fetchProperties(true);
      }, 500);
    });
  }

  // Price filter
  const priceFilter = document.getElementById('price-filter');
  if (priceFilter) {
    priceFilter.addEventListener('change', () => {
      const value = priceFilter.value;
      if (value === 'any') {
        enhancedState.filters.priceMin = null;
        enhancedState.filters.priceMax = null;
      } else if (value.includes('-')) {
        const [min, max] = value.split('-').map(Number);
        enhancedState.filters.priceMin = min;
        enhancedState.filters.priceMax = max;
      } else if (value.endsWith('+')) {
        enhancedState.filters.priceMin = Number(value.slice(0, -1));
        enhancedState.filters.priceMax = null;
      }
      fetchProperties(true);
    });
  }

  // Room type filter
  const roomTypeFilter = document.getElementById('room-type-filter');
  if (roomTypeFilter) {
    roomTypeFilter.addEventListener('change', () => {
      enhancedState.filters.roomType = roomTypeFilter.value;
      fetchProperties(true);
    });
  }

  // Distance filter (not implemented in backend yet, but can be added)
  const distanceFilter = document.getElementById('distance-filter');
  if (distanceFilter) {
    distanceFilter.addEventListener('change', () => {
      // TODO: Implement distance filter in backend
      console.log('Distance filter selected:', distanceFilter.value);
    });
  }

  // Amenities
  const amenitiesPanel = document.getElementById('amenities-panel');
  if (amenitiesPanel) {
    amenitiesPanel.addEventListener('change', e => {
      if (e.target.type === 'checkbox') {
        const checkedBoxes = amenitiesPanel.querySelectorAll('input:checked');
        enhancedState.filters.amenities = Array.from(checkedBoxes).map(cb => cb.value);
        fetchProperties(true);
      }
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      enhancedState.filters.sortBy = sortSelect.value;
      fetchProperties(true);
    });
  }

  // Reset filters button
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      enhancedState.filters = {
        search: '',
        priceMin: null,
        priceMax: null,
        roomType: '',
        amenities: [],
        sortBy: 'recommended',
      };

      // Reset UI controls
      if (searchInput) searchInput.value = '';
      if (priceFilter) priceFilter.value = 'any';
      if (roomTypeFilter) roomTypeFilter.value = 'any';
      if (distanceFilter) distanceFilter.value = 'any';
      if (sortSelect) sortSelect.value = 'recommended';

      // Uncheck all amenities
      if (amenitiesPanel) {
        amenitiesPanel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
        });
      }

      fetchProperties(true);
    });
  }

  // Load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      if (enhancedState.hasMore && !enhancedState.isLoading) {
        fetchProperties();
      }
    });
  }
}
const sampleApplications = [
  {
    id: 1,
    propertyId: 1,
    title: 'Sunrise Dormitory',
    address: 'Katipunan Avenue, Quezon City',
    price: 4500,
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80',
    status: 'accepted',
    appliedDate: '2026-04-01',
  },
  {
    id: 2,
    propertyId: 2,
    title: 'Campus View Residences',
    address: 'Loyola Heights, Quezon City',
    price: 6500,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80',
    status: 'pending',
    appliedDate: '2026-04-05',
  },
  {
    id: 3,
    propertyId: 3,
    title: 'Greenfield Boarding House',
    address: 'Commonwealth Avenue, Quezon City',
    price: 3200,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
    status: 'accepted',
    appliedDate: '2026-04-03',
  },
  {
    id: 4,
    propertyId: 6,
    title: 'Prime Location Suites',
    address: 'Tomas Morato Ave, Quezon City',
    price: 5500,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
    status: 'pending',
    appliedDate: '2026-04-08',
  },
];

// Sample property data for map (replace with API calls in production)
const properties = [
  {
    id: 1,
    title: 'Sunrise Dormitory',
    address: 'Fortich Street, Malaybalay City, Bukidnon',
    location: 'Capitol University Malaybalay',
    distance: 0.3,
    price: 3500,
    rating: 4.8,
    reviews: 24,
    type: 'single',
    amenities: ['wifi', 'ac', 'parking', 'laundry', 'security', 'cctv'],
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    badges: ['verified', 'new'],
    available: 'Now',
    roomTypes: 'Single & Shared',
    lat: 8.153,
    lng: 125.128,
    phone: '0906 460 1570',
    locationCode: '8FMH+2Q Malaybalay City',
    propertyType: 'Boarding House',
    description:
      'Sunrise Dormitory offers affordable and comfortable accommodations for students and professionals in the heart of Malaybalay City. With modern amenities and 24/7 security, we ensure a safe and conducive environment for living and studying.',
    photos: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    ],
    rooms: [
      {
        type: 'Single Room',
        price: 3500,
        availability: 'Available',
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80',
        description: 'Private room with bed, desk, and closet',
      },
      {
        type: 'Shared Room',
        price: 2500,
        availability: 'Available',
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
        description: 'Shared room with 2 beds, desks, and closets',
      },
    ],
    reviewsList: [
      {
        username: 'Maria Santos',
        initials: 'MS',
        reviewsCount: 12,
        photosCount: 8,
        rating: 5,
        time: '2 months ago',
        text: 'Great place to stay! Very clean and the landlord is accommodating. The WiFi is fast and perfect for online classes. Highly recommended!',
      },
      {
        username: 'Juan Dela Cruz',
        initials: 'JD',
        reviewsCount: 5,
        photosCount: 3,
        rating: 4,
        time: '3 months ago',
        text: 'Good value for money. The room is spacious and well-ventilated. Only minor issue is the occasional water interruption but overall a solid choice.',
      },
    ],
  },
  {
    id: 2,
    title: 'Campus View Residences',
    address: 'Don Carlos Street, Malaybalay City, Bukidnon',
    location: 'Bukidnon State University',
    distance: 0.5,
    price: 4500,
    rating: 4.6,
    reviews: 18,
    type: 'studio',
    amenities: ['wifi', 'furnished', 'parking', 'cctv', 'kitchen'],
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    badges: ['verified'],
    available: 'Now',
    roomTypes: 'Studio & 1 BHK',
    lat: 8.1489,
    lng: 125.125,
    phone: '0917 123 4567',
    locationCode: '8FMH+5P Malaybalay City',
    propertyType: 'Apartment',
    description:
      'Campus View Residences is strategically located near Bukidnon State University, offering modern studio and 1 BHK units. Perfect for students who value convenience and accessibility.',
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    ],
    rooms: [
      {
        type: 'Studio Unit',
        price: 4500,
        availability: 'Available',
        image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
        description: 'Studio unit with bed, kitchenette, and bathroom',
      },
      {
        type: '1 BHK',
        price: 6000,
        availability: 'Limited',
        image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80',
        description: '1 Bedroom with hall, kitchen, and bathroom',
      },
    ],
    reviewsList: [
      {
        username: 'Ana Reyes',
        initials: 'AR',
        reviewsCount: 8,
        photosCount: 5,
        rating: 5,
        time: '1 month ago',
        text: 'Amazing location! Walking distance to BSU and very safe area. The rooms are modern and clean.',
      },
    ],
  },
  {
    id: 3,
    title: 'Greenfield Boarding House',
    address: 'Manny Intal Ave, Malaybalay City, Bukidnon',
    location: 'Central Mindanao University',
    distance: 1.2,
    price: 2800,
    rating: 4.5,
    reviews: 32,
    type: 'shared',
    amenities: ['wifi', 'laundry', 'kitchen', 'parking'],
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    badges: ['promo'],
    available: 'Now',
    roomTypes: 'Shared Rooms',
    lat: 8.142,
    lng: 125.12,
    phone: '0918 987 6543',
    locationCode: '8FMH+8M Malaybalay City',
    propertyType: 'Boarding House',
    description:
      'Greenfield Boarding House provides budget-friendly accommodations for students and working professionals. Despite the affordable rates, we maintain high standards of cleanliness and security.',
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    ],
    rooms: [
      {
        type: 'Shared Room (2 pax)',
        price: 2800,
        availability: 'Available',
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&q=80',
        description: 'Shared room for 2 persons with beds and study tables',
      },
      {
        type: 'Shared Room (4 pax)',
        price: 2000,
        availability: 'Available',
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80',
        description: 'Shared room for 4 persons with beds and lockers',
      },
    ],
    reviewsList: [
      {
        username: 'Carlos Garcia',
        initials: 'CG',
        reviewsCount: 3,
        photosCount: 2,
        rating: 4,
        time: '2 weeks ago',
        text: 'Affordable and decent place. The shared kitchen is well-equipped and the landlord is friendly.',
      },
    ],
  },
  {
    id: 4,
    title: 'Metro Plaza Apartments',
    address: 'Aglugalon Street, Malaybalay City, Bukidnon',
    location: 'CUMSU Campus',
    distance: 0.8,
    price: 5500,
    rating: 4.9,
    reviews: 41,
    type: '1bhk',
    amenities: ['wifi', 'ac', 'security', 'cctv', 'parking', 'laundry', 'furnished', 'kitchen'],
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    badges: ['verified', 'new'],
    available: 'Now',
    roomTypes: '1 BHK & Studio',
    lat: 8.156,
    lng: 125.131,
    phone: '0920 555 1234',
    locationCode: '8FMH+3R Malaybalay City',
    propertyType: 'Apartment',
    description:
      'Metro Plaza Apartments offers premium accommodations with excellent amenities. Located in the city center with easy access to schools, markets, and public transportation.',
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    ],
    rooms: [
      {
        type: 'Studio Unit',
        price: 5500,
        availability: 'Available',
        image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80',
        description: 'Modern studio with AC, WiFi, and kitchenette',
      },
      {
        type: '1 BHK',
        price: 7500,
        availability: 'Available',
        image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80',
        description: 'Spacious 1 bedroom with hall and full kitchen',
      },
    ],
    reviewsList: [
      {
        username: 'Sofia Martinez',
        initials: 'SM',
        reviewsCount: 15,
        photosCount: 10,
        rating: 5,
        time: '1 week ago',
        text: 'Luxurious apartments with excellent amenities. The location is perfect and the security is top-notch. Worth every penny!',
      },
      {
        username: 'Diego Torres',
        initials: 'DT',
        reviewsCount: 7,
        photosCount: 4,
        rating: 5,
        time: '3 weeks ago',
        text: 'Best boarding house I have stayed in. The management is professional and the facilities are well-maintained.',
      },
    ],
  },
];

/**
 * Initialize all enhanced features
 */
export function initFindARoomEnhanced() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEnhancedFeatures);
  } else {
    setupEnhancedFeatures();
  }
}

/**
 * Setup all enhanced feature event listeners
 */
function setupEnhancedFeatures() {
  // Load auth state
  const authState = loadState();

  // Render UI based on auth state
  renderAuthState(authState);

  // Load applications from localStorage or use sample data
  const storedApplications = localStorage.getItem('applications');
  if (storedApplications) {
    try {
      enhancedState.applications = JSON.parse(storedApplications);
    } catch (error) {
      console.error('Failed to parse applications from localStorage:', error);
      enhancedState.applications = sampleApplications;
    }
  } else {
    // Initialize with sample data and persist to localStorage
    enhancedState.applications = sampleApplications;
    localStorage.setItem('applications', JSON.stringify(sampleApplications));
  }

  // Initialize floating header
  initFloatingHeader();

  // Initialize status dropdown (only for authenticated users)
  if (authState.isAuthenticated) {
    initStatusDropdown();
  }

  // Initialize profile dropdown (only for authenticated users)
  if (authState.isAuthenticated) {
    initProfileDropdown();
  }

  // Initialize map view
  initMapView();

  // Initialize modals
  initModals();

  // Update status badge (only for authenticated users)
  if (authState.isAuthenticated) {
    updateStatusBadge();
    renderApplications();
  }

  // Initialize guest search (only for unauthenticated users)
  if (!authState.isAuthenticated) {
    initGuestSearch();
  }

  // Fetch properties from backend
  fetchProperties(true);

  // Setup filter and search event listeners
  setupFilterListeners();
}

/* ==========================================================================
   Auth State Management
   ========================================================================== */

/**
 * Render UI based on authentication state
 */
function renderAuthState(authState) {
  const authControls = document.getElementById('find-room-auth-controls');
  const guestControls = document.getElementById('find-room-guest-controls');
  const heroAuth = document.getElementById('find-room-hero-auth');
  const heroGuest = document.getElementById('find-room-hero-guest');

  if (authState.isAuthenticated) {
    // Show authenticated UI
    if (authControls) authControls.style.display = 'flex';
    if (guestControls) guestControls.style.display = 'none';
    if (heroAuth) heroAuth.style.display = 'block';
    if (heroGuest) heroGuest.style.display = 'none';

    // Update profile info if available
    updateUserProfile(authState.user);
  } else {
    // Show guest/unauthenticated UI
    if (authControls) authControls.style.display = 'none';
    if (guestControls) guestControls.style.display = 'flex';
    if (heroAuth) heroAuth.style.display = 'none';
    if (heroGuest) heroGuest.style.display = 'block';
  }
}

/**
 * Update user profile in header with current user data
 */
function updateUserProfile(user) {
  if (!user) return;

  // Update profile name
  const profileNames = document.querySelectorAll('.find-room-header-profile-name');
  profileNames.forEach(el => {
    el.textContent = user.name || 'User';
  });

  // Update profile avatar initials in dropdown
  const avatarEl = document.querySelector('.find-room-profile-menu-avatar');
  if (avatarEl && user.initials) {
    avatarEl.textContent = user.initials;
  }

  // Update profile menu name
  const menuNames = document.querySelectorAll('.find-room-profile-menu-name');
  menuNames.forEach(el => {
    el.textContent = user.name || 'User';
  });

  // Update profile menu email
  const menuEmails = document.querySelectorAll('.find-room-profile-menu-email');
  menuEmails.forEach(el => {
    el.textContent = user.email || '';
  });

  // Update avatar image if available
  const avatarImg = document.querySelector('.find-room-header-profile-avatar');
  if (avatarImg) {
    if (user.avatarUrl) {
      avatarImg.src = user.avatarUrl;
    }
  }
}

/**
 * Initialize guest search functionality
 */
function initGuestSearch() {
  const searchBtn = document.getElementById('guest-search-btn');
  const searchInput = document.getElementById('guest-search-input');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        // Redirect to login with search query
        window.location.href = `../auth/login.html?redirect=${encodeURIComponent(
          window.location.pathname
        )}&search=${encodeURIComponent(query)}`;
      }
    });

    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });
  }

  // Location chips redirect to login
  document.querySelectorAll('.find-room-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const location = chip.dataset.location;
      if (location) {
        window.location.href = `../auth/login.html?redirect=${encodeURIComponent(
          window.location.pathname
        )}&search=${encodeURIComponent(location)}`;
      }
    });
  });
}

/* ==========================================================================
   Floating Header
   ========================================================================== */

function initFloatingHeader() {
  const header = document.getElementById('find-room-floating-header');
  if (!header) return;

  // Track mouse position for header visibility with throttling
  let mouseMoveThrottle = null;
  document.addEventListener('mousemove', event => {
    if (mouseMoveThrottle !== null) return;

    mouseMoveThrottle = setTimeout(() => {
      mouseMoveThrottle = null;
      handleMouseMoveForHeader(event);
    }, 50); // Throttle to 20fps to prevent rapid toggling
  });

  // Hide header after a delay when user scrolls down
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (window.scrollY > 100) {
        hideHeader();
      }
    }, 1000);
  });
}

function handleMouseMoveForHeader(event) {
  const header = document.getElementById('find-room-floating-header');
  if (!header) return;

  const threshold = 80; // pixels from top to show header
  const hideThreshold = 120; // Higher threshold to hide (prevents edge flickering)

  // Check if any dropdown/menu is currently open
  const statusMenu = document.getElementById('status-dropdown-menu');
  const profileMenu = document.getElementById('profile-dropdown-menu');

  const isMenuOpen =
    statusMenu?.classList.contains('show') || profileMenu?.classList.contains('show');

  // If menu is open, always show header
  if (isMenuOpen) {
    showHeader();
    return;
  }

  // Get header bounding rectangle to check if cursor is inside header
  const headerRect = header.getBoundingClientRect();
  const isInsideHeader =
    event.clientY >= headerRect.top - 10 && // Add 10px buffer
    event.clientY <= headerRect.bottom + 10 &&
    event.clientX >= headerRect.left - 10 &&
    event.clientX <= headerRect.right + 10;

  // Use hysteresis: different thresholds for showing vs hiding
  // This prevents rapid toggling at the boundary
  if (event.clientY <= threshold || isInsideHeader) {
    // Cursor near top or inside header - show header
    showHeader();
  } else if (event.clientY > hideThreshold) {
    // Cursor well below threshold - hide header
    hideHeader();
  }
  // If between threshold and hideThreshold, maintain current state (do nothing)
}

function showHeader() {
  const header = document.getElementById('find-room-floating-header');
  if (!header || header.classList.contains('show')) return;

  header.classList.add('show');
}

function hideHeader() {
  const header = document.getElementById('find-room-floating-header');
  if (!header || !header.classList.contains('show')) return;

  header.classList.remove('show');
}

/* ==========================================================================
   Status Dropdown
   ========================================================================== */

function initStatusDropdown() {
  const dropdownBtn = document.getElementById('status-dropdown-btn');
  const dropdownMenu = document.getElementById('status-dropdown-menu');
  const closeBtn = document.getElementById('find-room-status-close');

  if (!dropdownBtn || !dropdownMenu) return;

  // Toggle dropdown
  dropdownBtn.addEventListener('click', e => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
    });
  }

  // Status tabs
  const tabs = dropdownMenu.querySelectorAll('.find-room-status-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      enhancedState.currentStatusFilter = tab.dataset.status;
      renderApplications();
    });
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });
}

function renderApplications() {
  const list = document.getElementById('applications-list');
  if (!list) return;

  const filtered = enhancedState.applications.filter(app => {
    if (enhancedState.currentStatusFilter === 'all') return true;
    return app.status === enhancedState.currentStatusFilter;
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="find-room-empty-state">
        <p>No applications found</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered
    .map(
      app => `
      <div class="find-room-application-item" data-application-id="${app.id}">
        <img src="${app.image}" alt="${app.title}" class="find-room-application-image" />
        <div class="find-room-application-info">
          <h4 class="find-room-application-title">${app.title}</h4>
          <p class="find-room-application-address">${app.address}</p>
          <div class="find-room-application-price">₱${app.price.toLocaleString()}/month</div>
        </div>
        <span class="find-room-application-status find-room-status-${app.status}">
          ${app.status}
        </span>
      </div>
    `
    )
    .join('');

  // Add click handlers
  list.querySelectorAll('.find-room-application-item').forEach(item => {
    item.addEventListener('click', () => {
      const appId = parseInt(item.dataset.applicationId);
      const application = enhancedState.applications.find(a => a.id === appId);
      if (!application) return;

      // Check if boarder already accepted a landlord
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.boarderStatus === 'accepted') {
        // Already confirmed a booking - redirect to boarder dashboard
        window.location.href = '../../views/boarder/index.html';
        return;
      }

      // Navigate based on application status
      if (application.status === 'accepted') {
        // Accepted application - go to confirm-booking page
        window.location.href = `../../views/boarder/confirm-booking/index.html?applicationId=${application.id}`;
      } else if (application.status === 'pending') {
        // Pending application - still show details but indicate waiting status
        window.location.href = `../../views/boarder/confirm-booking/index.html?applicationId=${application.id}`;
      }
    });
  });
}

function updateStatusBadge() {
  const badge = document.getElementById('status-badge');
  if (!badge) return;

  const pendingCount = enhancedState.applications.filter(app => app.status === 'pending').length;

  const acceptedCount = enhancedState.applications.filter(app => app.status === 'accepted').length;

  const totalCount = pendingCount + acceptedCount;

  if (totalCount > 0) {
    badge.textContent = totalCount;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }

  // Check if multiple accepted - show confirmation modal
  if (acceptedCount > 1) {
    showConfirmationModal();
  }
}

/* ==========================================================================
   Profile Dropdown
   ========================================================================== */

function initProfileDropdown() {
  const dropdownBtn = document.getElementById('profile-dropdown-btn');
  const dropdownMenu = document.getElementById('profile-dropdown-menu');

  if (!dropdownBtn || !dropdownMenu) return;

  // Toggle dropdown
  dropdownBtn.addEventListener('click', e => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  // Profile link
  const profileLink = document.getElementById('profile-menu-profile');
  if (profileLink) {
    profileLink.addEventListener('click', e => {
      e.preventDefault();
      dropdownMenu.classList.remove('show');
      // Navigate to profile
      window.location.href = profileLink.href;
    });
  }

  // Settings link
  const settingsLink = document.getElementById('profile-menu-settings');
  if (settingsLink) {
    settingsLink.addEventListener('click', e => {
      e.preventDefault();
      dropdownMenu.classList.remove('show');
      // Show settings or navigate
    });
  }

  // Logout
  const logoutBtn = document.getElementById('profile-menu-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async e => {
      e.preventDefault();
      dropdownMenu.classList.remove('show');

      try {
        // Attempt logout API call
        await fetch('/api/auth/logout.php', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        // Continue with local cleanup
      }

      // Clear authentication data
      localStorage.removeItem('user');
      window.location.href = '../auth/login.html';
    });
  }

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });
}

/* ==========================================================================
   Map View Navigation
   ========================================================================== */

function initMapView() {
  // Map buttons now navigate to maps.html instead of toggling embedded map
  // The embedded map container and related functionality has been removed
}

// Note: The following functions have been removed as map navigation now goes to maps.html:
// - initializeMap()
// - setupMapControls()
// - addMapMarkers()
// - closeMapView()

/**
 * Open detail panel for a property
 */
function openDetailPanel(property) {
  const detailOverlay = document.getElementById('detail-overlay');
  const _detailPanel = document.getElementById('detail-panel');

  if (detailOverlay) {
    detailOverlay.style.display = 'flex';
    enhancedState.currentProperty = property;

    // Populate detail panel
    populateDetailPanel(property);

    // Keep map visible - don't close it
    // The detail panel will overlay on top of the map
  }
}

/**
 * Close detail panel
 */
function closeDetailPanel() {
  const detailOverlay = document.getElementById('detail-overlay');
  if (detailOverlay) {
    detailOverlay.style.display = 'none';
    enhancedState.currentProperty = null;
  }
}

/**
 * Switch detail panel tab
 */
function switchDetailTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.find-room-detail-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    }
  });

  // Update tab content
  document.querySelectorAll('.find-room-detail-tab-content').forEach(content => {
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
    propertyImage.src = property.image;
    propertyImage.alt = property.title;
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

  // Set description (if exists)
  const descriptionSection = document.createElement('div');
  descriptionSection.className = 'find-room-detail-description';
  if (property.description) {
    descriptionSection.innerHTML = `
      <h3 class="find-room-detail-section-title">About This Property</h3>
      <p>${property.description}</p>
    `;
    // Insert after info section
    const infoSection = document.querySelector('.find-room-detail-info');
    if (infoSection) {
      infoSection.after(descriptionSection);
    }
  }

  // Set rooms section
  const roomsSection = document.getElementById('detail-rooms-section');
  const roomsGrid = document.getElementById('detail-rooms-grid');
  if (roomsSection && roomsGrid && property.rooms) {
    roomsSection.style.display = 'block';
    roomsGrid.innerHTML = property.rooms
      .map(
        (room, _index) => `
      <div class="find-room-detail-room-card">
        <div class="find-room-room-image-wrapper">
          <img src="${room.image}" alt="${room.type}" class="find-room-room-image" />
          <div class="find-room-room-badge ${
            room.availability === 'Available'
              ? 'find-room-room-available'
              : 'find-room-room-limited'
          }">
            ${room.availability}
          </div>
        </div>
        <div class="find-room-room-info">
          <h4 class="find-room-room-type">${room.type}</h4>
          <p class="find-room-room-description">${room.description}</p>
          <div class="find-room-room-price">
            <span class="find-room-room-price-amount">₱${room.price.toLocaleString()}</span>
            <span class="find-room-room-price-period">/month</span>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  }

  // Set amenities section
  const amenitiesSection = document.getElementById('detail-amenities-section');
  const amenitiesGrid = document.getElementById('detail-amenities-grid');
  if (amenitiesSection && amenitiesGrid && property.amenities) {
    amenitiesSection.style.display = 'block';
    const amenityIcons = {
      wifi: 'wifi',
      ac: 'computerDesktop',
      parking: 'checkSimple',
      laundry: 'wrench',
      security: 'shieldCheck',
      cctv: 'cctvCamera',
      kitchen: 'wrench',
      furnished: 'checkSimple',
    };
    const amenityLabels = {
      wifi: 'High-Speed WiFi',
      ac: 'Air Conditioning',
      parking: 'Parking Space',
      laundry: 'Laundry Area',
      security: '24/7 Security',
      cctv: 'CCTV Surveillance',
      kitchen: 'Kitchen Access',
      furnished: 'Furnished',
    };

    amenitiesGrid.innerHTML = property.amenities
      .map(
        amenity => `
      <div class="find-room-detail-amenity-item">
        <span data-icon="${
          amenityIcons[amenity] || 'checkSimple'
        }" data-icon-width="20" data-icon-height="20"></span>
        <span>${amenityLabels[amenity] || amenity}</span>
      </div>
    `
      )
      .join('');

    // Re-render icons after setting HTML
    if (window.renderIcons) {
      setTimeout(() => window.renderIcons(), 100);
    }
  }

  // Set photos
  const photosContainer = document.getElementById('detail-photos');
  if (photosContainer) {
    photosContainer.innerHTML = property.photos
      .map(
        (photo, index) => `
      <div class="find-room-photo-item ${index === 0 ? 'active' : ''}">
        <img src="${photo}" alt="${index === 0 ? 'All' : index === 1 ? 'Rooms' : 'Videos'}" />
        <span>${index === 0 ? 'All' : index === 1 ? 'Rooms' : 'Videos'}</span>
      </div>
    `
      )
      .join('');
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
  if (reviewsContainer && property.reviewsList) {
    reviewsContainer.innerHTML = property.reviewsList
      .map(
        review => `
      <div class="find-room-review-item">
        <div class="find-room-review-header">
          <div class="find-room-review-avatar">${review.initials}</div>
          <div class="find-room-review-user-info">
            <p class="find-room-review-username">${review.username}</p>
            <p class="find-room-review-meta">${review.reviewsCount} reviews · ${
          review.photosCount
        } photos</p>
          </div>
        </div>
        <div class="find-room-review-rating">
          ${generateStarRating(review.rating, 14)}
          <span class="find-room-review-time">${review.time}</span>
        </div>
        <p class="find-room-review-text">${review.text}</p>
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
    starsHtml += getIcon('starSolid', { width: size, height: size });
  }

  if (hasHalfStar) {
    starsHtml += getIcon('starHalf', { width: size, height: size });
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
  const property = enhancedState.properties.find(p => p.id === parseInt(propertyId));
  if (property) {
    openDetailPanel(property);
  }
};

/**
 * Close map view
 */
function _closeMapView() {
  const mapContainer = document.getElementById('find-room-map-container');
  const mapBtnHeader = document.getElementById('map-view-btn');
  const mapBtnHero = document.getElementById('map-view-btn-hero');
  if (mapContainer) {
    mapContainer.style.display = 'none';
    enhancedState.mapViewActive = false;
    if (mapBtnHeader) {
      mapBtnHeader.classList.remove('active');
    }
    if (mapBtnHero) {
      mapBtnHero.classList.remove('active');
    }
  }
}

/* ==========================================================================
   Modals
   ========================================================================== */

function initModals() {
  // Detail panel close button
  const detailCloseBtn = document.getElementById('detail-close-btn');
  const detailOverlay = document.getElementById('detail-overlay');

  if (detailCloseBtn) {
    detailCloseBtn.addEventListener('click', () => {
      closeDetailPanel();
    });
  }

  // Close detail panel when clicking overlay
  if (detailOverlay) {
    detailOverlay.addEventListener('click', e => {
      if (e.target === detailOverlay) {
        closeDetailPanel();
      }
    });
  }

  // Detail tabs
  document.querySelectorAll('.find-room-detail-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchDetailTab(tab.dataset.tab);
    });
  });

  // Confirmation modal
  const confirmationModal = document.getElementById('confirmation-modal');
  const confirmationClose = document.getElementById('confirmation-modal-close');

  if (confirmationClose && confirmationModal) {
    confirmationClose.addEventListener('click', () => {
      confirmationModal.classList.remove('show');
      confirmationModal.style.display = 'none';
    });

    // Close on overlay click
    confirmationModal.addEventListener('click', e => {
      if (e.target === confirmationModal) {
        confirmationModal.classList.remove('show');
        confirmationModal.style.display = 'none';
      }
    });
  }

  // Rejection modal
  const rejectionModal = document.getElementById('rejection-modal');
  const rejectionClose = document.getElementById('rejection-modal-close');
  const cancelBtn = document.getElementById('rejection-cancel-btn');
  const confirmBtn = document.getElementById('rejection-confirm-btn');
  const otherRadio = rejectionModal?.querySelector('input[value="others"]');
  const otherInputContainer = document.getElementById('reason-other-input');
  const otherInput = document.getElementById('rejection-other-text');
  const otherError = document.getElementById('rejection-other-error');

  if (rejectionClose && rejectionModal) {
    rejectionClose.addEventListener('click', () => {
      rejectionModal.classList.remove('show');
      rejectionModal.style.display = 'none';
      clearRejectionForm();
    });

    // Close on overlay click
    rejectionModal.addEventListener('click', e => {
      if (e.target === rejectionModal) {
        rejectionModal.classList.remove('show');
        rejectionModal.style.display = 'none';
        clearRejectionForm();
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      rejectionModal.classList.remove('show');
      rejectionModal.style.display = 'none';
      clearRejectionForm();
    });
  }

  // Show/hide other input
  if (otherRadio) {
    otherRadio.addEventListener('change', () => {
      if (otherInputContainer) {
        otherInputContainer.style.display = 'block';
        clearError();
        otherInput?.focus();
      }
    });
  }

  // Reset other input when different radio selected
  const allRadios = rejectionModal?.querySelectorAll('input[name="rejection-reason"]');
  allRadios?.forEach(radio => {
    if (radio.value !== 'others') {
      radio.addEventListener('change', () => {
        if (otherInputContainer) {
          otherInputContainer.style.display = 'none';
          otherInput.value = '';
        }
        clearError();
      });
    }
  });

  // Confirm rejection with validation
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const selectedRadio = rejectionModal.querySelector('input[name="rejection-reason"]:checked');

      if (!selectedRadio) {
        showError('Please select a reason for rejection.');
        return;
      }

      // Validate "Other" input if selected
      if (selectedRadio.value === 'others') {
        const otherText = otherInput?.value.trim() || '';

        if (!otherText) {
          if (otherInput) {
            otherInput.classList.add('error');
          }
          showError('Please specify your reason in the text field.');
          otherInput?.focus();
          return;
        }

        // Clear error if validation passes
        clearError();
      }

      // Process rejection
      const reason =
        selectedRadio.value === 'others' ? otherInput?.value.trim() : selectedRadio.value;

      // Add to rejected set
      if (enhancedState.selectedProperty) {
        enhancedState.rejectedProperties.add(enhancedState.selectedProperty.id);
      }

      // Close modal
      rejectionModal.classList.remove('show');
      rejectionModal.style.display = 'none';

      // Reset form
      clearRejectionForm();

      // Check if still multiple accepted after rejection
      const acceptedCount = enhancedState.applications.filter(
        app => app.status === 'accepted' && !enhancedState.rejectedProperties.has(app.id)
      ).length;

      if (acceptedCount <= 1) {
        // Hide confirmation modal if only 1 or 0 left
        if (confirmationModal) {
          confirmationModal.classList.remove('show');
          confirmationModal.style.display = 'none';
        }
      }
    });
  }

  // Helper function to show inline error
  function showError(message) {
    if (otherError) {
      otherError.textContent = message;
      otherError.classList.add('show');
    }
  }

  // Helper function to clear error
  function clearError() {
    if (otherError) {
      otherError.classList.remove('show');
    }
    if (otherInput) {
      otherInput.classList.remove('error');
    }
  }

  // Helper function to clear rejection form
  function clearRejectionForm() {
    allRadios?.forEach(r => (r.checked = false));
    if (otherInput) {
      otherInput.value = '';
      otherInput.classList.remove('error');
    }
    if (otherInputContainer) {
      otherInputContainer.style.display = 'none';
    }
    clearError();
  }
}

function showConfirmationModal() {
  const modal = document.getElementById('confirmation-modal');
  const list = document.getElementById('accepted-list');
  if (!modal || !list) return;

  const acceptedApps = enhancedState.applications.filter(
    app => app.status === 'accepted' && !enhancedState.rejectedProperties.has(app.id)
  );

  if (acceptedApps.length <= 1) return;

  // Render accepted properties
  list.innerHTML = acceptedApps
    .map(
      app => `
      <div class="find-room-accepted-item" data-property-id="${app.propertyId}">
        <img src="${app.image}" alt="${app.title}" class="find-room-accepted-image" />
        <div class="find-room-accepted-info">
          <h4 class="find-room-accepted-title">${app.title}</h4>
          <p class="find-room-accepted-address">${app.address}</p>
          <div class="find-room-accepted-price">₱${app.price.toLocaleString()}/month</div>
        </div>
        <div class="find-room-accepted-actions">
          <button class="find-room-btn find-room-btn-success confirm-selection-btn" data-property-id="${
            app.propertyId
          }">
            Yes, Select
          </button>
          <button class="find-room-btn find-room-btn-danger reject-selection-btn" data-property-id="${
            app.propertyId
          }">
            No
          </button>
        </div>
      </div>
    `
    )
    .join('');

  // Add event listeners
  list.querySelectorAll('.confirm-selection-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const propertyId = parseInt(btn.dataset.propertyId);
      handlePropertySelection(propertyId);
    });
  });

  list.querySelectorAll('.reject-selection-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const propertyId = parseInt(btn.dataset.propertyId);
      showRejectionModal(propertyId);
    });
  });

  // Show modal
  modal.classList.add('show');
  modal.style.display = 'flex';
}

function handlePropertySelection(propertyId) {
  const selectedApp = enhancedState.applications.find(app => app.propertyId === propertyId);
  if (!selectedApp) return;

  // Store selection
  enhancedState.selectedProperty = selectedApp;

  // Update user's boarder status to pending_confirmation
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  user.boarderStatus = 'pending_confirmation';
  localStorage.setItem('user', JSON.stringify(user));
  console.log('Boarder status updated to:', user.boarderStatus);

  // Close modal
  const modal = document.getElementById('confirmation-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }

  // Redirect to confirm-booking page with application ID
  window.location.href = `../../views/boarder/confirm-booking/index.html?applicationId=${selectedApp.id}`;
}

function showRejectionModal(propertyId) {
  const modal = document.getElementById('rejection-modal');
  const propertyName = document.getElementById('rejection-property-name');
  if (!modal) return;

  const app = enhancedState.applications.find(a => a.propertyId === propertyId);
  if (!app) return;

  enhancedState.selectedProperty = app;

  if (propertyName) {
    propertyName.textContent = app.title;
  }

  modal.classList.add('show');
  modal.style.display = 'flex';
}

// Initialize on module load
if (typeof window !== 'undefined') {
  window.initFindARoomEnhanced = initFindARoomEnhanced;
}
