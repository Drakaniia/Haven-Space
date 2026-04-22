import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';
import { getAuthHeaders, getAuthHeadersOnly } from '../../shared/auth-headers.js';
import { requireAuth, isTokenExpired, logout } from '../../shared/auth-check.js';
import {
  initMap,
  setMarker,
  getCurrentLocation,
  searchAddress,
  reverseGeocode,
  debounce,
} from '../../shared/map-utils.js';

// Maximum number of photos allowed
const MAX_PHOTOS = 10;
// Maximum file size in MB
const MAX_FILE_SIZE_MB = 5;

// Store uploaded photos
const uploadedPhotos = [];

// Map state
let mapInstance = null;
let currentMarker = null;
let selectedLat = null;
let selectedLng = null;

/**
 * Inject icons from centralized library into elements with data-icon attributes
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
 * Initialize the create listing form
 */
export function initCreateListing() {
  console.log('Initializing create listing...');

  // Check authentication first
  if (!requireAuth('landlord')) {
    return; // Will redirect to login
  }

  // Check if token is expired
  if (isTokenExpired()) {
    alert('Your session has expired. Please log in again.');
    logout();
    return;
  }

  // Inject icons first
  injectIcons();

  // Initialize photo upload
  initPhotoUpload();

  // Initialize form handlers
  initFormHandlers();

  // Initialize other features
  initPropertyTypeToggle();
  initCapacityToggle();
  initCustomAmenities();
}

/**
 * Initialize photo upload functionality
 */
function initPhotoUpload() {
  console.log('Setting up photo upload...');

  const uploadArea = document.getElementById('photo-upload-area');
  const fileInput = document.getElementById('property-photos');
  const uploadBtn = document.getElementById('upload-photos-btn');

  if (!uploadArea || !fileInput) {
    console.error('Photo upload elements not found');
    return;
  }

  // Function to trigger file selection
  const triggerFileSelection = () => {
    console.log('Triggering file selection...');

    // Create a new file input to ensure it works
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';

    input.addEventListener('change', event => {
      console.log('Files selected:', event.target.files.length);
      if (event.target.files.length > 0) {
        handleFiles(event.target.files);
      }
      // Clean up
      document.body.removeChild(input);
    });

    document.body.appendChild(input);

    // Use setTimeout to ensure the input is properly added to DOM
    setTimeout(() => {
      input.click();
    }, 10);
  };

  // Click to upload on area (but not on button)
  uploadArea.addEventListener('click', e => {
    // Don't trigger if clicking on the button
    if (e.target.id === 'upload-photos-btn' || e.target.closest('#upload-photos-btn')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    console.log('Upload area clicked');
    triggerFileSelection();
  });

  // Button click handler
  if (uploadBtn) {
    uploadBtn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Upload button clicked');
      triggerFileSelection();
    });
  }

  // Original file input (as backup)
  fileInput.addEventListener('change', e => {
    console.log('Files selected via original input:', e.target.files.length);
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input
    e.target.value = '';
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    console.log('Files dropped:', e.dataTransfer.files.length);
    handleFiles(e.dataTransfer.files);
  });
}

/**
 * Handle selected/dropped files
 */
function handleFiles(files) {
  console.log('Processing files:', files.length);

  for (const file of files) {
    // Check if we've reached max photos
    if (uploadedPhotos.length >= MAX_PHOTOS) {
      showError(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please upload image files only (PNG, JPG, JPEG).');
      continue;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      showError(`File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      continue;
    }

    // Add photo to array
    const photoData = {
      file: file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
    };

    uploadedPhotos.push(photoData);
    console.log('Added photo:', photoData.id, 'Total photos:', uploadedPhotos.length);
  }

  renderPhotoGrid();
  hideError();
}

/**
 * Render the photo preview grid
 */
function renderPhotoGrid() {
  const grid = document.getElementById('photo-preview-grid');
  if (!grid) return;

  grid.innerHTML = '';

  uploadedPhotos.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'photo-preview-item';
    item.innerHTML = `
      <img src="${photo.preview}" alt="Property photo ${index + 1}" />
      <div class="photo-overlay">
        ${index === 0 ? '<span class="photo-badge">Cover</span>' : '<span></span>'}
        <button 
          type="button"
          class="photo-remove-btn"
          data-photo-id="${photo.id}"
          title="Remove photo"
        >
          ${getIcon('xMark')}
        </button>
      </div>
      ${index === 0 ? '<div class="cover-indicator">Cover Photo</div>' : ''}
    `;

    // Add remove event listener
    const removeBtn = item.querySelector('.photo-remove-btn');
    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      const photoId = parseFloat(removeBtn.dataset.photoId);
      removePhoto(photoId);
    });

    grid.appendChild(item);
  });
}

/**
 * Remove a photo from the upload queue
 */
function removePhoto(photoId) {
  const photoIndex = uploadedPhotos.findIndex(p => p.id === photoId);
  if (photoIndex === -1) return;

  // Revoke object URL to free memory
  URL.revokeObjectURL(uploadedPhotos[photoIndex].preview);
  uploadedPhotos.splice(photoIndex, 1);
  renderPhotoGrid();
}

/**
 * Show error message
 */
function showError(message) {
  const errorEl = document.getElementById('photo-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
    setTimeout(() => hideError(), 5000);
  }
}

/**
 * Hide error message
 */
function hideError() {
  const errorEl = document.getElementById('photo-error');
  if (errorEl) {
    errorEl.classList.remove('visible');
  }
}

/**
 * Initialize form handlers
 */
function initFormHandlers() {
  const form = document.getElementById('create-listing-form');
  const cancelBtn = document.getElementById('cancel-btn');
  const setLocationBtn = document.getElementById('set-location-btn');

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel? Your changes will be lost.')) {
        window.location.href = 'index.html';
      }
    });
  }

  if (setLocationBtn) {
    setLocationBtn.addEventListener('click', openMapModal);
  }

  // Initialize map modal handlers
  initMapModal();
}

/**
 * Initialize property type toggle
 */
function initPropertyTypeToggle() {
  const propertyTypeSelect = document.getElementById('property-type');
  if (propertyTypeSelect) {
    propertyTypeSelect.addEventListener('change', handlePropertyTypeChange);
  }
}

/**
 * Initialize capacity toggle
 */
function initCapacityToggle() {
  const propertyCapacitySelect = document.getElementById('property-capacity');
  if (propertyCapacitySelect) {
    propertyCapacitySelect.addEventListener('change', handleCapacityChange);
  }
}

/**
 * Initialize custom amenities
 */
function initCustomAmenities() {
  const addCustomAmenityBtn = document.getElementById('add-custom-amenity-btn');
  const customAmenityInput = document.getElementById('custom-amenity-input');

  if (addCustomAmenityBtn) {
    addCustomAmenityBtn.addEventListener('click', handleAddCustomAmenity);
  }

  if (customAmenityInput) {
    customAmenityInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustomAmenity();
      }
    });
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Validate photos
  if (uploadedPhotos.length === 0) {
    showError('Please upload at least one photo of your property.');
    return;
  }

  // Gather form data
  const formData = new FormData(e.target);

  // Get property type (handle "others" case)
  let propertyType = formData.get('propertyType');
  if (propertyType === 'others') {
    propertyType = formData.get('propertyTypeOther') || 'Others';
  }

  // Get capacity (handle "custom" case)
  let propertyCapacity = formData.get('propertyCapacity');
  if (propertyCapacity === 'custom') {
    propertyCapacity = formData.get('propertyCapacityCustom') || 'Custom';
  }

  // Get custom amenities
  const customAmenities = getCustomAmenities();

  const data = {
    propertyName: formData.get('propertyName'),
    propertyType: propertyType,
    propertyDescription: formData.get('propertyDescription'),
    propertyPrice: parseFloat(formData.get('propertyPrice')),
    propertyDeposit: parseFloat(formData.get('propertyDeposit')),
    propertyRooms: parseInt(formData.get('propertyRooms')),
    propertyCapacity: propertyCapacity,
    propertyAddress: formData.get('propertyAddress'),
    propertyCity: formData.get('propertyCity'),
    propertyProvince: formData.get('propertyProvince'),
    propertyLatitude: formData.get('propertyLatitude') || '14.5995',
    propertyLongitude: formData.get('propertyLongitude') || '120.9842',
    amenities: [...formData.getAll('amenities'), ...customAmenities],
  };

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Creating...';
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/listings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle authentication errors specifically
      if (response.status === 401) {
        alert('Your session has expired. Please log in again.');
        logout();
        return;
      }
      
      if (response.status === 403) {
        const errorCode = result.code;
        if (errorCode === 'EMAIL_NOT_VERIFIED') {
          alert('Please verify your email address before creating listings.');
        } else if (errorCode === 'VERIFICATION_PENDING') {
          alert('Your landlord account is under review. You have read-only access until verification is complete.');
        } else if (errorCode === 'VERIFICATION_REJECTED') {
          alert('Your account verification was rejected. Please review the feedback and resubmit required documents.');
        } else {
          alert(result.message || 'You do not have permission to create listings.');
        }
        window.location.href = '../index.html';
        return;
      }
      
      throw new Error(result.error || result.message || 'Failed to create listing');
    }

    const propertyId = result.data?.id;

    if (uploadedPhotos.length > 0 && propertyId) {
      try {
        await uploadPhotos(propertyId);
      } catch (photoError) {
        console.error('Photo upload failed:', photoError);
        showError(`Property created successfully, but photo upload failed: ${photoError.message}`);
        setTimeout(() => hideError(), 8000);
      }
    }

    showSuccessModal(propertyId, data.propertyName, data.propertyPrice);
  } catch (error) {
    showError(error.message || 'Failed to create listing. Please try again.');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}

/**
 * Upload photos to the server
 */
async function uploadPhotos(propertyId) {
  console.log('Starting photo upload for property:', propertyId);

  const photoFormData = new FormData();
  uploadedPhotos.forEach((photo, index) => {
    console.log(`Adding photo ${index + 1}:`, photo.file.name);
    photoFormData.append('propertyPhotos[]', photo.file);
  });

  const response = await fetch(
    `${CONFIG.API_BASE_URL}/api/landlord/listings/${propertyId}/photos`,
    {
      method: 'POST',
      headers: getAuthHeadersOnly(),
      body: photoFormData,
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload photos');
  }

  const result = await response.json();
  console.log('Photos uploaded successfully:', result);
}

/**
 * Show success modal
 */
function showSuccessModal(propertyId, propertyName, propertyPrice) {
  const modal = document.getElementById('listing-success-modal');
  const detailsContainer = document.getElementById('listing-success-details');
  const viewBtn = document.getElementById('listing-view-btn');
  const dashboardBtn = document.getElementById('listing-dashboard-btn');

  if (!modal) return;

  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div class="listing-success-row">
        <span class="listing-success-label">Property Name:</span>
        <span class="listing-success-value">${escapeHtml(propertyName)}</span>
      </div>
      <div class="listing-success-row">
        <span class="listing-success-label">Monthly Rent:</span>
        <span class="listing-success-value">₱${parseFloat(propertyPrice).toLocaleString()}</span>
      </div>
      <div class="listing-success-row">
        <span class="listing-success-label">Status:</span>
        <span class="listing-success-value listing-success-status">Published</span>
      </div>
    `;
  }

  if (viewBtn) {
    viewBtn.onclick = () => {
      window.location.href = 'index.html';
    };
  }

  if (dashboardBtn) {
    dashboardBtn.onclick = () => {
      window.location.href = '../index.html';
    };
  }

  modal.style.display = 'flex';
  modal.classList.add('show');
  injectIcons();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handle property type change (show/hide "Others" input)
 */
function handlePropertyTypeChange() {
  const select = document.getElementById('property-type');
  const otherGroup = document.getElementById('property-type-other-group');
  const otherInput = document.getElementById('property-type-other');

  if (!select || !otherGroup) return;

  if (select.value === 'others') {
    otherGroup.style.display = 'block';
    if (otherInput) {
      otherInput.required = true;
    }
  } else {
    otherGroup.style.display = 'none';
    if (otherInput) {
      otherInput.required = false;
    }
  }
}

/**
 * Handle capacity change (show/hide "Custom" input)
 */
function handleCapacityChange() {
  const select = document.getElementById('property-capacity');
  const customGroup = document.getElementById('property-capacity-custom-group');
  const customInput = document.getElementById('property-capacity-custom');

  if (!select || !customGroup) return;

  if (select.value === 'custom') {
    customGroup.style.display = 'block';
    if (customInput) {
      customInput.required = true;
    }
  } else {
    customGroup.style.display = 'none';
    if (customInput) {
      customInput.required = false;
    }
  }
}

// Store custom amenities
let customAmenitiesList = [];

/**
 * Handle add custom amenity
 */
function handleAddCustomAmenity() {
  const input = document.getElementById('custom-amenity-input');
  const listContainer = document.getElementById('custom-amenities-list');

  if (!input || !listContainer) return;

  const value = input.value.trim();
  if (!value) return;

  // Add to array
  customAmenitiesList.push(value);

  // Create tag element
  const tag = document.createElement('div');
  tag.className = 'amenity-tag-custom';
  tag.style.cssText =
    'display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: var(--bg-green); color: var(--primary-green); border-radius: 20px; font-size: 0.85rem; font-weight: 500; margin: 0.25rem;';

  tag.innerHTML = `
    ${value}
    <button type="button" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--primary-green);">
      ${getIcon('xMark', { width: 16, height: 16 })}
    </button>
  `;

  // Add remove event listener
  const removeBtn = tag.querySelector('button');
  removeBtn.addEventListener('click', () => {
    removeCustomAmenity(value);
  });

  listContainer.appendChild(tag);

  // Clear input
  input.value = '';
  input.focus();
}

/**
 * Remove custom amenity
 */
function removeCustomAmenity(value) {
  customAmenitiesList = customAmenitiesList.filter(a => a !== value);
  renderCustomAmenities();
}

/**
 * Render custom amenities list
 */
function renderCustomAmenities() {
  const listContainer = document.getElementById('custom-amenities-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  customAmenitiesList.forEach(amenity => {
    const tag = document.createElement('div');
    tag.className = 'amenity-tag-custom';
    tag.style.cssText =
      'display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: var(--bg-green); color: var(--primary-green); border-radius: 20px; font-size: 0.85rem; font-weight: 500; margin: 0.25rem;';

    tag.innerHTML = `
      ${amenity}
      <button type="button" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--primary-green);">
        ${getIcon('xMark', { width: 16, height: 16 })}
      </button>
    `;

    // Add remove event listener
    const removeBtn = tag.querySelector('button');
    removeBtn.addEventListener('click', () => {
      removeCustomAmenity(amenity);
    });

    listContainer.appendChild(tag);
  });
}

/**
 * Get custom amenities
 */
function getCustomAmenities() {
  return customAmenitiesList;
}

/**
 * Initialize map modal handlers
 */
function initMapModal() {
  const modal = document.getElementById('map-modal');
  const closeBtn = document.getElementById('map-modal-close');
  const cancelBtn = document.getElementById('map-cancel-btn');
  const confirmBtn = document.getElementById('map-confirm-btn');
  const geocodeBtn = document.getElementById('geocode-address-btn');
  const currentLocationBtn = document.getElementById('use-current-location-btn');
  const searchInput = document.getElementById('map-address-search');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMapModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeMapModal);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmLocation);
  }

  if (geocodeBtn) {
    geocodeBtn.addEventListener('click', handleGeocodeSearch);
  }

  if (currentLocationBtn) {
    currentLocationBtn.addEventListener('click', handleCurrentLocation);
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleGeocodeSearch();
      }
    });

    // Add debounced search as user types
    searchInput.addEventListener(
      'input',
      debounce(async e => {
        const query = e.target.value.trim();
        if (query.length >= 3) {
          await handleAddressSearch(query);
        } else {
          clearSearchResults();
        }
      }, 500)
    );
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeMapModal();
      }
    });
  }
}

/**
 * Open map modal
 */
function openMapModal() {
  const modal = document.getElementById('map-modal');
  if (!modal) return;

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('show'), 10);

  // Initialize map if not already initialized
  if (!mapInstance) {
    initializeMap();
  } else {
    // Invalidate size to fix display issues
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 100);
  }

  // Load existing coordinates if available
  const latInput = document.getElementById('property-latitude');
  const lngInput = document.getElementById('property-longitude');

  if (latInput?.value && lngInput?.value) {
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    if (!isNaN(lat) && !isNaN(lng)) {
      updateMapLocation(lat, lng);
    }
  }
}

/**
 * Close map modal
 */
function closeMapModal() {
  const modal = document.getElementById('map-modal');
  if (!modal) return;

  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);

  clearSearchResults();

  // Reset temporary selection if location wasn't confirmed
  const latInput = document.getElementById('property-latitude');
  const lngInput = document.getElementById('property-longitude');
  
  // If no location was previously confirmed (inputs are empty), reset the button text
  if (!latInput.value || !lngInput.value) {
    const locationBtnText = document.getElementById('location-btn-text');
    if (locationBtnText) {
      locationBtnText.textContent = 'Set Location';
    }
    
    const coordinatesDisplay = document.getElementById('coordinates-display');
    if (coordinatesDisplay) {
      coordinatesDisplay.textContent = '';
      coordinatesDisplay.style.color = '';
      coordinatesDisplay.style.fontWeight = '';
    }
  }
}

/**
 * Initialize the map
 */
function initializeMap() {
  const defaultLat = 14.5995; // Manila default
  const defaultLng = 120.9842;

  mapInstance = initMap('create-map', {
    center: [defaultLat, defaultLng],
    zoom: 13,
    onMapClick: handleMapClick,
  });

  // Set initial marker
  updateMapLocation(defaultLat, defaultLng);
}

/**
 * Handle map click event
 */
function handleMapClick(e) {
  const { lat, lng } = e.latlng;
  updateMapLocation(lat, lng);
}

/**
 * Update map location with marker
 */
function updateMapLocation(lat, lng) {
  if (!mapInstance) return;

  selectedLat = lat;
  selectedLng = lng;

  // Update or create marker
  currentMarker = setMarker(mapInstance, lat, lng, {
    draggable: true,
    onDragEnd: (newLat, newLng) => {
      updateMapLocation(newLat, newLng);
    },
  });

  // Update coordinate display
  const latDisplay = document.getElementById('map-lat-display');
  const lngDisplay = document.getElementById('map-lng-display');

  if (latDisplay) {
    latDisplay.textContent = `Lat: ${lat.toFixed(6)}`;
  }

  if (lngDisplay) {
    lngDisplay.textContent = `Lng: ${lng.toFixed(6)}`;
  }

  // Enable confirm button
  const confirmBtn = document.getElementById('map-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = false;
  }

  // Try to reverse geocode to get address
  reverseGeocode(lat, lng)
    .then(result => {
      const searchInput = document.getElementById('map-address-search');
      if (searchInput && result.display_name) {
        searchInput.value = result.display_name;
      }
    })
    .catch(error => {
      console.error('Reverse geocoding failed:', error);
    });
}

/**
 * Confirm location selection
 */
async function confirmLocation() {
  if (selectedLat === null || selectedLng === null) return;

  // Update hidden inputs
  const latInput = document.getElementById('property-latitude');
  const lngInput = document.getElementById('property-longitude');

  if (latInput) {
    latInput.value = selectedLat.toFixed(6);
  }

  if (lngInput) {
    lngInput.value = selectedLng.toFixed(6);
  }

  // Update button text
  const locationBtnText = document.getElementById('location-btn-text');
  if (locationBtnText) {
    locationBtnText.textContent = 'Location Set ✓';
  }

  // Update coordinates display
  const coordinatesDisplay = document.getElementById('coordinates-display');
  if (coordinatesDisplay) {
    coordinatesDisplay.textContent = `Lat: ${selectedLat.toFixed(6)}, Lng: ${selectedLng.toFixed(6)}`;
    coordinatesDisplay.style.color = 'var(--primary-green)';
    coordinatesDisplay.style.fontWeight = '600';
  }

  // Try to reverse geocode and update address fields
  try {
    const result = await reverseGeocode(selectedLat, selectedLng);

    if (result && result.address) {
      const address = result.address;

      // Update address field with street information
      const streetParts = [];
      if (address.house_number) streetParts.push(address.house_number);
      if (address.road) streetParts.push(address.road);
      if (address.neighbourhood || address.suburb) {
        streetParts.push(address.neighbourhood || address.suburb);
      }
      const streetAddress = streetParts.join(' ') || address.village || address.hamlet || '';

      if (streetAddress) {
        const addressInput = document.getElementById('property-address');
        if (addressInput) {
          addressInput.value = streetAddress;
        }
      }

      // Update city field
      const city =
        address.city ||
        address.town ||
        address.municipality ||
        address.city_district ||
        address.county ||
        '';
      if (city) {
        const cityInput = document.getElementById('property-city');
        if (cityInput) {
          cityInput.value = city;
        }
      }

      // Update province field
      const province = address.state || address.region || address.province || '';
      if (province) {
        const provinceInput = document.getElementById('property-province');
        if (provinceInput) {
          provinceInput.value = province;
        }
      }

      // Update postal code if available
      if (address.postcode) {
        const postalInput = document.getElementById('property-postal');
        if (postalInput) {
          postalInput.value = address.postcode;
        }
      }
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    // Continue anyway - coordinates are saved even if address lookup fails
  }

  closeMapModal();
}

/**
 * Handle geocode search
 */
async function handleGeocodeSearch() {
  const searchInput = document.getElementById('map-address-search');
  if (!searchInput) return;

  const query = searchInput.value.trim();
  if (!query) return;

  await handleAddressSearch(query);
}

/**
 * Handle address search
 */
async function handleAddressSearch(query) {
  const resultsContainer = document.getElementById('map-search-results');
  if (!resultsContainer) return;

  try {
    resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';

    const results = await searchAddress(query, { limit: 5 });

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="search-no-results">No results found</div>';
      return;
    }

    resultsContainer.innerHTML = results
      .map(
        (result, index) => `
        <div class="search-result-item" data-index="${index}">
          <div class="search-result-name">${result.display_name}</div>
        </div>
      `
      )
      .join('');

    // Add click handlers to results
    resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const result = results[index];
        updateMapLocation(parseFloat(result.latitude), parseFloat(result.longitude));
        clearSearchResults();
      });
    });
  } catch (error) {
    console.error('Address search failed:', error);
    resultsContainer.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
  }
}

/**
 * Clear search results
 */
function clearSearchResults() {
  const resultsContainer = document.getElementById('map-search-results');
  if (resultsContainer) {
    resultsContainer.innerHTML = '';
  }
}

/**
 * Handle current location button
 */
function handleCurrentLocation() {
  const btn = document.getElementById('use-current-location-btn');
  const originalText = btn ? btn.innerHTML : '';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = 'Getting location...';
  }

  getCurrentLocation(
    (lat, lng) => {
      updateMapLocation(lat, lng);

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    },
    error => {
      console.error('Failed to get current location:', error);
      alert('Failed to get your current location. Please check your browser permissions.');

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  );
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing create listing...');
  initCreateListing();
});
