import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';

let currentPage = 1;
const itemsPerPage = 20;
let totalActivities = 0;
let currentFilter = 'all';
let currentDateFilter = 'all';

function injectIcons() {
  const iconElements = document.querySelectorAll('[data-icon]');
  iconElements.forEach(element => {
    const iconName = element.dataset.icon;
    const options = {
      width: element.dataset.iconWidth || 24,
      height: element.dataset.iconHeight || 24,
      strokeWidth: element.dataset.iconStrokeWidth || '1.5',
      className: element.dataset.iconClass || '',
    };
    element.innerHTML = getIcon(iconName, options);
  });
}

export function initActivity() {
  injectIcons();
  loadActivities();
  initFilters();
  initPagination();
}

async function loadActivities() {
  const container = document.getElementById('activity-list');
  if (!container) return;

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: itemsPerPage,
      filter: currentFilter,
      date: currentDateFilter,
    });

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/activity.php?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }

    const result = await response.json();

    if (result.data) {
      totalActivities = result.data.total || result.data.activities?.length || 0;
      renderActivities(result.data.activities || [], container);
      updateStats(result.data.stats || {});
      updatePagination();
    } else {
      renderEmptyState(container);
    }
  } catch (error) {
    console.error('Failed to load activities:', error);
    renderErrorState(container);
  }
}

function renderActivities(activities, container) {
  if (!activities || activities.length === 0) {
    renderEmptyState(container);
    return;
  }

  const html = activities
    .map(
      activity => `
    <div class="activity-card" data-activity-id="${activity.id}" data-activity-type="${
        activity.type
      }">
      <div class="activity-card-icon ${activity.color || 'blue'}">
        <span
          data-icon="${activity.icon || 'activity'}"
          data-icon-width="20"
          data-icon-height="20"
          data-icon-stroke-width="2"
        ></span>
      </div>
      <div class="activity-card-content">
        <div class="activity-card-header">
          <h3 class="activity-card-title">${escapeHtml(activity.title || 'Activity')}</h3>
          <span class="activity-card-badge ${activity.type}">${formatType(activity.type)}</span>
        </div>
        <p class="activity-card-text">${escapeHtml(activity.description)}</p>
        <div class="activity-card-meta">
          <span class="activity-card-time">
            <span
              data-icon="clock"
              data-icon-width="16"
              data-icon-height="16"
              data-icon-stroke-width="2"
            ></span>
            ${activity.time_ago}
          </span>
          ${
            activity.property
              ? `
          <span class="activity-card-property">
            <span
              data-icon="building"
              data-icon-width="16"
              data-icon-height="16"
              data-icon-stroke-width="2"
            ></span>
            ${escapeHtml(activity.property)}
          </span>
          `
              : ''
          }
          ${
            activity.user
              ? `
          <span class="activity-card-user">
            <span
              data-icon="user"
              data-icon-width="16"
              data-icon-height="16"
              data-icon-stroke-width="2"
            ></span>
            ${escapeHtml(activity.user)}
          </span>
          `
              : ''
          }
        </div>
      </div>
      <div class="activity-card-actions">
        ${
          activity.action_url
            ? `
        <a href="${escapeHtml(
          activity.action_url
        )}" class="landlord-btn landlord-btn-outline landlord-btn-sm">
          View Details
        </a>
        `
            : ''
        }
      </div>
    </div>
  `
    )
    .join('');

  container.innerHTML = html;
  injectIcons();
}

function renderEmptyState(container) {
  container.innerHTML = `
    <div class="activity-empty">
      <div class="activity-empty-icon">
        <span
          data-icon="inbox"
          data-icon-width="48"
          data-icon-height="48"
          data-icon-stroke-width="1.5"
        ></span>
      </div>
      <p class="activity-empty-text">No activities found</p>
      <p class="activity-empty-subtext">Activities will appear here as boarders interact with your properties.</p>
    </div>
  `;
  injectIcons();
}

function renderErrorState(container) {
  container.innerHTML = `
    <div class="activity-error">
      <div class="activity-error-icon">
        <span
          data-icon="exclamationCircle"
          data-icon-width="48"
          data-icon-height="48"
          data-icon-stroke-width="1.5"
        ></span>
      </div>
      <p class="activity-error-text">Unable to load activities</p>
      <p class="activity-error-subtext">Please try again later.</p>
      <button type="button" class="landlord-btn landlord-btn-primary" id="retry-btn">
        <span
          data-icon="arrowPath"
          data-icon-width="20"
          data-icon-height="20"
          data-icon-stroke-width="2"
        ></span>
        Retry
      </button>
    </div>
  `;
  injectIcons();

  document.getElementById('retry-btn')?.addEventListener('click', () => loadActivities());
}

function updateStats(stats) {
  const totalEl = document.getElementById('total-activities');
  const weekEl = document.getElementById('week-activities');
  const pendingEl = document.getElementById('pending-actions');

  if (totalEl) totalEl.textContent = stats.total || totalActivities;
  if (weekEl) weekEl.textContent = stats.this_week || '--';
  if (pendingEl) pendingEl.textContent = stats.pending || '--';
}

function updatePagination() {
  const totalPages = Math.ceil(totalActivities / itemsPerPage);
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function initFilters() {
  const filterSelect = document.getElementById('activity-filter');
  const dateFilterSelect = document.getElementById('activity-date-filter');

  filterSelect?.addEventListener('change', e => {
    currentFilter = e.target.value;
    currentPage = 1;
    loadActivities();
  });

  dateFilterSelect?.addEventListener('change', e => {
    currentDateFilter = e.target.value;
    currentPage = 1;
    loadActivities();
  });
}

function initPagination() {
  document.getElementById('prev-page')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadActivities();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  document.getElementById('next-page')?.addEventListener('click', () => {
    const totalPages = Math.ceil(totalActivities / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      loadActivities();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function formatType(type) {
  const types = {
    payment: 'Payment',
    application: 'Application',
    maintenance: 'Maintenance',
    message: 'Message',
    general: 'General',
  };
  return types[type] || type || 'Activity';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  initActivity();
});
