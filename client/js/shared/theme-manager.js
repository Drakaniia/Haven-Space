/**
 * Theme Management System
 * Handles light/dark mode switching and persistence
 * Public pages are always light mode, dashboard pages can toggle
 */

const THEME_KEY = 'haven-space-theme';
const DASHBOARD_THEME_KEY = 'haven-space-dashboard-theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

/**
 * Check if current page is a dashboard page
 * @returns {boolean} True if current page is a dashboard
 */
function isDashboardPage() {
  const body = document.body;
  return (
    body.hasAttribute('data-dashboard-type') ||
    body.getAttribute('data-view') === 'boarder' ||
    body.getAttribute('data-view') === 'landlord' ||
    body.getAttribute('data-view') === 'admin'
  );
}

/**
 * Get the current theme from localStorage or system preference
 * @param {boolean} forDashboard - Whether to get theme for dashboard pages
 * @returns {string} Current theme ('light' or 'dark')
 */
export function getCurrentTheme(forDashboard = false) {
  // Public pages always return light theme
  if (!forDashboard && !isDashboardPage()) {
    return THEMES.LIGHT;
  }

  // For dashboard pages, check dashboard-specific theme
  if (forDashboard || isDashboardPage()) {
    const savedDashboardTheme = localStorage.getItem(DASHBOARD_THEME_KEY);
    if (savedDashboardTheme && Object.values(THEMES).includes(savedDashboardTheme)) {
      return savedDashboardTheme;
    }
  }

  // Check global theme (for backward compatibility)
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
    return savedTheme;
  }

  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEMES.DARK;
  }

  return THEMES.LIGHT;
}

/**
 * Apply theme to the document
 * @param {string} theme - Theme to apply ('light' or 'dark')
 * @param {boolean} forDashboard - Whether to apply theme for dashboard pages
 */
export function applyTheme(theme, forDashboard = false) {
  const root = document.documentElement;

  // Public pages always get light theme
  if (!forDashboard && !isDashboardPage()) {
    root.removeAttribute('data-theme');
    return;
  }

  if (theme === THEMES.DARK) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }

  // Save theme preference based on context
  if (forDashboard || isDashboardPage()) {
    localStorage.setItem(DASHBOARD_THEME_KEY, theme);
  } else {
    localStorage.setItem(THEME_KEY, theme);
  }

  // Dispatch theme change event
  window.dispatchEvent(
    new CustomEvent('theme:changed', {
      detail: { theme },
    })
  );
}

/**
 * Toggle between light and dark themes
 * Only works for dashboard pages
 * @returns {string} New theme after toggle
 */
export function toggleTheme() {
  // Only allow toggling on dashboard pages
  if (!isDashboardPage()) {
    return THEMES.LIGHT;
  }

  const currentTheme = getCurrentTheme(true);
  const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  applyTheme(newTheme, true);
  return newTheme;
}

/**
 * Initialize theme system
 * Should be called as early as possible to prevent flash
 */
export function initTheme() {
  // Determine if we're on a dashboard page
  const isDashboard = isDashboardPage();

  // Get appropriate theme for current page type
  const theme = getCurrentTheme(isDashboard);
  applyTheme(theme, isDashboard);

  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', e => {
      // Only auto-switch if user hasn't manually set a preference
      const savedDashboardTheme = localStorage.getItem(DASHBOARD_THEME_KEY);
      const savedGlobalTheme = localStorage.getItem(THEME_KEY);

      if (!savedDashboardTheme && !savedGlobalTheme) {
        const systemTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
        // Apply to dashboard pages only if we're on one
        if (isDashboardPage()) {
          applyTheme(systemTheme, true);
        }
      }
    });
  }
}

/**
 * Check if current theme is dark
 * @returns {boolean} True if dark theme is active
 */
export function isDarkTheme() {
  return getCurrentTheme(isDashboardPage()) === THEMES.DARK;
}

/**
 * Get theme constants
 */
export { THEMES };
