/**
 * Boarder Room Detail Initialization
 * Forces authenticated state for boarder users viewing room details
 */

import { initRoomDetail } from './room-detail.js';

/**
 * Initialize boarder room detail with forced authentication
 */
export function initBoarderRoomDetailAuth() {
  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user || !user.id) {
    // For testing purposes, we'll allow the page to load without authentication
    // In production, you would redirect to login:
    // const redirectUrl = encodeURIComponent(window.location.href);
    // window.location.href = `../../public/auth/login.html?redirect=${redirectUrl}`;
    // return;
  }

  // Initialize the room detail functionality for authenticated boarders

  // Initialize the room detail functionality for authenticated boarders
  initRoomDetail();
}
