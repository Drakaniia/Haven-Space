import CONFIG from '../../config.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the map, centered on Malaybalay City, Bukidnon
  const defaultLat = 8.1569;
  const defaultLng = 125.1297;

  // Malaybalay City bounding box — restricts panning outside the city
  const malaybalayBounds = L.latLngBounds(
    [8.05, 125.05], // SW corner
    [8.25, 125.25] // NE corner
  );

  const map = L.map('map', {
    maxBounds: malaybalayBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 12,
  }).setView([defaultLat, defaultLng], 13);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Custom icons for different property types
  const ownPropertyIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const otherPropertyIcon = L.icon({
    iconUrl:
      'data:image/svg+xml;base64,' +
      btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.4 12.5 41 12.5 41S25 19.4 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#dc2626"/>
        <circle cx="12.5" cy="12.5" r="6" fill="white"/>
      </svg>
    `),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Fetch all properties from all landlords for market view
  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get current landlord's user ID for highlighting their properties
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentLandlordId = user.user_id;

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/properties/all.php`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.data && result.data.properties && result.data.properties.length > 0) {
      const properties = result.data.properties;
      // Add markers for each property with valid coordinates
      properties.forEach(property => {
        // Check if property has valid latitude and longitude
        if (property.latitude && property.longitude) {
          const lat = parseFloat(property.latitude);
          const lng = parseFloat(property.longitude);

          // Validate coordinates are valid numbers
          if (!isNaN(lat) && !isNaN(lng)) {
            // Determine if this is the current landlord's property
            const isOwnProperty = property.landlord_id === currentLandlordId;
            const icon = isOwnProperty ? ownPropertyIcon : otherPropertyIcon;

            const marker = L.marker([lat, lng], {
              icon: icon,
            }).addTo(map);

            // Create popup content
            const statusLabel =
              property.status === 'active'
                ? 'Active'
                : property.status === 'full'
                ? 'Fully Occupied'
                : 'Inactive';

            const ownershipLabel = isOwnProperty ? 'Your Property' : `By ${property.landlord_name}`;
            const ownershipColor = isOwnProperty ? '#4a7c23' : '#dc2626';

            const popupContent = `
              <div style="min-width: 220px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <h3 style="margin: 0; font-size: 16px; font-weight: 600; flex: 1;">${
                    property.name
                  }</h3>
                  <span style="display: inline-block; padding: 2px 6px; background: ${ownershipColor}; color: white; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 8px;">
                    ${ownershipLabel}
                  </span>
                </div>
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #666;">
                  <strong>Address:</strong> ${property.address || 'N/A'}
                </p>
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #666;">
                  <strong>Price:</strong> ₱${(property.price || 0).toLocaleString()}/month
                </p>
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #666;">
                  <strong>Rooms:</strong> ${property.total_rooms || 0} (${
              property.occupied_rooms || 0
            } occupied)
                </p>
                <p style="margin: 0 0 8px 0; font-size: 13px;">
                  <span style="display: inline-block; padding: 2px 8px; background: ${
                    property.status === 'active'
                      ? '#dcfce7'
                      : property.status === 'full'
                      ? '#fef3c7'
                      : '#fee2e2'
                  }; color: ${
              property.status === 'active'
                ? '#166534'
                : property.status === 'full'
                ? '#92400e'
                : '#991b1b'
            }; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    ${statusLabel}
                  </span>
                </p>
                ${
                  isOwnProperty
                    ? `
                  <a href="../listings/edit.html?id=${property.id}" 
                     style="display: inline-block; padding: 6px 12px; background: #4a7c23; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    Edit Property
                  </a>
                `
                    : `
                  <a href="../../public/room-detail.html?id=${property.id}" 
                     style="display: inline-block; padding: 6px 12px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    View Details
                  </a>
                `
                }
              </div>
            `;

            marker.bindPopup(popupContent);
          }
        }
      });

      // Update instruction text
      const instruction = document.querySelector('.map-instruction');
      if (instruction) {
        const ownProperties = properties.filter(p => p.landlord_id === currentLandlordId);
        const otherProperties = properties.filter(p => p.landlord_id !== currentLandlordId);

        instruction.innerHTML = `
          <div style="text-align: center;">
            <div style="font-weight: 600; margin-bottom: 4px;">Market Overview</div>
            <div style="font-size: 12px; opacity: 0.8;">
              <span style="color: #4a7c23;">●</span> Your properties: ${ownProperties.length} | 
              <span style="color: #dc2626;">●</span> Other properties: ${otherProperties.length}
            </div>
          </div>
        `;
      }
    } else {
      // No properties found
      const instruction = document.querySelector('.map-instruction');
      if (instruction) {
        instruction.textContent = 'No properties with location data found';
        instruction.style.background = 'rgba(254, 226, 226, 0.95)';
        instruction.style.color = '#991b1b';
      }
    }
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    const instruction = document.querySelector('.map-instruction');
    if (instruction) {
      instruction.textContent = 'Failed to load properties. Please try again.';
      instruction.style.background = 'rgba(254, 226, 226, 0.95)';
      instruction.style.color = '#991b1b';
    }
  }
});
