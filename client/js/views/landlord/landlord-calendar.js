/**
 * Landlord Calendar
 * Handles calendar rendering and event management
 */

import { getIcon } from '../../shared/icons.js';

/**
 * Inject icons from centralized library into elements with data-icon attributes
 */
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

/**
 * Calendar State
 */
let currentDate = new Date();
let currentView = 'month'; // 'month' or 'week'
let events = [];

/**
 * Sample Events Data (Replace with API calls)
 */
function generateSampleEvents() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  return [
    {
      id: 1,
      title: 'Rent Due - Maria Santos',
      date: new Date(year, month, 5),
      type: 'payment',
      color: 'green',
      description: 'Monthly rent payment of ₱5,500 for Sunrise Dormitory - Room 201',
      tenant: 'Maria Santos',
      property: 'Sunrise Dormitory - Room 201',
      amount: '₱5,500',
    },
    {
      id: 2,
      title: 'Rent Due - Jose Reyes',
      date: new Date(year, month, 10),
      type: 'payment',
      color: 'green',
      description: 'Monthly rent payment of ₱4,500 for Green Valley - Room 105',
      tenant: 'Jose Reyes',
      property: 'Green Valley - Room 105',
      amount: '₱4,500',
    },
    {
      id: 3,
      title: 'Lease Expiry - Pedro Cruz',
      date: new Date(year, month, 15),
      type: 'lease',
      color: 'blue',
      description: 'Lease agreement expires for Metro Boarding - Room 302',
      tenant: 'Pedro Cruz',
      property: 'Metro Boarding - Room 302',
      action: 'Renewal discussion needed',
    },
    {
      id: 4,
      title: 'Maintenance - Room 205',
      date: new Date(year, month, 18),
      type: 'maintenance',
      color: 'orange',
      description: 'Scheduled plumbing repair for Sunrise Dormitory - Room 205',
      property: 'Sunrise Dormitory - Room 205',
      contractor: 'Plumber: Juan Dela Cruz',
      time: '10:00 AM',
    },
    {
      id: 5,
      title: 'Property Inspection',
      date: new Date(year, month, 22),
      type: 'inspection',
      color: 'purple',
      description: 'Quarterly safety inspection for Green Valley',
      property: 'Green Valley',
      time: '2:00 PM',
      inspector: 'Building Inspector',
    },
    {
      id: 6,
      title: 'Rent Due - Ana Garcia',
      date: new Date(year, month, 25),
      type: 'payment',
      color: 'green',
      description: 'Monthly rent payment of ₱6,000 for Sunrise Dormitory - Room 305',
      tenant: 'Ana Garcia',
      property: 'Sunrise Dormitory - Room 305',
      amount: '₱6,000',
    },
    {
      id: 7,
      title: 'Lease Start - Luis Torres',
      date: new Date(year, month, 1),
      type: 'lease',
      color: 'blue',
      description: 'New lease agreement begins for Green Valley - Room 210',
      tenant: 'Luis Torres',
      property: 'Green Valley - Room 210',
      action: 'Welcome package prepared',
    },
    {
      id: 8,
      title: 'Overdue Payment - Carlos Lima',
      date: new Date(year, month, 20),
      type: 'payment',
      color: 'red',
      description: 'Overdue rent payment for Metro Boarding - Room 108',
      tenant: 'Carlos Lima',
      property: 'Metro Boarding - Room 108',
      amount: '₱5,000',
      action: 'Late notice sent',
    },
  ];
}

/**
 * Render Calendar Days
 */
function renderCalendarDays() {
  const calendarDaysContainer = document.getElementById('calendarDays');
  if (!calendarDaysContainer) return;

  calendarDaysContainer.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  // Previous month's last day
  const prevMonthLastDay = new Date(year, month, 0);

  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const totalDaysInMonth = lastDay.getDate();

  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // Previous month days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNumber = prevMonthLastDay.getDate() - i;
    const dayElement = createDayElement(dayNumber, true, false);
    calendarDaysContainer.appendChild(dayElement);
  }

  // Current month days
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const isToday = day === todayDate && month === todayMonth && year === todayYear;
    const dayElement = createDayElement(day, false, isToday);

    // Add events for this day
    const currentDayDate = new Date(year, month, day);
    const dayEvents = getEventsForDate(currentDayDate);
    addEventsToDay(dayElement, dayEvents);

    calendarDaysContainer.appendChild(dayElement);
  }

  // Next month days to fill the grid
  const totalCells = calendarDaysContainer.children.length;
  const remainingCells = 42 - totalCells; // 6 rows × 7 days

  for (let day = 1; day <= remainingCells; day++) {
    const dayElement = createDayElement(day, true, false);
    calendarDaysContainer.appendChild(dayElement);
  }

  // Update month title
  updateMonthTitle();
}

/**
 * Create a day element for the calendar
 */
function createDayElement(dayNumber, isOtherMonth, isToday) {
  const dayElement = document.createElement('div');
  dayElement.className = 'calendar-day';

  if (isOtherMonth) {
    dayElement.classList.add('other-month');
  }

  if (isToday) {
    dayElement.classList.add('today');
  }

  const dayNumberElement = document.createElement('div');
  dayNumberElement.className = 'calendar-day-number';
  dayNumberElement.textContent = dayNumber;
  dayElement.appendChild(dayNumberElement);

  const eventsContainer = document.createElement('div');
  eventsContainer.className = 'calendar-day-events';
  dayElement.appendChild(eventsContainer);

  return dayElement;
}

/**
 * Get events for a specific date
 */
function getEventsForDate(date) {
  return events.filter(event => {
    const eventDate = new Date(event.date);
    return (
      eventDate.getDate() === date.getDate() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getFullYear() === date.getFullYear()
    );
  });
}

/**
 * Add events to a day element
 */
function addEventsToDay(dayElement, dayEvents) {
  const eventsContainer = dayElement.querySelector('.calendar-day-events');
  if (!eventsContainer) return;

  const maxEventsToShow = 3;

  dayEvents.slice(0, maxEventsToShow).forEach(event => {
    const eventElement = document.createElement('div');
    eventElement.className = `calendar-event calendar-event-${event.color}`;
    eventElement.textContent = event.title;
    eventElement.dataset.eventId = event.id;

    eventElement.addEventListener('click', () => showEventModal(event));

    eventsContainer.appendChild(eventElement);
  });

  if (dayEvents.length > maxEventsToShow) {
    const moreElement = document.createElement('div');
    moreElement.className = 'calendar-more-events';
    moreElement.textContent = `+${dayEvents.length - maxEventsToShow} more`;
    eventsContainer.appendChild(moreElement);
  }
}

/**
 * Update month title
 */
function updateMonthTitle() {
  const titleElement = document.getElementById('calendarMonthTitle');
  if (!titleElement) return;

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

  titleElement.textContent = `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

/**
 * Show Event Modal
 */
function showEventModal(event) {
  const modal = document.getElementById('eventModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  if (!modal || !modalTitle || !modalBody) return;

  modalTitle.textContent = event.title;

  let detailsHtml = `
    <div class="modal-detail-row">
      <span class="modal-detail-label">Date</span>
      <span class="modal-detail-value">${formatDate(event.date)}</span>
    </div>
    <div class="modal-detail-row">
      <span class="modal-detail-label">Type</span>
      <span class="modal-detail-value">${capitalizeFirst(event.type)}</span>
    </div>
  `;

  if (event.description) {
    detailsHtml += `
      <div class="modal-detail-row">
        <span class="modal-detail-label">Description</span>
        <span class="modal-detail-value">${event.description}</span>
      </div>
    `;
  }

  if (event.tenant) {
    detailsHtml += `
      <div class="modal-detail-row">
        <span class="modal-detail-label">Tenant</span>
        <span class="modal-detail-value">${event.tenant}</span>
      </div>
    `;
  }

  if (event.property) {
    detailsHtml += `
      <div class="modal-detail-row">
        <span class="modal-detail-label">Property</span>
        <span class="modal-detail-value">${event.property}</span>
      </div>
    `;
  }

  if (event.amount) {
    detailsHtml += `
      <div class="modal-detail-row">
        <span class="modal-detail-label">Amount</span>
        <span class="modal-detail-value" style="font-weight: 600;">${event.amount}</span>
      </div>
    `;
  }

  if (event.time) {
    detailsHtml += `
      <div class="modal-detail-row">
        <span class="modal-detail-label">Time</span>
        <span class="modal-detail-value">${event.time}</span>
      </div>
    `;
  }

  if (event.action) {
    detailsHtml += `
      <div class="modal-detail-row">
        <span class="modal-detail-label">Action</span>
        <span class="modal-detail-value" style="color: var(--primary-green); font-weight: 600;">${event.action}</span>
      </div>
    `;
  }

  modalBody.innerHTML = detailsHtml;
  modal.classList.add('active');
}

/**
 * Format date to readable string
 */
function formatDate(date) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Render Upcoming Events List
 */
function renderUpcomingEvents() {
  const eventsList = document.getElementById('upcomingEventsList');
  if (!eventsList) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter future events and sort by date
  const upcomingEvents = events
    .filter(event => new Date(event.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  eventsList.innerHTML = '';

  upcomingEvents.forEach(event => {
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';
    eventCard.dataset.eventId = event.id;

    eventCard.innerHTML = `
      <div class="event-card-accent event-card-accent-${event.color}"></div>
      <div class="event-card-content">
        <div class="event-card-header">
          <h3 class="event-card-title">${event.title}</h3>
          <span class="event-card-badge event-badge-${event.type}">${capitalizeFirst(
      event.type
    )}</span>
        </div>
        <div class="event-card-meta">
          <div class="event-meta-item">
            <span data-icon="calendar" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
            <span>${formatDate(event.date)}</span>
          </div>
          ${
            event.property
              ? `
          <div class="event-meta-item">
            <span data-icon="home" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
            <span>${event.property}</span>
          </div>
          `
              : ''
          }
          ${
            event.tenant
              ? `
          <div class="event-meta-item">
            <span data-icon="user" data-icon-width="14" data-icon-height="14" data-icon-stroke-width="2"></span>
            <span>${event.tenant}</span>
          </div>
          `
              : ''
          }
        </div>
        ${event.description ? `<p class="event-card-description">${event.description}</p>` : ''}
      </div>
    `;

    eventCard.addEventListener('click', () => showEventModal(event));

    eventsList.appendChild(eventCard);
  });

  // Re-inject icons for dynamically added content
  injectIcons();
}

/**
 * Navigate to previous month
 */
function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendarDays();
}

/**
 * Navigate to next month
 */
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendarDays();
}

/**
 * Go to today's date
 */
function goToToday() {
  currentDate = new Date();
  renderCalendarDays();
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Navigation buttons
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  const todayBtn = document.getElementById('todayBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', previousMonth);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', nextMonth);
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', goToToday);
  }

  // View toggle buttons
  const viewButtons = document.querySelectorAll('.calendar-view-btn');
  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      // TODO: Implement week view if needed
      console.log(`Switched to ${currentView} view`);
    });
  });

  // Modal close buttons
  const closeModal = document.getElementById('closeModal');
  const cancelModal = document.getElementById('cancelModal');
  const eventModal = document.getElementById('eventModal');

  const closeEventModal = () => {
    eventModal.classList.remove('active');
  };

  if (closeModal) {
    closeModal.addEventListener('click', closeEventModal);
  }

  if (cancelModal) {
    cancelModal.addEventListener('click', closeEventModal);
  }

  // Close modal on overlay click
  if (eventModal) {
    eventModal.addEventListener('click', e => {
      if (e.target === eventModal) {
        closeEventModal();
      }
    });
  }

  // View details button
  const viewDetailsBtn = document.getElementById('viewDetailsBtn');
  if (viewDetailsBtn) {
    viewDetailsBtn.addEventListener('click', () => {
      closeEventModal();
      // TODO: Navigate to detailed view if needed
      console.log('Navigate to detailed event view');
    });
  }
}

/**
 * Initialize Calendar
 */
export function initCalendar() {
  // Inject icons
  injectIcons();

  // Generate sample events (replace with API call)
  events = generateSampleEvents();

  // Render calendar
  renderCalendarDays();

  // Render upcoming events
  renderUpcomingEvents();

  // Initialize event listeners
  initEventListeners();
}

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();
});
