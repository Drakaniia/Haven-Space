/**
 * Theme Initialization Script
 * This should be loaded as early as possible to prevent theme flash
 * Public pages always light mode, dashboard pages can use dark mode
 */

(function () {
  const THEME_KEY = 'haven-space-theme';
  const DASHBOARD_THEME_KEY = 'haven-space-dashboard-theme';

  function isDashboardPage() {
    const body = document.body;
    return (
      body.hasAttribute('data-dashboard-type') ||
      body.getAttribute('data-view') === 'boarder' ||
      body.getAttribute('data-view') === 'landlord' ||
      body.getAttribute('data-view') === 'admin'
    );
  }

  function getCurrentTheme() {
    // Public pages always return light theme
    if (!isDashboardPage()) {
      return 'light';
    }

    // For dashboard pages, check dashboard-specific theme first
    const savedDashboardTheme = localStorage.getItem(DASHBOARD_THEME_KEY);
    if (
      savedDashboardTheme &&
      (savedDashboardTheme === 'light' || savedDashboardTheme === 'dark')
    ) {
      return savedDashboardTheme;
    }

    // Check global theme (for backward compatibility)
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }

    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  function applyTheme(theme) {
    // Public pages always get light theme
    if (!isDashboardPage()) {
      document.documentElement.removeAttribute('data-theme');
      return;
    }

    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // Apply theme immediately
  const theme = getCurrentTheme();
  applyTheme(theme);
})();
