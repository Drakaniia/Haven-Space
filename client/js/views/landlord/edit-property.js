/**
 * Edit Property - Photo Management & Property Updates
 * Handles editing property details and managing photos with drag-to-reorder
 */

// Maximum number of photos allowed
const MAX_PHOTOS = 10;
// Maximum file size in MB
const MAX_FILE_SIZE_MB = 5;

// Store uploaded photos
let uploadedPhotos = [];
// Property ID being edited
let propertyId = null;
// Original property data
let originalProperty = null;

// Sample property data (replace with API call)
const sampleProperties = {
  1: {
    id: 1,
    name: 'Sunrise Boarding House',
    type: 'boarding-house',
    description:
      'A cozy boarding house near universities with all essential amenities for comfortable living.',
    price: 5000,
    deposit: 5000,
    rooms: 10,
    capacity: 2,
    status: 'active',
    address: '123 España Blvd, Sampaloc',
    city: 'Manila',
    province: 'Metro Manila',
    latitude: '14.6091',
    longitude: '120.9898',
    amenities: ['wifi', 'aircon', 'parking', 'laundry', 'cctv'],
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ],
  },
  2: {
    id: 2,
    name: 'Green Valley Dormitory',
    type: 'dormitory',
    description:
      'Modern dormitory with affordable rates, perfect for students. Walking distance to universities.',
    price: 4500,
    deposit: 4500,
    rooms: 15,
    capacity: 4,
    status: 'full',
    address: '456 Quezon Ave',
    city: 'Quezon City',
    province: 'Metro Manila',
    latitude: '14.6760',
    longitude: '121.0437',
    amenities: ['wifi', 'furnished', 'laundry', 'kitchen', 'cctv'],
    photos: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
    ],
  },
};

/**
 * Initialize the edit property page
 */
export function initEditProperty() {
  // Get property ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  propertyId = urlParams.get('id');

  if (!propertyId) {
    alert('No property specified. Redirecting to properties list.');
    window.location.href = '../myproperties/index.html';
    return;
  }

  // Load property data
  loadPropertyData(propertyId);

  // Setup form handlers
  setupFormHandlers();
}

/**
 * Load property data into form
 */
function loadPropertyData(id) {
  const property = sampleProperties[id];

  if (!property) {
    alert('Property not found. Redirecting to properties list.');
    window.location.href = '../myproperties/index.html';
    return;
  }

  originalProperty = { ...property };
  uploadedPhotos = property.photos.map((url, index) => ({
    id: Date.now() + index,
    url: url, // Existing photos have URL
    preview: url,
    isNew: false,
  }));

  // Populate form fields
  document.getElementById('property-name').value = property.name;
  document.getElementById('property-type').value = property.type;
  document.getElementById('property-description').value = property.description;
  document.getElementById('property-price').value = property.price;
  document.getElementById('property-deposit').value = property.deposit;
  document.getElementById('property-rooms').value = property.rooms;
  document.getElementById('property-capacity').value = property.capacity;
  document.getElementById('property-status').value = property.status;
  document.getElementById('property-address').value = property.address;
  document.getElementById('property-city').value = property.city;
  document.getElementById('property-province').value = property.province;
  document.getElementById('property-latitude').value = property.latitude || '';
  document.getElementById('property-longitude').value = property.longitude || '';

  // Set amenities
  const amenityCheckboxes = document.querySelectorAll('input[name="amenities"]');
  amenityCheckboxes.forEach(checkbox => {
    checkbox.checked = property.amenities.includes(checkbox.value);
  });

  // Render photo grid
  renderPhotoGrid();
}

/**
 * Setup form event handlers
 */
function setupFormHandlers() {
  const form = document.getElementById('edit-property-form');
  const uploadArea = document.getElementById('photo-upload-area');
  const fileInput = document.getElementById('property-photos');
  const setLocationBtn = document.getElementById('set-location-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const saveDraftBtn = document.getElementById('save-draft-btn');
  const propertyTypeSelect = document.getElementById('property-type');
  const propertyCapacitySelect = document.getElementById('property-capacity');
  const addCustomAmenityBtn = document.getElementById('add-custom-amenity-btn');
  const customAmenityInput = document.getElementById('custom-amenity-input');

  if (!form || !uploadArea || !fileInput) return;

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
      if (hasUnsavedChanges()) {
        if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
          window.location.href = '../myproperties/index.html';
        }
      } else {
        window.location.href = '../myproperties/index.html';
      }
    });
  }

  // Save draft button
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', handleSaveDraft);
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
      if (e.key === 'Enter') handleAddCustomAmenity();
    });
  }
}

/**
 * Check if there are unsaved changes
 */
function hasUnsavedChanges() {
  if (!originalProperty) return false;

  const form = document.getElementById('edit-property-form');
  const formData = new FormData(form);

  // Simple check - compare photo count
  if (uploadedPhotos.length !== originalProperty.photos.length) {
    return true;
  }

  // Could add more detailed comparison here
  return false;
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
  const errorEl = document.getElementById('photo-error');

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

    // Add photo to array (new photo)
    const photoData = {
      file: file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
      isNew: true,
    };

    uploadedPhotos.push(photoData);
    renderPhotoGrid();
    hideError();
  }
}

/**
 * Render the photo preview grid with drag-to-reorder
 */
function renderPhotoGrid() {
  const grid = document.getElementById('photo-preview-grid');
  if (!grid) return;

  grid.innerHTML = '';

  uploadedPhotos.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'photo-preview-item';
    item.draggable = true;
    item.dataset.photoId = photo.id;

    const src = photo.preview || photo.url;

    item.innerHTML = `
      <img src="${src}" alt="Property photo ${index + 1}" />
      <div class="photo-overlay">
        ${index === 0 ? '<span class="photo-badge">Cover</span>' : '<span></span>'}
        <div style="display: flex; gap: 0.25rem;">
          <button 
            type="button" 
            class="photo-drag-handle" 
            title="Drag to reorder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <button 
            type="button" 
            class="photo-remove-btn" 
            data-photo-id="${photo.id}"
            title="Remove photo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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

  // Setup drag-to-reorder
  setupDragToReorder(grid);
}

/**
 * Setup drag-to-reorder functionality
 */
function setupDragToReorder(grid) {
  let dragSrcEl = null;

  const items = grid.querySelectorAll('.photo-preview-item');

  items.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });

  function handleDragStart(e) {
    dragSrcEl = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.photoId);
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (dragSrcEl && dragSrcEl !== this) {
      // Get the photo IDs
      const srcId = parseFloat(dragSrcEl.dataset.photoId);
      const targetId = parseFloat(this.dataset.photoId);

      // Find indices
      const srcIndex = uploadedPhotos.findIndex(p => p.id === srcId);
      const targetIndex = uploadedPhotos.findIndex(p => p.id === targetId);

      // Swap in array
      if (srcIndex !== -1 && targetIndex !== -1) {
        const temp = uploadedPhotos[srcIndex];
        uploadedPhotos[srcIndex] = uploadedPhotos[targetIndex];
        uploadedPhotos[targetIndex] = temp;
      }

      // Re-render
      renderPhotoGrid();
    }

    return false;
  }

  function handleDragEnd(e) {
    this.classList.remove('dragging');
    items.forEach(item => {
      item.classList.remove('drag-over');
    });
  }
}

/**
 * Remove a photo from the upload queue
 */
function removePhoto(photoId) {
  const photoIndex = uploadedPhotos.findIndex(p => p.id === photoId);
  if (photoIndex === -1) return;

  const photo = uploadedPhotos[photoIndex];

  // Revoke object URL if it's a new photo
  if (photo.isNew && photo.preview) {
    URL.revokeObjectURL(photo.preview);
  }

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
  const lat = document.getElementById('property-latitude').value;
  const lng = document.getElementById('property-longitude').value;
  const returnUrl = encodeURIComponent(window.location.href);

  let url = `../maps/index.html?return=${returnUrl}`;
  if (lat && lng) {
    url += `&lat=${lat}&lng=${lng}`;
  }

  window.location.href = url;
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
    id: propertyId,
    propertyName: formData.get('propertyName'),
    propertyType: propertyType,
    propertyDescription: formData.get('propertyDescription'),
    propertyPrice: parseFloat(formData.get('propertyPrice')),
    propertyDeposit: parseFloat(formData.get('propertyDeposit')),
    propertyRooms: parseInt(formData.get('propertyRooms')),
    propertyCapacity: propertyCapacity,
    propertyStatus: formData.get('propertyStatus'),
    propertyAddress: formData.get('propertyAddress'),
    propertyCity: formData.get('propertyCity'),
    propertyProvince: formData.get('propertyProvince'),
    propertyLatitude: formData.get('propertyLatitude'),
    propertyLongitude: formData.get('propertyLongitude'),
    amenities: [...formData.getAll('amenities'), ...customAmenities],
    photos: uploadedPhotos.map(photo => photo.url || photo.preview),
  };

  // Log data for debugging (replace with actual API call)
  console.log('Property updated with data:', data);
  console.log('Photos:', uploadedPhotos.length);

  // Show success message
  alert('Property updated successfully! (This is a demo - backend integration required)');

  // Redirect to properties page
  window.location.href = '../myproperties/index.html';
}

/**
 * Handle save draft
 */
function handleSaveDraft() {
  // Gather form data without validation
  const form = document.getElementById('edit-property-form');
  const formData = new FormData(form);

  const data = {
    id: propertyId,
    propertyName: formData.get('propertyName'),
    propertyType: formData.get('propertyType'),
    propertyStatus: 'inactive', // Save as draft/inactive
    amenities: formData.getAll('amenities'),
    photos: uploadedPhotos.map(photo => photo.url || photo.preview),
  };

  console.log('Draft saved:', data);
  alert('Draft saved successfully! (This is a demo - backend integration required)');
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
    if (otherInput) otherInput.required = true;
  } else {
    otherGroup.style.display = 'none';
    if (otherInput) otherInput.required = false;
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
    if (customInput) customInput.required = true;
  } else {
    customGroup.style.display = 'none';
    if (customInput) customInput.required = false;
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

  if (!input || !listContainer) return;

  const value = input.value.trim();
  if (!value) return;

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
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 16px; height: 16px;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 16px; height: 16px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      `;
      listContainer.appendChild(tag);
    });
  }
}

/**
 * Get custom amenities
 */
function getCustomAmenities() {
  return customAmenitiesList;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initEditProperty);
