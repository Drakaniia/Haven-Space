/**
 * Sidebar Component
 * Reusable sidebar with role-based navigation
 */

import { getIcon, ICON_PATHS } from '../shared/icons.js';

// Navigation configurations per role
const NAV_CONFIG = {
  boarder: [
    {
      group: 'Main',
      items: [
        { label: 'Dashboard', href: '../boarder/index.html', icon: 'home' },
        {
          label: 'My Lease',
          href: '../applications/index.html',
          icon: 'application',
        },
        { label: 'Messages', href: '../messages/index.html', icon: 'chat', badge: '3' },
        { label: 'Payments', href: '../payments/index.html', icon: 'payment' },
      ],
    },
    {
      group: 'Support',
      items: [
        { label: 'Maintenance', href: '../maintenance/index.html', icon: 'settings' },
        { label: 'Notices', href: '../notices/index.html', icon: 'announcement' },
        { label: 'Find a Room', href: '../rooms/index.html', icon: 'search' },
        {
          label: 'Room History',
          href: '#',
          icon: 'history',
          // TODO: Create room history page for utility and maintenance logs
        },
      ],
    },
  ],
  landlord: [
    {
      group: 'Main',
      items: [
        { label: 'Dashboard', href: '../landlord/index.html', icon: 'home' },
        {
          label: 'Properties',
          icon: 'list',
          dropdown: true,
          children: [
            { label: 'My Listings', href: '../landlord/listings/index.html', icon: 'list' },
            { label: 'My Properties', href: '../landlord/myproperties/index.html', icon: 'list' },
            { label: 'Map View', href: '../landlord/maps/index.html', icon: 'map' },
            {
              label: 'Applications',
              href: '../landlord/applications/index.html',
              icon: 'application',
            },
            { label: 'Boarders', href: '../landlord/boarders/index.html', icon: 'users' },
          ],
        },
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
        {
          label: 'Management',
          icon: 'list',
          dropdown: true,
          children: [
            { label: 'Users', href: '../admin/users/index.html', icon: 'users' },
            { label: 'Properties', href: '../admin/properties/index.html', icon: 'list' },
            { label: 'Bookings', href: '../admin/bookings/index.html', icon: 'calendar' },
          ],
        },
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
      setupToggleHandler();
      restoreCollapsedState();
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
  if (path.includes('/client/views/')) return '/client';
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

  // Add click handlers for dropdown toggles
  setupDropdownHandlers();
}

/**
 * Render a single nav item
 */
function renderNavItem(item) {
  const icon = getIcon(item.icon);

  // Check if this is a dropdown item
  if (item.dropdown && item.children) {
    const childrenHtml = item.children.map(child => renderNavChildItem(child)).join('');

    return `
<div class="sidebar-nav-dropdown">
  <div class="sidebar-nav-item sidebar-nav-dropdown-toggle" data-dropdown="${item.label
    .toLowerCase()
    .replace(/\s+/g, '-')}">
    ${icon}
    <span class="sidebar-nav-item-text">${item.label}</span>
    ${getIcon('chevronDown', { className: 'sidebar-dropdown-icon' })}
  </div>
  <div class="sidebar-nav-dropdown-content" id="dropdown-${item.label
    .toLowerCase()
    .replace(/\s+/g, '-')}" style="display: none;">
    ${childrenHtml}
  </div>
</div>`;
  }

  // Regular nav item (no dropdown)
  const badge = item.badge ? `<span class="sidebar-nav-badge">${item.badge}</span>` : '';

  return `<a href="${item.href}" class="sidebar-nav-item" data-href="${item.href}">
  ${icon}
  <span class="sidebar-nav-item-text">${item.label}</span>
  ${badge}
</a>`;
}

/**
 * Render a child item within a dropdown
 */
function renderNavChildItem(child) {
  const icon = getIcon(child.icon);
  return `<a href="${child.href}" class="sidebar-nav-child-item" data-href="${child.href}">
  ${icon}
  <span class="sidebar-nav-item-text">${child.label}</span>
</a>`;
}

/**
 * Setup dropdown toggle handlers
 */
function setupDropdownHandlers() {
  const dropdownToggles = document.querySelectorAll('.sidebar-nav-dropdown-toggle');

  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const dropdown = toggle.parentElement;
      const content = dropdown.querySelector('.sidebar-nav-dropdown-content');
      const icon = toggle.querySelector('.sidebar-dropdown-icon');

      if (content) {
        const isExpanded = content.style.display === 'block';

        // Close all other dropdowns first
        const allDropdowns = document.querySelectorAll('.sidebar-nav-dropdown-content');
        const allDropdownContainers = document.querySelectorAll('.sidebar-nav-dropdown');
        const allIcons = document.querySelectorAll(
          '.sidebar-nav-dropdown-toggle .sidebar-dropdown-icon'
        );

        allDropdowns.forEach(d => {
          if (d !== content) d.style.display = 'none';
        });
        allDropdownContainers.forEach(d => {
          if (d !== dropdown) d.classList.remove('sidebar-nav-dropdown-open');
        });
        allIcons.forEach(i => {
          if (i !== icon) i.style.transform = 'rotate(0deg)';
        });

        // Toggle current dropdown
        content.style.display = isExpanded ? 'none' : 'block';

        // Rotate chevron icon with smooth transition
        if (icon) {
          icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
          icon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }

        // Toggle active class on dropdown container
        dropdown.classList.toggle('sidebar-nav-dropdown-open');
      }
    });
  });
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
  const navChildItems = document.querySelectorAll('.sidebar-nav-child-item');

  // Handle regular nav items
  navItems.forEach(item => {
    const href = item.dataset.href || item.getAttribute('href');
    if (href && currentPath.includes(href)) {
      item.classList.add('active');

      // If this item is inside a dropdown, expand the dropdown
      const dropdownContent = item.closest('.sidebar-nav-dropdown-content');
      if (dropdownContent) {
        dropdownContent.style.display = 'block';
        const dropdown = dropdownContent.closest('.sidebar-nav-dropdown');
        if (dropdown) {
          dropdown.classList.add('sidebar-nav-dropdown-open');
          const toggle = dropdown.querySelector('.sidebar-nav-dropdown-toggle');
          const icon = dropdown.querySelector('.sidebar-dropdown-icon');
          if (toggle) toggle.classList.add('active');
          if (icon) {
            icon.style.transform = 'rotate(180deg)';
            icon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          }
        }
      }
    }
  });

  // Handle child items in dropdowns
  navChildItems.forEach(item => {
    const href = item.dataset.href || item.getAttribute('href');
    if (href && (currentPath.includes(href) || currentPath.endsWith(href))) {
      item.classList.add('active');
    }
  });
}

/**
 * Setup sidebar toggle handler
 */
function setupToggleHandler() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  // Support both boarder and landlord dashboard containers
  const dashboardContainer =
    document.querySelector('.boarder-dashboard') ||
    document.querySelector('.landlord-dashboard') ||
    document.querySelector('.admin-dashboard');
  // Support properties page layout
  const propertiesMain = document.querySelector('.your-properties-main');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = !sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed');

      // Add/remove collapsed class on dashboard container for layout adjustments
      if (dashboardContainer) {
        dashboardContainer.classList.toggle('sidebar-collapsed', isCollapsed);
      }

      // Add/remove collapsed class on properties main for layout adjustments
      if (propertiesMain) {
        propertiesMain.classList.toggle('sidebar-collapsed', isCollapsed);
      }

      saveCollapsedState(isCollapsed);
    });
  }
}

/**
 * Save collapsed state to localStorage
 * @param {boolean} isCollapsed - Whether sidebar is collapsed
 */
function saveCollapsedState(isCollapsed) {
  try {
    localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false');
  } catch (e) {
    // localStorage may not be available in some environments
    console.warn('Could not save sidebar state:', e);
  }
}

/**
 * Restore collapsed state from localStorage
 */
function restoreCollapsedState() {
  try {
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    const sidebar = document.querySelector('.sidebar');
    // Support both boarder and landlord dashboard containers
    const dashboardContainer =
      document.querySelector('.boarder-dashboard') ||
      document.querySelector('.landlord-dashboard') ||
      document.querySelector('.admin-dashboard');
    // Support properties page layout
    const propertiesMain = document.querySelector('.your-properties-main');

    if (sidebar && isCollapsed) {
      sidebar.classList.add('collapsed');
      // Also add collapsed class to dashboard container for layout adjustments
      if (dashboardContainer) {
        dashboardContainer.classList.add('sidebar-collapsed');
      }
      // Also add collapsed class to properties main for layout adjustments
      if (propertiesMain) {
        propertiesMain.classList.add('sidebar-collapsed');
      }
    }
  } catch (e) {
    // localStorage may not be available in some environments
    console.warn('Could not restore sidebar state:', e);
  }
}
