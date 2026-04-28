/**
 * Environment Check Utility
 * Displays warning when app is accessed incorrectly
 */

/**
 * Check if the application is being accessed correctly
 * Shows a warning banner if not using the PHP built-in server
 */
export function checkEnvironment() {
  const currentPort = window.location.port;
  const currentHost = window.location.hostname;

  // If on localhost but not port 8000, show warning
  if (
    (currentHost === 'localhost' || currentHost === '127.0.0.1') &&
    currentPort !== '8000' &&
    currentPort !== ''
  ) {
    showEnvironmentWarning();
  }

  // If on localhost with no port (Apache/XAMPP), show warning
  if (
    (currentHost === 'localhost' || currentHost === '127.0.0.1') &&
    currentPort === '' &&
    !window.location.pathname.includes(':8000')
  ) {
    showEnvironmentWarning();
  }
}

/**
 * Show environment warning banner
 */
function showEnvironmentWarning() {
  // Check if banner already exists
  if (document.getElementById('env-warning-banner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'env-warning-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    padding: 16px 20px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: slideDown 0.3s ease-out;
  `;

  banner.innerHTML = `
    <style>
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      #env-warning-banner a {
        color: white;
        text-decoration: underline;
        font-weight: 600;
      }
      #env-warning-banner button {
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        margin-left: 12px;
        transition: all 0.2s;
      }
      #env-warning-banner button:hover {
        background: rgba(255,255,255,0.3);
        border-color: rgba(255,255,255,0.5);
      }
      .env-warning-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }
      .env-warning-text {
        flex: 1;
      }
      .env-warning-title {
        font-weight: 700;
        font-size: 16px;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .env-warning-message {
        font-size: 14px;
        opacity: 0.95;
        line-height: 1.5;
      }
      .env-warning-icon {
        font-size: 24px;
      }
      @media (max-width: 768px) {
        .env-warning-content {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
    <div class="env-warning-content">
      <div class="env-warning-text">
        <div class="env-warning-title">
          <span class="env-warning-icon">⚠️</span>
          Wrong Server! Images and API won't work correctly
        </div>
        <div class="env-warning-message">
          You're accessing via <strong>${window.location.origin}</strong>. 
          Please use <strong>http://localhost:8000/</strong> instead. 
          Run <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 3px;">npm run server</code> 
          and access the app through port 8000.
        </div>
      </div>
      <div>
        <button onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
      </div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  // Add padding to body to prevent content from being hidden
  document.body.style.paddingTop = '80px';

  // Log to console as well
  console.warn(
    '%c⚠️ WRONG SERVER DETECTED',
    'background: #ff6b6b; color: white; padding: 8px 12px; font-size: 14px; font-weight: bold; border-radius: 4px;'
  );
  console.warn(
    `Current URL: ${window.location.origin}\nCorrect URL: http://localhost:8000/\n\nRun: npm run server`
  );
  console.warn('Images from /storage/ will fail to load!');
}

/**
 * Get the correct URL for the current page on port 8000
 */
export function getCorrectUrl() {
  const path = window.location.pathname + window.location.search + window.location.hash;
  return `http://localhost:8000${path}`;
}

/**
 * Redirect to correct server if needed
 * @param {boolean} autoRedirect - Whether to automatically redirect
 */
export function redirectToCorrectServer(autoRedirect = false) {
  const currentPort = window.location.port;
  const currentHost = window.location.hostname;

  if ((currentHost === 'localhost' || currentHost === '127.0.0.1') && currentPort !== '8000') {
    const correctUrl = getCorrectUrl();

    if (autoRedirect) {
      window.location.href = correctUrl;
    } else {
      return correctUrl;
    }
  }

  return null;
}
