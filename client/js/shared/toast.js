/**
 * Shared toast notification utility
 * Provides a consistent toast notification system across all pages
 */

import { getIcon } from '../shared/icons.js';

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'error', 'success', 'warning'
 * @param {number} duration - Auto-remove duration in ms (default: 5000)
 */
export function showToast(message, type = 'success', duration = 5000) {
  // Remove existing toast
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;

  const iconMap = {
    error: 'exclamationCircle',
    success: 'checkCircle',
    warning: 'exclamationTriangle',
  };

  toast.innerHTML = `
    <div class="toast-icon">
      ${getIcon(iconMap[type] || 'exclamationCircle', { width: 20, height: 20, strokeWidth: '2' })}
    </div>
    <div class="toast-content">${message}</div>
    <button class="toast-close" aria-label="Close notification">
      ${getIcon('xMark', { width: 16, height: 16, strokeWidth: '2' })}
    </button>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto remove after duration
  const autoRemoveTimeout = setTimeout(() => {
    removeToast(toast);
  }, duration);

  // Close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(autoRemoveTimeout);
    removeToast(toast);
  });

  return toast;
}

/**
 * Remove toast notification
 * @param {HTMLElement} toast - Toast element to remove
 */
function removeToast(toast) {
  toast.classList.remove('toast-visible');
  setTimeout(() => {
    toast.remove();
  }, 300);
}
