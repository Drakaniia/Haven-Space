import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';

let currentProperty = null;
let currentBoarder = null;
let boardersData = [];
let propertyData = null;

export function initLandlordBoarders() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  if (!propertyId) {
    window.location.href = '../listings/index.html';
    return;
  }

  loadPropertyData(propertyId);
  loadBoarders(propertyId);
  setupEventListeners();
}

async function fetchPropertyFromApi(propertyId) {
  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/properties.php?id=${propertyId}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.data && result.data.property) {
      return result.data.property;
    }

    // API may return a properties array when queried by id
    if (result.data && result.data.properties && result.data.properties.length > 0) {
      return result.data.properties[0];
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch property:', error);
    return null;
  }
}

async function fetchBoardersFromApi(propertyId) {
  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/boarders.php?propertyId=${propertyId}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.data && result.data.boarders) {
      return result.data.boarders;
    }

    return [];
  } catch (error) {
    console.error('Failed to fetch boarders:', error);
    return [];
  }
}

function loadPropertyData(propertyId) {
  fetchPropertyFromApi(propertyId).then(property => {
    if (!property) {
      window.location.href = '../listings/index.html';
      return;
    }

    propertyData = property;
    currentProperty = property;

    document.getElementById('property-name').textContent = property.name || 'Unnamed Property';
    document.getElementById('property-location').textContent =
      property.location || property.address || '';

    const totalRooms = property.total_rooms || property.rooms || 0;
    const occupiedRooms = property.occupied_rooms || property.occupied || 0;
    const availableRooms = totalRooms - occupiedRooms;
    const monthlyRevenue = property.monthly_revenue || property.monthlyRevenue || 0;

    document.getElementById('stat-total-rooms').textContent = totalRooms;
    document.getElementById('stat-occupied').textContent = occupiedRooms;
    document.getElementById('stat-available').textContent = availableRooms;
    document.getElementById('stat-revenue').textContent = `₱${monthlyRevenue.toLocaleString()}`;

    populateRoomFilter(totalRooms);
    populateRoomSelect(totalRooms);
  });
}

function loadBoarders(propertyId) {
  const grid = document.getElementById('boarders-grid');
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

  fetchBoardersFromApi(propertyId).then(boarders => {
    boardersData = boarders;

    if (loadingState) {
      loadingState.style.display = 'none';
    }

    if (boardersData.length === 0) {
      if (emptyState) {
        emptyState.style.display = 'flex';
      }
    } else {
      grid.style.display = 'grid';
      renderBoarders(boardersData);
    }
  });
}

function populateRoomFilter(totalRooms) {
  const roomSelect = document.getElementById('filter-room');
  if (!roomSelect) {
    return;
  }

  roomSelect.innerHTML = '<option value="all">All Rooms</option>';

  for (let i = 1; i <= totalRooms; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Room ${i}`;
    roomSelect.appendChild(option);
  }
}

function populateRoomSelect(totalRooms) {
  const roomSelect = document.getElementById('boarder-room');
  if (!roomSelect) {
    return;
  }

  roomSelect.innerHTML = '<option value="">Select a room</option>';

  for (let i = 1; i <= totalRooms; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Room ${i}`;
    roomSelect.appendChild(option);
  }
}

function renderBoarders(boarders) {
  const grid = document.getElementById('boarders-grid');
  if (!grid) {
    return;
  }

  grid.innerHTML = '';

  boarders.forEach(boarder => {
    const card = createBoarderCard(boarder);
    grid.appendChild(card);
  });
}

function createBoarderCard(boarder) {
  const card = document.createElement('div');
  card.className = 'boarder-card';
  card.dataset.boarderId = boarder.id;

  const initials = getInitials(boarder.first_name, boarder.last_name);
  const statusLabel =
    boarder.status === 'active' ? 'Active' : boarder.status === 'pending' ? 'Pending' : 'Inactive';

  card.innerHTML = `
    <div class="boarder-card-header">
      <div class="boarder-avatar">${initials}</div>
      <div class="boarder-info">
        <h3 class="boarder-name">${boarder.first_name} ${boarder.last_name}</h3>
        <p class="boarder-email">${boarder.email || 'No email'}</p>
      </div>
      <span class="boarder-status status-${boarder.status}">${statusLabel}</span>
    </div>
    <div class="boarder-card-body">
      <div class="boarder-info-row">
        <span class="boarder-info-label">Room</span>
        <span class="boarder-info-value">Room ${boarder.room_id || '--'}</span>
      </div>
      <div class="boarder-info-row">
        <span class="boarder-info-label">Rent</span>
        <span class="boarder-info-value">₱${(boarder.rent || 0).toLocaleString()}/mo</span>
      </div>
      <div class="boarder-info-row">
        <span class="boarder-info-label">Move-in</span>
        <span class="boarder-info-value">${formatDate(boarder.move_in_date)}</span>
      </div>
      <div class="boarder-info-row">
        <span class="boarder-info-label">Payment</span>
        <span class="boarder-info-value" style="color: ${getPaymentStatusColor(
          boarder.payment_status
        )}">${capitalizeFirst(boarder.payment_status || 'N/A')}</span>
      </div>
    </div>
    <div class="boarder-card-actions">
      <button type="button" data-action="view" data-id="${boarder.id}">
        ${getIcon('eye')}
        View
      </button>
      <button type="button" data-action="edit" data-id="${boarder.id}">
        ${getIcon('edit')}
        Edit
      </button>
      <button type="button" class="btn-remove" data-action="remove" data-id="${boarder.id}">
        ${getIcon('trash')}
        Remove
      </button>
    </div>
  `;

  card.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = parseInt(btn.dataset.id);
      handleBoarderAction(action, id);
    });
  });

  return card;
}

function handleBoarderAction(action, id) {
  const boarder = boardersData.find(b => b.id === id);
  if (!boarder) {
    return;
  }

  currentBoarder = boarder;

  switch (action) {
    case 'view':
      openBoarderDetailModal(boarder);
      break;
    case 'edit':
      editBoarder(boarder);
      break;
    case 'remove':
      confirmRemoveBoarder(boarder);
      break;
  }
}

function openBoarderDetailModal(boarder) {
  const modal = document.getElementById('boarder-detail-modal');
  if (!modal) {
    return;
  }

  const initials = getInitials(boarder.first_name, boarder.last_name);

  document.getElementById('detail-initials').textContent = initials;
  document.getElementById('detail-name').textContent = `${boarder.first_name} ${boarder.last_name}`;
  document.getElementById('detail-email').textContent = boarder.email || 'No email';
  document.getElementById('detail-email-full').textContent = boarder.email || 'No email';
  document.getElementById('detail-phone').textContent = boarder.phone || 'No phone';

  const statusEl = document.getElementById('detail-status');
  statusEl.textContent =
    boarder.status === 'active' ? 'Active' : boarder.status === 'pending' ? 'Pending' : 'Inactive';
  statusEl.className = `status-badge status-${boarder.status}`;

  document.getElementById('detail-room').textContent = `Room ${boarder.room_id || '--'}`;
  document.getElementById('detail-move-in').textContent = formatDate(boarder.move_in_date);
  document.getElementById('detail-duration').textContent = calculateDuration(boarder.move_in_date);
  document.getElementById('detail-rent').textContent = `₱${(boarder.rent || 0).toLocaleString()}`;
  document.getElementById('detail-deposit').textContent = `₱${(
    boarder.deposit || 0
  ).toLocaleString()}`;
  document.getElementById('detail-payment-due').textContent = `${
    boarder.payment_due_day || 15
  }th of the month`;
  document.getElementById('detail-last-payment').textContent = formatDate(
    boarder.last_payment_date
  );

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function editBoarder(boarder) {
  alert('Edit boarder functionality will be implemented soon.');
}

function confirmRemoveBoarder(boarder) {
  const modal = document.getElementById('remove-boarder-modal');
  if (!modal) {
    return;
  }

  document.getElementById(
    'remove-boarder-name'
  ).textContent = `${boarder.first_name} ${boarder.last_name}`;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function openAddBoarderModal() {
  const modal = document.getElementById('add-boarder-modal');
  if (!modal) {
    return;
  }

  const form = document.getElementById('add-boarder-form');
  form.reset();

  const startDate = document.getElementById('boarder-start-date');
  startDate.value = new Date().toISOString().split('T')[0];

  if (propertyData) {
    const rentInput = document.getElementById('boarder-rent');
    rentInput.value = propertyData.price || 0;

    const depositInput = document.getElementById('boarder-deposit');
    depositInput.value = propertyData.price || 0;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAddBoarderModal() {
  const modal = document.getElementById('add-boarder-modal');
  if (!modal) {
    return;
  }
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function closeBoarderDetailModal() {
  const modal = document.getElementById('boarder-detail-modal');
  if (!modal) {
    return;
  }
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function closeRemoveBoarderModal() {
  const modal = document.getElementById('remove-boarder-modal');
  if (!modal) {
    return;
  }
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

async function addNewBoarder(event) {
  event.preventDefault();

  if (!currentProperty) {
    return;
  }

  const form = event.target;
  const formData = new FormData(form);

  const newBoarderData = {
    property_id: currentProperty.id,
    first_name: formData.get('firstName'),
    last_name: formData.get('lastName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    room_id: parseInt(formData.get('roomId')),
    move_in_date: formData.get('startDate'),
    rent: parseFloat(formData.get('rent')) || 0,
    deposit: parseFloat(formData.get('deposit')) || 0,
    payment_due_day: parseInt(formData.get('paymentDueDay')) || 15,
    status: 'active',
    payment_status: 'paid',
  };

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/boarders.php`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newBoarderData),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    closeAddBoarderModal();
    loadBoarders(currentProperty.id);
    loadPropertyData(currentProperty.id);
    alert(
      `Boarder "${newBoarderData.first_name} ${newBoarderData.last_name}" has been added successfully.`
    );
  } catch (error) {
    console.error('Failed to add boarder:', error);
    alert('Failed to add boarder. Please try again.');
  }
}

async function removeBoarder() {
  if (!currentBoarder) {
    return;
  }

  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/boarders.php?id=${currentBoarder.id}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    closeRemoveBoarderModal();
    loadBoarders(currentProperty.id);
    loadPropertyData(currentProperty.id);
    alert(`Boarder has been removed successfully.`);
  } catch (error) {
    console.error('Failed to remove boarder:', error);
    alert('Failed to remove boarder. Please try again.');
  }
}

function setupEventListeners() {
  const btnFilter = document.getElementById('btn-filter');
  if (btnFilter) {
    btnFilter.addEventListener('click', () => {
      const filterBar = document.getElementById('filter-bar');
      if (filterBar) {
        filterBar.style.display = filterBar.style.display === 'none' ? 'block' : 'none';
      }
    });
  }

  const btnAddBoarder = document.getElementById('btn-add-boarder');
  if (btnAddBoarder) {
    btnAddBoarder.addEventListener('click', openAddBoarderModal);
  }

  const searchInput = document.getElementById('search-boarders');
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  const filterStatus = document.getElementById('filter-status');
  const filterRoom = document.getElementById('filter-room');
  const filterPayment = document.getElementById('filter-payment');

  if (filterStatus) {
    filterStatus.addEventListener('change', handleFilter);
  }
  if (filterRoom) {
    filterRoom.addEventListener('change', handleFilter);
  }
  if (filterPayment) {
    filterPayment.addEventListener('change', handleFilter);
  }

  setupModalHandlers();
}

function setupModalHandlers() {
  const addModal = document.getElementById('add-boarder-modal');
  if (addModal) {
    const closeBtn = document.getElementById('add-modal-close');
    const cancelBtn = document.getElementById('add-cancel');
    const overlay = addModal.querySelector('.modal-overlay');
    const form = document.getElementById('add-boarder-form');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeAddBoarderModal);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeAddBoarderModal);
    }
    if (overlay) {
      overlay.addEventListener('click', closeAddBoarderModal);
    }
    if (form) {
      form.addEventListener('submit', addNewBoarder);
    }
  }

  const detailModal = document.getElementById('boarder-detail-modal');
  if (detailModal) {
    const closeBtn = document.getElementById('detail-modal-close');
    const cancelBtn = document.getElementById('detail-cancel');
    const overlay = detailModal.querySelector('.modal-overlay');

    if (closeBtn) {
      closeBtn.addEventListener('click', closeBoarderDetailModal);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeBoarderDetailModal);
    }
    if (overlay) {
      overlay.addEventListener('click', closeBoarderDetailModal);
    }
  }

  const removeModal = document.getElementById('remove-boarder-modal');
  if (removeModal) {
    const cancelBtn = document.getElementById('remove-cancel');
    const confirmBtn = document.getElementById('remove-confirm');
    const overlay = removeModal.querySelector('.modal-overlay');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeRemoveBoarderModal);
    }
    if (overlay) {
      overlay.addEventListener('click', closeRemoveBoarderModal);
    }
    if (confirmBtn) {
      confirmBtn.addEventListener('click', removeBoarder);
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAddBoarderModal();
      closeBoarderDetailModal();
      closeRemoveBoarderModal();
    }
  });
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  filterAndSortBoarders(query);
}

function handleFilter() {
  filterAndSortBoarders();
}

function filterAndSortBoarders(searchQuery = '') {
  const searchInput = document.getElementById('search-boarders');
  const filterStatus = document.getElementById('filter-status');
  const filterRoom = document.getElementById('filter-room');
  const filterPayment = document.getElementById('filter-payment');

  if (!searchInput || !filterStatus || !filterRoom || !filterPayment) {
    return;
  }

  const query = searchInput || searchInput.value.toLowerCase().trim();
  const statusFilter = filterStatus.value;
  const roomFilter = filterRoom.value;
  const paymentFilter = filterPayment.value;

  const filtered = boardersData.filter(boarder => {
    const fullName = `${boarder.first_name || ''} ${boarder.last_name || ''}`.toLowerCase();
    const matchesSearch =
      !query || fullName.includes(query) || (boarder.email || '').toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'all' || boarder.status === statusFilter;
    const matchesRoom = roomFilter === 'all' || boarder.room_id === parseInt(roomFilter);
    const matchesPayment = paymentFilter === 'all' || boarder.payment_status === paymentFilter;

    return matchesSearch && matchesStatus && matchesRoom && matchesPayment;
  });

  renderBoarders(filtered);
}

function getInitials(firstName, lastName) {
  const first = (firstName || '').charAt(0).toUpperCase();
  const last = (lastName || '').charAt(0).toUpperCase();
  return `${first}${last}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return 'N/A';
  }

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function calculateDuration(startDate) {
  if (!startDate) {
    return 'N/A';
  }

  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMonths === 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffMonths === 1) {
    return '1 month';
  } else {
    return `${diffMonths} months`;
  }
}

function getPaymentStatusColor(status) {
  switch (status) {
    case 'paid':
      return '#22c55e';
    case 'pending':
      return '#f59e0b';
    case 'overdue':
      return '#ef4444';
    default:
      return '#555555';
  }
}

function capitalizeFirst(str) {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

document.addEventListener('DOMContentLoaded', initLandlordBoarders);
