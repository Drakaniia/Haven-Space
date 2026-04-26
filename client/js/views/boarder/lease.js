/**
 * Boarder Lease Page
 * Handles lease details, documents, payment history, and maintenance history
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { initBoarderAccessControl, showProtectedEmptyState } from './access-control-init.js';

// TODO: Integrate with backend API for lease data
const API_BASE_URL = 'http://localhost:8000'; // TODO: Replace with actual API base URL

function loginPath() {
  const pathname = window.location.pathname;
  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }
  if (pathname.includes('/views/')) {
    return '/views/public/auth/login.html';
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
  // Check access control first
  const accessResult = await initBoarderAccessControl();

  if (!accessResult.hasAccess) {
    const leaseContainer =
      document.querySelector('.lease-container') || document.querySelector('main');
    if (leaseContainer) {
      showProtectedEmptyState(leaseContainer, 'lease');
    }
    return;
  }

  let user;
  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
      credentials: 'include',
      headers,
    });
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
  // Fetch lease data from backend
  fetchLeaseData();

  // Fetch payment history from backend
  fetchPaymentHistory();

  setupDocumentDownloadHandlers();
}

/**
 * Fetch lease data from backend
 */
async function fetchLeaseData() {
  try {
    const userId = localStorage.getItem('user_id') || '3';
    const token = localStorage.getItem('token');
    console.log('[Lease] Fetching lease data for user ID:', userId);
    console.log('[Lease] Token available:', !!token);

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication - prefer JWT token, fallback to X-User-Id for testing
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-User-Id'] = userId;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/lease`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('[Lease] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Lease] API error response:', errorText);
      throw new Error(`Failed to fetch lease data: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Lease] API response:', result);

    if (result.success && result.data) {
      console.log('[Lease] Rendering lease details');
      renderLeaseDetails(result.data);
    } else {
      console.log('[Lease] No lease data returned. Message:', result.message);
      console.log('[Lease] Full result object:', JSON.stringify(result, null, 2));
      showNoLeaseState();
    }
  } catch (error) {
    console.error('[Lease] Error fetching lease data:', error);
    console.error('[Lease] Error stack:', error.stack);
    showNoLeaseState();
  }
}

/**
 * Show no lease state
 */
function showNoLeaseState() {
  const content = document.querySelector('.lease-page-content');
  if (content) {
    content.innerHTML = `
      <div style="text-align: center; padding: 80px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 24px; opacity: 0.5;">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #111827;">No Active Lease</h2>
        <p style="margin: 0 0 24px 0; font-size: 16px;">You don't have an active lease yet. Apply for a room to get started!</p>
        <a href="../find-a-room/index.html" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">Find a Room</a>
      </div>
    `;
  }
}

/**
 * Render lease details
 * @param {Object} lease - Lease data from backend
 */
function renderLeaseDetails(lease) {
  // Update property badge and title
  const propertyBadge = document.querySelector('.lease-property-badge span:last-child');
  if (propertyBadge) {
    propertyBadge.textContent = lease.property_name;
  }

  const propertyTitle = document.querySelector('.lease-property-title');
  if (propertyTitle) {
    propertyTitle.textContent = `Room ${lease.room_number} • ${lease.property_name}`;
  }

  const propertySubtitle = document.querySelector('.lease-property-subtitle');
  if (propertySubtitle) {
    const startDate = new Date(lease.lease_start_date);
    const formattedDate = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    propertySubtitle.textContent = `Your home away from home since ${formattedDate}`;
  }

  // Update lease progress
  const progressPercentage = (lease.current_month / lease.total_months) * 100;
  const progressFill = document.querySelector('.lease-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${progressPercentage}%`;
  }

  const progressText = document.querySelector('.lease-progress-percentage');
  if (progressText) {
    progressText.textContent = `Month ${lease.current_month} of ${lease.total_months}`;
  }

  const daysLeftValue = document.querySelector('.lease-progress-stat-value');
  if (daysLeftValue) {
    daysLeftValue.textContent = lease.days_until_end;
  }

  const leaseEndsValue = document.querySelectorAll('.lease-progress-stat-value')[1];
  if (leaseEndsValue) {
    const endDate = new Date(lease.end_date);
    leaseEndsValue.textContent = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Update key information cards
  const monthlyRentValue = document.querySelector('.lease-key-card-primary .lease-key-card-value');
  if (monthlyRentValue) {
    monthlyRentValue.textContent = `₱${formatCurrency(lease.monthly_rent)}`;
  }

  const securityDepositValue = document.querySelectorAll('.lease-key-card-value')[1];
  if (securityDepositValue) {
    securityDepositValue.textContent = `₱${formatCurrency(lease.monthly_rent * 2)}`;
  }

  const leaseDurationValue = document.querySelectorAll('.lease-key-card-value')[2];
  if (leaseDurationValue) {
    leaseDurationValue.textContent = `${lease.total_months} Months`;
  }

  const leaseDurationNote = document.querySelectorAll('.lease-key-card-note')[2];
  if (leaseDurationNote) {
    const startDate = new Date(lease.lease_start_date);
    const endDate = new Date(lease.end_date);
    const formattedStart = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedEnd = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    leaseDurationNote.textContent = `${formattedStart} - ${formattedEnd}`;
  }

  // Update lease information section
  updateLeaseInformationSection(lease);
}

/**
 * Update lease information section
 */
function updateLeaseInformationSection(lease) {
  // Property Address
  const propertyAddressValue = document.querySelector('[data-lease-info="property-address"]');
  if (propertyAddressValue) {
    propertyAddressValue.textContent = lease.address;
  }

  // Lease Type
  const leaseTypeValue = document.querySelector('[data-lease-info="lease-type"]');
  if (leaseTypeValue) {
    leaseTypeValue.textContent = `${lease.total_months}-month contract`;
  }

  // Lease Period
  const leasePeriodValue = document.querySelector('[data-lease-info="lease-period"]');
  if (leasePeriodValue) {
    const startDate = new Date(lease.lease_start_date);
    const endDate = new Date(lease.end_date);
    const formattedStart = startDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedEnd = endDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    leasePeriodValue.textContent = `${formattedStart} - ${formattedEnd}`;
  }

  // Payment Details
  const monthlyRentDetail = document.querySelector('[data-lease-info="monthly-rent"]');
  if (monthlyRentDetail) {
    monthlyRentDetail.textContent = `Monthly: ₱${formatCurrency(lease.monthly_rent)}`;
  }

  const securityDepositDetail = document.querySelector('[data-lease-info="security-deposit"]');
  if (securityDepositDetail) {
    securityDepositDetail.textContent = `Security: ₱${formatCurrency(lease.monthly_rent * 2)}`;
  }

  const dueDate = document.querySelector('[data-lease-info="due-date"]');
  if (dueDate) {
    dueDate.textContent = 'Due on 1st of each month';
  }
}

/**
 * Format currency value
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Fetch payment history from backend
 */
async function fetchPaymentHistory() {
  try {
    const userId = localStorage.getItem('user_id') || '3';
    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication - prefer JWT token, fallback to X-User-Id for testing
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-User-Id'] = userId;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/history?limit=10`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch payment history');

    const result = await response.json();

    if (result.success && result.data) {
      renderPaymentHistory(result.data);
    }
  } catch (error) {
    console.error('Error fetching payment history:', error);
  }
}

/**
 * Render payment history table
 * @param {Array} payments - Array of payment objects
 */
function renderPaymentHistory(payments) {
  const tbody = document.querySelector('.lease-table-body');
  if (!tbody) return;

  if (!payments || payments.length === 0) {
    tbody.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6b7280; grid-column: 1 / -1;">
        <p style="margin: 0;">No payment history available</p>
      </div>
    `;
    return;
  }

  tbody.innerHTML = payments
    .map(payment => {
      const dueDate = new Date(payment.due_date);
      const paidDate = payment.payment_date ? new Date(payment.payment_date) : null;

      const formattedDueDate = dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedPaidDate = paidDate
        ? paidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-';

      const period = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const statusClass = payment.status === 'paid' ? 'lease-status-paid' : 'lease-status-pending';
      const statusText = payment.status === 'paid' ? 'Paid' : 'Pending';

      return `
      <div class="lease-table-row">
        <span class="lease-table-cell">${period}</span>
        <span class="lease-table-cell lease-table-cell-bold">₱${formatCurrency(
          payment.amount
        )}</span>
        <span class="lease-table-cell">${formattedDueDate}</span>
        <span class="lease-table-cell">${formattedPaidDate}</span>
        <span class="lease-table-cell">
          <span class="lease-status-badge ${statusClass}">${statusText}</span>
        </span>
      </div>
    `;
    })
    .join('');
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
      alert(
        `TODO: Backend Integration\n\nDownloading document: ${docId}\n\nThis will connect to the backend API to fetch the actual document.`
      );
    });
  });
}
