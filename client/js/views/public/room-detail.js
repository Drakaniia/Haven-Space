/**
 * Room Detail Page - Public View
 * Handles room details display and gallery for public users
 */

import { getImageUrl } from '../../shared/image-utils.js';
import CONFIG from '../../config.js';
import { initIconElements, getIcon } from '../../shared/icons.js';

// State management
const state = {
  currentImageIndex: 0,
  roomId: null,
  isFavorite: false,
  roomData: null, // Store fetched room data
};

/**
 * Initialize the Room Detail page
 */
export function initRoomDetail() {
  if (!document.querySelector('.room-detail-dashboard')) {
    return;
  }

  // Extract room ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  state.roomId = parseInt(urlParams.get('id')) || 1;

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupPage());
  } else {
    setupPage();
  }
}

/**
 * Setup the page with room data
 */
async function setupPage() {
  try {
    // Show loading state
    showLoadingState();

    // Fetch room data from API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/detail?id=${state.roomId}`);

    if (!response.ok) {
      if (response.status === 404) {
        showNotFound();
        return;
      }
      throw new Error('Failed to fetch property details');
    }

    const result = await response.json();
    state.roomData = result.data;

    // Populate page with fetched data
    populateRoomData(state.roomData);
    setupGallery();
    setupEventListeners(state.roomData);
  } catch (error) {
    console.error('Error loading room details:', error);
    showNotFound();
  }
}

/**
 * Show loading state
 */
function showLoadingState() {
  const content = document.querySelector('.room-detail-content');
  if (content) {
    content.style.opacity = '0.5';
    content.style.pointerEvents = 'none';
  }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
  const content = document.querySelector('.room-detail-content');
  if (content) {
    content.style.opacity = '1';
    content.style.pointerEvents = 'auto';
  }
}

/**
 * Populate room data into the page
 */
function populateRoomData(room) {
  // Hide loading state
  hideLoadingState();

  // Update page title
  document.title = `${room.title} - Haven Space`;

  // Update breadcrumb
  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = room.title;
  }

  // Update room details
  const roomTitle = document.getElementById('room-title');
  if (roomTitle) roomTitle.textContent = room.title;

  // Update badges
  const badgesContainer = document.querySelector('.room-detail-badges');
  if (badgesContainer && room.badges && room.badges.length > 0) {
    badgesContainer.innerHTML = room.badges
      .map(badge => {
        const badgeClass =
          badge === 'verified'
            ? 'room-badge-verified'
            : badge === 'new'
            ? 'room-badge-new'
            : badge === 'promo'
            ? 'room-badge-promo'
            : '';
        const badgeText =
          badge === 'verified'
            ? 'Verified Property'
            : badge === 'new'
            ? 'New Listing'
            : badge === 'promo'
            ? 'Promo'
            : badge;
        const badgeIcon =
          badge === 'verified'
            ? '<span data-icon="badgeCheck" data-icon-width="16" data-icon-height="16"></span>'
            : '';

        return `
          <span class="room-badge ${badgeClass}">
            ${badgeIcon}
            ${badgeText}
          </span>
        `;
      })
      .join('');
  } else if (badgesContainer) {
    badgesContainer.innerHTML = '';
  }

  const roomAddress = document.getElementById('room-address');
  if (roomAddress) {
    const fullAddress = [room.address, room.city, room.province].filter(Boolean).join(', ');
    roomAddress.textContent = fullAddress;
  }

  const roomRating = document.getElementById('room-rating');
  const roomRatingContainer = document.querySelector('.room-detail-rating');
  if (roomRating && room.rating && room.reviews > 0) {
    roomRating.textContent = room.rating;
    if (roomRatingContainer) roomRatingContainer.style.display = 'flex';
  } else {
    if (roomRatingContainer) roomRatingContainer.style.display = 'none';
  }

  const roomReviews = document.getElementById('room-reviews');
  if (roomReviews && room.reviews > 0) {
    roomReviews.textContent = `(${room.reviews} reviews)`;
  } else if (roomReviews) {
    roomReviews.textContent = '(No reviews yet)';
  }

  const roomDistance = document.getElementById('room-distance');
  if (roomDistance) {
    // Hide distance element if not available
    const distanceContainer = roomDistance.closest('.room-detail-distance');
    if (room.distance) {
      roomDistance.textContent = room.distance;
      if (distanceContainer) distanceContainer.style.display = 'flex';
    } else {
      if (distanceContainer) distanceContainer.style.display = 'none';
    }
  }

  const roomTypes = document.getElementById('room-types');
  if (roomTypes) roomTypes.textContent = room.roomTypes || room.types || 'Available';

  const roomAvailability = document.getElementById('room-availability');
  if (roomAvailability)
    roomAvailability.textContent = room.availability || 'Contact for availability';

  const roomPrice = document.getElementById('room-price');
  if (roomPrice) roomPrice.textContent = `₱${room.price.toLocaleString()}`;

  const bookingAvailability = document.getElementById('booking-availability');
  if (bookingAvailability)
    bookingAvailability.textContent = room.availability || 'Contact for availability';

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
        const amenityIcon = typeof amenity === 'object' ? amenity.icon : 'check';
        return `
            <div class="amenity-item">
              <span data-icon="${amenityIcon}" data-icon-width="20" data-icon-height="20"></span>
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
        const ruleIcon = typeof rule === 'object' ? rule.icon : 'check';
        return `
            <div class="rule-item">
              <span data-icon="${ruleIcon}" data-icon-width="20" data-icon-height="20"></span>
              <div class="rule-content">
                <h4>${ruleTitle}</h4>
                ${ruleDesc ? `<p>${ruleDesc}</p>` : ''}
              </div>
            </div>
          `;
      })
      .join('');
  } else if (rulesContainer && room.rules && room.rules.length > 0) {
    // Fallback to old format
    rulesContainer.innerHTML = room.rules
      .map(
        rule => `
      <div class="rule-item">
        <span data-icon="${rule.icon}" data-icon-width="20" data-icon-height="20"></span>
        <div class="rule-content">
          <h4>${rule.title}</h4>
          <p>${rule.desc}</p>
        </div>
      </div>
    `
      )
      .join('');
  }

  // Update landlord info
  const landlordName = document.getElementById('landlord-name');
  if (landlordName && room.landlord) {
    landlordName.textContent = room.landlord.name || 'Property Owner';
  }

  // Update landlord stats
  const landlordStats = document.querySelectorAll('.landlord-stat-value');
  if (landlordStats.length >= 2 && room.landlord) {
    landlordStats[0].textContent = room.landlord.properties || '0';
    landlordStats[1].textContent = room.landlord.rating || '0';
  }

  // Update gallery images
  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage && room.images && room.images.length > 0) {
    mainImage.src = getImageUrl(room.images[0]);
    mainImage.alt = `${room.title} - Main View`;
    mainImage.onerror = function () {
      this.src = getImageUrl(null);
    };
  } else if (mainImage) {
    mainImage.src = getImageUrl(null);
    mainImage.alt = 'No image available';
  }

  // Update thumbnails
  const thumbnailsContainer = document.getElementById('gallery-thumbnails');
  if (thumbnailsContainer && room.images && room.images.length > 0) {
    thumbnailsContainer.innerHTML = room.images
      .map(
        (img, index) => `
          <button class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${getImageUrl(img)}" alt="Thumbnail ${index + 1}" />
          </button>
        `
      )
      .join('');
  }

  // Update booking section with room types
  if (room.rooms && room.rooms.length > 0) {
    const roomTypeOptions = document.querySelector('.booking-room-type-options');
    if (roomTypeOptions) {
      const availableRooms = room.rooms.filter(r => r.status === 'available');

      if (availableRooms.length > 0) {
        roomTypeOptions.innerHTML = availableRooms
          .map(
            (r, index) => `
              <label class="booking-room-option">
                <input type="radio" name="room-type" value="${r.roomType}" ${
              index === 0 ? 'checked' : ''
            } />
                <div class="booking-room-type-content">
                  <div class="booking-room-type-info">
                    <span data-icon="${
                      r.capacity > 1 ? 'userGroup' : 'user'
                    }" data-icon-width="18" data-icon-height="18"></span>
                    <span class="booking-room-type-label">${r.roomType}</span>
                  </div>
                  <span class="booking-room-type-price">₱${r.price.toLocaleString()}/mo</span>
                </div>
              </label>
            `
          )
          .join('');
      } else {
        roomTypeOptions.innerHTML = `
          <div style="padding: 1rem; text-align: center; color: #6b7280;">
            No rooms currently available
          </div>
        `;
      }
    }
  } else {
    // Fallback to old format with single/shared prices
    const roomTypeOptions = document.querySelectorAll('.booking-room-option');
    if (roomTypeOptions.length >= 2 && room.price && room.sharedPrice) {
      const singlePrice = roomTypeOptions[0].querySelector('.booking-room-type-price');
      if (singlePrice) singlePrice.textContent = `₱${room.price.toLocaleString()}/mo`;

      const sharedPrice = roomTypeOptions[1].querySelector('.booking-room-type-price');
      if (sharedPrice) sharedPrice.textContent = `₱${room.sharedPrice.toLocaleString()}/mo`;
    }
  }

  // Update min stay and deposit
  const minStayElement = document.querySelector('.quick-info-card:nth-child(3) .quick-info-value');
  if (minStayElement) {
    minStayElement.textContent = room.minStay || 'Contact for details';
  }

  const depositElements = document.querySelectorAll('.booking-info-item strong');
  if (depositElements.length >= 3) {
    depositElements[2].textContent = room.deposit || 'Contact for details';
  }

  // Update reviews
  const reviewsAverage = document.getElementById('reviews-average');
  if (reviewsAverage) reviewsAverage.textContent = room.rating || '0';

  const reviewsTotal = document.getElementById('reviews-total');
  if (reviewsTotal) reviewsTotal.textContent = room.reviews || '0';

  // Update rating breakdown - hide if no reviews
  const ratingBreakdown = document.querySelector('.rating-breakdown');
  if (ratingBreakdown && (!room.reviews || room.reviews === 0)) {
    ratingBreakdown.style.display = 'none';
  }

  // Initialize icons
  initIconElements();
}

/**
 * Initialize Leaflet map for the property location
 */
function initLeafletMap() {
  const room = state.roomData;

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
    // Use room coordinates if available, otherwise use default coordinates (Quezon City, Philippines)
    const latitude = room && room.latitude ? room.latitude : 14.676;
    const longitude = room && room.longitude ? room.longitude : 121.0437;

    // Initialize map centered on property location
    window.roomDetailMap = L.map('leaflet-map').setView([latitude, longitude], 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      minZoom: 10,
    }).addTo(window.roomDetailMap);

    // Add marker for the property
    const markerTitle = room && room.title ? room.title : 'Property Location';
    const markerAddress = room && room.address ? room.address : 'Quezon City, Philippines';

    L.marker([latitude, longitude])
      .addTo(window.roomDetailMap)
      .bindPopup(`<b>${markerTitle}</b><br>${markerAddress}`)
      .openPopup();
  } catch (error) {
    console.error('Error initializing Leaflet map:', error);
  }
}

/**
 * Toggle between gallery and map view
 */
function toggleView() {
  const gallerySection = document.querySelector('.room-detail-gallery');
  const mapSection = document.getElementById('room-map');
  const toggleBtn = document.getElementById('toggle-view-btn');
  const toggleText = toggleBtn.querySelector('.toggle-text');
  const toggleIcon = toggleBtn.querySelector('span');

  if (gallerySection && mapSection) {
    const isMapVisible = mapSection.style.display === 'block';

    if (isMapVisible) {
      // Switch to gallery view
      gallerySection.style.display = 'block';
      mapSection.style.display = 'none';
      toggleText.textContent = 'Show Map';

      // Update icon to map
      const mapIcon = getIcon('map', { width: 18, height: 18 });
      toggleIcon.innerHTML = mapIcon;
    } else {
      // Switch to map view
      gallerySection.style.display = 'none';
      mapSection.style.display = 'block';
      toggleText.textContent = 'Show Gallery';

      // Update icon to photo
      const photoIcon = getIcon('photo', { width: 18, height: 18 });
      toggleIcon.innerHTML = photoIcon;

      // Initialize Leaflet map when shown (with small delay to ensure DOM is ready)
      setTimeout(() => {
        initLeafletMap();
      }, 100);
    }
  }
}

/**
 * Setup gallery functionality
 */
function setupGallery() {
  const room = state.roomData;
  if (!room || !room.images || room.images.length === 0) return;

  const totalImages = room.images.length;

  // Previous button
  const prevBtn = document.getElementById('gallery-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      state.currentImageIndex = (state.currentImageIndex - 1 + totalImages) % totalImages;
      updateGalleryImage();
    });
  }

  // Next button
  const nextBtn = document.getElementById('gallery-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      state.currentImageIndex = (state.currentImageIndex + 1) % totalImages;
      updateGalleryImage();
    });
  }

  // Thumbnails
  document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      state.currentImageIndex = parseInt(thumb.dataset.index);
      updateGalleryImage();
    });
  });

  // Favorite button
  const favoriteBtn = document.getElementById('gallery-favorite');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', () => {
      state.isFavorite = !state.isFavorite;
      favoriteBtn.dataset.favorite = state.isFavorite.toString();

      const icon = favoriteBtn.querySelector('[data-icon]');
      if (icon) {
        icon.setAttribute('data-icon', state.isFavorite ? 'bookmarkSolid' : 'bookmark');
      }

      if (state.isFavorite) {
        favoriteBtn.classList.add('active');
      } else {
        favoriteBtn.classList.remove('active');
      }
    });
  }

  // Toggle button for map view
  const toggleBtn = document.getElementById('toggle-view-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toggleView();
    });
  }

  // Back to gallery button
  const backBtn = document.getElementById('back-to-gallery-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      toggleView();
    });
  }
}

/**
 * Update gallery main image
 */
function updateGalleryImage() {
  const room = state.roomData;
  if (!room || !room.images || room.images.length === 0) return;

  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage) {
    mainImage.src = getImageUrl(room.images[state.currentImageIndex]);
    mainImage.onerror = function () {
      this.src = getImageUrl(null);
    };
  }

  // Update thumbnail active state
  document.querySelectorAll('.gallery-thumb').forEach((thumb, index) => {
    if (index === state.currentImageIndex) {
      thumb.classList.add('active');
    } else {
      thumb.classList.remove('active');
    }
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners(_room) {
  // Apply Now button - redirect to login for public users
  const applyBtn = document.getElementById('apply-now-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const redirectUrl = encodeURIComponent(window.location.href);
      window.location.href = `../auth/login.html?redirect=${redirectUrl}`;
    });
  }

  // Schedule Tour button - redirect to login for public users
  const scheduleTourBtn = document.getElementById('schedule-tour-btn');
  if (scheduleTourBtn) {
    scheduleTourBtn.addEventListener('click', () => {
      const redirectUrl = encodeURIComponent(window.location.href);
      window.location.href = `../auth/login.html?redirect=${redirectUrl}`;
    });
  }

  // Contact Landlord button - redirect to login for public users
  const contactLandlordBtn = document.getElementById('contact-landlord-btn');
  if (contactLandlordBtn) {
    contactLandlordBtn.addEventListener('click', () => {
      const redirectUrl = encodeURIComponent(window.location.href);
      window.location.href = `../auth/login.html?redirect=${redirectUrl}`;
    });
  }

  // Similar property cards
  document.querySelectorAll('.similar-property-card').forEach(card => {
    card.addEventListener('click', () => {
      const propertyId = card.dataset.propertyId;
      if (propertyId) {
        window.location.href = `detail.html?id=${propertyId}`;
      }
    });
  });
}

/**
 * Show not found state
 */
function showNotFound() {
  const content = document.querySelector('.room-detail-content');
  if (content) {
    content.innerHTML = `
      <div class="room-detail-not-found">
        <span data-icon="home" data-icon-width="64" data-icon-height="64"></span>
        <h2>Room Not Found</h2>
        <p>The room you're looking for doesn't exist or has been removed.</p>
        <a href="../find-a-room.html" class="room-detail-back-btn">
          <span data-icon="arrowLeft" data-icon-width="20" data-icon-height="20"></span>
          Back to Find a Room
        </a>
      </div>
    `;
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  window.initRoomDetail = initRoomDetail;
  initRoomDetail();
}
