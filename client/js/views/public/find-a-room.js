/**
 * Find a Room Page - Enhanced Features
 * Handles floating smart header, status dropdown, map view, and modals
 */

import { getIcon } from '../../shared/icons.js';

// State management for enhanced features
const enhancedState = {
  headerVisible: true,
  headerHideTimer: null,
  lastMouseMove: Date.now(),
  applications: [],
  selectedApplication: null,
  rejectedProperties: new Set(),
  selectedProperty: null,
  mapViewActive: false,
  currentStatusFilter: 'all',
};

// Sample applications data (replace with API calls in production)
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
  // Load applications
  enhancedState.applications = sampleApplications;

  // Initialize floating header
  initFloatingHeader();

  // Initialize status dropdown
  initStatusDropdown();

  // Initialize profile dropdown
  initProfileDropdown();

  // Initialize map view
  initMapView();

  // Initialize modals
  initModals();

  // Update status badge
  updateStatusBadge();

  // Render applications
  renderApplications();
}

/* ==========================================================================
   Floating Header
   ========================================================================== */

function initFloatingHeader() {
  const header = document.getElementById('find-room-floating-header');
  if (!header) return;

  // Track mouse position for header visibility
  document.addEventListener('mousemove', handleMouseMoveForHeader);
}

function handleMouseMoveForHeader(event) {
  const header = document.getElementById('find-room-floating-header');
  if (!header) return;

  const threshold = 80; // pixels from top to show header

  // Check if any dropdown/menu is currently open
  const statusMenu = document.getElementById('status-dropdown-menu');
  const profileMenu = document.getElementById('profile-dropdown-menu');

  const isMenuOpen =
    statusMenu?.classList.contains('show') || profileMenu?.classList.contains('show');

  // Keep header visible if cursor is near top OR if any menu is open
  if (event.clientY <= threshold || isMenuOpen) {
    // Cursor near top or menu is open - show header
    showHeader();
  } else {
    // Cursor below threshold and no menus open - hide header
    hideHeader();
  }
}

function showHeader() {
  const header = document.getElementById('find-room-floating-header');
  if (!header || header.classList.contains('show')) return;

  header.classList.remove('hidden');
  header.classList.add('show');
}

function hideHeader() {
  const header = document.getElementById('find-room-floating-header');
  if (!header || header.classList.contains('hidden')) return;

  header.classList.add('hidden');
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
      if (application) {
        // Navigate to property details or show more info
        console.log('Application clicked:', application);
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
      console.log('Settings clicked');
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
   Map View
   ========================================================================== */

function initMapView() {
  const mapBtn = document.getElementById('map-view-btn');
  const mapContainer = document.getElementById('find-room-map-container');
  const closeMapBtn = document.getElementById('find-room-map-close-btn');

  if (!mapBtn || !mapContainer) return;

  // Toggle map view
  mapBtn.addEventListener('click', () => {
    enhancedState.mapViewActive = !enhancedState.mapViewActive;

    if (enhancedState.mapViewActive) {
      mapContainer.style.display = 'block';
      mapBtn.classList.add('active');
      initializeMap();
    } else {
      mapContainer.style.display = 'none';
      mapBtn.classList.remove('active');
    }
  });

  // Close map button
  if (closeMapBtn) {
    closeMapBtn.addEventListener('click', () => {
      enhancedState.mapViewActive = false;
      mapContainer.style.display = 'none';
      mapBtn.classList.remove('active');
    });
  }
}

function initializeMap() {
  const mapElement = document.getElementById('find-room-map');
  if (!mapElement) return;

  // For production, integrate with Leaflet, Google Maps, or Mapbox
  // This is a placeholder implementation
  mapElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #e8f5e9;">
      <div style="text-align: center; padding: 2rem;">
        ${getIcon('map', { width: 80, height: 80, className: 'find-room-map-placeholder-icon' })}
        <h3 style="margin-top: 1rem; color: #1a1a1a;">Map View</h3>
        <p style="color: #555; margin-top: 0.5rem;">
          Map integration coming soon! Integrate with Leaflet, Google Maps, or Mapbox for interactive property locations.
        </p>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Modals
   ========================================================================== */

function initModals() {
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

      console.log('Property rejected:', enhancedState.selectedProperty, 'Reason:', reason);

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

  console.log('Property selected:', selectedApp);

  // Store selection
  enhancedState.selectedProperty = selectedApp;

  // In production, send API call to confirm selection
  alert(
    `You selected: ${selectedApp.title}\n\nIn production, this will confirm your boarding house selection.`
  );

  // Close modal
  const modal = document.getElementById('confirmation-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
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
