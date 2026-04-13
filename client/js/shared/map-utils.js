/**
 * Map utilities for Leaflet integration
 * Provides helper functions for map initialization, geocoding, and location handling
 */

/**
 * Initialize a Leaflet map with default settings
 * @param {string} containerId - The ID of the map container element
 * @param {Object} options - Map configuration options
 * @returns {L.Map} The initialized map instance
 */
export function initMap(containerId, options = {}) {
  const {
    center = [8.1489, 125.125], // Default: Malaybalay City, Mindanao, Philippines
    zoom = 13,
    minZoom = 10,
    maxZoom = 18,
    onMapClick = null,
  } = options;

  const map = L.map(containerId).setView(center, zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom,
    minZoom,
  }).addTo(map);

  if (onMapClick) {
    map.on('click', onMapClick);
  }

  return map;
}

/**
 * Get user's current location using browser Geolocation API
 * @param {Function} onSuccess - Callback function for successful geolocation
 * @param {Function} onError - Callback function for geolocation errors
 */
export function getCurrentLocation(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by your browser'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      onSuccess(latitude, longitude);
    },
    error => {
      onError(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

/**
 * Add or update a marker on the map
 * @param {L.Map} map - The map instance
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} options - Marker options
 * @returns {L.Marker} The marker instance
 */
export function setMarker(map, lat, lng, options = {}) {
  const { draggable = true, onDragEnd = null } = options;

  // Remove existing marker if stored on map instance
  if (map._signupMarker) {
    map._signupMarker.setLatLng([lat, lng]);
  } else {
    const marker = L.marker([lat, lng], { draggable }).addTo(map);
    map._signupMarker = marker;

    if (onDragEnd && draggable) {
      marker.on('dragend', _e => {
        const position = marker.getLatLng();
        onDragEnd(position.lat, position.lng);
      });
    }
  }

  map.setView([lat, lng], map.getZoom());
  return map._signupMarker;
}

/**
 * Reverse geocode coordinates to address using API proxy
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Geocoding result with address details
 */
export async function reverseGeocode(lat, lng) {
  try {
    // Import CONFIG dynamically
    const { default: CONFIG } = await import('../config.js');

    const response = await fetch(`${CONFIG.API_BASE_URL}/geocode/search.php?lat=${lat}&lng=${lng}`);

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Geocoding failed');
    }

    return {
      display_name: result.data.display_name || '',
      address: result.data.address || {},
      latitude: lat,
      longitude: lng,
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw error;
  }
}

/**
 * Search for addresses using API proxy
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of search results
 */
export async function searchAddress(query, options = {}) {
  const { limit = 5 } = options;

  if (!query || query.length < 3) {
    return [];
  }

  try {
    // Import CONFIG dynamically
    const { default: CONFIG } = await import('../config.js');

    const response = await fetch(
      `${CONFIG.API_BASE_URL}/geocode/search.php?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error('Search request failed');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Search failed');
    }

    return result.data.map(item => ({
      display_name: item.display_name,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address || {},
    }));
  } catch (error) {
    console.error('Error searching address:', error);
    throw error;
  }
}

/**
 * Format address object into a readable string
 * @param {Object} address - Address object from geocoding
 * @returns {string} Formatted address string
 */
export function formatAddress(address) {
  const parts = [];

  if (address.road) parts.push(address.road);
  if (address.suburb || address.neighbourhood) {
    parts.push(address.suburb || address.neighbourhood);
  }
  if (address.city || address.town || address.municipality) {
    parts.push(address.city || address.town || address.municipality);
  }
  if (address.province || address.state) {
    parts.push(address.province || address.state);
  }
  if (address.postcode) {
    parts.push(address.postcode);
  }
  if (address.country) {
    parts.push(address.country);
  }

  return parts.join(', ') || '';
}

/**
 * Validate that coordinates are within Philippines bounds
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} Whether coordinates are valid for Philippines
 */
export function isValidPhilippinesLocation(lat, lng) {
  // Philippines bounding box
  const minLat = 4.5;
  const maxLat = 21.1;
  const minLng = 116.0;
  const maxLng = 127.0;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Debounce helper for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
