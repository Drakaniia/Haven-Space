/**
 * Room Detail Fix - Direct API call without modules
 * This is a temporary fix for the module loading issue
 */

// Configuration
const API_BASE_URL = 'http://localhost:8000';

// Get room ID from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = parseInt(urlParams.get('id')) || 1;

// Fetch room data and populate the page
async function loadRoomData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rooms/detail?id=${roomId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.data) {
      populateRoomData(result.data);
    } else {
      throw new Error('No data received from API');
    }
    
  } catch (error) {
    console.error('Error loading room data:', error);
    showError('Failed to load room details. Please try again later.');
  }
}

// Populate room data into the page
function populateRoomData(room) {

  
  // Update page title
  document.title = `${room.title} - Haven Space`;
  
  // Update room title
  const roomTitle = document.getElementById('room-title');
  if (roomTitle) {
    roomTitle.textContent = room.title;
  }
  
  // Update breadcrumb
  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = room.title;
  }
  
  // Update address
  const roomAddress = document.getElementById('room-address');
  if (roomAddress) {
    const fullAddress = [room.address, room.city, room.province].filter(Boolean).join(', ');
    roomAddress.textContent = fullAddress;
  }
  
  // Update rating and reviews
  const roomRating = document.getElementById('room-rating');
  if (roomRating && room.rating) {
    roomRating.textContent = room.rating;
  }
  
  const roomReviews = document.getElementById('room-reviews');
  if (roomReviews) {
    roomReviews.textContent = room.reviews > 0 ? `(${room.reviews} reviews)` : '(No reviews yet)';
  }
  
  // Update room types
  const roomTypes = document.getElementById('room-types');
  if (roomTypes) {
    roomTypes.textContent = room.roomTypes || 'Available';
  }
  
  // Update availability
  const roomAvailability = document.getElementById('room-availability');
  if (roomAvailability) {
    roomAvailability.textContent = room.availability || 'Contact for availability';
  }
  
  const bookingAvailability = document.getElementById('booking-availability');
  if (bookingAvailability) {
    bookingAvailability.textContent = room.availability || 'Contact for availability';
  }
  
  // Update price
  const roomPrice = document.getElementById('room-price');
  if (roomPrice) {
    roomPrice.textContent = `₱${room.price.toLocaleString()}`;
  }
  
  // Update description
  const roomDescription = document.getElementById('room-description');
  if (roomDescription) {
    roomDescription.innerHTML = room.description
      .split('\n\n')
      .map(p => `<p>${p}</p>`)
      .join('');
  }
  
  // Update amenities
  const roomAmenities = document.getElementById('room-amenities');
  if (roomAmenities && room.amenities && room.amenities.length > 0) {
    roomAmenities.innerHTML = room.amenities
      .map(amenity => {
        const amenityName = typeof amenity === 'string' ? amenity : amenity.label;
        return `
          <div class="amenity-item">
            <span>✓</span>
            <span>${amenityName}</span>
          </div>
        `;
      })
      .join('');
  }
  
  // Update house rules
  const rulesContainer = document.querySelector('.room-detail-rules');
  if (rulesContainer && room.houseRules && room.houseRules.length > 0) {
    rulesContainer.innerHTML = room.houseRules
      .map(rule => {
        const ruleTitle = typeof rule === 'string' ? rule : rule.title;
        const ruleDesc = typeof rule === 'object' ? rule.desc : '';
        return `
          <div class="rule-item">
            <span>•</span>
            <div class="rule-content">
              <h4>${ruleTitle}</h4>
              ${ruleDesc ? `<p>${ruleDesc}</p>` : ''}
            </div>
          </div>
        `;
      })
      .join('');
  }
  
  // Update landlord info
  const landlordName = document.getElementById('landlord-name');
  if (landlordName && room.landlord) {
    landlordName.textContent = room.landlord.name || 'Property Owner';
  }
  
  // Update main image with fallback
  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage) {
    if (room.images && room.images.length > 0) {
      // Convert relative path to full URL
      const imageUrl = room.images[0].startsWith('http') 
        ? room.images[0] 
        : `${API_BASE_URL}${room.images[0]}`;
      
      // Try to load the actual image, fallback to placeholder if it fails
      const img = new Image();
      img.onload = function() {
        mainImage.src = imageUrl;
        mainImage.alt = `${room.title} - Main View`;

      };
      img.onerror = function() {

        mainImage.src = '../../../assets/images/placeholder-room.svg';
        mainImage.alt = 'Property Image - Placeholder';
      };
      img.src = imageUrl;
    } else {
      // No images provided, use placeholder
      mainImage.src = '../../../assets/images/placeholder-room.svg';
      mainImage.alt = 'Property Image - Placeholder';
    }
  }
  
  // Update thumbnails with fallback
  const thumbnailsContainer = document.getElementById('gallery-thumbnails');
  if (thumbnailsContainer) {
    if (room.images && room.images.length > 0) {
      // Create thumbnails with error handling
      const thumbnailsHTML = room.images.map((img, index) => {
        const imageUrl = img.startsWith('http') ? img : `${API_BASE_URL}${img}`;
        return `
          <button class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="../../../assets/images/placeholder-room.svg" 
                 data-original-src="${imageUrl}" 
                 alt="Thumbnail ${index + 1}" 
                 class="gallery-thumb-img" />
          </button>
        `;
      }).join('');
      thumbnailsContainer.innerHTML = thumbnailsHTML;
      
      // Load thumbnails after they're added to DOM
      loadThumbnailImages(room.images);
    } else {
      // No images, show single placeholder thumbnail
      thumbnailsContainer.innerHTML = `
        <button class="gallery-thumb active" data-index="0">
          <img src="../../../assets/images/placeholder-room.svg" alt="Placeholder Thumbnail" />
        </button>
      `;
    }
  }
  
  // Update room types in booking section
  if (room.rooms && room.rooms.length > 0) {
    const roomTypeOptions = document.querySelector('.booking-room-type-options');
    if (roomTypeOptions) {
      const availableRooms = room.rooms.filter(r => r.status === 'available');
      
      if (availableRooms.length > 0) {
        roomTypeOptions.innerHTML = availableRooms
          .map((r, index) => `
            <label class="booking-room-option">
              <input type="radio" name="room-type" value="${r.roomType}" ${index === 0 ? 'checked' : ''} />
              <div class="booking-room-type-content">
                <div class="booking-room-type-info">
                  <span>${r.capacity > 1 ? '👥' : '👤'}</span>
                  <span class="booking-room-type-label">${r.roomType}</span>
                </div>
                <span class="booking-room-type-price">₱${r.price.toLocaleString()}/mo</span>
              </div>
            </label>
          `)
          .join('');
      }
    }
  }
  
  // Initialize gallery functionality
  if (room.images && room.images.length > 0) {
    initializeGallery(room.images);
  }
  
  // Initialize favorite button functionality
  initializeFavoriteButton(room.property_id || room.id, room.id);
  
  // Initialize icons
  if (window.initIconElements) {
    window.initIconElements();

  

}

// Load thumbnail images with proper error handling
function loadThumbnailImages(_images) {
  const thumbImgs = document.querySelectorAll('.gallery-thumb-img');
  
  thumbImgs.forEach((img, _index) => {
    const imageUrl = img.dataset.originalSrc;
    
    if (imageUrl) {
      const tempImg = new Image();
      tempImg.onload = function() {
        img.src = imageUrl;

      };
      tempImg.onerror = function() {

      };
      tempImg.src = imageUrl;
    }
  });
}

// Show error message
function showError(message) {
  const roomTitle = document.getElementById('room-title');
  if (roomTitle) {
    roomTitle.textContent = 'Error Loading Room';
    roomTitle.style.color = '#ef4444';
  }
  
  const roomDescription = document.getElementById('room-description');
  if (roomDescription) {
    roomDescription.innerHTML = `<p style="color: #ef4444;">${message}</p>`;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadRoomData);
} else {
  loadRoomData();
}

// Initialize toggle map functionality
document.addEventListener('DOMContentLoaded', function() {
  initializeToggleMap();
});

// Toggle Map Functionality
function initializeToggleMap() {
  const toggleBtn = document.getElementById('toggle-view-btn');
  const backToGalleryBtn = document.getElementById('back-to-gallery-btn');
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleView);
  }
  
  if (backToGalleryBtn) {
    backToGalleryBtn.addEventListener('click', toggleView);
  }
}

/**
 * Toggle between gallery and map view
 */
function toggleView() {
  const gallerySection = document.querySelector('.room-detail-gallery');
  const mapSection = document.getElementById('room-map');
  const toggleBtn = document.getElementById('toggle-view-btn');
  const toggleText = toggleBtn ? toggleBtn.querySelector('.toggle-text') : null;
  const toggleIcon = toggleBtn ? toggleBtn.querySelector('span') : null;

  if (gallerySection && mapSection) {
    const isMapVisible = mapSection.style.display === 'block';

    if (isMapVisible) {
      // Switch to gallery view
      gallerySection.style.display = 'block';
      mapSection.style.display = 'none';
      if (toggleText) toggleText.textContent = 'Show Map';
      
      // Update icon to map
      if (toggleIcon && window.getIcon) {
        const mapIcon = window.getIcon('map', { width: 18, height: 18 });
        toggleIcon.innerHTML = mapIcon;
      }
    } else {
      // Switch to map view
      gallerySection.style.display = 'none';
      mapSection.style.display = 'block';
      if (toggleText) toggleText.textContent = 'Show Gallery';
      
      // Update icon to photo
      if (toggleIcon && window.getIcon) {
        const photoIcon = window.getIcon('photo', { width: 18, height: 18 });
        toggleIcon.innerHTML = photoIcon;
      }
      
      // Initialize Leaflet map when shown (with small delay to ensure DOM is ready)
      setTimeout(() => {
        initLeafletMap();
      }, 100);
    }
  }
}

/**
 * Initialize Leaflet map for the property location
 */
function initLeafletMap() {
  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error('Leaflet library not loaded');
    return;
  }

  // Check if map is already initialized
  if (window.roomDetailMap) {
    return;
  }

  const mapContainer = document.getElementById('leaflet-map');
  if (!mapContainer) {

    return;
  }

  try {
    // Use default coordinates (Quezon City, Philippines) for now
    // In a real implementation, you would get these from the room data
    const latitude = 14.6760;
    const longitude = 121.0437;
    


    // Initialize map centered on property location
    window.roomDetailMap = L.map('leaflet-map').setView([latitude, longitude], 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      minZoom: 10
    }).addTo(window.roomDetailMap);

    // Add marker for the property
    const markerTitle = 'Property Location';
    const markerAddress = 'Quezon City, Philippines';
    
    L.marker([latitude, longitude]).addTo(window.roomDetailMap)
      .bindPopup(`<b>${markerTitle}</b><br>${markerAddress}`)
      .openPopup();


  } catch (error) {
    console.error('Error initializing Leaflet map:', error);
  }
}

// Gallery functionality
let currentImageIndex = 0;
let galleryImages = [];

// Initialize gallery after room data is loaded
function initializeGallery(images) {
  galleryImages = images.map(img => img.startsWith('http') ? img : `${API_BASE_URL}${img}`);
  currentImageIndex = 0;
  
  // Add event listeners for gallery navigation
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentImageIndex = currentImageIndex > 0 ? currentImageIndex - 1 : galleryImages.length - 1;
      updateMainImage();
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentImageIndex = currentImageIndex < galleryImages.length - 1 ? currentImageIndex + 1 : 0;
      updateMainImage();
    });
  }
  
  // Add event listeners for thumbnail clicks
  const thumbnailsContainer = document.getElementById('gallery-thumbnails');
  if (thumbnailsContainer) {
    thumbnailsContainer.addEventListener('click', (e) => {
      const thumb = e.target.closest('.gallery-thumb');
      if (thumb) {
        const index = parseInt(thumb.dataset.index);
        if (!isNaN(index)) {
          currentImageIndex = index;
          updateMainImage();
          updateActiveThumbnail();
        }
      }
    });
  }
}

// Update main image
function updateMainImage() {
  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage && galleryImages.length > 0) {
    const img = new Image();
    img.onload = function() {
      mainImage.src = galleryImages[currentImageIndex];

    };
    img.onerror = function() {

      mainImage.src = '../../../assets/images/placeholder-room.svg';
    };
    img.src = galleryImages[currentImageIndex];
  }
}

// Update active thumbnail
function updateActiveThumbnail() {
  const thumbnails = document.querySelectorAll('.gallery-thumb');
  thumbnails.forEach((thumb, index) => {
    thumb.classList.toggle('active', index === currentImageIndex);
  });
}

// Favorite functionality

/**
 * Initialize favorite button functionality
 */
function initializeFavoriteButton(propertyId, roomId = null) {
  
  const favoriteBtn = document.getElementById('gallery-favorite');
  if (!favoriteBtn) return;
  
  // Remove any existing event listeners by cloning the element
  const newFavoriteBtn = favoriteBtn.cloneNode(true);
  favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn);
  
  // Set up data attributes
  newFavoriteBtn.dataset.propertyId = propertyId;
  if (roomId) {
    newFavoriteBtn.dataset.roomId = roomId;
  }
  
  // Add click event listener
  newFavoriteBtn.addEventListener('click', handleFavoriteClick);
  
  // Load current favorite status
  loadFavoriteStatus(propertyId);
}

/**
 * Handle favorite button click
 */
async function handleFavoriteClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const btn = event.currentTarget;
  const propertyId = btn.dataset.propertyId;
  const roomId = btn.dataset.roomId || null;
  const isFavorite = btn.dataset.favorite === 'true';
  
  if (!propertyId) {
    console.error('Property ID not found');
    showToast('Error: Property ID not found', 'error');
    return;
  }
  
  // Check if user is authenticated
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please log in to save properties', 'error');
    return;
  }
  
  // Optimistic UI update
  btn.dataset.favorite = (!isFavorite).toString();
  updateFavoriteButtonUI(btn, !isFavorite);
  btn.disabled = true;
  
  try {
    if (!isFavorite) {
      // Save the property
      const response = await authenticatedFetch(`${API_BASE_URL}/api/boarder/saved-listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: parseInt(propertyId),
          room_id: roomId ? parseInt(roomId) : null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save property');
      }
      
      showToast('Property saved successfully!', 'success');
    } else {
      // Remove from saved
      const response = await authenticatedFetch(`${API_BASE_URL}/api/boarder/saved-listings`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: parseInt(propertyId),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove property');
      }
      
      showToast('Property removed from saved list', 'success');
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    
    // Revert UI on error
    btn.dataset.favorite = isFavorite.toString();
    updateFavoriteButtonUI(btn, isFavorite);
    
    showToast(error.message || 'Failed to update saved status', 'error');
  } finally {
    btn.disabled = false;
  }
}

/**
 * Update favorite button UI
 */
function updateFavoriteButtonUI(btn, isFavorite) {
  if (isFavorite) {
    btn.classList.add('active');
    // Use the same bookmark icon but with active styling
    btn.innerHTML = '<span data-icon="bookmark" data-icon-width="24" data-icon-height="24"></span>';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<span data-icon="bookmark" data-icon-width="24" data-icon-height="24"></span>';
  }
  
  // Re-initialize icons if available
  if (window.initIconElements) {
    window.initIconElements();
  }
}

/**
 * Load current favorite status for the property
 */
async function loadFavoriteStatus(propertyId) {
  const favoriteBtn = document.getElementById('gallery-favorite');
  if (!favoriteBtn) return;
  
  // Check if user is authenticated
  const token = localStorage.getItem('token');
  if (!token) {
    // User not logged in, keep button as unfavorited
    favoriteBtn.dataset.favorite = 'false';
    updateFavoriteButtonUI(favoriteBtn, false);
    return;
  }
  
  try {
    // Check if property is saved using the correct endpoint
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/boarder/saved-listings?property_id=${propertyId}`
    );
    
    if (response.ok) {
      const data = await response.json();
      const isSaved = data.is_saved || false;
      
      favoriteBtn.dataset.favorite = isSaved.toString();
      updateFavoriteButtonUI(favoriteBtn, isSaved);
    } else {
      // API call failed, default to not saved
      favoriteBtn.dataset.favorite = 'false';
      updateFavoriteButtonUI(favoriteBtn, false);
    }
  } catch (error) {
    console.error('Error loading favorite status:', error);
    // On error, default to not saved
    favoriteBtn.dataset.favorite = 'false';
    updateFavoriteButtonUI(favoriteBtn, false);
  }
}

/**
 * Authenticated fetch helper
 */
async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  return fetch(url, mergedOptions);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  // Add styles
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '6px',
    color: 'white',
    fontWeight: '500',
    zIndex: '10000',
    transform: 'translateX(100%)',
    transition: 'transform 0.3s ease',
    backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
  });
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}