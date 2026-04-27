/**
 * Theme Management System
 * Handles light/dark mode switching and persistence
 */

const THEME_KEY = 'haven-space-theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

/**
 * Get the current theme from localStorage or system preference
 * @returns {string} Current theme ('light' or 'dark')
 */
export function getCurrentTheme() {
  // Check localStorage first
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
 */
export function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === THEMES.DARK) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }

  // Save to localStorage
  localStorage.setItem(THEME_KEY, theme);

  // Dispatch theme change event
  window.dispatchEvent(
    new CustomEvent('theme:changed', {
      detail: { theme },
    })
  );
}

/**
 * Toggle between light and dark themes
 * @returns {string} New theme after toggle
 */
export function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
  applyTheme(newTheme);
  return newTheme;
}

/**
 * Initialize theme system
 * Should be called as early as possible to prevent flash
 */
export function initTheme() {
  const theme = getCurrentTheme();
  applyTheme(theme);

  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', e => {
      // Only auto-switch if user hasn't manually set a preference
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (!savedTheme) {
        const systemTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
        applyTheme(systemTheme);
      }
    });
  }
}

/**
 * Check if current theme is dark
 * @returns {boolean} True if dark theme is active
 */
export function isDarkTheme() {
  return getCurrentTheme() === THEMES.DARK;
}

/**
 * Get theme constants
 */
export { THEMES };
