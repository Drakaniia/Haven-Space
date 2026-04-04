// Landlord Welcome Message Configuration

document.addEventListener('DOMContentLoaded', () => {
  loadWelcomeTemplate();
  setupMessageEditor();
  setupPreview();
  setupSave();
});

let currentTemplate = '';

/**
 * Load existing welcome template
 */
async function loadWelcomeTemplate() {
  const textarea = document.getElementById('welcome-message-textarea');
  if (!textarea) return;

  try {
    const response = await fetch('/server/api/routes.php/landlord/welcome-message', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const result = await response.json();
      const template = result.data;

      if (template && template.message_text) {
        currentTemplate = template.message_text;
        textarea.value = currentTemplate;
        updateCharCount();
      } else {
        // Set default template
        textarea.value = "Welcome to {house_name}! We're excited to have you join our community.";
        updateCharCount();
      }
    }
  } catch (error) {
    console.error('Error loading welcome template:', error);
  }
}

/**
 * Setup message editor
 */
function setupMessageEditor() {
  const textarea = document.getElementById('welcome-message-textarea');
  if (!textarea) return;

  textarea.addEventListener('input', () => {
    updateCharCount();
  });

  // Allow tab key to insert spaces
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    }
  });
}

/**
 * Update character count
 */
function updateCharCount() {
  const textarea = document.getElementById('welcome-message-textarea');
  const charCount = document.getElementById('char-count');

  if (textarea && charCount) {
    charCount.textContent = textarea.value.length;
  }
}

/**
 * Setup preview
 */
function setupPreview() {
  const previewBtn = document.getElementById('preview-message-btn');
  if (!previewBtn) return;

  previewBtn.addEventListener('click', () => {
    const textarea = document.getElementById('welcome-message-textarea');
    const previewCard = document.getElementById('message-preview-card');
    const previewText = document.getElementById('preview-message-text');

    if (!textarea || !previewCard || !previewText) return;

    // Replace variables with sample values
    let message = textarea.value;
    message = message.replace(/{boarder_name}/g, 'Juan');
    message = message.replace(/{house_name}/g, 'Green Valley Boarding House');
    message = message.replace(/{move_in_date}/g, 'April 3, 2026');
    message = message.replace(/{room_number}/g, 'Room 205');

    previewText.textContent = message;

    // Show preview card
    previewCard.style.display = 'block';

    // Scroll to preview
    previewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/**
 * Setup save functionality
 */
function setupSave() {
  const saveBtn = document.getElementById('save-message-btn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    const textarea = document.getElementById('welcome-message-textarea');
    if (!textarea || !textarea.value.trim()) {
      showError('Please enter a welcome message');
      return;
    }

    saveBtn.disabled = true;
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span>Saving...</span>';

    try {
      const response = await fetch('/server/api/routes.php/landlord/welcome-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_text: textarea.value,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save template');
      }

      showSuccess('Welcome message template saved successfully');
    } catch (error) {
      console.error('Error saving welcome template:', error);
      showError(error.message || 'Failed to save welcome message');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  });
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
