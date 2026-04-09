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
          href: '../boarder/lease/index.html',
          icon: 'application',
        },
        { label: 'Messages', href: '../boarder/messages/index.html', icon: 'chat', badge: '3' },
        { label: 'Payments', href: '../boarder/payments/index.html', icon: 'payment' },
        {
          label: 'Announcements',
          href: '../boarder/announcements/index.html',
          icon: 'announcement',
        },
      ],
    },
    {
      group: 'Discovery',
      items: [{ label: 'Find a Room', href: '../boarder/find-a-room/index.html', icon: 'search' }],
    },
    {
      group: 'Info',
      items: [
        {
          label: 'House Rules / Handbook',
          href: '../boarder/house-rules/index.html',
          icon: 'document',
        },
        { label: 'Contact Management', href: '../boarder/contacts/index.html', icon: 'phone' },
      ],
    },
    {
      group: 'Account',
      items: [{ label: 'Settings', href: '../boarder/settings/index.html', icon: 'settings' }],
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
            { label: 'Tenants', href: '../landlord/boarders/index.html', icon: 'users' },
          ],
        },
        { label: 'Messages', href: '../landlord/messages/index.html', icon: 'chat', badge: '5' },
        { label: 'Payments', href: '../landlord/payments/index.html', icon: 'payment' },
        {
          label: 'Announcements',
          href: '../landlord/announcements/index.html',
          icon: 'announcement',
        },
      ],
    },
    {
      group: 'Management',
      items: [
        { label: 'Calendar', href: '../landlord/calendar/index.html', icon: 'calendar' },
        { label: 'Reports', href: '../landlord/reports/index.html', icon: 'analytics' },
      ],
    },
    {
      group: 'Account',
      items: [{ label: 'Settings', href: '../landlord/settings/index.html', icon: 'settings' }],
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
  if (!container) {
    return;
  }

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
      if (logoImg) {
        logoImg.src = `${basePath}/assets/images/Haven_Space_Logo.png`;
      }
      if (logoLink) {
        logoLink.href = `${basePath}/views/public/index.html`;
      }

      renderNavigation(role, basePath);
      updateUserInfo(user);
      setActiveState();
      setupNavbarSidebarToggle();
      setupLogoutHandler();
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
  if (path.includes('/client/views/')) {
    return '/client';
  }
  if (path.includes('/frontend/views/')) {
    return '/frontend';
  }
  if (path.includes('/views/')) {
    return '';
  }
  return '';
}

/**
 * Resolve navigation href based on base path
 * Converts relative paths like '../boarder/lease/index.html' to absolute paths
 * @param {string} href - Navigation href
 * @param {string} basePath - Base path from resolveBasePath()
 * @returns {string} Resolved href
 */
function resolveNavHref(href, basePath) {
  // Handle undefined or null href (e.g., dropdown parent items without links)
  if (!href) {
    return '#';
  }

  // If href is already absolute or starts with http/https, return as-is
  if (href.startsWith('/') || href.startsWith('http') || href === '#') {
    return href;
  }

  // If href starts with '../', remove it and prepend basePath/views/
  if (href.startsWith('../')) {
    const relativePath = href.replace(/^\.\.\//, '');
    return `${basePath}/views/${relativePath}`;
  }

  // For other relative paths, prepend basePath
  return `${basePath}/${href}`;
}

/**
 * Render navigation items based on role
 * @param {string} role - User role
 * @param {string} basePath - Base path for resolving hrefs
 */
function renderNavigation(role, basePath) {
  const navContent = document.getElementById('sidebar-nav-content');
  if (!navContent) {
    return;
  }

  const config = NAV_CONFIG[role] || NAV_CONFIG.boarder;
  navContent.innerHTML = config
    .map(
      group => `
<div class="sidebar-nav-group">
  <div class="sidebar-nav-title">${group.group}</div>
  ${group.items.map(item => renderNavItem(item, basePath)).join('')}
</div>`
    )
    .join('');

  // Add click handlers for dropdown toggles
  setupDropdownHandlers();
}

/**
 * Render a single nav item
 * @param {Object} item - Navigation item config
 * @param {string} basePath - Base path for resolving hrefs
 */
function renderNavItem(item, basePath) {
  const icon = getIcon(item.icon);
  // Resolve href with base path
  const resolvedHref = resolveNavHref(item.href, basePath);

  // Check if this is a dropdown item
  if (item.dropdown && item.children) {
    const childrenHtml = item.children.map(child => renderNavChildItem(child, basePath)).join('');

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

  return `<a href="${resolvedHref}" class="sidebar-nav-item" data-href="${resolvedHref}">
  ${icon}
  <span class="sidebar-nav-item-text">${item.label}</span>
  ${badge}
</a>`;
}

/**
 * Render a child item within a dropdown
 * @param {Object} child - Navigation child item config
 * @param {string} basePath - Base path for resolving hrefs
 */
function renderNavChildItem(child, basePath) {
  const icon = getIcon(child.icon);
  // Resolve href with base path
  const resolvedHref = resolveNavHref(child.href, basePath);

  return `<a href="${resolvedHref}" class="sidebar-nav-child-item" data-href="${resolvedHref}">
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
          if (d !== content) {
            d.style.display = 'none';
          }
        });
        allDropdownContainers.forEach(d => {
          if (d !== dropdown) {
            d.classList.remove('sidebar-nav-dropdown-open');
          }
        });
        allIcons.forEach(i => {
          if (i !== icon) {
            i.style.transform = 'rotate(0deg)';
          }
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

  if (avatar) {
    avatar.textContent = user.initials || 'JD';
  }
  if (name) {
    name.textContent = user.name || 'Juan Dela Cruz';
  }
  if (roleEl) {
    roleEl.textContent = user.role || 'Boarder';
  }
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
          if (toggle) {
            toggle.classList.add('active');
          }
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
 * Setup logout handler
 */
function setupLogoutHandler() {
  const logoutBtn =
    document.getElementById('sidebar-logout') || document.getElementById('navbar-menu-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async e => {
      e.preventDefault();

      try {
        const basePath = resolveBasePath();
        const configPath = `${basePath}/js/config.js`;
        const { default: CONFIG } = await import(configPath);

        await fetch(`${CONFIG.API_BASE_URL}/auth/logout.php`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }

      // Clear authentication data
      localStorage.removeItem('user');

      const basePath = resolveBasePath();
      window.location.href = `${basePath}/views/public/auth/login.html`;
    });
  }
}

/**
 * Setup sidebar toggle handler (listens for navbar toggle event)
 */
function setupNavbarSidebarToggle() {
  // Listen for the custom event dispatched by navbar toggle button
  window.addEventListener('navbar:sidebar:toggle', () => {
    const sidebar = document.querySelector('.sidebar');
    // Support both boarder and landlord dashboard containers
    const dashboardContainer =
      document.querySelector('.boarder-dashboard') ||
      document.querySelector('.landlord-dashboard') ||
      document.querySelector('.admin-dashboard');
    // Support properties page layout
    const propertiesMain = document.querySelector('.your-properties-main');

    if (sidebar) {
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
    }
  });
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
