/**
 * Boarder Announcements
 * Handles viewing and filtering announcements from landlords
 */

/**
 * Initialize announcements page
 */
export function initAnnouncements() {
  initFilterTabs();
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
  const announcements = document.querySelectorAll('.boarder-announcement-item');

  announcements.forEach(announcement => {
    const category = announcement.dataset.category;
    const priority = announcement.dataset.priority;
    const isUnread = announcement.classList.contains('unread');

    let shouldShow = true;

    switch (filter) {
      case 'unread':
        shouldShow = isUnread;
        break;
      case 'urgent':
        shouldShow = category === 'urgent' || priority === 'high';
        break;
      case 'maintenance':
        shouldShow = category === 'maintenance';
        break;
      case 'general':
        shouldShow = category === 'general';
        break;
      default:
        shouldShow = true;
    }

    announcement.style.display = shouldShow ? 'flex' : 'none';
  });
}

/**
 * Initialize mark as read functionality
 */
function initMarkAsRead() {
  const markReadButtons = document.querySelectorAll('.boarder-mark-read-btn');

  markReadButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const announcementItem = btn.closest('.boarder-announcement-item');

      if (announcementItem) {
        markAsRead(announcementItem);
      }
    });
  });

  // Also mark as read when clicking on the announcement
  const announcements = document.querySelectorAll('.boarder-announcement-item');
  announcements.forEach(announcement => {
    announcement.addEventListener('click', () => {
      if (announcement.classList.contains('unread')) {
        markAsRead(announcement);
      }
    });
  });
}

/**
 * Mark an announcement as read
 * @param {HTMLElement} announcementItem - The announcement item to mark as read
 */
function markAsRead(announcementItem) {
  // Remove unread class
  announcementItem.classList.remove('unread');

  // Remove the unread dot
  const unreadDot = announcementItem.querySelector('.boarder-announcement-unread-dot');
  if (unreadDot) {
    unreadDot.remove();
  }

  // Remove the mark as read button
  const markReadBtn = announcementItem.querySelector('.boarder-mark-read-btn');
  if (markReadBtn) {
    markReadBtn.remove();
  }

  // TODO: Connect to backend API to update read status
  console.log('Marked announcement as read');
}

/**
 * Initialize all components when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initAnnouncements();
});
