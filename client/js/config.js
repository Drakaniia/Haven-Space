// Haven Space Configuration
// Automatically detects environment and sets appropriate API endpoints

/**
 * Detect current environment based on hostname and URL patterns
 */
function detectEnvironment() {
  const hostname = window.location.hostname;

  // Production environments
  const productionHosts = [
    'onrender.com',
    'github.io', // GitHub Pages
  ];

  if (
    productionHosts.includes(hostname) ||
    hostname.includes('render') ||
    hostname.includes('github.io')
  ) {
    return 'production';
  }

  // Local development (XAMPP, Apache)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check if running via PHP built-in server (:8000) or Apache
    const port = window.location.port;
    const pathname = window.location.pathname;

    // PHP built-in server on port 8000
    if (port === '8000') {
      return 'local-dev';
    }

    // Apache/XAMPP - typically on port 80 or no port specified
    // or paths containing haven-space, htdocs, views
    return 'local-apache';
  }

  // Default to local development for unknown hosts
  return 'local-dev';
}

/**
 * Get API base URL based on detected environment
 */
function getApiBaseUrl() {
  const env = detectEnvironment();

  const apiUrls = {
    production: 'https://haven-space-api.onrender.com', // Production API on Render
    'local-dev': 'http://localhost:8000', // PHP built-in server
  };

  return apiUrls[env] || apiUrls['local-dev'];
}

/**
 * Get current environment name for debugging
 */
function getCurrentEnvironment() {
  return detectEnvironment();
}

const CONFIG = {
  // Backend API URL - automatically determined based on environment
  API_BASE_URL: getApiBaseUrl(),

  // Current environment (local, production, etc.)
  ENV: getCurrentEnvironment(),

  // Environment detection helper
  isProduction: () => detectEnvironment() === 'production',
  isLocal: () => detectEnvironment().startsWith('local'),
};

// Environment info available via CONFIG.ENV

export default CONFIG;
