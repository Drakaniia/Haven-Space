/**
 * Shared application state management
 * Used across all views for consistent data handling
 */

export const state = {
  currentUser: null,
  isAuthenticated: false,
  theme: 'light',
  
  // Get current user
  getUser() {
    return this.currentUser;
  },
  
  // Set current user
  setUser(user) {
    this.currentUser = user;
    this.isAuthenticated = !!user;
  },
  
  // Logout
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
  },
  
  // Set theme
  setTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }
};

// Utility: API base URL
export const API_BASE_URL = '/api';

// Utility: Fetch wrapper with auth
export async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (state.isAuthenticated) {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// Utility: Format date
export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));
}
