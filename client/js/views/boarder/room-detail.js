/**
 * Room Detail Page - Boarder Dashboard
 * Handles room details display, gallery, and booking functionality
 */

<<<<<<< HEAD
import { updateBoarderStatus } from '../../shared/routing.js';
import { getImageUrl } from '../../shared/image-utils.js';
import CONFIG from '../../config.js';
=======
import { getIcon } from '../../shared/icons.js';
import { updateBoarderStatus, getBoarderStatus } from '../../shared/routing.js';

// Sample room data (replace with API calls in production)
const roomData = {
  1: {
    id: 1,
    title: 'Sunrise Dormitory',
    address: 'Katipunan Avenue, Quezon City, Metro Manila',
    location: 'University of the Philippines',
    distance: '0.5 km from UP',
    price: 4500,
    sharedPrice: 3000,
    rating: 4.8,
    reviews: 24,
    types: 'Single & Shared',
    availability: 'Available Now',
    minStay: '6 months',
    deposit: '2 months',
    description: `Sunrise Dormitory offers comfortable and affordable boarding accommodations for students near the University of the Philippines. Our property features modern amenities, 24/7 security, and a conducive environment for studying.

Located in the heart of Katipunan, you'll have easy access to universities, shopping centers, restaurants, and public transportation. The property is regularly inspected and meets all safety and quality standards.`,
    amenities: [
      { icon: 'wifi', label: 'High-Speed WiFi' },
      { icon: 'computerDesktop', label: 'Air Conditioning' },
      { icon: 'check', label: 'Parking Space' },
      { icon: 'laundryMachine', label: 'Laundry Area' },
      { icon: 'shieldCheck', label: '24/7 Security' },
      { icon: 'cctvCamera', label: 'CCTV Surveillance' },
      { icon: 'list', label: 'Kitchen Access' },
      { icon: 'square', label: 'Furnished Rooms' },
      { icon: 'bolt', label: 'Backup Generator' },
      { icon: 'drop', label: 'Water Heater' },
      { icon: 'sparkles', label: 'Weekly Cleaning' },
      { icon: 'userGroup', label: 'Common Area' },
    ],
    rules: [
      {
        icon: 'clock',
        title: 'Curfew',
        desc: 'Building locks at 11:00 PM on weekdays, 12:00 AM on weekends',
      },
      {
        icon: 'noSmoking',
        title: 'No Smoking',
        desc: 'Smoking is not allowed inside the building',
      },
      { icon: 'noPets', title: 'No Pets', desc: 'Pets are not allowed on the premises' },
      { icon: 'userGroup', title: 'Visitors', desc: 'Visitors allowed until 9:00 PM only' },
    ],
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=80',
    ],
    badges: ['verified', 'new'],
    landlord: {
      name: 'Juan Dela Cruz',
      properties: 5,
      rating: 4.7,
    },
  },
  2: {
    id: 2,
    title: 'Campus View Residences',
    address: 'Loyola Heights, Quezon City, Metro Manila',
    location: 'Ateneo de Manila',
    distance: '1.2 km from Ateneo',
    price: 6500,
    sharedPrice: 4500,
    rating: 4.6,
    reviews: 18,
    types: 'Studio & 1 BHK',
    availability: 'Available Sept 1',
    minStay: '12 months',
    deposit: '3 months',
    description: `Campus View Residences offers premium boarding accommodations with stunning views of the Ateneo de Manila University campus. Our modern facilities include studio and 1 BHK units perfect for students who value privacy and comfort.

Enjoy easy access to Loyola Heights' vibrant community, with restaurants, cafes, and shops just steps away. The property features state-of-the-art amenities and professional management.`,
    amenities: [
      { icon: 'wifi', label: 'High-Speed WiFi' },
      { icon: 'computerDesktop', label: 'Air Conditioning' },
      { icon: 'check', label: 'Parking Space' },
      { icon: 'cctvCamera', label: 'CCTV Surveillance' },
      { icon: 'shieldCheck', label: '24/7 Security' },
      { icon: 'square', label: 'Fully Furnished' },
      { icon: 'bolt', label: 'Backup Generator' },
      { icon: 'drop', label: 'Water Heater' },
    ],
    rules: [
      { icon: 'clock', title: 'Curfew', desc: 'Building locks at 11:00 PM daily' },
      {
        icon: 'noSmoking',
        title: 'No Smoking',
        desc: 'Smoking is not allowed inside the building',
      },
      { icon: 'noPets', title: 'No Pets', desc: 'Pets are not allowed on the premises' },
    ],
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
    ],
    badges: ['verified'],
    landlord: {
      name: 'Maria Santos',
      properties: 3,
      rating: 4.8,
    },
  },
  3: {
    id: 3,
    title: 'Greenfield Boarding House',
    address: 'Commonwealth Avenue, Quezon City, Metro Manila',
    location: 'Miriam College',
    distance: '2.1 km from Miriam',
    price: 3200,
    sharedPrice: 2500,
    rating: 4.5,
    reviews: 32,
    types: 'Shared Rooms',
    availability: 'Available Now',
    minStay: '3 months',
    deposit: '1 month',
    description: `Greenfield Boarding House provides budget-friendly accommodations for students attending Miriam College and nearby universities. Despite the affordable rates, we maintain high standards of cleanliness and security.

Our communal living environment fosters friendships and study groups. With essential amenities and a prime location on Commonwealth Avenue, you get great value for your money.`,
    amenities: [
      { icon: 'wifi', label: 'High-Speed WiFi' },
      { icon: 'laundryMachine', label: 'Laundry Area' },
      { icon: 'list', label: 'Kitchen Access' },
      { icon: 'check', label: 'Parking Space' },
      { icon: 'shieldCheck', label: 'Security' },
    ],
    rules: [
      {
        icon: 'clock',
        title: 'Curfew',
        desc: 'Building locks at 10:00 PM on weekdays, 11:00 PM on weekends',
      },
      {
        icon: 'noSmoking',
        title: 'No Smoking',
        desc: 'Designated smoking area outside the building',
      },
      { icon: 'userGroup', title: 'Visitors', desc: 'Visitors allowed until 8:00 PM only' },
    ],
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
    ],
    badges: ['promo'],
    landlord: {
      name: 'Pedro Reyes',
      properties: 2,
      rating: 4.5,
    },
  },
  4: {
    id: 4,
    title: 'Metro Plaza Apartments',
    address: 'Roxas Boulevard, Quezon City, Metro Manila',
    location: 'University of the Philippines',
    distance: '0.8 km from UP',
    price: 7800,
    sharedPrice: 5500,
    rating: 4.9,
    reviews: 41,
    types: '1 BHK & Studio',
    availability: 'Available Aug 15',
    minStay: '12 months',
    deposit: '3 months',
    description: `Metro Plaza Apartments offers luxury boarding accommodations along the iconic Roxas Boulevard. Our premium 1 BHK and studio units are perfect for graduate students and young professionals who demand the best.

Experience bay-side living with stunning views, modern amenities, and proximity to UP Diliman. The building features professional management and top-notch security systems.`,
    amenities: [
      { icon: 'wifi', label: 'High-Speed WiFi' },
      { icon: 'computerDesktop', label: 'Air Conditioning' },
      { icon: 'shieldCheck', label: '24/7 Security' },
      { icon: 'cctvCamera', label: 'CCTV Surveillance' },
      { icon: 'check', label: 'Parking Space' },
      { icon: 'laundryMachine', label: 'Laundry Area' },
      { icon: 'square', label: 'Fully Furnished' },
      { icon: 'list', label: 'Kitchen Access' },
      { icon: 'bolt', label: 'Backup Generator' },
      { icon: 'drop', label: 'Water Heater' },
      { icon: 'sparkles', label: 'Weekly Cleaning' },
    ],
    rules: [
      { icon: 'clock', title: 'Curfew', desc: '24/7 access with key card' },
      {
        icon: 'noSmoking',
        title: 'No Smoking',
        desc: 'Smoking is not allowed inside the building',
      },
      { icon: 'userGroup', title: 'Visitors', desc: 'Visitors must register at reception' },
    ],
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=80',
    ],
    badges: ['verified', 'new'],
    landlord: {
      name: 'Ana Garcia',
      properties: 8,
      rating: 4.9,
    },
  },
};
>>>>>>> didigzz/feat/room-availability-management

// State management
const state = {
  currentImageIndex: 0,
  roomId: null,
  isFavorite: false,
<<<<<<< HEAD
  roomData: null, // Store fetched room data
=======
>>>>>>> didigzz/feat/room-availability-management
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
<<<<<<< HEAD
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
=======
function setupPage() {
  const room = roomData[state.roomId];

  if (!room) {
    showNotFound();
    return;
  }

  populateRoomData(room);
  setupGallery();
  setupEventListeners(room);
>>>>>>> didigzz/feat/room-availability-management
}

/**
 * Populate room data into the page
 */
function populateRoomData(room) {
<<<<<<< HEAD
  // Hide loading state
  hideLoadingState();

=======
>>>>>>> didigzz/feat/room-availability-management
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

<<<<<<< HEAD
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
=======
  const roomAddress = document.getElementById('room-address');
  if (roomAddress) roomAddress.textContent = room.address;

  const roomRating = document.getElementById('room-rating');
  if (roomRating) roomRating.textContent = room.rating;

  const roomReviews = document.getElementById('room-reviews');
  if (roomReviews) roomReviews.textContent = `(${room.reviews} reviews)`;

  const roomDistance = document.getElementById('room-distance');
  if (roomDistance) roomDistance.textContent = room.distance;

  const roomTypes = document.getElementById('room-types');
  if (roomTypes) roomTypes.textContent = room.types;

  const roomAvailability = document.getElementById('room-availability');
  if (roomAvailability) roomAvailability.textContent = room.availability;
>>>>>>> didigzz/feat/room-availability-management

  const roomPrice = document.getElementById('room-price');
  if (roomPrice) roomPrice.textContent = `₱${room.price.toLocaleString()}`;

  const bookingAvailability = document.getElementById('booking-availability');
<<<<<<< HEAD
  if (bookingAvailability)
    bookingAvailability.textContent = room.availability || 'Contact for availability';
=======
  if (bookingAvailability) bookingAvailability.textContent = room.availability;
>>>>>>> didigzz/feat/room-availability-management

  const roomDescription = document.getElementById('room-description');
  if (roomDescription) {
    roomDescription.innerHTML = room.description
      .split('\n\n')
      .map(p => `<p>${p}</p>`)
      .join('');
  }

  // Update amenities
  const roomAmenities = document.getElementById('room-amenities');
<<<<<<< HEAD
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
=======
  if (roomAmenities) {
    roomAmenities.innerHTML = room.amenities
      .map(
        amenity => `
      <div class="amenity-item">
        <span data-icon="${amenity.icon}" data-icon-width="20" data-icon-height="20"></span>
        <span>${amenity.label}</span>
      </div>
    `
      )
>>>>>>> didigzz/feat/room-availability-management
      .join('');
  }

  // Update house rules
  const rulesContainer = document.querySelector('.room-detail-rules');
<<<<<<< HEAD
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
=======
  if (rulesContainer) {
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
>>>>>>> didigzz/feat/room-availability-management
      .join('');
  }

  // Update landlord info
  const landlordName = document.getElementById('landlord-name');
<<<<<<< HEAD
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
=======
  if (landlordName) landlordName.textContent = room.landlord.name;

  // Update gallery images
  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage) {
    mainImage.src = room.images[0];
    mainImage.alt = `${room.title} - Main View`;
  }

  const thumbnails = document.querySelectorAll('.gallery-thumb img');
  room.images.forEach((img, index) => {
    if (thumbnails[index]) {
      thumbnails[index].src = img.replace('w=1200', 'w=300');
    }
  });

  // Update booking section
  const roomTypeOptions = document.querySelectorAll('.booking-room-option');
  if (roomTypeOptions.length >= 2) {
    const singlePrice = roomTypeOptions[0].querySelector('.booking-room-type-price');
    if (singlePrice) singlePrice.textContent = `₱${room.price.toLocaleString()}/mo`;

    const sharedPrice = roomTypeOptions[1].querySelector('.booking-room-type-price');
    if (sharedPrice) sharedPrice.textContent = `₱${room.sharedPrice.toLocaleString()}/mo`;
>>>>>>> didigzz/feat/room-availability-management
  }

  // Update reviews
  const reviewsAverage = document.getElementById('reviews-average');
<<<<<<< HEAD
  if (reviewsAverage) reviewsAverage.textContent = room.rating || '0';

  const reviewsTotal = document.getElementById('reviews-total');
  if (reviewsTotal) reviewsTotal.textContent = room.reviews || '0';

  // Update rating breakdown - hide if no reviews
  const ratingBreakdown = document.querySelector('.rating-breakdown');
  if (ratingBreakdown && (!room.reviews || room.reviews === 0)) {
    ratingBreakdown.style.display = 'none';
  }
=======
  if (reviewsAverage) reviewsAverage.textContent = room.rating;

  const reviewsTotal = document.getElementById('reviews-total');
  if (reviewsTotal) reviewsTotal.textContent = room.reviews;
>>>>>>> didigzz/feat/room-availability-management
}

/**
 * Setup gallery functionality
 */
function setupGallery() {
<<<<<<< HEAD
  const room = state.roomData;
  if (!room || !room.images || room.images.length === 0) return;
=======
  const room = roomData[state.roomId];
  if (!room) return;
>>>>>>> didigzz/feat/room-availability-management

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
}

/**
 * Update gallery main image
 */
function updateGalleryImage() {
<<<<<<< HEAD
  const room = state.roomData;
  if (!room || !room.images || room.images.length === 0) return;

  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage) {
    mainImage.src = getImageUrl(room.images[state.currentImageIndex]);
    mainImage.onerror = function () {
      this.src = getImageUrl(null);
    };
=======
  const room = roomData[state.roomId];
  if (!room) return;

  const mainImage = document.getElementById('gallery-main-image');
  if (mainImage) {
    mainImage.src = room.images[state.currentImageIndex];
>>>>>>> didigzz/feat/room-availability-management
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
 * Handle Apply Now action
 */
function handleApplyNow(room) {
<<<<<<< HEAD
  console.log('handleApplyNow called', room);
=======
  const boarderStatus = getBoarderStatus();
>>>>>>> didigzz/feat/room-availability-management

  // Check if user is logged in
  const user = JSON.parse(localStorage.getItem('user') || '{}');

<<<<<<< HEAD
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
=======
  if (!user || user.role !== 'boarder') {
    // Not logged in, redirect to login
    const basePath = window.location.pathname.includes('github.io')
      ? '/Haven-Space/client/views/public/auth/login.html'
      : '/views/public/auth/login.html';

    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `${basePath}?redirect=${redirectUrl}`;
    return;
  }

  // User is logged in, proceed with application
  // TODO: Integrate with backend API
  alert(`Application process for ${room.title} will begin. (Integration pending backend API)`);

  // Update boarder status
  updateBoarderStatus('applied_pending');

  // Redirect to applications page
  const basePath = window.location.pathname.includes('github.io')
    ? '/Haven-Space/client/views/boarder/applications/index.html'
    : '/views/boarder/applications/index.html';

  window.location.href = basePath;
>>>>>>> didigzz/feat/room-availability-management
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
<<<<<<< HEAD

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
=======
>>>>>>> didigzz/feat/room-availability-management
}
