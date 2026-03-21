/**
 * Admin Dashboard View Controller
 * Handles admin-specific functionality
 */

import { state, fetchWithAuth, formatDate } from '../shared/state.js';

export function initAdminView() {
  console.log('Admin view initialized');
  
  // Check admin authentication
  checkAdminAuth();
  
  // Initialize admin dashboard features
  setupDashboard();
  setupUserManagement();
  setupPropertyManagement();
  setupAnalytics();
}

function checkAdminAuth() {
  if (!state.isAuthenticated) {
    console.log('User not authenticated');
    return;
  }
  
  // Check if user has admin role
  const user = state.getUser();
  if (user && user.role !== 'admin') {
    console.warn('User does not have admin privileges');
    // Redirect to appropriate dashboard
  }
}

function setupDashboard() {
  loadDashboardStats();
}

async function loadDashboardStats() {
  try {
    const stats = await fetchWithAuth('/admin/stats');
    renderStats(stats);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function renderStats(stats) {
  const containers = {
    totalUsers: document.querySelector('#total-users'),
    totalProperties: document.querySelector('#total-properties'),
    activeBookings: document.querySelector('#active-bookings'),
    revenue: document.querySelector('#revenue'),
  };
  
  if (containers.totalUsers) containers.totalUsers.textContent = stats.totalUsers || 0;
  if (containers.totalProperties) containers.totalProperties.textContent = stats.totalProperties || 0;
  if (containers.activeBookings) containers.activeBookings.textContent = stats.activeBookings || 0;
  if (containers.revenue) containers.revenue.textContent = `$${stats.revenue || 0}`;
}

function setupUserManagement() {
  const userTabs = document.querySelectorAll('.user-tab');
  userTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      userTabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      loadUsers(e.target.dataset.type);
    });
  });
  
  loadUsers('all');
}

async function loadUsers(type = 'all') {
  try {
    const users = await fetchWithAuth(`/admin/users?type=${type}`);
    renderUsers(users);
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

function renderUsers(users) {
  const container = document.querySelector('#users-table tbody');
  if (!container) return;
  
  container.innerHTML = users.map(user => `
    <tr data-id="${user.id}">
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td><span class="role ${user.role}">${user.role}</span></td>
      <td><span class="status ${user.status}">${user.status}</span></td>
      <td>
        <button class="edit-btn" data-id="${user.id}">Edit</button>
        <button class="delete-btn" data-id="${user.id}">Delete</button>
      </td>
    </tr>
  `).join('');
  
  // Attach event listeners
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', handleEditUser);
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteUser);
  });
}

function handleEditUser(event) {
  const userId = event.currentTarget.dataset.id;
  console.log('Edit user:', userId);
  // Open edit user modal
}

function handleDeleteUser(event) {
  const userId = event.currentTarget.dataset.id;
  if (confirm('Are you sure you want to delete this user?')) {
    deleteUser(userId);
  }
}

async function deleteUser(userId) {
  try {
    await fetchWithAuth(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
    loadUsers();
  } catch (error) {
    console.error('Failed to delete user:', error);
  }
}

function setupPropertyManagement() {
  loadPropertiesForApproval();
}

async function loadPropertiesForApproval() {
  try {
    const properties = await fetchWithAuth('/admin/properties/pending');
    renderPropertiesForApproval(properties);
  } catch (error) {
    console.error('Failed to load properties:', error);
  }
}

function renderPropertiesForApproval(properties) {
  const container = document.querySelector('#pending-properties');
  if (!container) return;
  
  container.innerHTML = properties.map(property => `
    <div class="property-review-card" data-id="${property.id}">
      <h4>${property.name}</h4>
      <p>${property.landlordName}</p>
      <p>Submitted: ${formatDate(property.submittedDate)}</p>
      <div class="actions">
        <button class="approve-btn" data-id="${property.id}">Approve</button>
        <button class="reject-btn" data-id="${property.id}">Reject</button>
      </div>
    </div>
  `).join('');
  
  // Attach event listeners
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handlePropertyAction(e.target.dataset.id, 'approve'));
  });
  
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => handlePropertyAction(e.target.dataset.id, 'reject'));
  });
}

async function handlePropertyAction(propertyId, action) {
  try {
    await fetchWithAuth(`/admin/properties/${propertyId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: action }),
    });
    loadPropertiesForApproval();
  } catch (error) {
    console.error('Failed to update property:', error);
  }
}

function setupAnalytics() {
  loadAnalytics();
}

async function loadAnalytics() {
  try {
    const analytics = await fetchWithAuth('/admin/analytics');
    renderAnalytics(analytics);
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

function renderAnalytics(analytics) {
  // Render charts or analytics data
  console.log('Analytics:', analytics);
}
