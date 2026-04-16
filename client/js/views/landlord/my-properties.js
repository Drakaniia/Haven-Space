/**
 * My Properties - Property Management
 * Handles viewing, editing, and deleting landlord properties
 */

import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';

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
let isVerified = false;
let currentUser = null;

function loginPath() {
  const pathname = window.location.pathname;
  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }
  if (pathname.includes('/views/')) {
    return '/views/public/auth/login.html';
  }
  return '/views/public/auth/login.html';
}

function initialsFrom(user) {
  const a = (user.first_name || '').trim().charAt(0);
  const b = (user.last_name || '').trim().charAt(0);
  return (a + b || 'L').toUpperCase();
}

/**
 * Fetch landlord property data from API
 */
async function fetchPropertyData(userId) {
  try {
    const profileRes = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/profile.php?userId=${userId}`,
      { credentials: 'include' }
    );
    const profileData = await profileRes.json();

    console.log('Profile API response:', profileData);

    if (!profileData.success) {
      console.error('Profile API failed:', profileData.error);
      // Check if profile doesn't exist (404)
      if (profileRes.status === 404) {
        return { profileNotFound: true };
      }
      return null;
    }

    let locationData = { success: false, data: { address: '', city: '', province: '' } };

    try {
      const locationRes = await fetch(
        `${CONFIG.API_BASE_URL}/api/landlord/property-location.php?userId=${userId}`,
        { credentials: 'include' }
      );
      locationData = await locationRes.json();
      console.log('Location API response:', locationData);
    } catch (locationError) {
      console.warn('Failed to fetch location data:', locationError);
    }

    // Combine profile and location data into property structure
    const property = {
      id: profileData.data.profileId,
      name: profileData.data.boardingHouseName,
      type: mapPropertyType(profileData.data.propertyType),
      location: locationData.success ? locationData.data.address : 'Location not set',
      city: locationData.success ? locationData.data.city : '',
      province: locationData.success ? locationData.data.province : '',
      price: 0, // Price not set during signup, will be set by landlord later
      rooms: profileData.data.totalRooms,
      occupied: profileData.data.totalRooms - profileData.data.availableRooms,
      status: 'inactive', // Default status for new properties
      description: profileData.data.description || 'No description provided',
      amenities: [], // Amenities not set during signup
      photos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'], // Default placeholder
      createdAt: new Date().toISOString().split('T')[0],
    };

    console.log('Combined property data:', property);
    return property;
  } catch (error) {
    console.error('Error fetching property data:', error);
    return null;
  }
}

/**
 * Map database property type to frontend type
 */
function mapPropertyType(dbType) {
  const typeMap = {
    'Single unit': 'boarding-house',
    'Multi-unit': 'boarding-house',
    Apartment: 'apartment',
    Dormitory: 'dormitory',
  };
  return typeMap[dbType] || 'boarding-house';
}

/**
 * Fetch verification status
 */
async function fetchVerificationStatus() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/verification-status.php`, {
      credentials: 'include',
    });
    const data = await res.json();
    return data.success ? data.data.is_verified : false;
  } catch (error) {
    console.error('Error fetching verification status:', error);
    return false;
  }
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
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, { credentials: 'include' });
    if (!res.ok) {
      window.location.href = loginPath();
      return;
    }
    const data = await res.json();
    user = data.user;
    currentUser = user;
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

  // Fetch verification status
  isVerified = await fetchVerificationStatus();

  // Load properties from API
  await loadProperties(user.id);

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
async function loadProperties(userId) {
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

  try {
    // First, try to fetch from properties table (full listings)
    const propertiesRes = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/properties.php`, {
      credentials: 'include',
    });

    let hasFullProperties = false;
    if (propertiesRes.ok) {
      const propertiesData = await propertiesRes.json();
      if (propertiesData.success && propertiesData.data.properties.length > 0) {
        hasFullProperties = true;
        const mappedProperties = propertiesData.data.properties.map(prop => ({
          id: prop.id,
          name: prop.name,
          type: prop.type,
          location: prop.address,
          city: prop.city,
          province: prop.province,
          price: prop.price,
          rooms: prop.total_rooms,
          occupied: prop.occupied_rooms,
          status: prop.status,
          description: prop.description,
          amenities: prop.amenities || [],
          photos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
          createdAt: prop.created_at,
          isFullListing: true,
        }));

        if (loadingState) {
          loadingState.style.display = 'none';
        }
        grid.style.display = 'grid';
        renderProperties(mappedProperties);
        return;
      }
    }

    // If no full properties, check for profile data from signup
    const property = await fetchPropertyData(userId);

    if (loadingState) {
      loadingState.style.display = 'none';
    }

    if (!property) {
      // No property found
      if (emptyState) {
        emptyState.style.display = 'block';
        // Reset to default empty state message
        const emptyTitle = emptyState.querySelector('h2');
        const emptyText = emptyState.querySelector('p');
        if (emptyTitle) emptyTitle.textContent = 'No Properties Yet';
        if (emptyText)
          emptyText.textContent = 'Start by adding your first boarding house or property.';
      }
    } else if (property.profileNotFound) {
      // Profile doesn't exist - landlord needs to create their first property
      if (emptyState) {
        emptyState.style.display = 'block';
        // Update empty state to show profile not found message
        const emptyTitle = emptyState.querySelector('h2');
        const emptyText = emptyState.querySelector('p');
        if (emptyTitle) emptyTitle.textContent = 'Complete Your Profile';
        if (emptyText)
          emptyText.textContent =
            'Start by adding your first boarding house or property to get started.';
      }
    } else {
      // Mark as draft property from signup
      property.isDraft = true;
      property.isFullListing = false;
      propertiesData = [property];
      grid.style.display = 'grid';
      renderProperties(propertiesData);
    }
  } catch (error) {
    console.error('Error loading properties:', error);
    if (loadingState) {
      loadingState.style.display = 'none';
    }
    if (emptyState) {
      emptyState.style.display = 'block';
    }
  }
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

  // Determine status label
  let statusLabel = 'Draft';
  let statusClass = 'draft';

  if (property.isDraft) {
    statusLabel = 'Draft - Complete Setup';
    statusClass = 'draft';
  } else if (property.status === 'active') {
    statusLabel = 'Active';
    statusClass = 'active';
  } else if (property.status === 'full') {
    statusLabel = 'Fully Occupied';
    statusClass = 'full';
  } else {
    statusLabel = 'Inactive';
    statusClass = 'inactive';
  }

  card.innerHTML = `
    <div class="property-card-image">
      <img src="${property.photos[0] || '/placeholder.jpg'}" alt="${property.name}" />
      <span class="property-card-status status-${statusClass}">${statusLabel}</span>
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
      ${
        property.isDraft
          ? `
        <div class="property-card-draft-notice">
          <p style="color: var(--warning-color); font-size: 14px; margin: 8px 0;">
            ${getIcon('exclamationTriangle', { width: 16, height: 16 })}
            Complete your property details to publish
          </p>
        </div>
      `
          : ''
      }
      <div class="property-card-stats">
        <div class="property-card-stat">
          <div class="property-card-stat-value">${
            property.price > 0 ? '₱' + property.price.toLocaleString() : 'Not set'
          }</div>
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
      ${
        property.isDraft
          ? `
        <button class="btn-edit btn-primary" data-action="edit" data-id="${
          property.id
        }" style="flex: 1;">
          ${getIcon('edit')}
          Complete Setup
        </button>
      `
          : `
        <button class="btn-view" data-action="view" data-id="${property.id}">
          ${getIcon('eye')}
          View
        </button>
        <button class="btn-edit" data-action="edit" data-id="${property.id}" ${
              !isVerified ? 'disabled' : ''
            } title="${!isVerified ? 'Account pending verification' : 'Edit Property'}">
          ${getIcon('edit')}
          Edit
        </button>
        <button class="btn-delete" data-action="delete" data-id="${property.id}" ${
              !isVerified ? 'disabled' : ''
            } title="${!isVerified ? 'Account pending verification' : 'Delete Property'}">
          ${getIcon('trash')}
          Delete
        </button>
      `
      }
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
      if (!isVerified) {
        alert(
          'Your account is pending verification by a superadmin. You can delete your property after your account has been approved.'
        );
        return;
      }
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
    editBtn.disabled = !isVerified;
    editBtn.title = !isVerified ? 'Account pending verification' : 'Edit Property';
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
 * Edit property - navigate to edit page (only if verified)
 */
function editProperty(property) {
  // For draft properties from signup, allow editing even if not verified
  // since they need to complete their property setup
  if (!property.isDraft && !isVerified) {
    alert(
      'Your account is pending verification by a superadmin. You can edit your property details after your account has been approved.'
    );
    return;
  }

  // Navigate to edit page with property ID
  // For draft properties, pass a flag to indicate it's from profile
  const editUrl = property.isDraft
    ? `../listings/edit.html?profileId=${property.id}&draft=true`
    : `../listings/edit.html?id=${property.id}`;

  window.location.href = editUrl;
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
  // Check if landlord is verified
  if (!isVerified) {
    alert(
      'Your account is pending verification by a superadmin. You can delete your property after your account has been approved.'
    );
    return;
  }

  // Remove from data
  propertiesData = propertiesData.filter(p => p.id !== property.id);

  // Re-render
  loadProperties(currentUser.id);

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
