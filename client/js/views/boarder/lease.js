/**
 * Boarder Lease Page
 * Handles lease details, documents, payment history, and maintenance history
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';

// TODO: Integrate with backend API for lease data
const API_BASE_URL = 'http://localhost:8000'; // TODO: Replace with actual API base URL

function loginPath() {
  const pathname = window.location.pathname;
  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }
  if (pathname.includes('/client/views/')) {
    return '/client/views/public/auth/login.html';
  }
  return '/views/public/auth/login.html';
}

function initialsFrom(user) {
  const a = (user.first_name || '').trim().charAt(0);
  const b = (user.last_name || '').trim().charAt(0);
  return (a + b || 'B').toUpperCase();
}

/**
 * Initialize Lease Page
 * Sets up sidebar, navbar, and lease page functionality
 */
export async function initLeasePage() {
  let user;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/auth/me.php`, { credentials: 'include' });
    if (!res.ok) {
      window.location.href = loginPath();
      return;
    }
    const data = await res.json();
    user = data.user;
  } catch {
    window.location.href = loginPath();
    return;
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Boarder';
  const initials = initialsFrom(user);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'boarder',
      user: {
        name,
        initials,
        role: 'Boarder',
        email: user.email || '',
      },
    });
  }

  // Initialize navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: {
        name,
        initials,
        avatarUrl: user.avatar_url || '',
        email: user.email || '',
      },
      notificationCount: 3,
    });
  }

  // Initialize lease page functionality
  setupLeasePage();
}

/**
 * Setup lease page functionality
 */
function setupLeasePage() {
  // TODO: Fetch lease data from backend
  // fetchLeaseData();

  // TODO: Fetch lease documents from backend
  // fetchLeaseDocuments();

  // TODO: Fetch payment history from backend
  // fetchPaymentHistory();

  // TODO: Fetch maintenance history from backend
  // fetchMaintenanceHistory();

  setupDocumentDownloadHandlers();
  loadMockData();
}

/**
 * Load mock data for development/testing
 * TODO: Remove this function when backend integration is complete
 */
function loadMockData() {
  // TODO: Replace with actual API calls
}

/**
 * Setup document download button handlers
 */
function setupDocumentDownloadHandlers() {
  const downloadButtons = document.querySelectorAll('.boarder-lease-doc-btn');

  downloadButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const docId = button.dataset.docId;

      // TODO: Integrate with backend API for document download
      // await downloadDocument(docId);

      // Mock download for development
      alert(
        `TODO: Backend Integration\n\nDownloading document: ${docId}\n\nThis will connect to the backend API to fetch the actual document.`
      );
    });
  });
}

/**
 * Fetch lease data from backend
 * TODO: Integrate with backend API
 */
// async function _fetchLeaseData() {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/lease/current`, {
//       method: 'GET',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//     });
//     if (!response.ok) throw new Error('Failed to fetch lease data');
//     const data = await response.json();
//     renderLeaseDetails(data);
//   } catch (error) {
//     console.error('Error fetching lease data:', error);
//   }
// }

/**
 * Render lease details
 * @param {Object} _lease - Lease data from backend
 */
function renderLeaseDetails(_lease) {
  // TODO: Update lease details DOM elements with actual data
}

/**
 * Fetch lease documents from backend
 * TODO: Integrate with backend API
 */
// async function _fetchLeaseDocuments() {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/lease/documents`, {
//       method: 'GET',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//     });
//     if (!response.ok) throw new Error('Failed to fetch lease documents');
//     const data = await response.json();
//     renderLeaseDocuments(data);
//   } catch (error) {
//     console.error('Error fetching lease documents:', error);
//   }
// }

/**
 * Render lease documents list
 * @param {Array} _documents - Array of document objects
 */
function renderLeaseDocuments(_documents) {
  // TODO: Update documents list DOM with actual data
}

/**
 * Download a lease document
 * @param {string} docId - Document ID
 * TODO: Integrate with backend API
 */
// async function downloadDocument(docId) {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/lease/documents/${docId}/download`, {
//       method: 'GET',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//     });
//     if (!response.ok) throw new Error('Failed to download document');
//     const blob = await response.blob();
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = docId;
//     a.click();
//     window.URL.revokeObjectURL(url);
//   } catch (error) {
//     console.error('Error downloading document:', error);
//   }
// }

/**
 * Fetch payment history from backend
 * TODO: Integrate with backend API
 */
// async function _fetchPaymentHistory() {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/lease/payments`, {
//       method: 'GET',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//     });
//     if (!response.ok) throw new Error('Failed to fetch payment history');
//     const data = await response.json();
//     renderPaymentHistory(data);
//   } catch (error) {
//     console.error('Error fetching payment history:', error);
//   }
// }

/**
 * Render payment history table
 * @param {Array} _payments - Array of payment objects
 */
function renderPaymentHistory(_payments) {
  // TODO: Update payment table DOM with actual data
}

/**
 * Fetch maintenance history from backend
 * TODO: Integrate with backend API
 */
// async function _fetchMaintenanceHistory() {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/lease/maintenance`, {
//       method: 'GET',
//       headers: { 'Content-Type': 'application/json' },
//       credentials: 'include',
//     });
//     if (!response.ok) throw new Error('Failed to fetch maintenance history');
//     const data = await response.json();
//     renderMaintenanceHistory(data);
//   } catch (error) {
//     console.error('Error fetching maintenance history:', error);
//   }
// }

/**
 * Render maintenance history list
 * @param {Array} _maintenance - Array of maintenance request objects
 */
function renderMaintenanceHistory(_maintenance) {
  // TODO: Update maintenance list DOM with actual data
}

/**
 * Get authentication token from localStorage or cookie
 * @returns {string|null} Auth token
 * TODO: Implement proper auth token retrieval
 */
// function _getAuthToken() {
//   return localStorage.getItem('authToken') || null;
// }
