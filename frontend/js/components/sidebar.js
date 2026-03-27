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
        { label: 'Dashboard', href: '../boarder/index.html', icon: 'home' },
        { label: 'Browse Listings', href: '../rooms/index.html', icon: 'search' },
        { label: 'Saved Listings', href: '#', icon: 'bookmark' },
        { label: 'My Bookings', href: '#', icon: 'calendar' },
        { label: 'Messages', href: '../messages/index.html', icon: 'chat', badge: '3' },
        { label: 'Payments', href: '../payments/index.html', icon: 'payment' },
      ],
    },
    {
      group: 'Support',
      items: [
        { label: 'Maintenance', href: '../maintenance/index.html', icon: 'settings' },
        { label: 'Notices', href: '../notices/index.html', icon: 'announcement' },
      ],
    },
  ],
  landlord: [
    {
      group: 'Main',
      items: [
        { label: 'Dashboard', href: '../landlord/index.html', icon: 'home' },
        { label: 'My Listings', href: '../landlord/listings/index.html', icon: 'list' },
        { label: 'Applications', href: '../landlord/applications/index.html', icon: 'application' },
        { label: 'Boarders', href: '../landlord/boarders/index.html', icon: 'users' },
        { label: 'Messages', href: '../landlord/messages/index.html', icon: 'chat', badge: '5' },
        { label: 'Payments', href: '../landlord/payments/index.html', icon: 'payment' },
      ],
    },
    {
      group: 'Management',
      items: [
        { label: 'Maintenance', href: '../landlord/maintenance/index.html', icon: 'settings' },
        { label: 'Reports', href: '../landlord/reports/index.html', icon: 'analytics' },
      ],
    },
  ],
  admin: [
    {
      group: 'Main',
      items: [
        { label: 'Dashboard', href: '../admin/index.html', icon: 'home' },
        { label: 'Users', href: '../admin/users/index.html', icon: 'users' },
        { label: 'Properties', href: '../admin/properties/index.html', icon: 'list' },
        { label: 'Bookings', href: '../admin/bookings/index.html', icon: 'calendar' },
        { label: 'Analytics', href: '../admin/analytics/index.html', icon: 'analytics' },
      ],
    },
    {
      group: 'System',
      items: [
        { label: 'Settings', href: '../admin/settings/index.html', icon: 'settings' },
        { label: 'Logs', href: '../admin/logs/index.html', icon: 'announcement' },
      ],
    },
  ],
};

// Icon path data for Heroicons v2 (outline)
const ICON_PATHS = {
  home: 'm2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  search: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
  bookmark:
    'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z',
  calendar:
    'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
  chat: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
  payment:
    'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
  settings:
    'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.753 6.753 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  announcement:
    'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.43.816 1.035.816 1.73 0 .695-.32 1.3-.816 1.73m0-3.46a24.42 24.42 0 0 1 0 3.46',
  list: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  application:
    'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  users:
    'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  analytics: 'M10.5 6a7.5 7.5 0 1 0 7.5 7.5H10.5V6ZM13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z',
};

/**
 * Get Heroicon SVG by name
 * @param {string} iconName - Name of the icon
 * @returns {string} SVG string from Heroicons v2 (outline)
 */
function getHeroicon(iconName) {
  const pathData = ICON_PATHS[iconName] || ICON_PATHS.home;
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="${pathData}" />
  </svg>`;
}

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
  if (!container) return;

  // Calculate base path from URL depth
  const basePath = resolveBasePath();

  // Load sidebar template
  fetch(`${basePath}/components/sidebar.html`)
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html;

      // Fix logo path
      const logoImg = container.querySelector('.sidebar-logo-img');
      const logoLink = container.querySelector('.sidebar-logo');
      if (logoImg) logoImg.src = `${basePath}/assets/images/Haven_Space_Logo.png`;
      if (logoLink) logoLink.href = `${basePath}/views/public/index.html`;

      renderNavigation(role);
      updateUserInfo(user);
      setActiveState();
      setupLogoutHandler();
    })
    .catch(err => {
      console.error('Failed to load sidebar template:', err);
    });
}

/**
 * Resolve base path based on current URL structure
 * @returns {string} Base path for asset resolution
 */
function resolveBasePath() {
  const path = window.location.pathname;
  if (path.includes('/frontend/views/')) return '/frontend';
  if (path.includes('/views/')) return '';
  return '';
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
</div>`
    )
    .join('');
}

/**
 * Render a single nav item
 */
function renderNavItem(item) {
  const icon = getHeroicon(item.icon);
  const badge = item.badge ? `<span class="sidebar-nav-badge">${item.badge}</span>` : '';

  return `<a href="${item.href}" class="sidebar-nav-item" data-href="${item.href}">
  ${icon}
  ${item.label}
  ${badge}
</a>`;
}

/**
 * Update user profile info
 */
function updateUserInfo(user) {
  const avatar = document.getElementById('sidebar-avatar');
  const name = document.getElementById('sidebar-profile-name');
  const roleEl = document.getElementById('sidebar-profile-role');

  if (avatar) avatar.textContent = user.initials || 'JD';
  if (name) name.textContent = user.name || 'Juan Dela Cruz';
  if (roleEl) roleEl.textContent = user.role || 'Boarder';
}

/**
 * Set active state based on current URL
 */
function setActiveState() {
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll('.sidebar-nav-item');

  navItems.forEach(item => {
    const href = item.dataset.href || item.getAttribute('href');
    item.classList.toggle('active', currentPath.includes(href) || currentPath.endsWith(href));
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
      console.log('Logout clicked');
    });
  }
}
