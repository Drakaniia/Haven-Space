/**
 * Room Detail Page - Public View
 * Handles room details display and gallery for public users
 */

<<<<<<< HEAD
import { getImageUrl } from '../../shared/image-utils.js';
import CONFIG from '../../config.js';
=======
import { getIcon } from '../../shared/icons.js';

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
  if (roomTypes) roomTypes.textContent = room.roomTypes || room.types || 'Available';

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
      .join('');
  } else if (rulesContainer && room.rules && room.rules.length > 0) {
    // Fallback to old format
=======
  if (rulesContainer) {
>>>>>>> didigzz/feat/room-availability-management
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
<<<<<<< HEAD
function setupEventListeners(_room) {
=======
function setupEventListeners(room) {
>>>>>>> didigzz/feat/room-availability-management
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
