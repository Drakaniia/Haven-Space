/**
 * Simple State Management
 * Stores user authentication state and preferences
 */

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  theme: 'light',
};

// Current state (in-memory)
let currentState = { ...initialState };

/**
 * Get current state
 * @returns {Object} Current state object
 */
export function getState() {
  return { ...currentState };
}

/**
 * Update state
 * @param {Object} newState - Partial state to merge
 */
export function setState(newState) {
  currentState = { ...currentState, ...newState };

  // Persist to localStorage (optional)
  try {
    localStorage.setItem('haven_state', JSON.stringify(currentState));
  } catch (e) {
    console.warn('Failed to persist state to localStorage');
  }

  // Dispatch custom event for state changes
  window.dispatchEvent(new CustomEvent('statechange', { detail: currentState }));
}

/**
 * Load state from localStorage
 */
export function loadState() {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      const userData = JSON.parse(user);
      currentState = {
        ...initialState,
        isAuthenticated: true,
        user: userData,
        token: token,
      };
    } else {
      currentState = { ...initialState };
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
    currentState = { ...initialState };
  }
  return currentState;
}

/**
 * Clear state (logout)
 */
export function clearState() {
  currentState = { ...initialState };
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('haven_state');
  } catch (e) {
    console.warn('Failed to clear state from localStorage', e);
  }
  window.dispatchEvent(new CustomEvent('statechange', { detail: currentState }));
}

/**
 * Create headers for authenticated API requests
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} Headers object with Authorization token if available
 */
export function getAuthHeaders(additionalHeaders = {}) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // For development/testing - include user ID header
  if (user.id) {
    headers['X-USER-ID'] = user.id.toString();
  }

  return headers;
}

/**
 * Make an authenticated API request with automatic token refresh
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  const headers = getAuthHeaders(options.headers);

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  // If we get a 401 (Unauthorized), try to refresh the token
  if (response.status === 401) {
    try {
      const refreshResponse = await fetch(`${url.split('/api/')[0]}/auth/refresh-token.php`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        // Token refreshed successfully, retry the original request
        const newHeaders = getAuthHeaders(options.headers);
        return fetch(url, {
          credentials: 'include',
          ...options,
          headers: newHeaders,
        });
      }
    } catch (refreshError) {
      console.warn('Token refresh failed:', refreshError);
    }
  }

  return response;
}

/**
 * Update user data in localStorage and trigger UI updates
 * @param {Object} userData - Updated user data
 */
export function updateUserData(userData) {
  const currentState = getState();
  const updatedUser = { ...currentState.user, ...userData };

  setState({
    user: updatedUser,
  });

  // Update localStorage
  try {
    localStorage.setItem('user', JSON.stringify(updatedUser));
  } catch (e) {
    console.warn('Failed to update user data in localStorage', e);
  }

  // Trigger UI updates
  updateUserUI(updatedUser);
}

/**
 * Update user information in the UI across all pages
 * @param {Object} user - User data
 */
function updateUserUI(user) {
  // Update sidebar user info
  const sidebarUserName = document.querySelector('.sidebar-user-name');
  if (sidebarUserName && user.first_name && user.last_name) {
    sidebarUserName.textContent = `${user.first_name} ${user.last_name}`;
  }

  // Update sidebar user avatar
  const sidebarAvatar = document.querySelector('.sidebar-user-avatar');
  if (sidebarAvatar && user.avatar_url) {
    sidebarAvatar.src = user.avatar_url;
  }

  // Update navbar user info
  const navbarUserName = document.querySelector('.navbar-user-name');
  if (navbarUserName && user.first_name && user.last_name) {
    navbarUserName.textContent = `${user.first_name} ${user.last_name}`;
  }

  // Update navbar user avatar
  const navbarAvatar = document.querySelector('.navbar-user-avatar');
  if (navbarAvatar && user.avatar_url) {
    navbarAvatar.src = user.avatar_url;
  }

  // Update any profile completion indicators
  updateProfileCompletion(user);
}

/**
 * Calculate and update profile completion percentage
 * @param {Object} user - User data
 */
function updateProfileCompletion(user) {
  const requiredFields = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'current_address',
    'employment_status',
    'emergency_contact_name',
    'emergency_contact_phone',
  ];

  const completedFields = requiredFields.filter(
    field => user[field] && user[field].toString().trim() !== ''
  );

  const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

  // Update profile completion displays
  const completionElements = document.querySelectorAll('.profile-completion-percentage');
  completionElements.forEach(el => {
    el.textContent = `${completionPercentage}%`;
  });

  const completionCircles = document.querySelectorAll('.progress-circle');
  completionCircles.forEach(circle => {
    circle.style.setProperty('--progress', completionPercentage);
  });

  // Update completion checklist
  updateCompletionChecklist(user, completedFields, requiredFields);
}

/**
 * Update profile completion checklist
 * @param {Object} user - User data
 * @param {Array} completedFields - List of completed fields
 * @param {Array} requiredFields - List of required fields
 */
function updateCompletionChecklist(user, completedFields, requiredFields) {
  const checklistItems = document.querySelectorAll('.completion-item');

  const fieldMapping = {
    'Basic Information': ['first_name', 'last_name'],
    'Contact Details': ['email', 'phone', 'current_address'],
    'Employment Info': ['employment_status'],
    'Emergency Contact': ['emergency_contact_name', 'emergency_contact_phone'],
  };

  checklistItems.forEach(item => {
    const itemText = item.querySelector('.completion-item-text')?.textContent;
    if (itemText && fieldMapping[itemText]) {
      const isComplete = fieldMapping[itemText].every(field => completedFields.includes(field));

      const icon = item.querySelector('.completion-item-icon');
      if (icon) {
        icon.innerHTML = isComplete
          ? '<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>'
          : '<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" fill="none"></circle></svg>';
      }
    }
  });
}

// Listen for profile updates
window.addEventListener('userProfileUpdated', event => {
  updateUserData(event.detail);
});

// Load state on module init
loadState();
