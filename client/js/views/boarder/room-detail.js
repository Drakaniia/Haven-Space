/**
 * Room Detail Page - Boarder Dashboard
 * Handles room details display, gallery, and booking functionality
 */

import { updateBoarderStatus } from '../../shared/routing.js';
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
    console.log('setupPage called, fetching data for room ID:', state.roomId);

    // Show loading state
    showLoadingState();

    // Fetch room data from API
    console.log('Fetching from:', `${CONFIG.API_BASE_URL}/api/rooms/detail?id=${state.roomId}`);
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/rooms/detail?id=${state.roomId}`);

    console.log('Response status:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        showNotFound();
        return;
      }
      throw new Error('Failed to fetch property details');
    }

    const result = await response.json();
    console.log('API response:', result);
    state.roomData = result.data;

    // Populate page with fetched data
    console.log('Populating room data');
    populateRoomData(state.roomData);
    setupGallery();
    setupEventListeners(state.roomData);

    console.log('Room detail page setup complete');
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
  if (roomTypes) roomTypes.textContent = room.roomTypes || 'Available';

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
    // No rooms data, show message
    const roomTypeOptions = document.querySelector('.booking-room-type-options');
    if (roomTypeOptions) {
      roomTypeOptions.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: #6b7280;">
          Contact landlord for room availability
        </div>
      `;
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

  // Load available rooms
  loadAvailableRooms(room);

  // Load similar properties
  loadSimilarProperties(room.id);
}

/**
 * Setup gallery functionality
 */
async function setupGallery() {
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
    console.log('Leaflet map container not found');
    return;
  }

  try {
    // Use room coordinates if available, otherwise use default coordinates (Quezon City, Philippines)
    const latitude = room && room.latitude ? room.latitude : 14.676;
    const longitude = room && room.longitude ? room.longitude : 121.0437;

    console.log('Initializing map with coordinates:', latitude, longitude);

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

    console.log('Leaflet map initialized successfully');
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

      // Initialize Leaflet map when shown
      setTimeout(() => {
        initLeafletMap();
      }, 100);
    }
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
function setupEventListeners(room) {
  // Apply Now button
  const applyBtn = document.getElementById('apply-now-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => handleApplyNow(room));
  }

  // Schedule Tour button
  const scheduleTourBtn = document.getElementById('schedule-tour-btn');
  if (scheduleTourBtn) {
    scheduleTourBtn.addEventListener('click', () => handleScheduleTour(room));
  }

  // Contact Landlord button
  const contactLandlordBtn = document.getElementById('contact-landlord-btn');
  if (contactLandlordBtn) {
    contactLandlordBtn.addEventListener('click', () => handleContactLandlord(room));
  }
}

/**
 * Handle Apply Now action
 */
function handleApplyNow(room) {
  console.log('handleApplyNow called', room);

  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user || !user.id || user.role !== 'boarder') {
    // Not logged in, redirect to login with correct relative path
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `../../public/auth/login.html?redirect=${redirectUrl}`;
    return;
  }

  console.log('Redirecting to confirm-booking page');

  // Get selected room type and its price
  const selectedRoomType = document.querySelector('input[name="room-type"]:checked');
  let roomType = 'Standard Room';
  let roomPrice = room.price || 0;

  if (selectedRoomType) {
    const roomOption = selectedRoomType.closest('.booking-room-option');
    const roomTypeLabel = roomOption?.querySelector('.booking-room-type-label');
    const roomTypePrice = roomOption?.querySelector('.booking-room-type-price');

    if (roomTypeLabel) {
      roomType = roomTypeLabel.textContent.trim();
    }

    if (roomTypePrice) {
      // Extract price from text like "₱4,500/mo"
      const priceText = roomTypePrice.textContent.replace(/[₱,/mo]/g, '').trim();
      roomPrice = parseInt(priceText) || room.price || 0;
    }
  }

  // User is logged in, redirect to confirm-booking page to set up moving date
  // Pass room details as URL parameters since they haven't applied yet
  const params = new URLSearchParams({
    id: room.id || state.roomId,
    title: room.title || 'Property',
    price: roomPrice,
    address: room.address || '',
    landlordName: room.landlord?.name || 'Property Owner',
    roomType: roomType,
  });

  window.location.href = `../confirm-booking/index.html?${params.toString()}`;
}

/**
 * Show application confirmation modal
 */
function showApplicationModal(room) {
  // Get selected room type
  const selectedRoomType = document.querySelector('input[name="room-type"]:checked');
  const roomType = selectedRoomType ? selectedRoomType.value : 'single';
  const price = roomType === 'single' ? room.price : room.sharedPrice;

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'application-modal-overlay';
  modalOverlay.innerHTML = `
    <div class="application-modal">
      <div class="application-modal-header">
        <div class="application-modal-icon">
          <span data-icon="application" data-icon-width="24" data-icon-height="24"></span>
        </div>
        <h2 class="application-modal-title">Confirm Your Application</h2>
        <p class="application-modal-subtitle">Review your application details before submitting</p>
      </div>
      
      <div class="application-modal-body">
        <div class="application-modal-info">
          <div class="application-modal-info-item">
            <span class="application-modal-info-label">Property</span>
            <span class="application-modal-info-value">${room.title}</span>
          </div>
          <div class="application-modal-info-item">
            <span class="application-modal-info-label">Room Type</span>
            <span class="application-modal-info-value">${
              roomType === 'single' ? 'Single Room' : 'Shared Room'
            }</span>
          </div>
          <div class="application-modal-info-item">
            <span class="application-modal-info-label">Monthly Rent</span>
            <span class="application-modal-info-value">₱${price.toLocaleString()}</span>
          </div>
          <div class="application-modal-info-item">
            <span class="application-modal-info-label">Deposit Required</span>
            <span class="application-modal-info-value">${room.deposit}</span>
          </div>
        </div>

        <div class="application-modal-message">
          <h3 class="application-modal-message-title">
            <span data-icon="informationCircle" data-icon-width="20" data-icon-height="20"></span>
            What happens next?
          </h3>
          <p class="application-modal-message-text">
            Your application will be sent to the landlord for review. You'll receive a notification once they respond. 
            This typically takes 1-3 business days. You can continue browsing other properties while you wait.
          </p>
        </div>
      </div>

      <div class="application-modal-actions">
        <button class="application-modal-btn application-modal-btn-secondary" id="modal-cancel-btn">
          Cancel
        </button>
        <button class="application-modal-btn application-modal-btn-tertiary" id="modal-browse-btn">
          <span data-icon="search" data-icon-width="18" data-icon-height="18"></span>
          Browse More
        </button>
        <button class="application-modal-btn application-modal-btn-primary" id="modal-submit-btn">
          <span data-icon="paperAirplane" data-icon-width="18" data-icon-height="18"></span>
          Submit Application
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Trigger animation
  requestAnimationFrame(() => {
    modalOverlay.classList.add('active');
  });

  // Event listeners
  const cancelBtn = modalOverlay.querySelector('#modal-cancel-btn');
  const browseBtn = modalOverlay.querySelector('#modal-browse-btn');
  const submitBtn = modalOverlay.querySelector('#modal-submit-btn');

  // Cancel button - close modal
  cancelBtn.addEventListener('click', () => {
    closeModal(modalOverlay);
  });

  // Browse more button - close modal and stay on page
  browseBtn.addEventListener('click', () => {
    closeModal(modalOverlay);
    // Optionally scroll to similar properties
    const similarSection = document.querySelector('.similar-properties');
    if (similarSection) {
      similarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Submit button - submit application
  submitBtn.addEventListener('click', () => {
    submitApplication(room, roomType, modalOverlay);
  });

  // Close on overlay click
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) {
      closeModal(modalOverlay);
    }
  });
}

/**
 * Submit application
 */
async function submitApplication(room, roomType, modalOverlay) {
  const submitBtn = modalOverlay.querySelector('#modal-submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.textContent = 'Submitting...';

  try {
    // Get form data
    const messageInput = modalOverlay.querySelector('#application-message');
    const moveInDateInput = modalOverlay.querySelector('#move-in-date');
    const termsCheckbox = modalOverlay.querySelector('#terms-checkbox');

    // Validate form
    if (!termsCheckbox.checked) {
      throw new Error('Please accept the terms and conditions');
    }

    if (!moveInDateInput.value) {
      throw new Error('Please select a move-in date');
    }

    // Prepare application data
    const applicationData = {
      room_id: room.id,
      landlord_id: room.landlord_id,
      property_id: room.property_id,
      message: `Move-in Date: ${moveInDateInput.value}\n\n${
        messageInput.value || 'No additional message provided.'
      }`,
    };

    // Get auth token
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.token) {
      throw new Error('Authentication required. Please log in.');
    }

    // Submit to backend API
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`,
      },
      credentials: 'include',
      body: JSON.stringify(applicationData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to submit application');
    }

    // Update boarder status
    updateBoarderStatus('applied_pending');

    // Show success state
    showSuccessModal(room, modalOverlay);
  } catch (error) {
    console.error('Application submission error:', error);
    submitBtn.classList.remove('loading');
    submitBtn.innerHTML = `
      <span data-icon="paperAirplane" data-icon-width="18" data-icon-height="18"></span>
      Submit Application
    `;
    alert(error.message || 'Failed to submit application. Please try again.');
  }
}

/**
 * Show success modal
 */
function showSuccessModal(room, modalOverlay) {
  const modal = modalOverlay.querySelector('.application-modal');
  modal.classList.add('application-modal-success');
  modal.innerHTML = `
    <div class="application-modal-header">
      <div class="application-modal-icon">
        <span data-icon="checkCircle" data-icon-width="24" data-icon-height="24"></span>
      </div>
      <h2 class="application-modal-title">Application Submitted!</h2>
      <p class="application-modal-subtitle">Your application has been sent to the landlord</p>
    </div>
    
    <div class="application-modal-body">
      <div class="application-modal-message">
        <h3 class="application-modal-message-title">
          <span data-icon="clock" data-icon-width="20" data-icon-height="20"></span>
          What's next?
        </h3>
        <p class="application-modal-message-text">
          The landlord will review your application and respond within 1-3 business days. 
          You'll receive a notification when they make a decision. Feel free to continue browsing other properties!
        </p>
      </div>
    </div>

    <div class="application-modal-actions">
      <button class="application-modal-btn application-modal-btn-tertiary" id="modal-browse-more-btn">
        <span data-icon="search" data-icon-width="18" data-icon-height="18"></span>
        Browse More Listings
      </button>
      <button class="application-modal-btn application-modal-btn-primary" id="modal-view-applications-btn">
        <span data-icon="clipboardList" data-icon-width="18" data-icon-height="18"></span>
        View My Applications
      </button>
    </div>
  `;

  // Event listeners for success modal
  const browseMoreBtn = modal.querySelector('#modal-browse-more-btn');
  const viewApplicationsBtn = modal.querySelector('#modal-view-applications-btn');

  browseMoreBtn.addEventListener('click', () => {
    closeModal(modalOverlay);
    // Navigate to find a room page
    const basePath = window.location.pathname.includes('github.io')
      ? '/Haven-Space/client/views/public/find-a-room.html'
      : '/views/public/find-a-room.html';
    window.location.href = basePath;
  });

  viewApplicationsBtn.addEventListener('click', () => {
    closeModal(modalOverlay);
    // Navigate to applications page
    const basePath = window.location.pathname.includes('github.io')
      ? '/Haven-Space/client/views/boarder/applications/index.html'
      : '/views/boarder/applications/index.html';
    window.location.href = basePath;
  });
}

/**
 * Close modal
 */
function closeModal(modalOverlay) {
  modalOverlay.classList.remove('active');
  setTimeout(() => {
    modalOverlay.remove();
  }, 300);
}

/**
 * Handle Schedule Tour action
 */
function handleScheduleTour(room) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user || user.role !== 'boarder') {
    const basePath = window.location.pathname.includes('github.io')
      ? '/Haven-Space/client/views/public/auth/login.html'
      : '/views/public/auth/login.html';

    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${basePath}?redirect=${redirectUrl}`;
    return;
  }

  // TODO: Implement tour scheduling modal/form
  alert(`Schedule a tour for ${room.title}. (Feature coming soon)`);
}

/**
 * Handle Contact Landlord action
 */
function handleContactLandlord(room) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!user || user.role !== 'boarder') {
    const basePath = window.location.pathname.includes('github.io')
      ? '/Haven-Space/client/views/public/auth/login.html'
      : '/views/public/auth/login.html';

    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${basePath}?redirect=${redirectUrl}`;
    return;
  }

  // TODO: Redirect to messages page with landlord
  alert(`Contact landlord for ${room.title}. (Integration pending)`);

  const basePath = window.location.pathname.includes('github.io')
    ? '/Haven-Space/client/views/boarder/messages/index.html'
    : '/views/boarder/messages/index.html';

  window.location.href = basePath;
}

/**
 * Load similar properties
 */
async function loadSimilarProperties(propertyId) {
  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/rooms/similar?id=${propertyId}&limit=3`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch similar properties');
    }

    const result = await response.json();
    const similarProperties = result.data || [];

    // Get the similar properties container
    const similarPropertiesContainer = document.getElementById('similar-properties');

    if (similarPropertiesContainer && similarProperties.length > 0) {
      similarPropertiesContainer.innerHTML = similarProperties
        .map(
          property => `
          <div class="similar-property-card" data-property-id="${property.id}">
            <div class="similar-property-image-wrapper">
              <img
                src="${property.coverImage || '/assets/images/placeholder-room.svg'}"
                alt="${property.title}"
                class="similar-property-image"
              />
              <div class="similar-property-badges">
                ${
                  property.rating >= 4.5
                    ? `
                  <span class="similar-property-badge similar-property-badge-verified">
                    <span data-icon="badgeCheck" data-icon-width="14" data-icon-height="14"></span>
                    Verified
                  </span>
                `
                    : ''
                }
              </div>
            </div>
            <div class="similar-property-content">
              <h3 class="similar-property-title">${property.title}</h3>
              <div class="similar-property-location">
                <span data-icon="location" data-icon-width="16" data-icon-height="16"></span>
                <span>${property.city || property.address || 'N/A'}</span>
              </div>
              <div class="similar-property-meta">
                <div class="similar-property-rating">
                  <span data-icon="starSolid" data-icon-width="14" data-icon-height="14"></span>
                  <span>${property.rating || 'New'}</span>
                  <span class="similar-property-rating-count">(${property.reviewCount || 0})</span>
                </div>
                <div class="similar-property-price">
                  <span class="similar-property-price-amount">₱${
                    property.price ? property.price.toLocaleString() : 'N/A'
                  }</span>
                  <span class="similar-property-price-period">/mo</span>
                </div>
              </div>
            </div>
          </div>
        `
        )
        .join('');

      // Add event listeners to the new cards
      document.querySelectorAll('.similar-property-card').forEach(card => {
        card.addEventListener('click', () => {
          const propertyId = card.dataset.propertyId;
          if (propertyId) {
            window.location.href = `detail.html?id=${propertyId}`;
          }
        });
      });
    }
  } catch (error) {
    console.error('Error loading similar properties:', error);
    // If there's an error, keep the hardcoded properties or show nothing
  }
}

/**
 * Load available rooms for the property
 */
function loadAvailableRooms(property) {
  const roomsGrid = document.getElementById('available-rooms-grid');
  if (!roomsGrid) return;

  // Check if property has rooms data
  if (!property.rooms || property.rooms.length === 0) {
    roomsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-gray);">
        <p>No room details available for this property.</p>
      </div>
    `;
    return;
  }

  // Render room cards
  roomsGrid.innerHTML = property.rooms
    .map(room => {
      const statusClass =
        room.status === 'available'
          ? 'available'
          : room.status === 'occupied'
          ? 'occupied'
          : 'limited';
      const statusText =
        room.status === 'available'
          ? 'Available'
          : room.status === 'occupied'
          ? 'Occupied'
          : 'Limited';
      const roomImage =
        room.images && room.images.length > 0 ? getImageUrl(room.images[0]) : getImageUrl(null);
      const roomDescription = room.description || 'No description available';
      const roomSize = room.size ? `${room.size} sqm` : 'N/A';
      const furnishing = room.furnishing || 'Not specified';

      return `
        <div class="available-room-card" data-room-id="${room.id}" data-room='${JSON.stringify(
        room
      ).replace(/'/g, '&apos;')}'>
          <div class="available-room-image-wrapper">
            <img src="${roomImage}" alt="${room.roomType}" class="available-room-image" />
            <span class="available-room-status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="available-room-content">
            <div class="available-room-header">
              <h3 class="available-room-type">${room.roomType}</h3>
              <div class="available-room-price">
                <span class="available-room-price-amount">₱${room.price.toLocaleString()}</span>
                <span class="available-room-price-period">/mo</span>
              </div>
            </div>
            <div class="available-room-details">
              <div class="available-room-detail">
                <span data-icon="userGroup" data-icon-width="16" data-icon-height="16"></span>
                <span>${room.capacity} ${room.capacity > 1 ? 'persons' : 'person'}</span>
              </div>
              <div class="available-room-detail">
                <span data-icon="ruler" data-icon-width="16" data-icon-height="16"></span>
                <span>${roomSize}</span>
              </div>
              <div class="available-room-detail">
                <span data-icon="bed" data-icon-width="16" data-icon-height="16"></span>
                <span>${furnishing}</span>
              </div>
            </div>
            <p class="available-room-description">${roomDescription}</p>
          </div>
        </div>
      `;
    })
    .join('');

  // Initialize icons for room cards
  initIconElements();

  // Add click event listeners to room cards
  document.querySelectorAll('.available-room-card').forEach(card => {
    card.addEventListener('click', () => {
      const roomData = JSON.parse(card.dataset.room);
      showRoomDetailModal(roomData, property);
    });
  });
}

/**
 * Show room detail modal
 */
function showRoomDetailModal(room, property) {
  const modal = document.getElementById('room-detail-modal');
  if (!modal) return;

  // Populate modal with room data
  const modalTitle = document.getElementById('modal-room-title');
  if (modalTitle) modalTitle.textContent = room.roomType;

  // Update status badge
  const statusBadge = document.getElementById('modal-room-status');
  if (statusBadge) {
    const statusClass = room.status === 'available' ? 'available' : 'occupied';
    const statusText = room.status === 'available' ? 'Available' : 'Occupied';
    statusBadge.className = `room-modal-status-badge ${statusClass}`;
    statusBadge.textContent = statusText;
  }

  // Update price
  const priceAmount = document.getElementById('modal-room-price');
  if (priceAmount) priceAmount.textContent = `₱${room.price.toLocaleString()}`;

  // Update capacity
  const capacity = document.getElementById('modal-room-capacity');
  if (capacity)
    capacity.textContent = `${room.capacity} ${room.capacity > 1 ? 'persons' : 'person'}`;

  // Update room type
  const roomType = document.getElementById('modal-room-type');
  if (roomType) roomType.textContent = room.roomType;

  // Update size
  const size = document.getElementById('modal-room-size');
  if (size) size.textContent = room.size ? `${room.size} sqm` : 'Not specified';

  // Update furnishing
  const furnishing = document.getElementById('modal-room-furnishing');
  if (furnishing) furnishing.textContent = room.furnishing || 'Not specified';

  // Update description
  const description = document.getElementById('modal-room-description');
  if (description) description.textContent = room.description || 'No description available.';

  // Update gallery
  const mainImage = document.getElementById('modal-main-image');
  const thumbnailsContainer = document.getElementById('modal-thumbnails');

  if (room.images && room.images.length > 0) {
    if (mainImage) {
      mainImage.src = getImageUrl(room.images[0]);
      mainImage.alt = room.roomType;
    }

    if (thumbnailsContainer) {
      thumbnailsContainer.innerHTML = room.images
        .map(
          (img, index) => `
          <img 
            src="${getImageUrl(img)}" 
            alt="Room ${index + 1}" 
            class="room-modal-thumbnail ${index === 0 ? 'active' : ''}" 
            data-index="${index}"
          />
        `
        )
        .join('');

      // Add thumbnail click handlers
      thumbnailsContainer.querySelectorAll('.room-modal-thumbnail').forEach(thumb => {
        thumb.addEventListener('click', () => {
          const index = parseInt(thumb.dataset.index);
          if (mainImage) {
            mainImage.src = getImageUrl(room.images[index]);
          }
          thumbnailsContainer
            .querySelectorAll('.room-modal-thumbnail')
            .forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        });
      });
    }
  } else {
    if (mainImage) {
      mainImage.src = getImageUrl(null);
      mainImage.alt = 'No image available';
    }
    if (thumbnailsContainer) {
      thumbnailsContainer.innerHTML = '';
    }
  }

  // Update amenities
  const amenitiesList = document.getElementById('modal-amenities-list');
  const amenitiesSection = document.getElementById('modal-room-amenities');

  if (room.amenities && room.amenities.length > 0) {
    if (amenitiesList) {
      amenitiesList.innerHTML = room.amenities
        .map(amenity => {
          const amenityName = typeof amenity === 'string' ? amenity : amenity.label;
          const amenityIcon = typeof amenity === 'object' ? amenity.icon : 'check';
          return `
            <div class="room-modal-amenity-item">
              <span data-icon="${amenityIcon}" data-icon-width="18" data-icon-height="18"></span>
              <span>${amenityName}</span>
            </div>
          `;
        })
        .join('');
    }
    if (amenitiesSection) amenitiesSection.style.display = 'block';
  } else {
    if (amenitiesSection) amenitiesSection.style.display = 'none';
  }

  // Initialize icons in modal
  initIconElements();

  // Show modal
  modal.classList.add('active');

  // Setup modal event listeners
  setupRoomModalListeners(room, property, modal);
}

/**
 * Setup room modal event listeners
 */
function setupRoomModalListeners(room, property, modal) {
  // Close button
  const closeBtn = document.getElementById('close-room-modal');
  const closeModalBtn = document.getElementById('modal-close-btn');

  const closeHandler = () => {
    modal.classList.remove('active');
  };

  if (closeBtn) {
    closeBtn.replaceWith(closeBtn.cloneNode(true));
    document.getElementById('close-room-modal').addEventListener('click', closeHandler);
  }

  if (closeModalBtn) {
    closeModalBtn.replaceWith(closeModalBtn.cloneNode(true));
    document.getElementById('modal-close-btn').addEventListener('click', closeHandler);
  }

  // Close on overlay click
  modal.replaceWith(modal.cloneNode(true));
  const newModal = document.getElementById('room-detail-modal');

  newModal.addEventListener('click', e => {
    if (e.target === newModal) {
      newModal.classList.remove('active');
    }
  });

  // Apply button
  const applyBtn = document.getElementById('modal-apply-btn');
  if (applyBtn) {
    applyBtn.replaceWith(applyBtn.cloneNode(true));
    document.getElementById('modal-apply-btn').addEventListener('click', () => {
      newModal.classList.remove('active');

      // Check if user is logged in
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (!user || !user.id || user.role !== 'boarder') {
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = `../../public/auth/login.html?redirect=${redirectUrl}`;
        return;
      }

      // Redirect to confirm-booking page with room details
      const params = new URLSearchParams({
        id: property.id || state.roomId,
        title: property.title || 'Property',
        price: room.price,
        address: property.address || '',
        landlordName: property.landlord?.name || 'Property Owner',
        roomType: room.roomType,
      });

      window.location.href = `../confirm-booking/index.html?${params.toString()}`;
    });
  }

  // Re-setup close handlers for the new modal
  const newCloseBtn = document.getElementById('close-room-modal');
  const newCloseModalBtn = document.getElementById('modal-close-btn');

  if (newCloseBtn) {
    newCloseBtn.addEventListener('click', () => {
      newModal.classList.remove('active');
    });
  }

  if (newCloseModalBtn) {
    newCloseModalBtn.addEventListener('click', () => {
      newModal.classList.remove('active');
    });
  }
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
        <a href="../find-a-room/index.html" class="room-detail-back-btn">
          <span data-icon="arrowLeft" data-icon-width="20" data-icon-height="20"></span>
          Back to Find a Room
        </a>
      </div>
    `;
  }
}

// Initialize on module load for single-page apps
if (typeof window !== 'undefined') {
  window.initRoomDetail = initRoomDetail;

  // Auto-initialize if the room detail dashboard exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.querySelector('.room-detail-dashboard')) {
        initRoomDetail();
      }
    });
  } else {
    // DOM already loaded
    if (document.querySelector('.room-detail-dashboard')) {
      initRoomDetail();
    }
  }
}
