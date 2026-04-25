// Haven Space Configuration
// Automatically detects environment and sets appropriate API endpoints

/**
 * Detect current environment based on hostname and URL patterns
 */
function detectEnvironment() {
  const hostname = window.location.hostname;

  // Production environments
  const productionHosts = [
    'github.io', // GitHub Pages
    'appwrite.network', // Appwrite hosting
  ];

  if (
    productionHosts.some(host => hostname.includes(host)) ||
    hostname.includes('render') ||
    hostname.includes('github.io') ||
    hostname.includes('appwrite')
  ) {
    return 'production';
  }

  // Local development (XAMPP, Apache)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check if running via PHP built-in server (:8000) or Apache
    const port = window.location.port;

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
    production: 'https://haven-space.appwrite.network', // Use the same domain for API
    'local-dev': 'http://localhost:8000', // PHP built-in server
    'local-apache': 'http://localhost:8000', // Apache/XAMPP - still use port 8000 for API
  };

  return apiUrls[env] || 'http://localhost:8000';
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

  // Appwrite configuration
  APPWRITE: {
    ENDPOINT: 'https://fra.cloud.appwrite.io/v1',
    PROJECT_ID: '69eae504002697b6749c',
    FUNCTION_ID: 'api-function',
  },
};

// Environment info available via CONFIG.ENV

export default CONFIG;
