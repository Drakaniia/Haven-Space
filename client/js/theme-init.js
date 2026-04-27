/**
 * Theme Initialization Script
 * This should be loaded as early as possible to prevent theme flash
 */

(function () {
  const THEME_KEY = 'haven-space-theme';

  function getCurrentTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  function applyTheme(theme) {
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
