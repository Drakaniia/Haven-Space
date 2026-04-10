// Haven Space Configuration
// Automatically detects environment and sets appropriate API endpoints

/**
 * Detect current environment based on hostname and URL patterns
 */
function detectEnvironment() {
  const hostname = window.location.hostname;

  // Production environments
  const productionHosts = [
    'havenspace.com',
    'www.havenspace.com',
    'onrender.com',
    'github.io', // GitHub Pages
  ];

  if (
    productionHosts.includes(hostname) ||
    hostname.includes('havenspace') ||
    hostname.includes('render') ||
    hostname.includes('github.io')
  ) {
    return 'production';
  }

  // Local development (XAMPP, Apache)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check if running via PHP built-in server (:8000) or Apache (/haven-space/)
    const pathname = window.location.pathname;
    if (pathname.includes('haven-space') || pathname.includes('htdocs')) {
      return 'local-apache';
    }
    return 'local-dev';
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
    production: 'https://haven-space-api.onrender.com/api', // Production API on Render
    'local-apache': 'http://localhost/haven-space/server/api', // XAMPP Apache
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

// Log environment info in development
if (CONFIG.isLocal()) {
  console.log(
    `%c🔧 Haven Space - ${CONFIG.ENV.toUpperCase()} Environment`,
    'background: #4a7c23; color: white; padding: 4px 8px; font-weight: bold;',
    `\nAPI Base URL: ${CONFIG.API_BASE_URL}`
  );
}

export default CONFIG;
