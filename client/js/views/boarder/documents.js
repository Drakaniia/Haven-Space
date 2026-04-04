// Boarder Documents - My Documents

document.addEventListener('DOMContentLoaded', () => {
  loadDocuments();
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
    const response = await fetch('/server/api/routes.php/boarder/documents', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to load documents');

    const result = await response.json();
    allDocuments = result.data || [];

    renderDocuments(allDocuments);
    updateStats(allDocuments);
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
        <h3>No documents yet</h3>
        <p>Documents from your landlord will appear here once you're accepted into a boarding house</p>
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
 * Create document item
 */
function createDocumentItem(doc) {
  const item = document.createElement('div');
  item.className = 'boarder-document-item';

  const fileSize = formatFileSize(doc.file_size);
  const receivedDate = new Date(doc.received_at).toLocaleDateString();
  const isAcknowledged = doc.acknowledged;

  item.innerHTML = `
    <div class="document-left-section">
      <div class="document-file-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="document-file-info">
        <h3 class="document-file-name">${escapeHtml(doc.document_name)}</h3>
        <div class="document-file-meta">
          <span class="document-category-tag">${doc.category}</span>
          <span>${fileSize}</span>
          <span>Received ${receivedDate}</span>
        </div>
      </div>
    </div>
    <div class="document-right-section">
      <div class="acknowledged-badge ${isAcknowledged ? 'acknowledged' : 'pending'}">
        ${
          isAcknowledged
            ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
             </svg>
             <span>Acknowledged</span>`
            : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <span>Pending</span>`
        }
      </div>
      <a href="/server/storage/uploads/${
        doc.document_url
      }" download class="document-action-btn" title="Download">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </a>
      ${
        !isAcknowledged
          ? `<button class="acknowledge-btn" data-document-id="${doc.id}">
             Acknowledge
           </button>`
          : ''
      }
    </div>
  `;

  // Acknowledge button
  const acknowledgeBtn = item.querySelector('.acknowledge-btn');
  if (acknowledgeBtn) {
    acknowledgeBtn.addEventListener('click', async () => {
      await acknowledgeDocument(doc.id);
    });
  }

  return item;
}

/**
 * Acknowledge a document
 */
async function acknowledgeDocument(documentId) {
  try {
    const response = await fetch('/server/api/routes.php/boarder/documents/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
      }),
    });

    if (!response.ok) throw new Error('Failed to acknowledge document');

    showSuccess('Document acknowledged successfully');

    // Reload documents to update UI
    loadDocuments();
  } catch (error) {
    console.error('Error acknowledging document:', error);
    showError('Failed to acknowledge document');
  }
}

/**
 * Update stats cards
 */
function updateStats(documents) {
  const total = documents.length;
  const acknowledged = documents.filter(doc => doc.acknowledged).length;
  const pending = total - acknowledged;

  const statTotal = document.getElementById('stat-total');
  const statAcknowledged = document.getElementById('stat-acknowledged');
  const statPending = document.getElementById('stat-pending');

  if (statTotal) statTotal.textContent = total;
  if (statAcknowledged) statAcknowledged.textContent = acknowledged;
  if (statPending) statPending.textContent = pending;
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
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
