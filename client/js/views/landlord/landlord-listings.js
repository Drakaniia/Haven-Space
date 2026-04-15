import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';

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

let currentProperty = null;
let propertiesData = [];

export function initLandlordListings() {
  const searchInput = document.getElementById('search-properties');
  const filterType = document.getElementById('filter-type');
  const filterStatus = document.getElementById('filter-status');
  const sortBy = document.getElementById('sort-by');

  if (!searchInput) {
    return;
  }

  loadProperties();

  searchInput.addEventListener('input', handleSearch);
  filterType.addEventListener('change', handleFilter);
  filterStatus.addEventListener('change', handleFilter);
  sortBy.addEventListener('change', handleSort);

  setupModalHandlers();
}

async function fetchPropertiesFromApi() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/properties.php`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.data && result.data.properties) {
      return result.data.properties.map(p => ({
        id: p.id,
        name: p.name || p.title,
        address: p.address || '',
        location: p.address || '',
        city: p.city || '',
        province: p.province || '',
        price: p.price || 0,
        rooms: p.total_rooms || 0,
        occupied: p.occupied_rooms || 0,
        status: p.status || 'active',
        monthlyRevenue: p.monthly_revenue || 0,
        createdAt: p.created_at || new Date().toISOString(),
        photos: [],
        description: '',
        amenities: [],
      }));
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    return [];
  }
}

function loadProperties() {
  const grid = document.getElementById('properties-grid');
  const emptyState = document.getElementById('empty-state');
  const loadingState = document.getElementById('loading-state');

  if (!grid) {
    return;
  }

  if (loadingState) {
    loadingState.style.display = 'flex';
  }
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  grid.style.display = 'none';

  // Fetch real data from API
  fetchPropertiesFromApi().then(properties => {
    propertiesData = properties;

    if (loadingState) {
      loadingState.style.display = 'none';
    }

    updateStats();

    if (propertiesData.length === 0) {
      if (emptyState) {
        emptyState.style.display = 'flex';
      }
    } else {
      grid.style.display = 'grid';
      renderProperties(propertiesData);
    }
  });
}

function updateStats() {
  const totalProperties = propertiesData.length;
  const totalRooms = propertiesData.reduce((sum, p) => sum + (p.total_rooms || p.rooms || 0), 0);
  const totalBoarders = propertiesData.reduce(
    (sum, p) => sum + (p.occupied_rooms || p.occupied || 0),
    0
  );
  const monthlyRevenue = propertiesData.reduce(
    (sum, p) => sum + (p.monthly_revenue || p.monthlyRevenue || 0),
    0
  );

  const propEl = document.querySelector('[data-total="properties"]');
  const roomEl = document.querySelector('[data-total="rooms"]');
  const boarderEl = document.querySelector('[data-total="boarders"]');
  const revenueEl = document.querySelector('[data-total="revenue"]');

  if (propEl) propEl.textContent = totalProperties;
  if (roomEl) roomEl.textContent = totalRooms;
  if (boarderEl) boarderEl.textContent = totalBoarders;
  if (revenueEl) revenueEl.textContent = `₱${monthlyRevenue.toLocaleString()}`;
}

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

function createPropertyCard(property) {
  const card = document.createElement('div');
  card.className = 'property-card';
  card.dataset.propertyId = property.id;

  const totalRooms = property.total_rooms || property.rooms || 0;
  const occupiedRooms = property.occupied_rooms || property.occupied || 0;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const statusLabel =
    property.status === 'active'
      ? 'Active'
      : property.status === 'full'
      ? 'Fully Occupied'
      : 'Inactive';

  const photos = property.photos || [];
  const photoCount = photos.length;

  card.innerHTML = `
    <div class="property-card-image">
      <img src="${photos[0] || '/assets/placeholder-property.svg'}" alt="${property.name}" />
      <span class="property-card-status status-${property.status}">${statusLabel}</span>
      <div class="property-card-photo-count">
        ${getIcon('photo')}
        ${photoCount}
      </div>
    </div>
    <div class="property-card-body">
      <h3 class="property-card-name">${property.name}</h3>
      <div class="property-card-location">
        ${getIcon('location')}
        ${property.location || property.address || ''}
      </div>
      <div class="property-card-stats">
        <div class="property-card-stat">
          <div class="property-card-stat-value">₱${(property.price || 0).toLocaleString()}</div>
          <div class="property-card-stat-label">/month</div>
        </div>
        <div class="property-card-stat">
          <div class="property-card-stat-value">${totalRooms}</div>
          <div class="property-card-stat-label">Rooms</div>
        </div>
        <div class="property-card-stat">
          <div class="property-card-stat-value">${occupancyRate}%</div>
          <div class="property-card-stat-label">Occupancy</div>
        </div>
      </div>
    </div>
    <div class="property-card-actions">
      <button type="button" data-action="view" data-id="${property.id}">
        ${getIcon('eye')}
        View
      </button>
      <button type="button" data-action="edit" data-id="${property.id}">
        ${getIcon('edit')}
        Edit
      </button>
      <button type="button" class="btn-delete" data-action="delete" data-id="${property.id}">
        ${getIcon('trash')}
        Delete
      </button>
    </div>
  `;

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

function openPropertyModal(property) {
  const modal = document.getElementById('property-modal');
  if (!modal) {
    return;
  }

  const totalRooms = property.total_rooms || property.rooms || 0;
  const occupiedRooms = property.occupied_rooms || property.occupied || 0;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  document.getElementById('modal-property-name').textContent = property.name || 'Unnamed Property';
  document.getElementById('modal-property-type').textContent = (property.type || 'boarding-house')
    .replace('-', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  document.getElementById('modal-property-location').textContent =
    property.location || property.address || 'No address provided';
  document.getElementById('modal-property-price').textContent = `₱${(
    property.price || 0
  ).toLocaleString()}/month`;
  document.getElementById('modal-property-rooms').textContent = `${totalRooms} rooms`;
  document.getElementById(
    'modal-property-occupancy'
  ).textContent = `${occupancyRate}% (${occupiedRooms}/${totalRooms})`;

  const statusEl = document.getElementById('modal-property-status');
  statusEl.textContent =
    property.status === 'active'
      ? 'Active'
      : property.status === 'full'
      ? 'Fully Occupied'
      : 'Inactive';
  statusEl.className = `status-badge status-${property.status}`;

  document.getElementById('modal-property-description').textContent =
    property.description || 'No description available.';

  const photos = property.photos || [];
  const coverImage = document.getElementById('modal-cover-image');
  coverImage.src = photos[0] || '/assets/placeholder-property.svg';
  coverImage.alt = property.name;

  const thumbsContainer = document.getElementById('modal-image-thumbs');
  thumbsContainer.innerHTML = '';
  photos.slice(1).forEach(photoUrl => {
    const img = document.createElement('img');
    img.src = photoUrl;
    img.alt = property.name;
    img.addEventListener('click', () => {
      coverImage.src = photoUrl;
    });
    thumbsContainer.appendChild(img);
  });

  const amenitiesContainer = document.getElementById('modal-amenities');
  amenitiesContainer.innerHTML = '';
  const amenities = property.amenities || [];
  amenities.forEach(amenity => {
    const tag = document.createElement('span');
    tag.className = 'amenity-tag';
    tag.textContent = amenityLabels[amenity] || amenity;
    amenitiesContainer.appendChild(tag);
  });

  const editBtn = document.getElementById('modal-edit');
  if (editBtn) {
    editBtn.onclick = () => {
      closeModal(modal);
      editProperty(property);
    };
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function editProperty(property) {
  window.location.href = `edit.html?id=${property.id}`;
}

function confirmDelete(property) {
  const modal = document.getElementById('delete-modal');
  if (!modal) {
    return;
  }

  document.getElementById('delete-property-name').textContent = property.name;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function setupModalHandlers() {
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

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal(propertyModal);
      closeModal(deleteModal);
    }
  });
}

function closeModal(modal) {
  if (!modal) {
    return;
  }
  modal.classList.remove('active');
  document.body.style.overflow = '';
  currentProperty = null;
}

function deleteProperty(property) {
  propertiesData = propertiesData.filter(p => p.id !== property.id);
  loadProperties();
  alert(`Property "${property.name}" has been deleted successfully.`);
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  filterAndSortProperties(query);
}

function handleFilter() {
  filterAndSortProperties();
}

function handleSort() {
  filterAndSortProperties();
}

function filterAndSortProperties(searchQuery = '') {
  const searchInput = document.getElementById('search-properties');
  const filterType = document.getElementById('filter-type');
  const filterStatus = document.getElementById('filter-status');
  const sortBy = document.getElementById('sort-by');

  if (!searchInput || !filterType || !filterStatus || !sortBy) {
    return;
  }

  const query = searchQuery || searchInput.value.toLowerCase().trim();
  const typeFilter = filterType.value;
  const statusFilter = filterStatus.value;
  const sortOption = sortBy.value;

  const filtered = propertiesData.filter(property => {
    const location = property.location || property.address || '';
    const matchesSearch =
      !query ||
      (property.name || '').toLowerCase().includes(query) ||
      location.toLowerCase().includes(query);

    const matchesType = typeFilter === 'all' || property.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  filtered.sort((a, b) => {
    const aRooms = a.total_rooms || a.rooms || 0;
    const bRooms = b.total_rooms || b.rooms || 0;
    const aOccupied = a.occupied_rooms || a.occupied || 0;
    const bOccupied = b.occupied_rooms || b.occupied || 0;

    switch (sortOption) {
      case 'newest':
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      case 'oldest':
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'occupancy':
        return bOccupied / bRooms - aOccupied / aRooms;
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      default:
        return 0;
    }
  });

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
      case 'price-high':
        return b.price - a.price;
      case 'price-low':
        return a.price - b.price;
      default:
        return 0;
    }
  });

  renderProperties(filtered);
}

document.addEventListener('DOMContentLoaded', initLandlordListings);
