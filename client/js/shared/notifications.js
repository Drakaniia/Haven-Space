/**
 * Notification API Utility
 * Handles all notification-related API calls
 */

import CONFIG from '../config.js';
import { getAuthHeaders, authenticatedFetch } from './state.js';

/**
 * Fetch all notifications for the current user
 * @returns {Promise<{data: Array, unread_count: number}>}
 */
export async function fetchNotifications(limit = 50, offset = 0) {
  const res = await fetch(
    `${CONFIG.API_BASE_URL}/api/notifications?limit=${limit}&offset=${offset}`,
    {
      headers: getAuthHeaders(),
      credentials: 'include',
    }
  );
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

/**
 * Fetch unread notification count
 * @returns {Promise<number>}
 */
export async function fetchUnreadCount() {
  const res = await fetch(`${CONFIG.API_BASE_URL}/api/notifications/unread-count`, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch unread count');
  const json = await res.json();
  return json.data.unread_count;
}

/**
 * Mark a single notification as read
 * @param {number} notificationId
 * @returns {Promise<void>}
 */
export async function markNotificationAsRead(notificationId) {
  const res = await fetch(`${CONFIG.API_BASE_URL}/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to mark notification as read');
}

/**
 * Mark all notifications as read
 * @returns {Promise<void>}
 */
export async function markAllNotificationsAsRead() {
  const res = await fetch(`${CONFIG.API_BASE_URL}/api/notifications/read-all`, {
    method: 'PATCH',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to mark all notifications as read');
}

/**
 * Delete a notification
 * @param {number} notificationId
 * @returns {Promise<void>}
 */
export async function deleteNotification(notificationId) {
  const res = await fetch(`${CONFIG.API_BASE_URL}/api/notifications/${notificationId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete notification');
}

/**
 * Fetch boarder's accepted applications
 * @returns {Promise<Array>}
 */
export async function fetchAcceptedApplications() {
  const res = await authenticatedFetch(`${CONFIG.API_BASE_URL}/api/boarder/accepted-applications`);
  if (!res.ok) throw new Error('Failed to fetch accepted applications');
  const json = await res.json();
  return json.data;
}

/**
 * Check if boarder has any accepted applications
 * @returns {Promise<boolean>}
 */
export async function hasAcceptedApplications() {
  const res = await authenticatedFetch(
    `${CONFIG.API_BASE_URL}/api/boarder/has-accepted-applications`
  );
  if (!res.ok) throw new Error('Failed to check accepted applications');
  const json = await res.json();
  return json.data.has_accepted;
}
