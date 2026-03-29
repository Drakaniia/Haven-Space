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
    const saved = localStorage.getItem('haven_state');
    if (saved) {
      currentState = { ...initialState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage');
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
    localStorage.removeItem('haven_state');
  } catch (e) {
    console.warn('Failed to clear state from localStorage');
  }
  window.dispatchEvent(new CustomEvent('statechange', { detail: currentState }));
}

// Load state on module init
loadState();
