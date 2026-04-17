/**
 * Application Submitted Page
 * Shows confirmation after successful application submission
 */

import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';
import { getImageUrl } from '../../shared/image-utils.js';

// State management
const state = {
  applicationData: null,
  propertyData: null,
};

/**
 * Initialize Application Submitted Page
 */
export async function initApplicationSubmitted() {
  // Check if user is authenticated
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || !user.id || user.role !== 'boarder') {
    // Redirect to login if not authenticated as boarder
    window.location.href = '../../public/auth/login.html';
    return;
  }

  // Get application data from URL parameters or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const applicationId = urlParams.get('id');
  const propertyId = urlParams.get('property_id');

  if (applicationId) {
    // Load application data from API
    await loadApplicationData(applicationId);
  } else if (propertyId) {
    // Load property data for recently submitted application
    await loadPropertyData(propertyId);
  } else {
    // Check for temporary application data in localStorage
    const tempAppData = localStorage.getItem('temp_application_data');
    if (tempAppData) {
      try {
        state.applicationData = JSON.parse(tempAppData);
        await loadPropertyData(state.applicationData.property_id);
        // Clear temporary data
        localStorage.removeItem('temp_application_data');
      } catch (error) {
        console.error('Error parsing temporary application data:', error);
        // Redirect to applications page if no valid data
        window.location.href = '../applications/index.html';
        return;
      }
    } else {
      // No application data available, redirect to applications page
      window.location.href = '../applications/index.html';
      return;
    }
  }

  // Inject icons
  injectIcons();

  // Setup event listeners
  setupEventListeners();

  // Populate page with data
  populatePageData();
}

/**
 * Load application data from API
 */
async function loadApplicationData(applicationId) {
  try {
    const userId = getCurrentUserId();
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/boarder/applications/${applicationId}`,
      {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch application data');
    }

    const result = await response.json();
    state.applicationData = result.data;

    // Load associated property data
    if (state.applicationData.property_id) {
      await loadPropertyData(state.applicationData.property_id);
    }
  } catch (error) {
    console.error('Error loading application data:', error);
    // Use fallback data or redirect
    window.location.href = '../applications/index.html';
  }
}

/**
 * Load property data from API
 */
async function loadPropertyData(propertyId) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/detail?id=${propertyId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch property data');
    }

    const result = await response.json();
    state.propertyData = result.data;
  } catch (error) {
    console.error('Error loading property data:', error);
    // Use fallback property data
    state.propertyData = {
      title: 'Property Details Unavailable',
      address: 'Location not available',
      images: [],
    };
  }
}

/**
 * Populate page with application and property data
 */
function populatePageData() {
  // Populate application ID
  const applicationIdEl = document.getElementById('application-id');
  if (applicationIdEl) {
    const appId = state.applicationData?.id || generateTempId();
    applicationIdEl.textContent = `#${appId}`;
  }

  // Populate submission date
  const submissionDateEl = document.getElementById('submission-date');
  if (submissionDateEl) {
    const date = state.applicationData?.created_at
      ? new Date(state.applicationData.created_at)
      : new Date();

    submissionDateEl.textContent = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Populate property data
  if (state.propertyData) {
    // Property image
    const propertyImageEl = document.getElementById('property-image');
    if (propertyImageEl && state.propertyData.images && state.propertyData.images.length > 0) {
      propertyImageEl.src = getImageUrl(state.propertyData.images[0]);
      propertyImageEl.alt = state.propertyData.title;

      // Add error handler for fallback
      propertyImageEl.onerror = function () {
        this.onerror = null;
        this.src = '../../../assets/images/placeholder-property.svg';
      };
    }

    // Property name
    const propertyNameEl = document.getElementById('property-name');
    if (propertyNameEl) {
      propertyNameEl.textContent = state.propertyData.title || 'Property Name Unavailable';
    }

    // Property location
    const propertyLocationEl = document.getElementById('property-location');
    if (propertyLocationEl) {
      const fullAddress = [
        state.propertyData.address,
        state.propertyData.city,
        state.propertyData.province,
      ]
        .filter(Boolean)
        .join(', ');

      propertyLocationEl.textContent = fullAddress || 'Location not available';
    }

    // Room type and rent
    const roomTypeEl = document.getElementById('room-type');
    const monthlyRentEl = document.getElementById('monthly-rent');

    if (state.applicationData && state.propertyData.rooms) {
      // Find the applied room
      const appliedRoom = state.propertyData.rooms.find(
        room => room.id === state.applicationData.room_id
      );

      if (appliedRoom) {
        if (roomTypeEl) {
          roomTypeEl.textContent = appliedRoom.roomType || 'Room Type';
        }
        if (monthlyRentEl) {
          monthlyRentEl.textContent = `₱${formatCurrency(appliedRoom.price)}`;
        }
      }
    } else {
      // Fallback values
      if (roomTypeEl) {
        roomTypeEl.textContent = 'Room Type';
      }
      if (monthlyRentEl) {
        monthlyRentEl.textContent = 'Price not available';
      }
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // View Applications button
  const viewApplicationsBtn = document.getElementById('view-applications-btn');
  if (viewApplicationsBtn) {
    viewApplicationsBtn.addEventListener('click', () => {
      window.location.href = '../applications/index.html';
    });
  }

  // Find More Rooms button
  const findMoreRoomsBtn = document.getElementById('find-more-rooms-btn');
  if (findMoreRoomsBtn) {
    findMoreRoomsBtn.addEventListener('click', () => {
      window.location.href = '../find-a-room/index.html';
    });
  }
}

/**
 * Inject icons from centralized library
 */
function injectIcons() {
  const iconElements = document.querySelectorAll('[data-icon]');

  iconElements.forEach(element => {
    const iconName = element.dataset.icon;
    const options = {
      width: element.dataset.iconWidth || 24,
      height: element.dataset.iconHeight || 24,
      strokeWidth: element.dataset.iconStrokeWidth || '1.5',
      className: element.dataset.iconClass || '',
    };

    element.innerHTML = getIcon(iconName, options);
  });
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return parseInt(user.id || user.user_id || localStorage.getItem('user_id') || '3');
}

/**
 * Format currency
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generate temporary ID for display purposes
 */
function generateTempId() {
  return Math.floor(Math.random() * 10000) + 1000;
}

/**
 * Store temporary application data for the success page
 * This function should be called from the confirm-application page
 */
export function storeTemporaryApplicationData(applicationData) {
  localStorage.setItem(
    'temp_application_data',
    JSON.stringify({
      ...applicationData,
      created_at: new Date().toISOString(),
      id: generateTempId(),
    })
  );
}

// Initialize when module is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApplicationSubmitted);
} else {
  initApplicationSubmitted();
}
