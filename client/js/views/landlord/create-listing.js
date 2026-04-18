import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';
import { getAuthHeaders } from '../../shared/auth-headers.js';
import {
  initMap,
  setMarker,
  reverseGeocode,
  searchAddress,
  getCurrentLocation,
  debounce,
} from '../../shared/map-utils.js';

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

// Maximum number of photos allowed
const MAX_PHOTOS = 10;
// Maximum file size in MB
const MAX_FILE_SIZE_MB = 5;

// Store uploaded photos
const uploadedPhotos = [];

// Map variables
let createMap = null;
let createMapMarker = null;
let tempLatitude = null;
let tempLongitude = null;

/**
 * Initialize the create listing form
 */
export function initCreateListing() {
  const form = document.getElementById('create-listing-form');
  const uploadArea = document.getElementById('photo-upload-area');
  const fileInput = document.getElementById('property-photos');
  const setLocationBtn = document.getElementById('set-location-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const propertyTypeSelect = document.getElementById('property-type');
  const propertyCapacitySelect = document.getElementById('property-capacity');
  const addCustomAmenityBtn = document.getElementById('add-custom-amenity-btn');
  const customAmenityInput = document.getElementById('custom-amenity-input');

  if (!form || !uploadArea || !fileInput) {
    return;
  }

  // Inject icons from centralized library
  injectIcons();

  // Initialize photo upload handlers
  initPhotoUpload(uploadArea, fileInput);

  // Form submission
  form.addEventListener('submit', handleFormSubmit);

  // Set location button
  if (setLocationBtn) {
    setLocationBtn.addEventListener('click', handleSetLocation);
  }

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel? Your changes will be lost.')) {
        window.location.href = 'index.html';
      }
    });
  }

  // Property type "Others" toggle
  if (propertyTypeSelect) {
    propertyTypeSelect.addEventListener('change', handlePropertyTypeChange);
  }

  // Property capacity "Custom" toggle
  if (propertyCapacitySelect) {
    propertyCapacitySelect.addEventListener('change', handleCapacityChange);
  }

  // Custom amenities
  if (addCustomAmenityBtn && customAmenityInput) {
    addCustomAmenityBtn.addEventListener('click', handleAddCustomAmenity);
    customAmenityInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        handleAddCustomAmenity();
      }
    });
  }
}

/**
 * Initialize photo upload functionality
 */
function initPhotoUpload(uploadArea, fileInput) {
  // Click to upload
  uploadArea.addEventListener('click', () => fileInput.click());

  // File selection
  fileInput.addEventListener('change', e => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    fileInput.value = '';
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
}

/**
 * Handle selected/dropped files
 */
function handleFiles(files) {
  const _errorEl = document.getElementById('photo-error');

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
    renderPhotoGrid();
    hideError();
  }
}

/**
 * Render the photo preview grid
 */
function renderPhotoGrid() {
  const grid = document.getElementById('photo-preview-grid');
  if (!grid) {
    return;
  }

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

    grid.appendChild(item);
  });

  // Add remove event listeners
  grid.querySelectorAll('.photo-remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const photoId = parseFloat(btn.dataset.photoId);
      removePhoto(photoId);
    });
  });
}

/**
 * Remove a photo from the upload queue
 */
function removePhoto(photoId) {
  const photoIndex = uploadedPhotos.findIndex(p => p.id === photoId);
  if (photoIndex === -1) {
    return;
  }

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
 * Handle set location button click
 */
function handleSetLocation() {
  openMapModal();
}

/**
 * Open map modal for setting location
 */
function openMapModal() {
  const modal = document.getElementById('map-modal');
  if (!modal) {
    return;
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Initialize map if not already initialized
  setTimeout(() => {
    if (!createMap) {
      initializeCreateMap();
    } else {
      createMap.invalidateSize();
    }
  }, 100);

  // Setup modal event listeners
  setupMapModalListeners();
}

/**
 * Close map modal
 */
function closeMapModal() {
  const modal = document.getElementById('map-modal');
  if (!modal) {
    return;
  }

  modal.style.display = 'none';
  document.body.style.overflow = '';

  // Reset temp coordinates
  tempLatitude = null;
  tempLongitude = null;
}

/**
 * Initialize the create map
 */
function initializeCreateMap() {
  const currentLat = document.getElementById('property-latitude').value;
  const currentLng = document.getElementById('property-longitude').value;

  const center =
    currentLat && currentLng
      ? [parseFloat(currentLat), parseFloat(currentLng)]
      : [14.5995, 120.9842]; // Default: Manila

  createMap = initMap('create-map', {
    center,
    zoom: currentLat && currentLng ? 16 : 13,
    onMapClick: handleCreateMapClick,
  });

  // Add marker if coordinates exist
  if (currentLat && currentLng) {
    createMapMarker = setMarker(createMap, parseFloat(currentLat), parseFloat(currentLng), {
      draggable: true,
      onDragEnd: handleCreateMarkerDrag,
    });

    tempLatitude = parseFloat(currentLat);
    tempLongitude = parseFloat(currentLng);

    updateMapCoordinatesDisplay(tempLatitude, tempLongitude);
    document.getElementById('map-confirm-btn').disabled = false;
  }
}

/**
 * Handle map click event
 */
async function handleCreateMapClick(e) {
  const { lat, lng } = e.latlng;

  tempLatitude = lat;
  tempLongitude = lng;

  // Update marker
  if (createMapMarker) {
    createMapMarker.setLatLng([lat, lng]);
  } else {
    createMapMarker = setMarker(createMap, lat, lng, {
      draggable: true,
      onDragEnd: handleCreateMarkerDrag,
    });
  }

  updateMapCoordinatesDisplay(lat, lng);
  document.getElementById('map-confirm-btn').disabled = false;

  // Reverse geocode to get address
  try {
    const result = await reverseGeocode(lat, lng);
    const searchInput = document.getElementById('map-address-search');
    if (searchInput) {
      searchInput.value = result.display_name || '';
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
  }
}

/**
 * Handle marker drag event
 */
async function handleCreateMarkerDrag(lat, lng) {
  tempLatitude = lat;
  tempLongitude = lng;

  updateMapCoordinatesDisplay(lat, lng);
  document.getElementById('map-confirm-btn').disabled = false;

  // Reverse geocode to get address
  try {
    const result = await reverseGeocode(lat, lng);
    const searchInput = document.getElementById('map-address-search');
    if (searchInput) {
      searchInput.value = result.display_name || '';
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
  }
}

/**
 * Update coordinates display in modal
 */
function updateMapCoordinatesDisplay(lat, lng) {
  document.getElementById('map-lat-display').textContent = `Lat: ${lat.toFixed(6)}`;
  document.getElementById('map-lng-display').textContent = `Lng: ${lng.toFixed(6)}`;
}

/**
 * Setup map modal event listeners
 */
function setupMapModalListeners() {
  const closeBtn = document.getElementById('map-modal-close');
  const cancelBtn = document.getElementById('map-cancel-btn');
  const confirmBtn = document.getElementById('map-confirm-btn');
  const currentLocationBtn = document.getElementById('use-current-location-btn');
  const searchInput = document.getElementById('map-address-search');

  // Remove existing listeners by cloning nodes
  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', closeMapModal);
  }

  if (cancelBtn) {
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener('click', closeMapModal);
  }

  if (confirmBtn) {
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', confirmMapLocation);
  }

  if (currentLocationBtn) {
    const newCurrentLocationBtn = currentLocationBtn.cloneNode(true);
    currentLocationBtn.parentNode.replaceChild(newCurrentLocationBtn, currentLocationBtn);
    newCurrentLocationBtn.addEventListener('click', useCurrentLocation);
  }

  // Setup address search
  if (searchInput) {
    const debouncedSearch = debounce(handleAddressSearch, 500);
    searchInput.addEventListener('input', e => {
      debouncedSearch(e.target.value);
    });
  }
}

/**
 * Confirm map location and update form
 */
async function confirmMapLocation() {
  if (tempLatitude === null || tempLongitude === null) {
    alert('Please select a location on the map');
    return;
  }

  // Update form fields
  document.getElementById('property-latitude').value = tempLatitude.toFixed(6);
  document.getElementById('property-longitude').value = tempLongitude.toFixed(6);

  // Update button text and coordinates display
  document.getElementById('location-btn-text').textContent = 'Update Location';
  document.getElementById('coordinates-display').textContent = `Coordinates: ${tempLatitude.toFixed(
    6
  )}, ${tempLongitude.toFixed(6)}`;

  // Try to reverse geocode and update address fields
  try {
    const result = await reverseGeocode(tempLatitude, tempLongitude);

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
        document.getElementById('property-address').value = streetAddress;
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
        document.getElementById('property-city').value = city;
      }

      // Update province field
      const province = address.state || address.region || address.province || '';
      if (province) {
        document.getElementById('property-province').value = province;
      }
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    // Continue anyway - coordinates are saved even if address lookup fails
  }

  closeMapModal();
}

/**
 * Use current location from browser geolocation
 */
function useCurrentLocation() {
  getCurrentLocation(
    async (lat, lng) => {
      tempLatitude = lat;
      tempLongitude = lng;

      // Update map view
      createMap.setView([lat, lng], 16);

      // Update marker
      if (createMapMarker) {
        createMapMarker.setLatLng([lat, lng]);
      } else {
        createMapMarker = setMarker(createMap, lat, lng, {
          draggable: true,
          onDragEnd: handleCreateMarkerDrag,
        });
      }

      updateMapCoordinatesDisplay(lat, lng);
      document.getElementById('map-confirm-btn').disabled = false;

      // Reverse geocode to get address
      try {
        const result = await reverseGeocode(lat, lng);
        const searchInput = document.getElementById('map-address-search');
        if (searchInput) {
          searchInput.value = result.display_name || '';
        }
      } catch (error) {
        console.error('Error reverse geocoding:', error);
      }
    },
    error => {
      console.error('Geolocation error:', error);
      alert('Unable to get your current location. Please select manually on the map.');
    }
  );
}

/**
 * Handle address search
 */
async function handleAddressSearch(query) {
  const resultsContainer = document.getElementById('map-search-results');

  if (!query || query.length < 3) {
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none';
    return;
  }

  try {
    const results = await searchAddress(query);

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="map-search-result">No results found</div>';
      resultsContainer.style.display = 'block';
      return;
    }

    resultsContainer.innerHTML = results
      .map(
        (result, index) => `
        <div class="map-search-result" data-index="${index}">
          <div class="map-search-result-name">${result.display_name.split(',')[0]}</div>
          <div class="map-search-result-detail">${result.display_name}</div>
        </div>
      `
      )
      .join('');

    // Store results for click handling
    window._mapSearchResults = results;

    // Add click handlers
    resultsContainer.querySelectorAll('.map-search-result').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index);
        const result = window._mapSearchResults[index];

        // Update map view
        tempLatitude = result.latitude;
        tempLongitude = result.longitude;

        createMap.setView([result.latitude, result.longitude], 16);

        // Update marker
        if (createMapMarker) {
          createMapMarker.setLatLng([result.latitude, result.longitude]);
        } else {
          createMapMarker = setMarker(createMap, result.latitude, result.longitude, {
            draggable: true,
            onDragEnd: handleCreateMarkerDrag,
          });
        }

        updateMapCoordinatesDisplay(result.latitude, result.longitude);
        document.getElementById('map-confirm-btn').disabled = false;

        // Update search input
        document.getElementById('map-address-search').value = result.display_name;

        // Hide results
        resultsContainer.style.display = 'none';
      });
    });

    resultsContainer.style.display = 'block';
  } catch (error) {
    console.error('Error searching address:', error);
    resultsContainer.innerHTML = '<div class="map-search-result">Error searching address</div>';
    resultsContainer.style.display = 'block';
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
    propertyLatitude: formData.get('propertyLatitude'),
    propertyLongitude: formData.get('propertyLongitude'),
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
      headers: getAuthHeaders('4'),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || 'Failed to create listing');
    }

    const propertyId = result.data?.id;

    if (uploadedPhotos.length > 0 && propertyId) {
      await uploadPhotos(propertyId);
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

async function uploadPhotos(propertyId) {
  const photoFormData = new FormData();
  uploadedPhotos.forEach(photo => {
    photoFormData.append('propertyPhotos[]', photo.file);
  });

  try {
    await fetch(`${CONFIG.API_BASE_URL}/api/landlord/listings/${propertyId}/photos`, {
      method: 'POST',
      body: photoFormData,
      credentials: 'include',
    });
  } catch (error) {
    console.error('Failed to upload photos:', error);
  }
}

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

  if (viewBtn && propertyId) {
    viewBtn.onclick = () => {
      window.location.href = `view.html?id=${propertyId}`;
    };
  } else if (viewBtn) {
    viewBtn.style.display = 'none';
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

  if (!select || !otherGroup) {
    return;
  }

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

  if (!select || !customGroup) {
    return;
  }

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

/**
 * Store custom amenities
 */
let customAmenitiesList = [];

/**
 * Handle add custom amenity
 */
function handleAddCustomAmenity() {
  const input = document.getElementById('custom-amenity-input');
  const listContainer = document.getElementById('custom-amenities-list');

  if (!input || !listContainer) {
    return;
  }

  const value = input.value.trim();
  if (!value) {
    return;
  }

  // Add to array
  customAmenitiesList.push(value);

  // Create tag element
  const tag = document.createElement('div');
  tag.className = 'amenity-tag-custom';
  tag.style.cssText =
    'display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: var(--bg-green); color: var(--primary-green); border-radius: 20px; font-size: 0.85rem; font-weight: 500;';
  tag.innerHTML = `
    ${value}
    <button type="button" onclick="removeCustomAmenity('${value.replace(
      /'/g,
      "\\'"
    )}')" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--primary-green);">
      ${getIcon('xMark', { width: 16, height: 16 })}
    </button>
  `;

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

  // Re-render list
  const listContainer = document.getElementById('custom-amenities-list');
  if (listContainer) {
    listContainer.innerHTML = '';
    customAmenitiesList.forEach(amenity => {
      const tag = document.createElement('div');
      tag.className = 'amenity-tag-custom';
      tag.style.cssText =
        'display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background-color: var(--bg-green); color: var(--primary-green); border-radius: 20px; font-size: 0.85rem; font-weight: 500;';
      tag.innerHTML = `
        ${amenity}
        <button type="button" onclick="removeCustomAmenity('${amenity.replace(
          /'/g,
          "\\'"
        )}')" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: var(--primary-green);">
          ${getIcon('xMark', { width: 16, height: 16 })}
        </button>
      `;
      listContainer.appendChild(tag);
    });
  }
}

// Make removeCustomAmenity globally accessible
window.removeCustomAmenity = removeCustomAmenity;

/**
 * Get custom amenities
 */
function getCustomAmenities() {
  return customAmenitiesList;
}

/**
 * Set coordinates from URL parameters (when returning from map)
 */
export function setCoordinatesFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const lat = urlParams.get('lat');
  const lng = urlParams.get('lng');

  if (lat && lng) {
    const latInput = document.getElementById('property-latitude');
    const lngInput = document.getElementById('property-longitude');

    if (latInput && lngInput) {
      latInput.value = lat;
      lngInput.value = lng;

      // Show confirmation
      const setLocationBtn = document.getElementById('set-location-btn');
      if (setLocationBtn) {
        setLocationBtn.textContent = '✓ Location Set';
        setLocationBtn.style.backgroundColor = 'var(--primary-green)';
        setLocationBtn.style.color = 'var(--white)';
      }
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initCreateListing();
  setCoordinatesFromUrl();
});
