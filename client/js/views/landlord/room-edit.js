import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';
import { setImageWithFallback } from '../../shared/image-utils.js';
import { showToast } from '../../shared/toast.js';

let currentProperty = null;
let roomsData = [];
let currentRoom = null;

export function initRoomEdit() {
  // Check authentication first
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please login to access this page', 'error');
    window.location.href = '../../../auth/login.html';
    return;
  }

  // Get property ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  if (!propertyId) {
    showToast('Property ID is required', 'error');
    window.location.href = 'index.html';
    return;
  }

  console.log('Initializing room edit for property:', propertyId);
  loadPropertyData(propertyId);
  setupEventListeners();
}

async function loadPropertyData(propertyId) {
  console.log('Loading property data for ID:', propertyId);
  try {
    const token = localStorage.getItem('token');
    console.log('Token available:', !!token);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Fetch property details
    const propertyUrl = `${CONFIG.API_BASE_URL}/api/landlord/properties.php?id=${propertyId}`;
    console.log('Fetching property from:', propertyUrl);

    const propertyResponse = await fetch(propertyUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('Property response status:', propertyResponse.status);

    if (!propertyResponse.ok) {
      const errorText = await propertyResponse.text();
      console.error('Property fetch error:', errorText);

      if (propertyResponse.status === 401) {
        showToast('Please login to access this page', 'error');
        window.location.href = '../../../auth/login.html';
        return;
      } else if (propertyResponse.status === 403 || propertyResponse.status === 404) {
        showToast('Property not found or access denied', 'error');
        window.location.href = 'index.html';
        return;
      }

      throw new Error(`Failed to fetch property: ${propertyResponse.status}`);
    }

    const propertyResult = await propertyResponse.json();
    console.log('Property result:', propertyResult);

    if (propertyResult.data) {
      currentProperty = propertyResult.data;
      updatePropertyInfo();
    } else {
      throw new Error('Property data not found in response');
    }

    // Fetch rooms for this property
    await loadRooms(propertyId);
  } catch (error) {
    console.error('Failed to load property data:', error);
    showToast('Failed to load property data', 'error');
  }
}

async function loadRooms(propertyId) {
  console.log('Loading rooms for property ID:', propertyId);
  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const roomsUrl = `${CONFIG.API_BASE_URL}/api/landlord/rooms.php?property_id=${propertyId}`;
    console.log('Fetching rooms from:', roomsUrl);

    const response = await fetch(roomsUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('Rooms response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Rooms fetch error:', errorText);

      if (response.status === 401) {
        showToast('Please login to access this page', 'error');
        window.location.href = '../../../auth/login.html';
        return;
      } else if (response.status === 403 || response.status === 404) {
        showToast('Property not found or access denied', 'error');
        window.location.href = 'index.html';
        return;
      }

      throw new Error(`Failed to fetch rooms: ${response.status}`);
    }

    const result = await response.json();
    console.log('Rooms result:', result);

    if (result.data && result.data.rooms) {
      roomsData = result.data.rooms || [];
    } else {
      roomsData = [];
    }

    console.log('Loaded rooms data:', roomsData);
    hideLoadingState();
    renderRooms(roomsData);
  } catch (error) {
    console.error('Failed to load rooms:', error);
    hideLoadingState();
    showEmptyState();
    // Don't show error toast for empty rooms, it's normal for new properties
  }
}

function updatePropertyInfo() {
  if (!currentProperty) return;

  const totalRooms = currentProperty.total_rooms || 0;
  const occupiedRooms = currentProperty.occupied_rooms || 0;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  document.getElementById('page-title').textContent = `Manage Rooms - ${currentProperty.name}`;
  document.getElementById('property-name').textContent = currentProperty.name || 'Unnamed Property';
  document.getElementById('property-location').textContent =
    currentProperty.address || currentProperty.location || 'No address provided';
  document.getElementById('property-type').textContent = (currentProperty.type || 'boarding-house')
    .replace('-', ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  document.getElementById('property-total-rooms').textContent = totalRooms;
  document.getElementById('property-occupied-rooms').textContent = occupiedRooms;
  document.getElementById('property-occupancy-rate').textContent = `${occupancyRate}%`;
}

function renderRooms(rooms) {
  const grid = document.getElementById('rooms-grid');
  const emptyState = document.getElementById('rooms-empty-state');

  if (!grid) return;

  grid.innerHTML = '';

  if (rooms.length === 0) {
    showEmptyState();
    return;
  }

  emptyState.style.display = 'none';
  grid.style.display = 'grid';

  rooms.forEach(room => {
    const card = createRoomCard(room);
    grid.appendChild(card);
  });
}

function createRoomCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card';
  card.dataset.roomId = room.id;

  const statusClass = room.status || 'available';
  const statusLabel =
    {
      available: 'Available',
      occupied: 'Occupied',
      maintenance: 'Maintenance',
    }[statusClass] || 'Available';

  const price = room.price || 0;
  const size = room.size ? `${room.size} sqm` : 'Size not specified';
  const capacity = room.capacity || 1;

  card.innerHTML = `
    <div class="room-card-image">
      <img src="../../../assets/images/placeholder-room.svg" alt="Room ${room.room_number}" />
      <span class="room-status ${statusClass}">${statusLabel}</span>
    </div>
    <div class="room-card-body">
      <div class="room-card-header">
        <h3 class="room-number">Room ${room.room_number}</h3>
        <div class="room-price">₱${price.toLocaleString()}/mo</div>
      </div>
      <div class="room-details">
        <div class="room-detail">
          <span data-icon="ruler" data-icon-width="16" data-icon-height="16" data-icon-stroke-width="2"></span>
          ${size}
        </div>
        <div class="room-detail">
          <span data-icon="userGroup" data-icon-width="16" data-icon-height="16" data-icon-stroke-width="2"></span>
          Max ${capacity} ${capacity === 1 ? 'person' : 'people'}
        </div>
      </div>
      ${
        room.status === 'occupied' && room.tenant_name
          ? `
        <div class="tenant-info">
          <div class="tenant-name">${room.tenant_name}</div>
          <div class="tenant-contact">${room.tenant_contact || 'No contact info'}</div>
        </div>
      `
          : ''
      }
      <div class="room-actions">
        <button type="button" data-action="edit" data-id="${room.id}">
          <span data-icon="edit" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
          Edit
        </button>
        <button type="button" data-action="tenant" data-id="${room.id}">
          <span data-icon="user" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
          ${room.status === 'occupied' ? 'Tenant' : 'Assign'}
        </button>
        <button type="button" class="btn-danger" data-action="delete" data-id="${room.id}">
          <span data-icon="trash" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
          Delete
        </button>
      </div>
    </div>
  `;

  // Add event listeners to action buttons
  card.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const roomId = parseInt(btn.dataset.id);
      handleRoomAction(action, roomId);
    });
  });

  return card;
}

function handleRoomAction(action, roomId) {
  const room = roomsData.find(r => r.id === roomId);
  if (!room) return;

  switch (action) {
    case 'edit':
      openRoomModal(room);
      break;
    case 'tenant':
      if (room.status === 'occupied') {
        // Show tenant details or edit tenant info
        openRoomModal(room, true);
      } else {
        // Assign new tenant
        openRoomModal(room, true);
      }
      break;
    case 'delete':
      confirmDeleteRoom(room);
      break;
  }
}

function setupEventListeners() {
  // Add room buttons
  const addRoomBtn = document.getElementById('add-room-btn');
  const floatingAddBtn = document.getElementById('floating-add-room');
  const emptyStateAddBtn = document.getElementById('empty-state-add-room');

  [addRoomBtn, floatingAddBtn, emptyStateAddBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => openRoomModal());
    }
  });

  // Search and filter
  const searchInput = document.getElementById('search-rooms');
  const filterStatus = document.getElementById('filter-status');
  const sortRooms = document.getElementById('sort-rooms');

  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  if (filterStatus) {
    filterStatus.addEventListener('change', handleFilter);
  }
  if (sortRooms) {
    sortRooms.addEventListener('change', handleSort);
  }

  // Modal handlers
  setupModalHandlers();
}

function openRoomModal(room = null, focusTenant = false) {
  const modal = document.getElementById('room-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('room-form');
  const tenantSection = document.getElementById('tenant-section');
  const roomStatusSelect = document.getElementById('room-status');

  if (!modal || !form) return;

  currentRoom = room;

  // Reset form
  form.reset();

  if (room) {
    // Edit mode
    modalTitle.textContent = `Edit Room ${room.room_number}`;
    document.getElementById('room-number').value = room.room_number || '';
    document.getElementById('room-price').value = room.price || '';
    document.getElementById('room-size').value = room.size || '';
    document.getElementById('room-capacity').value = room.capacity || 1;
    document.getElementById('room-status').value = room.status || 'available';
    document.getElementById('room-description').value = room.description || '';

    // Tenant information
    if (room.tenant_name) {
      document.getElementById('tenant-name').value = room.tenant_name || '';
      document.getElementById('tenant-contact').value = room.tenant_contact || '';
      document.getElementById('lease-start').value = room.lease_start || '';
      document.getElementById('lease-end').value = room.lease_end || '';
    }
  } else {
    // Add mode
    modalTitle.textContent = 'Add New Room';
    document.getElementById('room-capacity').value = 1;
    document.getElementById('room-status').value = 'available';
  }

  // Show/hide tenant section based on status
  const toggleTenantSection = () => {
    const status = roomStatusSelect.value;
    tenantSection.style.display = status === 'occupied' ? 'block' : 'none';
  };

  roomStatusSelect.addEventListener('change', toggleTenantSection);
  toggleTenantSection();

  // Focus on tenant section if requested
  if (focusTenant && room && room.status === 'occupied') {
    tenantSection.style.display = 'block';
    setTimeout(() => {
      document.getElementById('tenant-name').focus();
    }, 100);
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function setupModalHandlers() {
  const modal = document.getElementById('room-modal');
  const deleteModal = document.getElementById('delete-room-modal');

  // Room modal handlers
  if (modal) {
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const saveBtn = document.getElementById('modal-save');
    const overlay = modal.querySelector('.modal-overlay');

    [closeBtn, cancelBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => closeModal(modal));
      }
    });

    if (overlay) {
      overlay.addEventListener('click', () => closeModal(modal));
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', saveRoom);
    }
  }

  // Delete modal handlers
  if (deleteModal) {
    const closeBtn = document.getElementById('delete-modal-close');
    const cancelBtn = document.getElementById('delete-cancel');
    const confirmBtn = document.getElementById('delete-confirm');
    const overlay = deleteModal.querySelector('.modal-overlay');

    [closeBtn, cancelBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => closeModal(deleteModal));
      }
    });

    if (overlay) {
      overlay.addEventListener('click', () => closeModal(deleteModal));
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', deleteRoom);
    }
  }

  // ESC key handler
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal(modal);
      closeModal(deleteModal);
    }
  });
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
  currentRoom = null;
}

async function saveRoom() {
  const form = document.getElementById('room-form');
  if (!form || !currentProperty) return;

  const formData = new FormData(form);
  const roomData = {
    property_id: currentProperty.id,
    room_number: formData.get('room_number'),
    price: parseFloat(formData.get('price')) || 0,
    size: parseFloat(formData.get('size')) || null,
    capacity: parseInt(formData.get('capacity')) || 1,
    status: formData.get('status') || 'available',
    description: formData.get('description') || '',
  };

  // Add tenant data if status is occupied
  if (roomData.status === 'occupied') {
    roomData.tenant_name = formData.get('tenant_name') || '';
    roomData.tenant_contact = formData.get('tenant_contact') || '';
    roomData.lease_start = formData.get('lease_start') || null;
    roomData.lease_end = formData.get('lease_end') || null;
  }

  // Validation
  if (!roomData.room_number || !roomData.price) {
    showToast('Room number and price are required', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = currentRoom
      ? `${CONFIG.API_BASE_URL}/api/landlord/rooms.php?id=${currentRoom.id}`
      : `${CONFIG.API_BASE_URL}/api/landlord/rooms.php`;

    const method = currentRoom ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: JSON.stringify(roomData),
    });

    if (!response.ok) {
      throw new Error(`Failed to save room: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      showToast(currentRoom ? 'Room updated successfully' : 'Room added successfully', 'success');
      closeModal(document.getElementById('room-modal'));
      await loadRooms(currentProperty.id);
    } else {
      throw new Error(result.message || 'Failed to save room');
    }
  } catch (error) {
    console.error('Error saving room:', error);
    showToast('Failed to save room. Please try again.', 'error');
  }
}

function confirmDeleteRoom(room) {
  const modal = document.getElementById('delete-room-modal');
  const roomNameEl = document.getElementById('delete-room-name');

  if (!modal || !roomNameEl) return;

  currentRoom = room;
  roomNameEl.textContent = `Room ${room.room_number}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function deleteRoom() {
  if (!currentRoom) return;

  try {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/rooms.php?id=${currentRoom.id}`,
      {
        method: 'DELETE',
        headers,
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete room: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      showToast(`Room ${currentRoom.room_number} deleted successfully`, 'success');
      closeModal(document.getElementById('delete-room-modal'));
      await loadRooms(currentProperty.id);
    } else {
      throw new Error(result.message || 'Failed to delete room');
    }
  } catch (error) {
    console.error('Error deleting room:', error);
    showToast('Failed to delete room. Please try again.', 'error');
  }
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  filterAndSortRooms(query);
}

function handleFilter() {
  filterAndSortRooms();
}

function handleSort() {
  filterAndSortRooms();
}

function filterAndSortRooms(searchQuery = '') {
  const searchInput = document.getElementById('search-rooms');
  const filterStatus = document.getElementById('filter-status');
  const sortRooms = document.getElementById('sort-rooms');

  if (!searchInput || !filterStatus || !sortRooms) return;

  const query = searchQuery || searchInput.value.toLowerCase().trim();
  const statusFilter = filterStatus.value;
  const sortOption = sortRooms.value;

  const filtered = roomsData.filter(room => {
    const matchesSearch =
      !query ||
      (room.room_number || '').toLowerCase().includes(query) ||
      (room.tenant_name || '').toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort rooms
  filtered.sort((a, b) => {
    switch (sortOption) {
      case 'room-number':
        return (a.room_number || '').localeCompare(b.room_number || '');
      case 'price-high':
        return (b.price || 0) - (a.price || 0);
      case 'price-low':
        return (a.price || 0) - (b.price || 0);
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      default:
        return 0;
    }
  });

  renderRooms(filtered);
}

function hideLoadingState() {
  const loadingState = document.getElementById('rooms-loading-state');
  if (loadingState) {
    loadingState.style.display = 'none';
  }
}

function showEmptyState() {
  const emptyState = document.getElementById('rooms-empty-state');
  const grid = document.getElementById('rooms-grid');

  if (emptyState) {
    emptyState.style.display = 'flex';
  }
  if (grid) {
    grid.style.display = 'none';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/listings/room-edit')) {
    initRoomEdit();
  }
});
