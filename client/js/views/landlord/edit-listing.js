import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';
import { getImageUrl } from '../../shared/image-utils.js';
import {
  initMap,
  setMarker,
  reverseGeocode,
  searchAddress,
  getCurrentLocation,
  debounce,
} from '../../shared/map-utils.js';

let propertyId = null;
let existingPhotos = [];
const newPhotos = [];
const photosToDelete = [];
let editMap = null;
let editMapMarker = null;
let tempLatitude = null;
let tempLongitude = null;

export function initEditListing() {
  const urlParams = new URLSearchParams(window.location.search);
  propertyId = urlParams.get('id');

  if (!propertyId) {
    alert('Property ID is missing');
    window.location.href = 'index.html';
    return;
  }

  loadPropertyData();
  setupFormHandlers();
  setupPhotoUpload();
}

async function loadPropertyData() {
  const loadingState = document.getElementById('loading-state');
  const form = document.getElementById('edit-listing-form');

  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/properties.php?id=${propertyId}`,
      {
        credentials: 'include',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const property = result.data;

    if (!property) {
      throw new Error('Property not found');
    }

    populateForm(property);

    if (loadingState) {
      loadingState.style.display = 'none';
    }
    if (form) {
      form.style.display = 'block';
    }
  } catch (error) {
    console.error('Failed to load property:', error);
    alert('Failed to load property details. Redirecting to listings...');
    window.location.href = 'index.html';
  }
}

function populateForm(property) {
  document.getElementById('property-name').value = property.name || '';
  document.getElementById('property-type').value = property.type || 'boarding-house';
  document.getElementById('property-description').value = property.description || '';
  document.getElementById('property-price').value = property.price || 0;
  document.getElementById('property-deposit').value = property.deposit || 0;
  document.getElementById('property-rooms').value = property.total_rooms || property.rooms || 0;
  document.getElementById('property-capacity').value = property.capacity || '';
  document.getElementById('property-min-stay').value = property.min_stay || '';
  document.getElementById('property-availability').value = property.availability || 'available-now';
  document.getElementById('property-status').value = property.status || 'active';
  document.getElementById('property-address').value = property.address || '';
  document.getElementById('property-city').value = property.city || '';
  document.getElementById('property-province').value = property.province || '';
  document.getElementById('property-latitude').value = property.latitude || '';
  document.getElementById('property-longitude').value = property.longitude || '';

  // Set amenities
  const amenities = property.amenities || [];
  const amenityCheckboxes = document.querySelectorAll('input[name="amenities"]');
  amenityCheckboxes.forEach(checkbox => {
    checkbox.checked = amenities.includes(checkbox.value);
  });

  // Load existing photos
  existingPhotos = property.photos || [];
  renderExistingPhotos();
}

function renderExistingPhotos() {
  const grid = document.getElementById('existing-photos-grid');
  if (!grid) {
    return;
  }

  grid.innerHTML = '';

  existingPhotos.forEach((photoUrl, index) => {
    const photoCard = document.createElement('div');
    photoCard.className = 'photo-preview-card';
    photoCard.dataset.photoUrl = photoUrl;
    photoCard.dataset.index = index;

    photoCard.innerHTML = `
      <img src="${getImageUrl(photoUrl)}" alt="Property photo ${index + 1}" />
      ${index === 0 ? '<span class="photo-cover-badge">Cover Photo</span>' : ''}
      <button type="button" class="photo-remove-btn" data-photo-url="${photoUrl}">
        ${getIcon('trash')}
      </button>
      <div class="photo-drag-handle">${getIcon('menu')}</div>
    `;

    grid.appendChild(photoCard);
  });

  // Add event listeners for remove buttons
  grid.querySelectorAll('.photo-remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const photoUrl = btn.dataset.photoUrl;
      removeExistingPhoto(photoUrl);
    });
  });

  // Make photos sortable (drag and drop)
  makeSortable(grid);
}

function removeExistingPhoto(photoUrl) {
  const index = existingPhotos.indexOf(photoUrl);
  if (index > -1) {
    existingPhotos.splice(index, 1);
    photosToDelete.push(photoUrl);
    renderExistingPhotos();
  }
}

function makeSortable(container) {
  let draggedElement = null;

  container.querySelectorAll('.photo-preview-card').forEach(card => {
    card.draggable = true;

    card.addEventListener('dragstart', () => {
      draggedElement = card;
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedElement = null;
    });

    card.addEventListener('dragover', _e => {
      _e.preventDefault();
      const afterElement = getDragAfterElement(container, _e.clientY);
      if (afterElement === null) {
        container.appendChild(draggedElement);
      } else {
        container.insertBefore(draggedElement, afterElement);
      }
    });
  });

  container.addEventListener('drop', () => {
    updatePhotoOrder();
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.photo-preview-card:not(.dragging)')];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function updatePhotoOrder() {
  const grid = document.getElementById('existing-photos-grid');
  const cards = grid.querySelectorAll('.photo-preview-card');
  existingPhotos = Array.from(cards).map(card => card.dataset.photoUrl);
  renderExistingPhotos();
}

function setupPhotoUpload() {
  const uploadArea = document.getElementById('photo-upload-area');
  const fileInput = document.getElementById('property-photos');

  if (!uploadArea || !fileInput) {
    return;
  }

  uploadArea.addEventListener('click', e => {
    // Prevent multiple triggers and event bubbling
    e.stopPropagation();
    e.preventDefault();
    if (e.target === fileInput) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', e => {
    handleFileSelect(e.target.files);
    // Reset file input to allow selecting the same file again
    e.target.value = '';
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', e => {
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
    handleFileSelect(e.dataTransfer.files);
  });
}

function handleFileSelect(files) {
  const photoError = document.getElementById('photo-error');
  photoError.textContent = '';

  const totalPhotos = existingPhotos.length + newPhotos.length + files.length;
  if (totalPhotos > 10) {
    photoError.textContent = 'Maximum 10 photos allowed';
    return;
  }

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) {
      photoError.textContent = 'Only image files are allowed';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      photoError.textContent = 'Each photo must be less than 5MB';
      return;
    }

    newPhotos.push(file);
    previewNewPhoto(file);
  });
}

function previewNewPhoto(file) {
  const grid = document.getElementById('existing-photos-grid');
  if (!grid) {
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const photoCard = document.createElement('div');
    photoCard.className = 'photo-preview-card new-photo';
    photoCard.dataset.fileName = file.name;

    photoCard.innerHTML = `
      <img src="${e.target.result}" alt="${file.name}" />
      <span class="photo-new-badge">New</span>
      <button type="button" class="photo-remove-btn" data-file-name="${file.name}">
        ${getIcon('trash')}
      </button>
    `;

    grid.appendChild(photoCard);

    photoCard.querySelector('.photo-remove-btn').addEventListener('click', e => {
      e.stopPropagation();
      removeNewPhoto(file.name);
    });
  };

  reader.readAsDataURL(file);
}

function removeNewPhoto(fileName) {
  const index = newPhotos.findIndex(f => f.name === fileName);
  if (index > -1) {
    newPhotos.splice(index, 1);
    const card = document.querySelector(`.photo-preview-card[data-file-name="${fileName}"]`);
    if (card) {
      card.remove();
    }
  }
}

function setupFormHandlers() {
  const form = document.getElementById('edit-listing-form');
  const cancelBtn = document.getElementById('cancel-btn');
  const setLocationBtn = document.getElementById('set-location-btn');

  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        window.location.href = 'index.html';
      }
    });
  }

  if (setLocationBtn) {
    setLocationBtn.addEventListener('click', openMapModal);
  }

  // Setup geocode from address button
  const geocodeBtn = document.getElementById('geocode-address-btn');
  if (geocodeBtn) {
    geocodeBtn.addEventListener('click', handleGeocodeFromAddress);
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  // Get selected amenities
  const amenityCheckboxes = form.querySelectorAll('input[name="amenities"]:checked');
  const selectedAmenities = Array.from(amenityCheckboxes).map(cb => cb.value);

  const updatedData = {
    id: propertyId,
    name: formData.get('propertyName'),
    type: formData.get('propertyType'),
    description: formData.get('propertyDescription'),
    price: parseFloat(formData.get('propertyPrice')) || 0,
    deposit: parseFloat(formData.get('propertyDeposit')) || 0,
    total_rooms: parseInt(formData.get('propertyRooms')) || 0,
    capacity: formData.get('propertyCapacity') || null,
    min_stay: formData.get('propertyMinStay') || null,
    availability: formData.get('propertyAvailability') || 'available-now',
    status: formData.get('propertyStatus'),
    address: formData.get('propertyAddress'),
    city: formData.get('propertyCity'),
    province: formData.get('propertyProvince'),
    latitude: formData.get('propertyLatitude') || null,
    longitude: formData.get('propertyLongitude') || null,
    amenities: selectedAmenities,
    photos: existingPhotos,
    photos_to_delete: photosToDelete,
  };

  // Handle new photo uploads
  if (newPhotos.length > 0) {
    const uploadFormData = new FormData();
    newPhotos.forEach(file => {
      uploadFormData.append('photos[]', file);
    });

    try {
      const token = localStorage.getItem('token');
      const uploadHeaders = {};
      if (token) {
        uploadHeaders['Authorization'] = `Bearer ${token}`;
      }

      const uploadResponse = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/upload-photos.php`, {
        method: 'POST',
        credentials: 'include',
        headers: uploadHeaders,
        body: uploadFormData,
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        if (uploadResult.data && uploadResult.data.urls) {
          updatedData.photos = [...existingPhotos, ...uploadResult.data.urls];
        }
      } else {
        console.error('Photo upload failed:', uploadResponse.status);
      }
    } catch (error) {
      console.error('Failed to upload photos:', error);
    }
  }

  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/listings/${propertyId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    await response.json();
    showSuccessModal();
  } catch (error) {
    // console.error('Failed to update property:', error);
    alert(`Failed to update property: ${error.message}`);
  }
}

function showSuccessModal() {
  const modal = document.getElementById('listing-success-modal');
  if (!modal) {
    return;
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const dashboardBtn = document.getElementById('listing-dashboard-btn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
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
    if (!editMap) {
      initializeEditMap();
    } else {
      editMap.invalidateSize();
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

  // Restore original coordinates display if location was previously set
  const latInput = document.getElementById('property-latitude');
  const lngInput = document.getElementById('property-longitude');

  if (latInput.value && lngInput.value) {
    // Restore the original coordinates display
    const coordinatesDisplay = document.getElementById('coordinates-display');
    if (coordinatesDisplay) {
      coordinatesDisplay.textContent = `Coordinates: ${parseFloat(latInput.value).toFixed(
        6
      )}, ${parseFloat(lngInput.value).toFixed(6)}`;
    }
  }
}

/**
 * Initialize the edit map
 */
function initializeEditMap() {
  const currentLat = document.getElementById('property-latitude').value;
  const currentLng = document.getElementById('property-longitude').value;

  const center =
    currentLat && currentLng
      ? [parseFloat(currentLat), parseFloat(currentLng)]
      : [14.5995, 120.9842]; // Default: Manila

  editMap = initMap('edit-map', {
    center,
    zoom: currentLat && currentLng ? 16 : 13,
    onMapClick: handleEditMapClick,
  });

  // Add marker if coordinates exist
  if (currentLat && currentLng) {
    editMapMarker = setMarker(editMap, parseFloat(currentLat), parseFloat(currentLng), {
      draggable: true,
      onDragEnd: handleEditMarkerDrag,
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
async function handleEditMapClick(e) {
  const { lat, lng } = e.latlng;

  tempLatitude = lat;
  tempLongitude = lng;

  // Update marker
  if (editMapMarker) {
    editMapMarker.setLatLng([lat, lng]);
  } else {
    editMapMarker = setMarker(editMap, lat, lng, {
      draggable: true,
      onDragEnd: handleEditMarkerDrag,
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
async function handleEditMarkerDrag(lat, lng) {
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

  // Remove existing listeners
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  const newCurrentLocationBtn = currentLocationBtn.cloneNode(true);
  currentLocationBtn.parentNode.replaceChild(newCurrentLocationBtn, currentLocationBtn);

  // Add new listeners
  newCloseBtn.addEventListener('click', closeMapModal);
  newCancelBtn.addEventListener('click', closeMapModal);
  newConfirmBtn.addEventListener('click', confirmMapLocation);
  newCurrentLocationBtn.addEventListener('click', useCurrentLocation);

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

      // Update postal code if available
      if (address.postcode) {
        const postalField = document.getElementById('property-postal');
        if (postalField) {
          postalField.value = address.postcode;
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
 * Use current location from browser geolocation
 */
function useCurrentLocation() {
  getCurrentLocation(
    async (lat, lng) => {
      tempLatitude = lat;
      tempLongitude = lng;

      // Update map view
      editMap.setView([lat, lng], 16);

      // Update marker
      if (editMapMarker) {
        editMapMarker.setLatLng([lat, lng]);
      } else {
        editMapMarker = setMarker(editMap, lat, lng, {
          draggable: true,
          onDragEnd: handleEditMarkerDrag,
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

        editMap.setView([result.latitude, result.longitude], 16);

        // Update marker
        if (editMapMarker) {
          editMapMarker.setLatLng([result.latitude, result.longitude]);
        } else {
          editMapMarker = setMarker(editMap, result.latitude, result.longitude, {
            draggable: true,
            onDragEnd: handleEditMarkerDrag,
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
 * Geocode from the property address field
 */
async function handleGeocodeFromAddress() {
  const addressField = document.getElementById('property-address');
  const cityField = document.getElementById('property-city');
  const provinceField = document.getElementById('property-province');

  if (!addressField || !addressField.value.trim()) {
    alert('Please enter an address first');
    return;
  }

  // Build full address query
  const addressParts = [
    addressField.value.trim(),
    cityField?.value.trim(),
    provinceField?.value.trim(),
    'Philippines',
  ].filter(Boolean);

  const fullAddress = addressParts.join(', ');

  try {
    const results = await searchAddress(fullAddress);

    if (results.length === 0) {
      alert(
        'Could not find coordinates for this address. Please set location manually on the map.'
      );
      return;
    }

    // Use first result
    const result = results[0];

    // Update form fields
    document.getElementById('property-latitude').value = result.latitude.toFixed(6);
    document.getElementById('property-longitude').value = result.longitude.toFixed(6);

    // Update button text and coordinates display
    document.getElementById('location-btn-text').textContent = 'Update Location';
    document.getElementById(
      'coordinates-display'
    ).textContent = `Coordinates: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`;

    alert('Coordinates set successfully from address!');
  } catch (error) {
    console.error('Error geocoding address:', error);
    alert('Failed to geocode address. Please try setting location manually on the map.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Only run edit listing initialization if we're on the edit page
  if (window.location.pathname.includes('/listings/edit')) {
    initEditListing();
  }
});
