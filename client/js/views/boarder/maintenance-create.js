// Boarder Maintenance - Create New Request Page

document.addEventListener('DOMContentLoaded', () => {
  setupFormSubmit();
  setupImageUpload();
  setupCategoryDropdown();
  setupPrioritySelector();
});

const uploadedImages = [];

function setupFormSubmit() {
  const form = document.getElementById('maintenance-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Get form data
      const data = {
        title: document.getElementById('request-title')?.value || '',
        description: document.getElementById('request-description')?.value || '',
        category: document.getElementById('request-category')?.value || 'Other',
        priority: getSelectedPriority(),
        landlord_id: 1, // TODO: Get from auth state
        images: imageUrls,
      };

      // TODO: API endpoint requires PHP server to be running
      // TODO: Update fetch URL to: 'http://localhost:8000/api/boarder/maintenance'
      // TODO: Implement proper error handling with user-friendly messages
      const response = await fetch('/server/api/routes.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create request');
      }

      // Success - redirect to maintenance list
      window.location.href = './index.html?success=1';
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      showError(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request';
    }
  });
}

function validateForm() {
  const title = document.getElementById('request-title')?.value;
  const description = document.getElementById('request-description')?.value;
  const category = document.getElementById('request-category')?.value;

  if (!title || !description || !category) {
    showError('Please fill in all required fields');
    return false;
  }

  if (title.length < 5) {
    showError('Title must be at least 5 characters');
    return false;
  }

  return true;
}

function setupImageUpload() {
  const fileInput = document.getElementById('request-images');
  if (!fileInput) return;

  fileInput.addEventListener('change', async e => {
    const files = Array.from(e.target.files);
    const previewContainer = document.getElementById('image-preview');

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        showError(`File ${file.name} is too large (max 10MB)`);
        continue;
      }

      // Add to uploaded images array
      uploadedImages.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = e => {
        const preview = document.createElement('div');
        preview.className = 'image-preview-item';
        preview.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="remove-image" data-index="${uploadedImages.length - 1}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        `;
        previewContainer?.appendChild(preview);
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle image removal
  document.getElementById('image-preview')?.addEventListener('click', e => {
    const removeBtn = e.target.closest('.remove-image');
    if (removeBtn) {
      const index = parseInt(removeBtn.dataset.index);
      uploadedImages.splice(index, 1);
      removeBtn.closest('.image-preview-item').remove();
    }
  });
}

async function uploadImages() {
  const urls = [];
  for (const file of uploadedImages) {
    const formData = new FormData();
    formData.append('file', file);

    // TODO: API endpoint requires PHP server to be running
    // TODO: Update fetch URL to: 'http://localhost:8000/api/upload'
    // TODO: Implement proper image upload handling
    const response = await fetch('/server/api/routes.php', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const result = await response.json();
      urls.push(result.file_url);
    }
  }
  return urls;
}

function setupCategoryDropdown() {
  // Basic dropdown - already handled by HTML
}

function setupPrioritySelector() {
  const priorityButtons = document.querySelectorAll('.priority-selector button');
  priorityButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      priorityButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function getSelectedPriority() {
  const activeBtn = document.querySelector('.priority-selector button.active');
  return activeBtn?.dataset.priority || 'Medium';
}

function showError(message) {
  let errorContainer = document.getElementById('form-error-message');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'form-error-message';
    errorContainer.className = 'form-error-message';
    const form = document.getElementById('maintenance-form');
    form?.prepend(errorContainer);
  }
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';

  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 5000);
}
