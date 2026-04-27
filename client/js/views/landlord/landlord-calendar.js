/**
 * Landlord Calendar
 * Renders a monthly calendar with real events fetched from the API.
 * Event types: payment (green/red), lease (blue), maintenance (orange/red)
 */

import CONFIG from '../../config.js';
import { getIcon } from '../../shared/icons.js';

// ─── State ────────────────────────────────────────────────────────────────────

let currentDate = new Date();
let _currentView = 'month';
/** @type {Array<Object>} */
let events = [];
/** @type {Object|null} */
let activeEvent = null;
let isLoading = false;

// ─── Icon injection ───────────────────────────────────────────────────────────

function injectIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    el.innerHTML = getIcon(el.dataset.icon, {
      width: el.dataset.iconWidth || 24,
      height: el.dataset.iconHeight || 24,
      strokeWidth: el.dataset.iconStrokeWidth || '1.5',
      className: el.dataset.iconClass || '',
    });
  });
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Fetch calendar events for the visible date range (±1 month buffer).
 */
async function fetchEvents() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch a 3-month window centred on the current month so navigation feels instant
  const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const endDate = new Date(year, month + 2, 0).toISOString().slice(0, 10);

  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/calendar?start_date=${startDate}&end_date=${endDate}`,
      {
        method: 'GET',
        headers,
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.events)) {
      // Normalise dates to Date objects
      events = result.events.map(e => ({ ...e, date: new Date(e.date + 'T00:00:00') }));
    } else {
      events = [];
    }
  } catch (err) {
    console.error('Failed to load calendar events:', err);
    events = [];
    showCalendarError();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return events that fall on a given calendar day.
 * @param {Date} date
 */
function getEventsForDate(date) {
  return events.filter(
    e =>
      e.date.getDate() === date.getDate() &&
      e.date.getMonth() === date.getMonth() &&
      e.date.getFullYear() === date.getFullYear()
  );
}

/**
 * Format a Date (or ISO string) to a human-readable string.
 * @param {Date|string} date
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a Date (or ISO string) to a short string for event cards.
 * @param {Date|string} date
 */
function formatDateShort(date) {
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// ─── Loading / Error states ───────────────────────────────────────────────────

function showCalendarLoading() {
  const container = document.getElementById('calendarDays');
  if (!container) return;
  container.innerHTML = `
    <div class="calendar-loading" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--dashboard-text-secondary);">
      <div class="calendar-spinner"></div>
      <p style="margin-top: 12px; font-size: 14px;">Loading events…</p>
    </div>
  `;
}

function showCalendarError() {
  const container = document.getElementById('calendarDays');
  if (!container) return;
  // Don't wipe the grid — just show a toast-style notice
  const notice = document.createElement('div');
  notice.className = 'calendar-error-notice';
  notice.textContent = 'Could not load events. Check your connection and try again.';
  container.parentElement?.insertAdjacentElement('afterend', notice);
}

function showUpcomingLoading() {
  const list = document.getElementById('upcomingEventsList');
  if (!list) return;
  list.innerHTML = `
    <div class="upcoming-loading" style="text-align: center; padding: 2rem; color: var(--dashboard-text-secondary); font-size: 14px;">
      Loading upcoming events…
    </div>
  `;
}

function showUpcomingEmpty() {
  const list = document.getElementById('upcomingEventsList');
  if (!list) return;
  list.innerHTML = `
    <div class="upcoming-empty">
      <div class="upcoming-empty-icon">
        <span data-icon="calendar" data-icon-width="40" data-icon-height="40" data-icon-stroke-width="1.5"></span>
      </div>
      <p class="upcoming-empty-text">No upcoming events in the next 30 days.</p>
    </div>
  `;
  injectIcons();
}

// ─── Calendar rendering ───────────────────────────────────────────────────────

function updateMonthTitle() {
  const el = document.getElementById('calendarMonthTitle');
  if (!el) return;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  el.textContent = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

function renderCalendarDays() {
  const container = document.getElementById('calendarDays');
  if (!container) return;

  container.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevMonthLastDay = new Date(year, month, 0);

  const startDow = firstDay.getDay(); // 0 = Sunday
  const totalDays = lastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Previous-month filler days
  for (let i = startDow - 1; i >= 0; i--) {
    container.appendChild(createDayElement(prevMonthLastDay.getDate() - i, true, false));
  }

  // Current-month days
  for (let day = 1; day <= totalDays; day++) {
    const dayDate = new Date(year, month, day);
    const isToday = dayDate.getTime() === today.getTime();
    const el = createDayElement(day, false, isToday);
    addEventsToDay(el, getEventsForDate(dayDate));
    container.appendChild(el);
  }

  // Next-month filler days (fill to 6 rows = 42 cells)
  const filled = container.children.length;
  const remaining = 42 - filled;
  for (let day = 1; day <= remaining; day++) {
    container.appendChild(createDayElement(day, true, false));
  }

  updateMonthTitle();
}

function createDayElement(dayNumber, isOtherMonth, isToday) {
  const el = document.createElement('div');
  el.className = 'calendar-day';
  if (isOtherMonth) el.classList.add('other-month');
  if (isToday) el.classList.add('today');

  const num = document.createElement('div');
  num.className = 'calendar-day-number';
  num.textContent = dayNumber;
  el.appendChild(num);

  const eventsWrap = document.createElement('div');
  eventsWrap.className = 'calendar-day-events';
  el.appendChild(eventsWrap);

  return el;
}

function addEventsToDay(dayEl, dayEvents) {
  const wrap = dayEl.querySelector('.calendar-day-events');
  if (!wrap || dayEvents.length === 0) return;

  const MAX_VISIBLE = 3;

  dayEvents.slice(0, MAX_VISIBLE).forEach(event => {
    const chip = document.createElement('div');
    chip.className = `calendar-event calendar-event-${event.color}`;
    chip.textContent = event.title;
    chip.dataset.eventId = event.id;
    chip.addEventListener('click', e => {
      e.stopPropagation();
      showEventModal(event);
    });
    wrap.appendChild(chip);
  });

  if (dayEvents.length > MAX_VISIBLE) {
    const more = document.createElement('div');
    more.className = 'calendar-more-events';
    more.textContent = `+${dayEvents.length - MAX_VISIBLE} more`;
    more.addEventListener('click', e => {
      e.stopPropagation();
      showDayEventsModal(dayEvents);
    });
    wrap.appendChild(more);
  }
}

// ─── Upcoming events list ─────────────────────────────────────────────────────

function renderUpcomingEvents() {
  const list = document.getElementById('upcomingEventsList');
  if (!list) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + 30);

  const upcoming = events
    .filter(e => e.date >= now && e.date <= cutoff)
    .sort((a, b) => a.date - b.date)
    .slice(0, 8);

  if (upcoming.length === 0) {
    showUpcomingEmpty();
    return;
  }

  list.innerHTML = upcoming.map(event => buildEventCard(event)).join('');
  injectIcons();

  // Attach click handlers
  list.querySelectorAll('.event-card').forEach(card => {
    const id = card.dataset.eventId;
    const event = events.find(e => e.id === id);
    if (event) card.addEventListener('click', () => showEventModal(event));
  });
}

function buildEventCard(event) {
  const propertyMeta = event.property
    ? `<div class="event-meta-item">
        <span data-icon="home" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
        <span>${event.property}</span>
      </div>`
    : '';

  const tenantMeta = event.tenant
    ? `<div class="event-meta-item">
        <span data-icon="user" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
        <span>${event.tenant}</span>
      </div>`
    : '';

  const amountMeta = event.amount
    ? `<div class="event-meta-item event-meta-amount">
        <span data-icon="currencyDollar" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
        <span>${event.amount}</span>
      </div>`
    : '';

  const statusBadge = event.status
    ? `<span class="event-status-chip event-status-${event.status}">${capitalizeFirst(
        event.status
      )}</span>`
    : '';

  return `
    <div class="event-card" data-event-id="${event.id}" role="button" tabindex="0" aria-label="${
    event.title
  }">
      <div class="event-card-accent event-card-accent-${event.color}"></div>
      <div class="event-card-content">
        <div class="event-card-header">
          <h3 class="event-card-title">${event.title}</h3>
          <div class="event-card-badges">
            <span class="event-card-badge event-badge-${event.type}">${capitalizeFirst(
    event.type
  )}</span>
            ${statusBadge}
          </div>
        </div>
        <div class="event-card-meta">
          <div class="event-meta-item">
            <span data-icon="calendar" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
            <span>${formatDateShort(event.date)}</span>
          </div>
          ${propertyMeta}
          ${tenantMeta}
          ${amountMeta}
        </div>
        ${event.description ? `<p class="event-card-description">${event.description}</p>` : ''}
      </div>
    </div>
  `;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function showEventModal(event) {
  activeEvent = event;
  const modal = document.getElementById('eventModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  if (!modal || !title || !body) return;

  title.textContent = event.title;

  const rows = [
    ['Date', formatDate(event.date)],
    ['Type', capitalizeFirst(event.type)],
    event.status
      ? [
          'Status',
          `<span class="event-status-chip event-status-${event.status}">${capitalizeFirst(
            event.status
          )}</span>`,
        ]
      : null,
    event.description ? ['Description', event.description] : null,
    event.tenant ? ['Tenant', event.tenant] : null,
    event.property ? ['Property', event.property] : null,
    event.amount ? ['Amount', `<strong>${event.amount}</strong>`] : null,
    event.payment_method ? ['Payment Method', capitalizeFirst(event.payment_method)] : null,
    event.paid_date ? ['Paid On', formatDate(event.paid_date)] : null,
    event.priority
      ? [
          'Priority',
          `<span class="event-priority-chip event-priority-${event.priority}">${capitalizeFirst(
            event.priority
          )}</span>`,
        ]
      : null,
    event.time ? ['Time', event.time] : null,
    event.action
      ? [
          'Action',
          `<span style="color: var(--primary-green); font-weight: 600;">${event.action}</span>`,
        ]
      : null,
  ].filter(Boolean);

  body.innerHTML = rows
    .map(
      ([label, value]) => `
      <div class="modal-detail-row">
        <span class="modal-detail-label">${label}</span>
        <span class="modal-detail-value">${value}</span>
      </div>`
    )
    .join('');

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Show all events for a day when "+N more" is clicked.
 */
function showDayEventsModal(dayEvents) {
  const modal = document.getElementById('eventModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  if (!modal || !title || !body) return;

  title.textContent = formatDate(dayEvents[0].date);

  body.innerHTML = dayEvents
    .map(
      event => `
      <div class="modal-day-event-item modal-day-event-${event.color}" data-event-id="${
        event.id
      }" role="button" tabindex="0">
        <span class="modal-day-event-dot modal-day-event-dot-${event.color}"></span>
        <div>
          <div class="modal-day-event-title">${event.title}</div>
          ${event.description ? `<div class="modal-day-event-desc">${event.description}</div>` : ''}
        </div>
      </div>`
    )
    .join('');

  // Allow clicking individual events inside the day-events modal
  body.querySelectorAll('.modal-day-event-item').forEach(item => {
    const id = item.dataset.eventId;
    const event = events.find(e => e.id === id);
    if (event) {
      item.addEventListener('click', () => showEventModal(event));
    }
  });

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeEventModal() {
  const modal = document.getElementById('eventModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  activeEvent = null;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

async function navigateMonth(delta) {
  if (isLoading) return;
  currentDate.setMonth(currentDate.getMonth() + delta);
  isLoading = true;
  showCalendarLoading();
  await fetchEvents();
  isLoading = false;
  renderCalendarDays();
  renderUpcomingEvents();
}

async function goToToday() {
  if (isLoading) return;
  currentDate = new Date();
  isLoading = true;
  showCalendarLoading();
  await fetchEvents();
  isLoading = false;
  renderCalendarDays();
  renderUpcomingEvents();
}

// ─── Event listeners ──────────────────────────────────────────────────────────

function initEventListeners() {
  document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(-1));
  document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(1));
  document.getElementById('todayBtn')?.addEventListener('click', goToToday);

  // View toggle
  document.querySelectorAll('.calendar-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calendar-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _currentView = btn.dataset.view;
    });
  });

  // Modal close
  document.getElementById('closeModal')?.addEventListener('click', closeEventModal);
  document.getElementById('cancelModal')?.addEventListener('click', closeEventModal);

  const modal = document.getElementById('eventModal');
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeEventModal();
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeEventModal();
  });

  // View Details button — navigate to relevant page based on event type
  document.getElementById('viewDetailsBtn')?.addEventListener('click', () => {
    if (!activeEvent) {
      closeEventModal();
      return;
    }
    closeEventModal();
    const type = activeEvent.type;
    if (type === 'payment') {
      window.location.href = '../payments/index.html';
    } else if (type === 'maintenance') {
      window.location.href = '../maintenance/index.html';
    } else if (type === 'lease') {
      window.location.href = '../applications/index.html';
    }
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Main entry point — called by main.js or directly via DOMContentLoaded.
 */
export async function initCalendar() {
  injectIcons();
  updateMonthTitle();
  showCalendarLoading();
  showUpcomingLoading();

  await fetchEvents();

  renderCalendarDays();
  renderUpcomingEvents();
  initEventListeners();
}

// Auto-init when loaded as a standalone module
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
});
