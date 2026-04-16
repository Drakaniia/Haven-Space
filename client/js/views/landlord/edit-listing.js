import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';

let propertyId = null;
let existingPhotos = [];
const newPhotos = [];
const photosToDelete = [];

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
      <img src="${photoUrl}" alt="Property photo ${index + 1}" />
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

    card.addEventListener('dragstart', e => {
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

  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', e => {
    handleFileSelect(e.target.files);
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
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);

  // Get selected amenities
  const amenityCheckboxes = form.querySelectorAll('input[name="amenities"]:checked');
  const selectedAmenities = Array.from(amenityCheckboxes).map(cb => cb.value);

  const updatedData = {
    name: formData.get('propertyName'),
    type: formData.get('propertyType'),
    description: formData.get('propertyDescription'),
    price: parseFloat(formData.get('propertyPrice')) || 0,
    deposit: parseFloat(formData.get('propertyDeposit')) || 0,
    total_rooms: parseInt(formData.get('propertyRooms')) || 0,
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
      const uploadResponse = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/upload-photos.php`, {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        if (uploadResult.data && uploadResult.data.urls) {
          updatedData.photos = [...existingPhotos, ...uploadResult.data.urls];
        }
      }
    } catch (error) {
      console.error('Failed to upload photos:', error);
    }
  }

  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/properties.php?id=${propertyId}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    showSuccessModal();
  } catch (error) {
    console.error('Failed to update property:', error);
    alert('Failed to update property. Please try again.');
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

document.addEventListener('DOMContentLoaded', () => {
  // Only run edit listing initialization if we're on the edit page
  if (window.location.pathname.includes('/listings/edit')) {
    initEditListing();
  }
});
