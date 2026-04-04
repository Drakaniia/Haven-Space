// Boarder Maintenance - New Request Modal

document.addEventListener('DOMContentLoaded', () => {
  setupModalOpen();
  setupModalClose();
  setupFormSubmit();
  setupCategorySelection();
  setupPrioritySelection();
  setupCharCounters();
  setupPhotoUpload();
});

let uploadedImages = [];

// ===== Modal Open/Close =====

function setupModalOpen() {
  const newRequestBtn = document.getElementById('open-new-request-modal');
  const emptyStateBtn = document.getElementById('open-new-request-modal-empty');

  if (newRequestBtn) {
    newRequestBtn.addEventListener('click', e => {
      e.preventDefault();
      openModal();
    });
  }

  if (emptyStateBtn) {
    emptyStateBtn.addEventListener('click', e => {
      e.preventDefault();
      openModal();
    });
  }
}

function openModal() {
  const modal = document.getElementById('new-request-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    // Focus on the title input
    setTimeout(() => {
      const titleInput = document.getElementById('modal-request-title');
      if (titleInput) titleInput.focus();
    }, 100);
  }
}

function setupModalClose() {
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const backdrop = document.querySelector('.modal-backdrop');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeModal);
  }

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('new-request-modal');
      if (modal && modal.style.display !== 'none') {
        closeModal();
      }
    }
  });
}

function closeModal() {
  const modal = document.getElementById('new-request-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    resetForm();
  }
}

// ===== Form Submission =====

function setupFormSubmit() {
  const form = document.getElementById('maintenance-request-form-modal');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitBtn = document.getElementById('modal-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Submitting...</span>';

    try {
      // Upload images first (if any)
      const imageUrls = uploadedImages.length > 0 ? await uploadImages() : [];

      // Get form data
      const data = {
        title: document.getElementById('modal-request-title')?.value || '',
        description: document.getElementById('modal-request-description')?.value || '',
        category: document.getElementById('modal-selected-category')?.value || 'Other',
        priority: getSelectedPriority(),
        roomArea: document.getElementById('modal-room-area')?.value || '',
        landlord_id: 1, // TODO: Get from auth state
        images: imageUrls,
        status: 'Pending',
      };

      // TODO: Replace with actual API endpoint
      const response = await fetch('/server/api/routes.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create request');
      }

      const result = await response.json();

      // Success - close modal and refresh the timeline
      closeModal();

      // TODO: Update the timeline with the new request
      // For now, show a success message
      showSuccessMessage('Maintenance request created successfully!');

      // Reload maintenance requests to show the new one
      if (typeof window.loadMaintenanceRequests === 'function') {
        window.loadMaintenanceRequests();
      }
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      showFormError(error.message || 'Failed to create request. Please try again.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ===== Form Validation =====

function validateForm() {
  clearFormErrors();

  const title = document.getElementById('modal-request-title')?.value?.trim() || '';
  const description = document.getElementById('modal-request-description')?.value?.trim() || '';
  const category = document.getElementById('modal-selected-category')?.value || '';
  const priority = document.getElementById('modal-selected-priority')?.value || '';
  const roomArea = document.getElementById('modal-room-area')?.value || '';

  let isValid = true;

  if (!title) {
    showFieldError('modal-title-error', 'Title is required');
    isValid = false;
  } else if (title.length < 5) {
    showFieldError('modal-title-error', 'Title must be at least 5 characters');
    isValid = false;
  }

  if (!description) {
    showFieldError('modal-description-error', 'Description is required');
    isValid = false;
  } else if (description.length < 10) {
    showFieldError('modal-description-error', 'Description must be at least 10 characters');
    isValid = false;
  }

  if (!category) {
    showFieldError('modal-category-error', 'Please select a category');
    isValid = false;
  }

  if (!priority) {
    showFieldError('modal-priority-error', 'Please select a priority level');
    isValid = false;
  }

  if (!roomArea) {
    showFieldError('modal-room-area-error', 'Please select a room or area');
    isValid = false;
  }

  return isValid;
}

function clearFormErrors() {
  const errorElements = document.querySelectorAll('#new-request-modal .error-message');
  errorElements.forEach(el => {
    el.textContent = '';
  });
}

function showFieldError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function showFormError(message) {
  // TODO: Show error notification
  console.error('Form error:', message);
  alert(message);
}

function showSuccessMessage(message) {
  // TODO: Show success notification
  console.log('Success:', message);
  // You can implement a toast notification here
}

// ===== Category Selection =====

function setupCategorySelection() {
  const categoryGrid = document.getElementById('modal-category-grid');
  if (!categoryGrid) return;

  const categoryOptions = categoryGrid.querySelectorAll('.category-option');

  categoryOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      categoryOptions.forEach(opt => opt.classList.remove('selected'));

      // Add selected class to clicked option
      option.classList.add('selected');

      // Update hidden input
      const category = option.getAttribute('data-category');
      const hiddenInput = document.getElementById('modal-selected-category');
      if (hiddenInput) {
        hiddenInput.value = category;
      }

      // Clear category error
      showFieldError('modal-category-error', '');
    });
  });
}

// ===== Priority Selection =====

function setupPrioritySelection() {
  const priorityOptions = document.querySelectorAll('#modal-priority-options .priority-option');

  priorityOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      document.querySelectorAll('#modal-priority-options .priority-option').forEach(opt => {
        opt.classList.remove('selected');
      });

      // Add selected class to clicked option
      option.classList.add('selected');

      // Update hidden input
      const priority = option.getAttribute('data-priority');
      const hiddenInput = document.getElementById('modal-selected-priority');
      if (hiddenInput) {
        hiddenInput.value = priority;
      }

      // Show/hide urgent warning
      const urgentWarning = document.getElementById('modal-urgent-warning');
      if (priority === 'urgent') {
        urgentWarning.style.display = 'flex';
      } else {
        urgentWarning.style.display = 'none';
      }

      // Clear priority error
      showFieldError('modal-priority-error', '');
    });
  });
}

function getSelectedPriority() {
  const selectedOption = document.querySelector(
    '#modal-priority-options .priority-option.selected'
  );
  return selectedOption ? selectedOption.getAttribute('data-priority') : 'medium';
}

// ===== Character Counters =====

function setupCharCounters() {
  const titleInput = document.getElementById('modal-request-title');
  const titleCount = document.getElementById('modal-title-count');

  if (titleInput && titleCount) {
    titleInput.addEventListener('input', () => {
      titleCount.textContent = titleInput.value.length;
    });
  }

  const descriptionInput = document.getElementById('modal-request-description');
  const descriptionCount = document.getElementById('modal-description-count');

  if (descriptionInput && descriptionCount) {
    descriptionInput.addEventListener('input', () => {
      descriptionCount.textContent = descriptionInput.value.length;
    });
  }
}

// ===== Photo Upload =====

function setupPhotoUpload() {
  const uploadBox = document.getElementById('modal-photo-upload-box');
  const fileInput = document.getElementById('modal-photo-input');
  const previewGrid = document.getElementById('modal-photo-preview-grid');

  if (!uploadBox || !fileInput || !previewGrid) return;

  // Click on upload box triggers file input
  uploadBox.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file selection
  fileInput.addEventListener('change', e => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    // Check file limit
    if (uploadedImages.length + files.length > 5) {
      showFieldError('modal-photo-error', 'Maximum 5 photos allowed');
      return;
    }

    files.forEach(file => {
      // Check file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        showFieldError('modal-photo-error', `File ${file.name} is too large (max 10MB)`);
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        showFieldError('modal-photo-error', `File ${file.name} is not an image`);
        return;
      }

      // Add to uploaded images array
      uploadedImages.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = e => {
        const previewItem = document.createElement('div');
        previewItem.className = 'photo-preview-item';
        previewItem.innerHTML = `
          <img src="${e.target.result}" alt="Photo preview">
          <button type="button" class="photo-remove-btn" data-index="${uploadedImages.length - 1}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        `;
        previewGrid.appendChild(previewItem);
      };
      reader.readAsDataURL(file);
    });

    // Clear file input
    fileInput.value = '';
  });

  // Handle image removal
  previewGrid.addEventListener('click', e => {
    const removeBtn = e.target.closest('.photo-remove-btn');
    if (removeBtn) {
      const index = parseInt(removeBtn.getAttribute('data-index'));
      uploadedImages.splice(index, 1);
      removeBtn.closest('.photo-preview-item').remove();

      // Update indices for remaining items
      const remainingBtns = previewGrid.querySelectorAll('.photo-remove-btn');
      remainingBtns.forEach((btn, idx) => {
        btn.setAttribute('data-index', idx);
      });

      // Clear photo error
      showFieldError('modal-photo-error', '');
    }
  });
}

async function uploadImages() {
  const urls = [];

  for (const file of uploadedImages) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // TODO: Replace with actual upload endpoint
      // TODO: API endpoint requires PHP server to be running
      // TODO: Implement proper image upload handling
      // TODO: Add image validation (file size, type, dimensions)
      // TODO: Implement image compression before upload
      const response = await fetch('/server/api/routes.php', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        urls.push(result.file_url);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  }

  return urls;
}

// ===== Form Reset =====

function resetForm() {
  const form = document.getElementById('maintenance-request-form-modal');
  if (form) {
    form.reset();
  }

  // Reset hidden inputs
  const categoryInput = document.getElementById('modal-selected-category');
  if (categoryInput) categoryInput.value = '';

  const priorityInput = document.getElementById('modal-selected-priority');
  if (priorityInput) priorityInput.value = '';

  // Reset selected states
  document.querySelectorAll('#modal-category-grid .category-option').forEach(opt => {
    opt.classList.remove('selected');
  });

  document.querySelectorAll('#modal-priority-options .priority-option').forEach(opt => {
    opt.classList.remove('selected');
  });

  // Hide urgent warning
  const urgentWarning = document.getElementById('modal-urgent-warning');
  if (urgentWarning) {
    urgentWarning.style.display = 'none';
  }

  // Reset character counters
  const titleCount = document.getElementById('modal-title-count');
  if (titleCount) titleCount.textContent = '0';

  const descriptionCount = document.getElementById('modal-description-count');
  if (descriptionCount) descriptionCount.textContent = '0';

  // Clear photo previews
  const previewGrid = document.getElementById('modal-photo-preview-grid');
  if (previewGrid) {
    previewGrid.innerHTML = '';
  }

  // Clear uploaded images
  uploadedImages = [];

  // Clear all errors
  clearFormErrors();

  // Reset submit button
  const submitBtn = document.getElementById('modal-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
      <span>Submit Request</span>
    `;
  }
}
