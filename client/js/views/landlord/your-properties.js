/**
 * Your Properties - Property Management
 * Handles viewing, editing, and deleting landlord properties
 */

import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';
import { getImageUrl } from '../../shared/image-utils.js';

// Amenity display names
const amenityLabels = {
  wifi: 'WiFi',
  aircon: 'Air Conditioning',
  furnished: 'Fully Furnished',
  parking: 'Parking',
  laundry: 'Laundry',
  kitchen: 'Kitchen Access',
  cr: 'CR Inside Room',
  cctv: 'CCTV Security',
};

// Current property being viewed/deleted
let currentProperty = null;
let propertiesData = [];

/**
 * Initialize the Your Properties page
 */
export function initYourProperties() {
  const searchInput = document.getElementById('search-properties');
  const filterStatus = document.getElementById('filter-status');
  const sortBy = document.getElementById('sort-by');

  if (!searchInput) {
    return;
  }

  // Load properties from API
  loadProperties();

  // Event listeners
  searchInput.addEventListener('input', handleSearch);
  filterStatus.addEventListener('change', handleFilter);
  sortBy.addEventListener('change', handleSort);

  // Modal close handlers
  setupModalHandlers();
}

/**
 * Fetch properties from API
 * @returns {Promise<Array>} Array of property objects
 */
async function fetchPropertiesFromApi() {
  const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/properties`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = '../../public/auth/login.html';
      return [];
    }
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();

  if (result.data && result.data.properties) {
    return result.data.properties;
  }

  return [];
}

/**
 * Normalize a property object from the API to the shape expected by the UI
 * @param {Object} p - Raw property from API
 * @returns {Object} Normalized property
 */
function normalizeProperty(p) {
  const photos = Array.isArray(p.photos)
    ? p.photos.map(photo =>
        typeof photo === 'string' ? photo : photo.url || photo.photo_url || ''
      )
    : [];

  const location = [p.address, p.city, p.province].filter(Boolean).join(', ') || p.location || '';

  return {
    id: p.id,
    name: p.name || p.property_name || 'Unnamed Property',
    type: p.type || p.property_type || 'boarding-house',
    location,
    city: p.city || '',
    province: p.province || '',
    price: p.price || p.monthly_rate || 0,
    rooms: p.total_rooms || p.rooms || 0,
    occupied: p.occupied_rooms || p.occupied || 0,
    status: p.status || 'inactive',
    description: p.description || '',
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    photos,
    createdAt: p.created_at || p.createdAt || '',
  };
}

/**
 * Load and render properties from API
 */
function loadProperties() {
  const grid = document.getElementById('properties-grid');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');

  if (!grid) {
    return;
  }

  // Show loading state
  if (loadingState) {
    loadingState.style.display = 'block';
  }
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  grid.style.display = 'none';

  fetchPropertiesFromApi()
    .then(rawProperties => {
      propertiesData = rawProperties.map(normalizeProperty);

      if (loadingState) {
        loadingState.style.display = 'none';
      }

      if (propertiesData.length === 0) {
        if (emptyState) {
          emptyState.style.display = 'block';
        }
      } else {
        grid.style.display = 'grid';
        renderProperties(propertiesData);
      }
    })
    .catch(error => {
      console.error('Failed to load properties:', error);
      if (loadingState) {
        loadingState.style.display = 'none';
      }
      if (emptyState) {
        emptyState.style.display = 'block';
      }
    });
}

/**
 * Render properties grid
 */
function renderProperties(properties) {
  const grid = document.getElementById('properties-grid');
  if (!grid) {
    return;
  }

  grid.innerHTML = '';

  properties.forEach(property => {
    const card = createPropertyCard(property);
    grid.appendChild(card);
  });
}

/**
 * Create a property card element
 */
function createPropertyCard(property) {
  const card = document.createElement('div');
  card.className = 'property-card';
  card.dataset.propertyId = property.id;

  const occupancyRate =
    property.rooms > 0 ? Math.round((property.occupied / property.rooms) * 100) : 0;
  const statusLabel =
    property.status === 'active'
      ? 'Active'
      : property.status === 'full'
      ? 'Fully Occupied'
      : 'Inactive';

  const coverPhoto = property.photos[0]
    ? getImageUrl(property.photos[0])
    : '/assets/images/placeholder-property.svg';

  card.innerHTML = `
    <div class="property-card-image">
      <img src="${coverPhoto}" alt="${
    property.name
  }" onerror="this.onerror=null;this.src='/assets/images/placeholder-property.svg'" />
      <span class="property-card-status status-${property.status}">${statusLabel}</span>
      <div class="property-card-photo-count">
        ${getIcon('photo')}
        ${property.photos.length}
      </div>
    </div>
    <div class="property-card-body">
      <h3 class="property-card-name">${property.name}</h3>
      <div class="property-card-location">
        ${getIcon('location')}
        ${property.location}
      </div>
      <div class="property-card-stats">
        <div class="property-card-stat">
          <div class="property-card-stat-value">₱${property.price.toLocaleString()}</div>
          <div class="property-card-stat-label">/month</div>
        </div>
        <div class="property-card-stat">
          <div class="property-card-stat-value">${property.rooms}</div>
          <div class="property-card-stat-label">Rooms</div>
        </div>
        <div class="property-card-stat">
          <div class="property-card-stat-value">${occupancyRate}%</div>
          <div class="property-card-stat-label">Occupancy</div>
        </div>
      </div>
    </div>
    <div class="property-card-actions">
      <button class="btn-view" data-action="view" data-id="${property.id}">
        ${getIcon('eye')}
        View
      </button>
      <button class="btn-edit" data-action="edit" data-id="${property.id}">
        ${getIcon('edit')}
        Edit
      </button>
      <button class="btn-delete" data-action="delete" data-id="${property.id}">
        ${getIcon('trash')}
        Delete
      </button>
    </div>
  `;

  // Add event listeners to buttons
  card.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = parseInt(btn.dataset.id);
      handlePropertyAction(action, id);
    });
  });

  return card;
}

/**
 * Handle property actions (view, edit, delete)
 */
function handlePropertyAction(action, id) {
  const property = propertiesData.find(p => p.id === id);
  if (!property) {
    return;
  }

  currentProperty = property;

  switch (action) {
    case 'view':
      openPropertyModal(property);
      break;
    case 'edit':
      editProperty(property);
      break;
    case 'delete':
      confirmDelete(property);
      break;
  }
}

/**
 * Open property detail modal
 */
function openPropertyModal(property) {
  const modal = document.getElementById('property-modal');
  if (!modal) {
    return;
  }

  // Populate modal data
  document.getElementById('modal-property-name').textContent = property.name;
  document.getElementById('modal-property-type').textContent = property.type
    .replace('-', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  document.getElementById('modal-property-location').textContent = `${property.location}`;
  document.getElementById(
    'modal-property-price'
  ).textContent = `₱${property.price.toLocaleString()}/month`;
  document.getElementById('modal-property-rooms').textContent = `${property.rooms} rooms`;
  document.getElementById('modal-property-occupancy').textContent = `${Math.round(
    property.rooms > 0 ? (property.occupied / property.rooms) * 100 : 0
  )}% (${property.occupied}/${property.rooms})`;

  const statusEl = document.getElementById('modal-property-status');
  statusEl.textContent =
    property.status === 'active'
      ? 'Active'
      : property.status === 'full'
      ? 'Fully Occupied'
      : 'Inactive';
  statusEl.className = `status-badge status-${property.status}`;

  document.getElementById('modal-property-description').textContent = property.description;

  // Set cover image
  const coverImage = document.getElementById('modal-cover-image');
  coverImage.src = property.photos[0]
    ? getImageUrl(property.photos[0])
    : '/assets/images/placeholder-property.svg';
  coverImage.alt = property.name;
  coverImage.onerror = function () {
    this.onerror = null;
    this.src = '/assets/images/placeholder-property.svg';
  };

  // Set thumbnail images
  const thumbsContainer = document.getElementById('modal-image-thumbs');
  thumbsContainer.innerHTML = '';
  property.photos.slice(1).forEach(photoUrl => {
    const img = document.createElement('img');
    img.src = getImageUrl(photoUrl);
    img.alt = property.name;
    img.onerror = function () {
      this.onerror = null;
      this.src = '/assets/images/placeholder-property.svg';
    };
    img.addEventListener('click', () => {
      coverImage.src = getImageUrl(photoUrl);
    });
    thumbsContainer.appendChild(img);
  });

  // Set amenities
  const amenitiesContainer = document.getElementById('modal-amenities');
  amenitiesContainer.innerHTML = '';
  property.amenities.forEach(amenity => {
    const tag = document.createElement('span');
    tag.className = 'amenity-tag';
    tag.textContent = amenityLabels[amenity] || amenity;
    amenitiesContainer.appendChild(tag);
  });

  // Set edit button handler
  const editBtn = document.getElementById('modal-edit');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal(modal);
      editProperty(property);
    };
  }

  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Edit property - navigate to edit page
 */
function editProperty(property) {
  window.location.href = `../listings/edit.html?id=${property.id}`;
}

/**
 * Confirm delete property
 */
function confirmDelete(property) {
  const modal = document.getElementById('delete-modal');
  if (!modal) {
    return;
  }

  document.getElementById('delete-property-name').textContent = property.name;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Setup modal event handlers
 */
function setupModalHandlers() {
  // Property modal close handlers
  const propertyModal = document.getElementById('property-modal');
  if (propertyModal) {
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const overlay = propertyModal.querySelector('.modal-overlay');

    [closeBtn, cancelBtn, overlay].forEach(el => {
      if (el) {
        el.addEventListener('click', () => closeModal(propertyModal));
      }
    });
  }

  // Delete modal handlers
  const deleteModal = document.getElementById('delete-modal');
  if (deleteModal) {
    const cancelBtn = document.getElementById('delete-cancel');
    const confirmBtn = document.getElementById('delete-confirm');
    const overlay = deleteModal.querySelector('.modal-overlay');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => closeModal(deleteModal));
    }

    if (overlay) {
      overlay.addEventListener('click', () => closeModal(deleteModal));
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        deleteProperty(currentProperty);
        closeModal(deleteModal);
      });
    }
  }

  // Close on escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal(propertyModal);
      closeModal(deleteModal);
    }
  });
}

/**
 * Close modal
 */
function closeModal(modal) {
  if (!modal) {
    return;
  }
  modal.classList.remove('active');
  document.body.style.overflow = '';
  currentProperty = null;
}

/**
 * Delete property via API
 */
async function deleteProperty(property) {
  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/properties.php?id=${property.id}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Remove from local data and re-render
    propertiesData = propertiesData.filter(p => p.id !== property.id);
    loadProperties();
  } catch (error) {
    console.error('Failed to delete property:', error);
    alert('Failed to delete property. Please try again.');
  }
}

/**
 * Handle search input
 */
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  filterAndSortProperties(query);
}

/**
 * Handle filter change
 */
function handleFilter() {
  filterAndSortProperties();
}

/**
 * Handle sort change
 */
function handleSort() {
  filterAndSortProperties();
}

/**
 * Filter and sort properties based on current state
 */
function filterAndSortProperties(searchQuery = '') {
  const searchInput = document.getElementById('search-properties');
  const filterStatus = document.getElementById('filter-status');
  const sortBy = document.getElementById('sort-by');

  if (!searchInput || !filterStatus || !sortBy) {
    return;
  }

  const query = searchQuery || searchInput.value.toLowerCase().trim();
  const statusFilter = filterStatus.value;
  const sortOption = sortBy.value;

  // Filter
  const filtered = propertiesData.filter(property => {
    const matchesSearch =
      !query ||
      property.name.toLowerCase().includes(query) ||
      property.location.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort
  filtered.sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'occupancy':
        return (b.rooms > 0 ? b.occupied / b.rooms : 0) - (a.rooms > 0 ? a.occupied / a.rooms : 0);
      default:
        return 0;
    }
  });

  renderProperties(filtered);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initYourProperties);
