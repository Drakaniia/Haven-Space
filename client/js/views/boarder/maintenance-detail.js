// Boarder Maintenance - Detail Page

document.addEventListener('DOMContentLoaded', () => {
  const requestId = getRequestId();
  if (requestId) {
    loadRequestDetails(requestId);
    setupAddComment(requestId);
    setupPhotoUpload();
    setupContactLandlord();
  }
});

/**
 * Extract request ID from URL query parameter
 */
function getRequestId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    console.error('No request ID provided in URL');
    showError('No maintenance request specified');
    return null;
  }
  return parseInt(id, 10);
}

/**
 * Load request details from API
 */
async function loadRequestDetails(requestId) {
  try {
    // TODO: API endpoint requires PHP server to be running
    // TODO: Update fetch URL to: 'http://localhost:8000/api/boarder/maintenance/${requestId}'
    // TODO: Implement proper error handling with user-friendly retry mechanism
    // TODO: Add loading skeleton screen while fetching data
    const response = await fetch(`/server/api/boarder/maintenance/${requestId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch maintenance request');
    }

    const result = await response.json();
    const request = result.data;

    if (!request) {
      showError('Maintenance request not found');
      return;
    }

    renderRequestDetails(request);
  } catch (error) {
    console.error('Error loading maintenance request:', error);
    showError('Failed to load maintenance request details');
  }
}

/**
 * Render request details to the page
 */
function renderRequestDetails(request) {
  // Update header info
  document.getElementById('detail-request-id').textContent = `#REQ-${request.id}`;
  document.getElementById('detail-title').textContent = escapeHtml(request.title);
  document.getElementById('detail-subtitle').textContent = `Submitted on ${formatDate(
    request.created_at
  )}`;

  // Update detail grid
  const categoryEl = document.getElementById('detail-category');
  const categoryIcon = getCategoryIcon(request.category);
  categoryEl.className = `category-badge ${request.category.toLowerCase()}`;
  categoryEl.innerHTML = `${categoryIcon} ${escapeHtml(request.category)}`;

  const priorityEl = document.getElementById('detail-priority');
  priorityEl.className = `priority-badge ${request.priority.toLowerCase()}`;
  priorityEl.textContent = request.priority;

  const statusEl = document.getElementById('detail-status');
  statusEl.className = `status-badge ${request.status.toLowerCase().replace(' ', '-')}`;
  statusEl.textContent = request.status;

  document.getElementById('detail-date').textContent = formatDate(request.created_at);
  document.getElementById('detail-description').textContent = request.description;

  // Render photos if available
  if (request.images && request.images.length > 0) {
    renderPhotos(request.images);
  }

  // Update progress steps
  updateProgressSteps(request.status);

  // Update timeline
  updateTimeline(request);

  // Load comments
  if (request.comments && request.comments.length > 0) {
    renderComments(request.comments);
  } else {
    document.getElementById('comments-timeline').innerHTML =
      '<p class="no-comments">No comments yet. Add a follow-up if needed.</p>';
    document.getElementById('comment-count').textContent = '0 comments';
  }
}

/**
 * Get icon for category
 */
function getCategoryIcon(category) {
  const icons = {
    Plumbing:
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>',
    Electrical:
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
    Appliances:
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>',
    Furniture:
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>',
    Structural:
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>',
    Cleaning:
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>',
    Other:
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  };
  return icons[category] || icons['Other'];
}

/**
 * Render photos grid
 */
function renderPhotos(images) {
  const photosSection = document.getElementById('detail-photos-section');
  const photosGrid = document.getElementById('detail-photos');

  photosGrid.innerHTML = images
    .map(
      img => `
    <div class="photo-item">
      <img src="${escapeHtml(img)}" alt="Maintenance request photo" />
      <button class="photo-expand-btn" onclick="expandPhoto('${escapeHtml(img)}')">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>
    </div>
  `
    )
    .join('');

  photosSection.style.display = 'block';
}

/**
 * Expand photo in modal (placeholder implementation)
 */
function expandPhoto(src) {
  // TODO: Implement lightbox/modal for photo viewing
  window.open(src, '_blank');
}

/**
 * Update progress steps based on status
 */
function updateProgressSteps(status) {
  const steps = {
    Pending: ['submitted'],
    'In Progress': ['submitted', 'reviewed', 'in-progress'],
    Resolved: ['submitted', 'reviewed', 'in-progress', 'completed'],
    Rejected: ['submitted', 'reviewed'],
    Closed: ['submitted', 'reviewed', 'in-progress', 'completed'],
  };

  const completedSteps = steps[status] || ['submitted'];

  // Update step indicators
  const allSteps = ['submitted', 'reviewed', 'in-progress', 'completed'];
  allSteps.forEach((step, index) => {
    const stepEl = document.getElementById(`step-${step}`);
    const lineEl = document.getElementById(`line-${index + 1}`);

    if (completedSteps.includes(step)) {
      stepEl.classList.add('completed');
      if (lineEl && index < completedSteps.length - 1) {
        lineEl.classList.add('completed');
      }
    }
  });

  // Mark lines as completed for completed steps
  completedSteps.forEach((step, index) => {
    const lineEl = document.getElementById(`line-${index + 1}`);
    if (lineEl && index < completedSteps.length - 1) {
      lineEl.classList.add('completed');
    }
  });
}

/**
 * Update timeline events
 */
function updateTimeline(request) {
  const timelineContainer = document.getElementById('detail-timeline-events');
  const submittedDate = formatDate(request.created_at);
  document.getElementById('timeline-submitted-date').textContent = submittedDate;

  // Build timeline events from comments
  const events = [];

  // Add submission event
  events.push({
    title: 'Request Submitted',
    time: submittedDate,
    description: 'You submitted this maintenance request',
    completed: true,
  });

  // Add status change events from comments
  if (request.comments) {
    request.comments
      .filter(c => c.is_system_note)
      .forEach(comment => {
        events.push({
          title: comment.comment,
          time: formatDate(comment.created_at),
          description: '',
          completed: true,
        });
      });
  }

  // Add current status event
  if (request.status === 'In Progress') {
    events.push({
      title: 'In Progress',
      time: 'Current',
      description: 'Your request is being worked on',
      active: true,
    });
  } else if (request.status === 'Pending') {
    events.push({
      title: 'Pending Review',
      time: 'Current',
      description: 'Waiting for landlord to review',
      active: true,
    });
  }

  // Render timeline
  timelineContainer.innerHTML = events
    .map(
      event => `
    <div class="timeline-event">
      <div class="timeline-dot ${
        event.completed ? 'completed' : event.active ? 'active' : ''
      }"></div>
      <div class="timeline-content">
        <div class="timeline-event-header">
          <span class="timeline-event-title">${escapeHtml(event.title)}</span>
          <span class="timeline-event-time">${event.time}</span>
        </div>
        ${event.description ? `<p class="timeline-event-description">${event.description}</p>` : ''}
      </div>
    </div>
  `
    )
    .join('');
}

/**
 * Render comments timeline
 */
function renderComments(comments) {
  const timeline = document.getElementById('comments-timeline');
  const commentCount = document.getElementById('comment-count');

  timeline.innerHTML = comments
    .map(comment => {
      const isSystem = comment.is_system_note;
      const isLandlord = comment.user_type === 'landlord';
      const isBoarder = comment.user_type === 'boarder';

      let avatarClass = 'comment-avatar';
      let avatarContent = '';

      if (isSystem) {
        avatarClass += ' system';
        avatarContent =
          '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
      } else if (isLandlord) {
        avatarClass += ' landlord-avatar';
        avatarContent = getInitials(comment.first_name, comment.last_name);
      } else if (isBoarder) {
        avatarClass += ' boarder-avatar';
        avatarContent = 'You';
      }

      const authorName = isSystem ? 'System Note' : `${comment.first_name} ${comment.last_name}`;

      return `
      <div class="comment-item ${isSystem ? 'system-note' : ''}">
        <div class="${avatarClass}">${avatarContent}</div>
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(authorName)}</span>
            <span class="comment-time">${formatDate(comment.created_at)}</span>
          </div>
          <p class="comment-text">${escapeHtml(comment.comment)}</p>
        </div>
      </div>
    `;
    })
    .join('');

  commentCount.textContent = `${comments.length} comment${comments.length !== 1 ? 's' : ''}`;
}

/**
 * Setup add comment functionality
 */
function setupAddComment(requestId) {
  const submitBtn = document.getElementById('submit-comment-btn');
  const commentText = document.getElementById('comment-text');

  if (!submitBtn || !commentText) return;

  submitBtn.addEventListener('click', async () => {
    const comment = commentText.value.trim();
    if (!comment) {
      alert('Please enter a comment');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
      // TODO: API endpoint requires PHP server to be running
      // TODO: Update fetch URL to: 'http://localhost:8000/api/boarder/maintenance/${requestId}/comment'
      // TODO: Implement proper error handling with user-friendly messages
      const response = await fetch(`/server/api/boarder/maintenance/${requestId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const result = await response.json();

      // Clear textarea
      commentText.value = '';

      // Reload request details to show new comment
      loadRequestDetails(requestId);

      showNotification('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Comment';
    }
  });
}

/**
 * Setup photo upload for comments
 */
function setupPhotoUpload() {
  const attachBtn = document.getElementById('attach-photo-btn');
  const photoInput = document.getElementById('comment-photo-input');

  if (!attachBtn || !photoInput) return;

  attachBtn.addEventListener('click', () => {
    photoInput.click();
  });

  photoInput.addEventListener('change', e => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // TODO: Implement photo upload and preview
      console.log(
        'Selected files:',
        files.map(f => f.name)
      );
      showNotification(`${files.length} photo(s) selected. Upload feature coming soon!`);
    }
  });
}

/**
 * Setup contact landlord button
 */
function setupContactLandlord() {
  const contactBtn = document.getElementById('contact-landlord-btn');
  if (!contactBtn) return;

  contactBtn.addEventListener('click', () => {
    // Navigate to messages page
    window.location.href = '../messages/index.html';
  });
}

/**
 * Show error message
 */
function showError(message) {
  const container = document.querySelector('.maintenance-detail-content');
  if (container) {
    container.innerHTML = `
      <div class="error-state" style="text-align: center; padding: 60px 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; color: var(--text-gray);">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 style="margin: 16px 0 8px; color: var(--text-dark);">Oops! Something went wrong</h2>
        <p style="color: var(--text-gray); margin-bottom: 24px;">${escapeHtml(message)}</p>
        <a href="./index.html" style="display: inline-block; padding: 12px 24px; background: var(--primary-green); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Back to Maintenance Requests</a>
      </div>
    `;
  }
}

/**
 * Show notification message
 */
function showNotification(message) {
  // TODO: Implement proper notification system
  const notification = document.createElement('div');
  notification.className = 'notification-success';
  notification.textContent = message;
  notification.style.cssText =
    'position: fixed; top: 20px; right: 20px; padding: 16px 24px; background: var(--primary-green); color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; animation: slideIn 0.3s ease;';

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Get initials from name
 */
function getInitials(firstName, lastName) {
  const first = firstName ? firstName.charAt(0) : '';
  const last = lastName ? lastName.charAt(0) : '';
  return (first + last).toUpperCase();
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
