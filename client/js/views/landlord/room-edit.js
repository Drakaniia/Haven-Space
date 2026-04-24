/**
 * room-edit.js
 * Manages rooms for a single property.
 * Reads ?propertyId=X from the URL and makes real API calls to:
 *   GET    /api/landlord/rooms?propertyId=X   – load property + rooms
 *   POST   /api/landlord/rooms                – create room
 *   PUT    /api/landlord/rooms?id=Y           – update room
 *   DELETE /api/landlord/rooms?id=Y           – delete room
 */

import CONFIG from '../../config.js';
import { showToast } from '../../shared/toast.js';
import { getIcon } from '../../shared/icons.js';
import { initLandlordPermissions } from '../../shared/permissions.js';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
let propertyId   = null;
let propertyData = null;
let allRooms     = [];
let editingRoomId = null; // null = creating new room

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  propertyId = params.get('propertyId') ? parseInt(params.get('propertyId')) : null;

  if (!propertyId) {
    showToast('No property selected. Redirecting…', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }

  loadPropertyAndRooms();
  bindUI();
  initLandlordPermissions();
});

/* ------------------------------------------------------------------ */
/* API helpers                                                         */
/* ------------------------------------------------------------------ */
function authHeaders() {
  const token = localStorage.getItem('token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: authHeaders(),
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

/* ------------------------------------------------------------------ */
/* Load data                                                           */
/* ------------------------------------------------------------------ */
async function loadPropertyAndRooms() {
  showLoading(true);

  try {
    const result = await apiFetch(
      `${CONFIG.API_BASE_URL}/api/landlord/rooms?propertyId=${propertyId}`
    );

    propertyData = result.data.property;
    allRooms     = result.data.rooms || [];

    renderPropertyInfo(propertyData);
    renderRooms(allRooms);
  } catch (err) {
    console.error('Failed to load rooms:', err);
    showToast(`Failed to load rooms: ${err.message}`, 'error');
    showEmptyState(true);
  } finally {
    showLoading(false);
  }
}

/* ------------------------------------------------------------------ */
/* Render – property info banner                                       */
/* ------------------------------------------------------------------ */
function renderPropertyInfo(prop) {
  if (!prop) return;

  setText('page-title',       `Manage Rooms – ${prop.name}`);
  setText('page-description', `Add, edit, and manage rooms for ${prop.name}.`);
  setText('property-name',    prop.name);
  setText('property-type',    prop.status ?? '—');

  const total    = prop.total_rooms    ?? 0;
  const occupied = prop.occupied_rooms ?? 0;
  const rate     = total > 0 ? Math.round((occupied / total) * 100) : 0;

  setText('property-total-rooms',    total);
  setText('property-occupied-rooms', occupied);
  setText('property-occupancy-rate', `${rate}%`);

  // location / type come from the full property fetch if available
  setText('property-location', prop.address ?? '—');
}

/* ------------------------------------------------------------------ */
/* Render – rooms grid                                                 */
/* ------------------------------------------------------------------ */
function renderRooms(rooms) {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;

  grid.innerHTML = '';

  if (!rooms.length) {
    showEmptyState(true);
    return;
  }

  showEmptyState(false);
  rooms.forEach(room => grid.appendChild(buildRoomCard(room)));
}

function buildRoomCard(room) {
  const card = document.createElement('div');
  card.className = 'room-card';
  card.dataset.roomId = room.id;

  const statusClass = {
    available:   'available',
    occupied:    'occupied',
    maintenance: 'maintenance',
  }[room.status] ?? 'available';

  const statusLabel = {
    available:   'Available',
    occupied:    'Occupied',
    maintenance: 'Maintenance',
  }[room.status] ?? room.status;

  const tenantHtml = room.tenant
    ? `<div class="tenant-info">
         <p class="tenant-name">${escHtml(room.tenant.name)}</p>
         ${room.tenant.phone ? `<p class="tenant-contact">${escHtml(room.tenant.phone)}</p>` : ''}
       </div>`
    : '';

  card.innerHTML = `
    <div class="room-card-image">
      <span class="room-status ${statusClass}">${statusLabel}</span>
    </div>
    <div class="room-card-body">
      <div class="room-card-header">
        <h3 class="room-number">Room ${escHtml(room.room_number)}</h3>
        <span class="room-price">₱${Number(room.price).toLocaleString()}/mo</span>
      </div>
      <div class="room-details">
        <div class="room-detail">
          ${getIcon('userGroup', { width: 16, height: 16, strokeWidth: '2' })}
          Capacity: ${room.capacity}
        </div>
        ${room.size ? `<div class="room-detail">
          ${getIcon('home', { width: 16, height: 16, strokeWidth: '2' })}
          ${room.size} sqm
        </div>` : ''}
      </div>
      ${tenantHtml}
      ${room.description ? `<p style="font-size:0.8rem;color:var(--text-gray);margin-top:0.5rem;">${escHtml(room.description)}</p>` : ''}
      <div class="room-actions">
        <button type="button" data-action="edit"   data-id="${room.id}">
          ${getIcon('edit',  { width: 16, height: 16, strokeWidth: '2' })} Edit
        </button>
        <button type="button" data-action="delete" data-id="${room.id}" class="btn-danger">
          ${getIcon('trash', { width: 16, height: 16, strokeWidth: '2' })} Delete
        </button>
      </div>
    </div>
  `;

  card.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      if (btn.dataset.action === 'edit')   openEditModal(id);
      if (btn.dataset.action === 'delete') openDeleteModal(id);
    });
  });

  return card;
}

/* ------------------------------------------------------------------ */
/* Modal – add / edit room                                             */
/* ------------------------------------------------------------------ */
function openAddModal() {
  editingRoomId = null;
  setText('modal-title', 'Add New Room');
  document.getElementById('room-form').reset();
  hideTenantSection();
  openModal('room-modal');
}

function openEditModal(roomId) {
  const room = allRooms.find(r => r.id === roomId);
  if (!room) return;

  editingRoomId = roomId;
  setText('modal-title', `Edit Room ${room.room_number}`);

  setVal('room-number',      room.room_number);
  setVal('room-price',       room.price);
  setVal('room-size',        room.size ?? '');
  setVal('room-capacity',    room.capacity);
  setVal('room-status',      room.status);
  setVal('room-description', room.description ?? '');

  if (room.tenant) {
    showTenantSection();
    setVal('tenant-name',    room.tenant.name    ?? '');
    setVal('tenant-contact', room.tenant.phone   ?? '');
    setVal('lease-start',    room.tenant.lease_start ?? '');
    setVal('lease-end',      room.tenant.lease_end   ?? '');
  } else {
    hideTenantSection();
  }

  openModal('room-modal');
}

async function saveRoom() {
  const saveBtn = document.getElementById('modal-save');
  const form    = document.getElementById('room-form');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const payload = {
    property_id:  propertyId,
    room_number:  getVal('room-number'),
    price:        parseFloat(getVal('room-price')),
    size:         getVal('room-size')     ? parseFloat(getVal('room-size'))     : null,
    capacity:     getVal('room-capacity') ? parseInt(getVal('room-capacity'))   : 1,
    status:       getVal('room-status'),
    description:  getVal('room-description'),
  };

  saveBtn.disabled    = true;
  saveBtn.textContent = editingRoomId ? 'Saving…' : 'Creating…';

  try {
    let result;
    if (editingRoomId) {
      result = await apiFetch(
        `${CONFIG.API_BASE_URL}/api/landlord/rooms?id=${editingRoomId}`,
        { method: 'PUT', body: JSON.stringify({ ...payload, id: editingRoomId }) }
      );
      // Replace in local array
      const idx = allRooms.findIndex(r => r.id === editingRoomId);
      if (idx !== -1) allRooms[idx] = result.data;
      showToast('Room updated successfully', 'success');
    } else {
      result = await apiFetch(
        `${CONFIG.API_BASE_URL}/api/landlord/rooms`,
        { method: 'POST', body: JSON.stringify(payload) }
      );
      allRooms.push(result.data);
      showToast('Room created successfully', 'success');
    }

    closeModal('room-modal');
    applyFilters();
    refreshPropertyCounts();
  } catch (err) {
    console.error('Save room error:', err);
    showToast(`Failed to save room: ${err.message}`, 'error');
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Save Room';
  }
}

/* ------------------------------------------------------------------ */
/* Modal – delete confirmation                                         */
/* ------------------------------------------------------------------ */
let pendingDeleteId = null;

function openDeleteModal(roomId) {
  const room = allRooms.find(r => r.id === roomId);
  if (!room) return;

  pendingDeleteId = roomId;
  setText('delete-room-name', `Room ${room.room_number}`);
  openModal('delete-room-modal');
}

async function confirmDelete() {
  if (!pendingDeleteId) return;

  const confirmBtn = document.getElementById('delete-confirm');
  confirmBtn.disabled    = true;
  confirmBtn.textContent = 'Deleting…';

  try {
    await apiFetch(
      `${CONFIG.API_BASE_URL}/api/landlord/rooms?id=${pendingDeleteId}`,
      { method: 'DELETE' }
    );

    allRooms = allRooms.filter(r => r.id !== pendingDeleteId);
    showToast('Room deleted successfully', 'success');
    closeModal('delete-room-modal');
    applyFilters();
    refreshPropertyCounts();
  } catch (err) {
    console.error('Delete room error:', err);
    showToast(`Failed to delete room: ${err.message}`, 'error');
  } finally {
    confirmBtn.disabled    = false;
    confirmBtn.textContent = 'Delete Room';
    pendingDeleteId = null;
  }
}

/* ------------------------------------------------------------------ */
/* Search / filter / sort                                              */
/* ------------------------------------------------------------------ */
function applyFilters() {
  const query  = (document.getElementById('search-rooms')?.value  ?? '').toLowerCase().trim();
  const status = document.getElementById('filter-status')?.value  ?? 'all';
  const sort   = document.getElementById('sort-rooms')?.value     ?? 'room-number';

  let filtered = allRooms.filter(room => {
    const matchSearch = !query
      || room.room_number.toLowerCase().includes(query)
      || (room.tenant?.name ?? '').toLowerCase().includes(query);
    const matchStatus = status === 'all' || room.status === status;
    return matchSearch && matchStatus;
  });

  filtered.sort((a, b) => {
    switch (sort) {
      case 'price-high':   return b.price - a.price;
      case 'price-low':    return a.price - b.price;
      case 'status':       return a.status.localeCompare(b.status);
      default:             return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
    }
  });

  renderRooms(filtered);
}

/* ------------------------------------------------------------------ */
/* Bind all UI events                                                  */
/* ------------------------------------------------------------------ */
function bindUI() {
  // Add room buttons
  ['add-room-btn', 'floating-add-room', 'empty-state-add-room'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', openAddModal);
  });

  // Save room
  document.getElementById('modal-save')?.addEventListener('click', saveRoom);

  // Delete confirm
  document.getElementById('delete-confirm')?.addEventListener('click', confirmDelete);

  // Close modals
  document.getElementById('modal-close')?.addEventListener('click',        () => closeModal('room-modal'));
  document.getElementById('modal-cancel')?.addEventListener('click',       () => closeModal('room-modal'));
  document.getElementById('delete-modal-close')?.addEventListener('click', () => closeModal('delete-room-modal'));
  document.getElementById('delete-cancel')?.addEventListener('click',      () => closeModal('delete-room-modal'));

  // Close on overlay click
  ['room-modal', 'delete-room-modal'].forEach(id => {
    document.getElementById(id)?.querySelector('.modal-overlay')
      ?.addEventListener('click', () => closeModal(id));
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal('room-modal');
      closeModal('delete-room-modal');
    }
  });

  // Show/hide tenant section when status changes
  document.getElementById('room-status')?.addEventListener('change', e => {
    e.target.value === 'occupied' ? showTenantSection() : hideTenantSection();
  });

  // Search / filter / sort
  document.getElementById('search-rooms')?.addEventListener('input',  applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
  document.getElementById('sort-rooms')?.addEventListener('change',    applyFilters);
}

/* ------------------------------------------------------------------ */
/* UI helpers                                                          */
/* ------------------------------------------------------------------ */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function showLoading(show) {
  const el = document.getElementById('rooms-loading-state');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showEmptyState(show) {
  const el = document.getElementById('rooms-empty-state');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showTenantSection() {
  const el = document.getElementById('tenant-section');
  if (el) el.style.display = 'block';
}

function hideTenantSection() {
  const el = document.getElementById('tenant-section');
  if (el) el.style.display = 'none';
}

function refreshPropertyCounts() {
  const total    = allRooms.length;
  const occupied = allRooms.filter(r => r.status === 'occupied').length;
  const rate     = total > 0 ? Math.round((occupied / total) * 100) : 0;

  setText('property-total-rooms',    total);
  setText('property-occupied-rooms', occupied);
  setText('property-occupancy-rate', `${rate}%`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function getVal(id) {
  return document.getElementById(id)?.value ?? '';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
