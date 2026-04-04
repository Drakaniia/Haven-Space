// Landlord Document Management

document.addEventListener('DOMContentLoaded', () => {
  loadDocuments();
  setupUploadModal();
  setupCategoryFilter();
});

let allDocuments = [];

/**
 * Load documents from API
 */
async function loadDocuments() {
  const container = document.getElementById('documents-container');
  if (!container) return;

  container.innerHTML = '<div class="loading-state">Loading documents...</div>';

  try {
    const response = await fetch('/server/api/routes.php/landlord/documents', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to load documents');

    const result = await response.json();
    allDocuments = result.data || [];

    renderDocuments(allDocuments);
  } catch (error) {
    console.error('Error loading documents:', error);
    container.innerHTML =
      '<div class="error-state">Failed to load documents. Please try again.</div>';
  }
}

/**
 * Render documents list
 */
function renderDocuments(documents) {
  const container = document.getElementById('documents-container');
  if (!container) return;

  if (documents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3>No documents uploaded yet</h3>
        <p>Upload your first document to get started</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  documents.forEach(doc => {
    const item = createDocumentItem(doc);
    container.appendChild(item);
  });
}

/**
 * Create document list item
 */
function createDocumentItem(doc) {
  const item = document.createElement('div');
  item.className = 'document-item';
  item.dataset.category = doc.category;

  const fileSize = formatFileSize(doc.file_size);
  const uploadDate = new Date(doc.created_at).toLocaleDateString();

  item.innerHTML = `
    <div class="document-info">
      <div class="document-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="document-details">
        <h3 class="document-name">${escapeHtml(doc.document_name)}</h3>
        <div class="document-meta">
          <span class="document-category-badge">${doc.category}</span>
          <span>${fileSize}</span>
          <span>Uploaded ${uploadDate}</span>
        </div>
      </div>
    </div>
    <div class="document-actions">
      <div class="auto-send-toggle-switch">
        <label class="toggle-switch">
          <input type="checkbox" class="auto-send-checkbox" data-document-id="${doc.id}" ${
    doc.auto_send_to_new_boarders ? 'checked' : ''
  } />
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-label">Auto-send</span>
      </div>
      <a href="/server/storage/uploads/${
        doc.document_url
      }" download class="btn-icon" title="Download">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </a>
      <button class="btn-icon delete" data-document-id="${doc.id}" title="Delete">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `;

  // Auto-send toggle
  const autoSendCheckbox = item.querySelector('.auto-send-checkbox');
  autoSendCheckbox.addEventListener('change', async () => {
    await toggleAutoSend(doc.id, autoSendCheckbox.checked);
  });

  // Delete button
  const deleteBtn = item.querySelector('.btn-icon.delete');
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(doc.id);
    }
  });

  return item;
}

/**
 * Toggle auto-send for a document
 */
async function toggleAutoSend(documentId, isActive) {
  try {
    const response = await fetch('/server/api/routes.php/landlord/documents/auto-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
        is_active: isActive,
      }),
    });

    if (!response.ok) throw new Error('Failed to update auto-send setting');

    showSuccess(`Auto-send ${isActive ? 'enabled' : 'disabled'} successfully`);
  } catch (error) {
    console.error('Error updating auto-send:', error);
    showError('Failed to update auto-send setting');
  }
}

/**
 * Delete a document
 */
async function deleteDocument(documentId) {
  try {
    const response = await fetch(`/server/api/routes.php/landlord/documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete document');

    showSuccess('Document deleted successfully');
    loadDocuments();
  } catch (error) {
    console.error('Error deleting document:', error);
    showError('Failed to delete document');
  }
}

/**
 * Setup upload modal
 */
function setupUploadModal() {
  const uploadBtn = document.getElementById('upload-document-btn');
  const modal = document.getElementById('upload-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const submitBtn = document.getElementById('upload-submit-btn');
  const form = document.getElementById('upload-form');

  if (!uploadBtn || !modal) return;

  // Open modal
  uploadBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  // Close modal functions
  function closeModal() {
    modal.style.display = 'none';
    form.reset();
  }

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Submit form
  submitBtn?.addEventListener('click', async e => {
    e.preventDefault();
    await uploadDocument();
  });
}

/**
 * Upload a document
 */
async function uploadDocument() {
  const fileInput = document.getElementById('document-file');
  const categorySelect = document.getElementById('document-category');
  const autoSendToggle = document.getElementById('auto-send-toggle');

  if (!fileInput || !fileInput.files[0]) {
    showError('Please select a file');
    return;
  }

  const file = fileInput.files[0];
  const category = categorySelect.value;
  const autoSend = autoSendToggle.checked;

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    showError('File size must be less than 10MB');
    return;
  }

  // Validate file type
  if (file.type !== 'application/pdf') {
    showError('Only PDF files are allowed');
    return;
  }

  const submitBtn = document.getElementById('upload-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  try {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('category', category);
    formData.append('auto_send', autoSend.toString());

    const response = await fetch('/server/api/routes.php/landlord/documents', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    showSuccess('Document uploaded successfully');

    // Close modal and reload documents
    document.getElementById('upload-modal').style.display = 'none';
    loadDocuments();
  } catch (error) {
    console.error('Error uploading document:', error);
    showError(error.message || 'Failed to upload document');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload Document';
  }
}

/**
 * Setup category filter
 */
function setupCategoryFilter() {
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.dataset.category;
      filterDocuments(category);
    });
  });
}

/**
 * Filter documents by category
 */
function filterDocuments(category) {
  const filtered =
    category === 'all' ? allDocuments : allDocuments.filter(doc => doc.category === category);

  renderDocuments(filtered);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'toast-message toast-error';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  setTimeout(() => errorDiv.remove(), 3000);
}

/**
 * Show success message
 */
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'toast-message toast-success';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);

  setTimeout(() => successDiv.remove(), 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
