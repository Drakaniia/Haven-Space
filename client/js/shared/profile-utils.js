/**
 * Profile Utilities
 * Handles user profile data, avatar URLs, and display names
 */

/**
 * Get user's display name from profile data
 * @param {Object} user - User object
 * @returns {string} Full display name
 */
export function getDisplayName(user) {
  if (!user) return 'User';

  // Use first_name and last_name if available
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }

  // Fallback to name field (from Google OAuth)
  if (user.name) {
    return user.name;
  }

  // Fallback to email prefix
  if (user.email) {
    return user.email.split('@')[0];
  }

  return 'User';
}

/**
 * Get user's initials for avatar display
 * @param {Object} user - User object
 * @returns {string} User initials (max 2 characters)
 */
export function getUserInitials(user) {
  if (!user) return 'U';

  let initials = '';

  // Use first_name and last_name if available
  if (user.first_name) {
    initials += user.first_name.charAt(0).toUpperCase();
  }
  if (user.last_name) {
    initials += user.last_name.charAt(0).toUpperCase();
  }

  // If we have initials from first/last name, return them
  if (initials.length > 0) {
    return initials.substring(0, 2);
  }

  // Fallback to name field (from Google OAuth)
  if (user.name) {
    const nameParts = user.name.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    } else if (nameParts.length === 1) {
      return nameParts[0].substring(0, 2).toUpperCase();
    }
  }

  // Fallback to email prefix
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }

  return 'U';
}

/**
 * Get user's avatar URL with fallback options
 * @param {Object} user - User object
 * @param {string} basePath - Base path for default images
 * @returns {string} Avatar URL or fallback image path
 */
export function getAvatarUrl(user, basePath = '') {
  if (!user) {
    return `${basePath}/assets/images/sample.png`;
  }

  // Priority 1: avatar_url from database (includes Google profile pictures)
  if (user.avatar_url && user.avatar_url.trim()) {
    return user.avatar_url;
  }

  // Priority 2: avatarUrl from localStorage (legacy)
  if (user.avatarUrl && user.avatarUrl.trim()) {
    return user.avatarUrl;
  }

  // Priority 3: Generate avatar from UI Avatars service using real name
  const displayName = getDisplayName(user);
  if (displayName && displayName !== 'User') {
    const encodedName = encodeURIComponent(displayName);
    return `https://ui-avatars.com/api/?name=${encodedName}&background=6366f1&color=ffffff&size=128&bold=true`;
  }

  // Fallback: Default sample image
  return `${basePath}/assets/images/sample.png`;
}

/**
 * Update user profile elements in the DOM
 * @param {Object} user - User object
 * @param {string} basePath - Base path for assets
 */
export function updateProfileElements(user, basePath = '') {
  if (!user) return;

  const displayName = getDisplayName(user);
  const initials = getUserInitials(user);
  const avatarUrl = getAvatarUrl(user, basePath);

  // Update profile names
  const nameSelectors = [
    '.find-room-header-profile-name',
    '.find-room-profile-menu-name',
    '#navbar-user-menu-name',
    '.profile-name',
    '.user-name',
  ];

  nameSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.textContent = displayName;
    });
  });

  // Update profile emails
  const emailSelectors = [
    '.find-room-profile-menu-email',
    '#navbar-user-menu-email',
    '.profile-email',
    '.user-email',
  ];

  emailSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.textContent = user.email || '';
    });
  });

  // Update avatar images
  const avatarImageSelectors = [
    '.find-room-header-profile-avatar',
    '#navbar-avatar-img',
    '#navbar-user-menu-avatar',
    '#profile-avatar-preview',
    '.profile-avatar',
    '.user-avatar-img',
  ];

  avatarImageSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.src = avatarUrl;
      el.alt = `${displayName} Avatar`;
    });
  });

  // Update avatar initials (for text-based avatars)
  const avatarInitialSelectors = [
    '.find-room-profile-menu-avatar',
    '.profile-avatar-initials',
    '.user-avatar-initials',
  ];

  avatarInitialSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.textContent = initials;
    });
  });

  // Note: #navbar-user-menu-avatar is now an img tag, handled separately
}

/**
 * Fetch and update user profile from API
 * @param {string} apiBaseUrl - API base URL
 * @param {string} basePath - Base path for assets
 * @returns {Promise<Object|null>} Updated user object or null if failed
 */
export async function fetchAndUpdateProfile(apiBaseUrl, basePath = '') {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found');
      return null;
    }

    const response = await fetch(`${apiBaseUrl}/api/users/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('Failed to fetch user profile:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.user) {
      console.warn('No user data in profile response');
      return null;
    }

    // Merge with existing user data from localStorage
    const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = {
      ...existingUser,
      ...data.user,
      // Ensure we keep the role from localStorage if not in API response
      role: data.user.role || existingUser.role,
    };

    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));

    // Update DOM elements
    updateProfileElements(updatedUser, basePath);

    return updatedUser;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Initialize profile data on page load
 * @param {string} apiBaseUrl - API base URL
 * @param {string} basePath - Base path for assets
 */
export async function initializeProfile(apiBaseUrl, basePath = '') {
  // First, update with existing localStorage data
  const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
  if (existingUser && Object.keys(existingUser).length > 0) {
    updateProfileElements(existingUser, basePath);
  }

  // Then fetch fresh data from API
  const updatedUser = await fetchAndUpdateProfile(apiBaseUrl, basePath);

  return updatedUser || existingUser;
}
