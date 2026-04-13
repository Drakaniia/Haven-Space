/**
 * My Properties - Property Management
 * Handles viewing, editing, and deleting landlord properties
 */

import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';

// Sample properties data (replace with API call)
const sampleProperties = [
  {
    id: 1,
    name: 'Sunrise Boarding House',
    type: 'boarding-house',
    location: 'Sampaloc, Manila',
    city: 'Manila',
    province: 'Metro Manila',
    price: 5000,
    rooms: 10,
    occupied: 8,
    status: 'active',
    description:
      'A cozy boarding house near universities with all essential amenities for comfortable living.',
    amenities: ['wifi', 'aircon', 'parking', 'laundry', 'cctv'],
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ],
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    name: 'Green Valley Dormitory',
    type: 'dormitory',
    location: 'España Blvd, Manila',
    city: 'Manila',
    province: 'Metro Manila',
    price: 4500,
    rooms: 15,
    occupied: 15,
    status: 'full',
    description:
      'Modern dormitory with affordable rates, perfect for students. Walking distance to universities.',
    amenities: ['wifi', 'furnished', 'laundry', 'kitchen', 'cctv'],
    photos: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
    ],
    createdAt: '2024-02-20',
  },
  {
    id: 3,
    name: 'Palm Springs Apartments',
    type: 'apartment',
    location: 'Quezon City',
    city: 'Quezon City',
    province: 'Metro Manila',
    price: 8000,
    rooms: 6,
    occupied: 3,
    status: 'active',
    description:
      'Upscale apartments with modern furnishings and premium amenities. Ideal for young professionals.',
    amenities: ['wifi', 'aircon', 'furnished', 'parking', 'laundry', 'kitchen', 'cr'],
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800',
    ],
    createdAt: '2024-03-10',
  },
  {
    id: 4,
    name: 'Budget Stay Boarding House',
    type: 'boarding-house',
    location: 'Caloocan City',
    city: 'Caloocan',
    province: 'Metro Manila',
    price: 3500,
    rooms: 8,
    occupied: 2,
    status: 'inactive',
    description:
      'Affordable boarding house with basic amenities. Currently under renovation for improvements.',
    amenities: ['wifi', 'parking', 'cctv'],
    photos: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800'],
    createdAt: '2023-11-05',
  },
];

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
let propertiesData = [...sampleProperties];

function loginPath() {
  const pathname = window.location.pathname;
  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }
  if (pathname.includes('/client/views/')) {
    return '/client/views/public/auth/login.html';
  }
  return '/views/public/auth/login.html';
}

function initialsFrom(user) {
  const a = (user.first_name || '').trim().charAt(0);
  const b = (user.last_name || '').trim().charAt(0);
  return (a + b || 'L').toUpperCase();
}

/**
 * Initialize the My Properties page
 */
export async function initMyProperties() {
  const searchInput = document.getElementById('search-properties');
  const filterStatus = document.getElementById('filter-status');
  const sortBy = document.getElementById('sort-by');

  if (!searchInput) {
    return;
  }

  // Fetch real user data
  let user;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me.php`, { credentials: 'include' });
    if (!res.ok) {
      window.location.href = loginPath();
      return;
    }
    const data = await res.json();
    user = data.user;
  } catch {
    window.location.href = loginPath();
    return;
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Landlord';
  const initials = initialsFrom(user);

  // Initialize sidebar and navbar
  initSidebar({
    role: 'landlord',
    user: {
      name,
      initials,
      role: 'Landlord',
      email: user.email || '',
    },
  });

  initNavbar({
    user: {
      name,
      initials,
      avatarUrl: user.avatar_url || '',
      email: user.email || '',
    },
    notificationCount: 5,
  });

  // Load properties
  loadProperties();

  // Event listeners
  searchInput.addEventListener('input', handleSearch);
  filterStatus.addEventListener('change', handleFilter);
  sortBy.addEventListener('change', handleSort);

  // Modal close handlers
  setupModalHandlers();
}

/**
 * Load and render properties
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

  // Simulate API delay
  setTimeout(() => {
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
  }, 500);
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

  const occupancyRate = Math.round((property.occupied / property.rooms) * 100);
  const statusLabel =
    property.status === 'active'
      ? 'Active'
      : property.status === 'full'
      ? 'Fully Occupied'
      : 'Inactive';

  card.innerHTML = `
    <div class="property-card-image">
      <img src="${property.photos[0] || '/placeholder.jpg'}" alt="${property.name}" />
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
  document.getElementById(
    'modal-property-location'
  ).textContent = `${property.location}, ${property.province}`;
  document.getElementById(
    'modal-property-price'
  ).textContent = `₱${property.price.toLocaleString()}/month`;
  document.getElementById('modal-property-rooms').textContent = `${property.rooms} rooms`;
  document.getElementById('modal-property-occupancy').textContent = `${Math.round(
    (property.occupied / property.rooms) * 100
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
  coverImage.src = property.photos[0] || '/placeholder.jpg';
  coverImage.alt = property.name;

  // Set thumbnail images
  const thumbsContainer = document.getElementById('modal-image-thumbs');
  thumbsContainer.innerHTML = '';
  property.photos.slice(1).forEach(photoUrl => {
    const img = document.createElement('img');
    img.src = photoUrl;
    img.alt = property.name;
    img.addEventListener('click', () => {
      coverImage.src = photoUrl;
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
  // Navigate to edit page with property ID
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
 * Delete property
 */
function deleteProperty(property) {
  // Remove from data
  propertiesData = propertiesData.filter(p => p.id !== property.id);

  // Re-render
  loadProperties();

  // Show success message (in real app, use toast notification)
  alert(`Property "${property.name}" has been deleted successfully.`);
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
    // Search filter
    const matchesSearch =
      !query ||
      property.name.toLowerCase().includes(query) ||
      property.location.toLowerCase().includes(query);

    // Status filter
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
        return b.occupied / b.rooms - a.occupied / a.rooms;
      default:
        return 0;
    }
  });

  renderProperties(filtered);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initMyProperties);
