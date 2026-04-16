/**
 * Boarder Announcements
 * Handles viewing and filtering announcements from landlords
 */

import CONFIG from '../../config.js';
import { showToast } from '../../shared/toast.js';

let allAnnouncements = [];

/**
 * Initialize announcements page
 */
export function initAnnouncements() {
  initFilterTabs();
  loadAnnouncements();
}

/**
 * Load announcements from API
 */
async function loadAnnouncements() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/announcements`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }

    const result = await response.json();
    if (result.success !== false && result.data) {
      allAnnouncements = result.data.announcements || [];
      renderAnnouncements(allAnnouncements);
    }
  } catch (error) {
    console.error('Failed to load announcements:', error);
    showToast('Failed to load announcements', 'error');
  }
}

/**
 * Render announcements list
 */
function renderAnnouncements(announcements) {
  const listContainer = document.getElementById('announcements-list');
  if (!listContainer) {
    return;
  }

  if (announcements.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 48px 24px; color: #6b7280;">
        <p style="font-size: 16px; margin-bottom: 8px;">No announcements yet</p>
        <p style="font-size: 14px;">You'll see announcements from your landlord here</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = announcements
    .map(announcement => {
      const isUnread = !announcement.is_viewed;
      const categoryClass = `boarder-announcement-badge-${announcement.category}`;
      const priorityClass = `boarder-announcement-badge-${announcement.priority}`;
      const date = new Date(announcement.publish_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Icon color based on category
      const iconColorMap = {
        urgent: 'orange',
        maintenance: 'blue',
        general: 'green',
        reminder: 'purple',
        event: 'blue',
      };
      const iconColor = iconColorMap[announcement.category] || 'blue';

      // Icon name based on category
      const iconNameMap = {
        urgent: 'exclamationTriangle',
        maintenance: 'wrenchScrewdriver',
        general: 'info',
        reminder: 'bell',
        event: 'calendar',
      };
      const iconName = iconNameMap[announcement.category] || 'info';

      return `
      <div
        class="boarder-announcement-item ${isUnread ? 'unread' : ''}"
        data-category="${announcement.category}"
        data-priority="${announcement.priority}"
        data-announcement-id="${announcement.id}"
      >
        <div class="boarder-announcement-icon ${iconColor}">
          <span
            data-icon="${iconName}"
            data-icon-width="24"
            data-icon-height="24"
            data-icon-stroke-width="2"
          ></span>
        </div>
        <div class="boarder-announcement-content">
          <div class="boarder-announcement-header">
            <div class="boarder-announcement-badges">
              <span class="boarder-announcement-badge ${categoryClass}">${
        announcement.category
      }</span>
              <span class="boarder-announcement-badge ${priorityClass}">${
        announcement.priority
      }</span>
            </div>
            ${
              isUnread
                ? `
            <button class="boarder-mark-read-btn" title="Mark as read" data-id="${announcement.id}">
              <span
                data-icon="checkSimple"
                data-icon-width="20"
                data-icon-height="20"
                data-icon-stroke-width="2"
              ></span>
            </button>
            `
                : ''
            }
          </div>
          <h3 class="boarder-announcement-title">${announcement.title}</h3>
          <p class="boarder-announcement-text">${announcement.description}</p>
          <div class="boarder-announcement-meta">
            <span class="boarder-announcement-date">
              <span
                data-icon="calendarDays"
                data-icon-width="16"
                data-icon-height="16"
                data-icon-stroke-width="2"
              ></span>
              ${date}
            </span>
            <span class="boarder-announcement-from">
              <span
                data-icon="user"
                data-icon-width="16"
                data-icon-height="16"
                data-icon-stroke-width="2"
              ></span>
              ${announcement.landlord_name} (Landlord)
            </span>
          </div>
        </div>
        ${isUnread ? '<div class="boarder-announcement-unread-dot"></div>' : ''}
      </div>
    `;
    })
    .join('');

  // Re-attach event listeners
  initMarkAsRead();
}

/**
 * Initialize filter tabs functionality
 */
function initFilterTabs() {
  const filterTabs = document.querySelectorAll('.announcement-filter-tab');

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      filterTabs.forEach(t => t.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Filter announcements
      const filter = tab.dataset.filter;
      filterAnnouncements(filter);
    });
  });
}

/**
 * Filter announcements based on selected filter
 * @param {string} filter - Filter type (all, unread, urgent, maintenance, general)
 */
function filterAnnouncements(filter) {
  let filteredAnnouncements = allAnnouncements;

  switch (filter) {
    case 'unread':
      filteredAnnouncements = allAnnouncements.filter(a => !a.is_viewed);
      break;
    case 'urgent':
      filteredAnnouncements = allAnnouncements.filter(
        a => a.category === 'urgent' || a.priority === 'high'
      );
      break;
    case 'maintenance':
      filteredAnnouncements = allAnnouncements.filter(a => a.category === 'maintenance');
      break;
    case 'general':
      filteredAnnouncements = allAnnouncements.filter(a => a.category === 'general');
      break;
    default:
      filteredAnnouncements = allAnnouncements;
  }

  renderAnnouncements(filteredAnnouncements);
}

/**
 * Initialize mark as read functionality
 */
function initMarkAsRead() {
  const markReadButtons = document.querySelectorAll('.boarder-mark-read-btn');

  markReadButtons.forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const announcementId = btn.dataset.id;
      await markAsRead(announcementId);
    });
  });

  // Also mark as read when clicking on the announcement
  const announcements = document.querySelectorAll('.boarder-announcement-item.unread');
  announcements.forEach(announcement => {
    announcement.addEventListener('click', async () => {
      const announcementId = announcement.dataset.announcementId;
      await markAsRead(announcementId);
    });
  });
}

/**
 * Mark an announcement as read
 * @param {string} announcementId - The announcement ID to mark as read
 */
async function markAsRead(announcementId) {
  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/boarder/announcements/${announcementId}/view`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to mark as read');
    }

    // Update local state
    const announcement = allAnnouncements.find(a => a.id === parseInt(announcementId));
    if (announcement) {
      announcement.is_viewed = true;
      announcement.viewed_at = new Date().toISOString();
    }

    // Update UI
    const announcementItem = document.querySelector(
      `.boarder-announcement-item[data-announcement-id="${announcementId}"]`
    );
    if (announcementItem) {
      announcementItem.classList.remove('unread');

      const unreadDot = announcementItem.querySelector('.boarder-announcement-unread-dot');
      if (unreadDot) {
        unreadDot.remove();
      }

      const markReadBtn = announcementItem.querySelector('.boarder-mark-read-btn');
      if (markReadBtn) {
        markReadBtn.remove();
      }
    }
  } catch (error) {
    console.error('Failed to mark announcement as read:', error);
    // Don't show error toast - this is a non-critical action
  }
}
