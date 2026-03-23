/**
 * Sidebar Component
 * Reusable sidebar with role-based navigation
 */

// Navigation configurations per role
const NAV_CONFIG = {
  boarder: [
    {
      group: 'Main',
      items: [
        {
          label: 'Dashboard',
          href: '../boarder/index.html',
          icon: 'home',
        },
        {
          label: 'Browse Listings',
          href: '../rooms/index.html',
          icon: 'search',
        },
        {
          label: 'Saved Listings',
          href: '#',
          icon: 'bookmark',
        },
        {
          label: 'My Bookings',
          href: '#',
          icon: 'calendar',
        },
        {
          label: 'Messages',
          href: '../messages/index.html',
          icon: 'chat',
          badge: '3',
        },
        {
          label: 'Payments',
          href: '../payments/index.html',
          icon: 'payment',
        },
      ],
    },
    {
      group: 'Support',
      items: [
        {
          label: 'Maintenance',
          href: '../maintenance/index.html',
          icon: 'settings',
        },
        {
          label: 'Notices',
          href: '../notices/index.html',
          icon: 'announcement',
        },
      ],
    },
  ],
  landlord: [
    {
      group: 'Main',
      items: [
        {
          label: 'Dashboard',
          href: '../landlord/index.html',
          icon: 'home',
        },
        {
          label: 'My Listings',
          href: '../landlord/listings/index.html',
          icon: 'list',
        },
        {
          label: 'Applications',
          href: '../landlord/applications/index.html',
          icon: 'application',
        },
        {
          label: 'Boarders',
          href: '../landlord/boarders/index.html',
          icon: 'users',
        },
        {
          label: 'Messages',
          href: '../landlord/messages/index.html',
          icon: 'chat',
          badge: '5',
        },
        {
          label: 'Payments',
          href: '../landlord/payments/index.html',
          icon: 'payment',
        },
      ],
    },
    {
      group: 'Management',
      items: [
        {
          label: 'Maintenance',
          href: '../landlord/maintenance/index.html',
          icon: 'settings',
        },
        {
          label: 'Reports',
          href: '../landlord/reports/index.html',
          icon: 'analytics',
        },
      ],
    },
  ],
  admin: [
    {
      group: 'Main',
      items: [
        {
          label: 'Dashboard',
          href: '../admin/index.html',
          icon: 'home',
        },
        {
          label: 'Users',
          href: '../admin/users/index.html',
          icon: 'users',
        },
        {
          label: 'Properties',
          href: '../admin/properties/index.html',
          icon: 'list',
        },
        {
          label: 'Bookings',
          href: '../admin/bookings/index.html',
          icon: 'calendar',
        },
        {
          label: 'Analytics',
          href: '../admin/analytics/index.html',
          icon: 'analytics',
        },
      ],
    },
    {
      group: 'System',
      items: [
        {
          label: 'Settings',
          href: '../admin/settings/index.html',
          icon: 'settings',
        },
        {
          label: 'Logs',
          href: '../admin/logs/index.html',
          icon: 'announcement',
        },
      ],
    },
  ],
};

// Icon SVG templates
const ICONS = {
  home: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>`,
  search: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>`,
  bookmark: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>`,
  calendar: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>`,
  chat: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>`,
  payment: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>`,
  settings: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>`,
  announcement: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>`,
  list: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>`,
  application: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>`,
  users: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>`,
  analytics: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>`,
};

/**
 * Initialize sidebar component
 * @param {Object} options - Configuration options
 * @param {string} options.role - User role: 'boarder', 'landlord', or 'admin'
 * @param {string} options.containerId - ID of container element (default: 'sidebar-container')
 * @param {Object} options.user - User info object with name, initials, role
 */
export function initSidebar(options = {}) {
  const {
    role = 'boarder',
    containerId = 'sidebar-container',
    user = {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      role: 'Boarder',
    },
  } = options;

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Sidebar container #${containerId} not found`);
    return;
  }

  // Load sidebar HTML template
  fetch('../../components/sidebar.html')
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      // Render navigation
      renderNavigation(role);

      // Update user info
      updateUserInfo(user);

      // Set active state based on current URL
      setActiveState();

      // Setup logout handler
      setupLogoutHandler();
    })
    .catch(err => {
      console.error('Failed to load sidebar template:', err);
    });
}

/**
 * Render navigation items based on role
 */
function renderNavigation(role) {
  const navContent = document.getElementById('sidebar-nav-content');
  if (!navContent) return;

  const config = NAV_CONFIG[role] || NAV_CONFIG.boarder;
  navContent.innerHTML = config
    .map(
      group => `
        <div class="sidebar-nav-group">
          <div class="sidebar-nav-title">${group.group}</div>
          ${group.items.map(renderNavItem).join('')}
        </div>
      `
    )
    .join('');
}

/**
 * Render a single nav item
 */
function renderNavItem(item) {
  const icon = ICONS[item.icon] || ICONS.home;
  const badge = item.badge ? `<span class="sidebar-nav-badge">${item.badge}</span>` : '';

  return `
    <a href="${item.href}" class="sidebar-nav-item" data-href="${item.href}">
      ${icon}
      ${item.label}
      ${badge}
    </a>
  `;
}

/**
 * Update user profile info
 */
function updateUserInfo(user) {
  const avatar = document.getElementById('sidebar-avatar');
  const name = document.getElementById('sidebar-profile-name');
  const role = document.getElementById('sidebar-profile-role');

  if (avatar) avatar.textContent = user.initials || 'JD';
  if (name) name.textContent = user.name || 'Juan Dela Cruz';
  if (role) role.textContent = user.role || 'Boarder';
}

/**
 * Set active state based on current URL
 */
function setActiveState() {
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll('.sidebar-nav-item');

  navItems.forEach(item => {
    const href = item.dataset.href || item.getAttribute('href');
    if (currentPath.includes(href) || currentPath.endsWith(href)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Setup logout handler
 */
function setupLogoutHandler() {
  const logoutBtn = document.getElementById('sidebar-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', e => {
      e.preventDefault();
      // TODO: Implement actual logout logic
      console.log('Logout clicked');
      // window.location.href = '../public/auth/login.html';
    });
  }
}
