import CONFIG from '../../config.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the map, centered on Malaybalay City, Bukidnon
  const defaultLat = 7.8183;
  const defaultLng = 125.1333;

  const map = L.map('map').setView([defaultLat, defaultLng], 13);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Custom icon for property markers
  const propertyIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Fetch properties from API
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/properties.php`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.data && result.data.properties && result.data.properties.length > 0) {
      const properties = result.data.properties;
      const bounds = [];

      // Add markers for each property with valid coordinates
      properties.forEach(property => {
        // Check if property has valid latitude and longitude
        if (property.latitude && property.longitude) {
          const lat = parseFloat(property.latitude);
          const lng = parseFloat(property.longitude);

          // Validate coordinates are valid numbers
          if (!isNaN(lat) && !isNaN(lng)) {
            const marker = L.marker([lat, lng], {
              icon: propertyIcon,
            }).addTo(map);

            // Create popup content
            const statusLabel =
              property.status === 'active'
                ? 'Active'
                : property.status === 'full'
                ? 'Fully Occupied'
                : 'Inactive';

            const popupContent = `
              <div style="min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${
                  property.name
                }</h3>
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
                <a href="../listings/edit.html?id=${property.id}" 
                   style="display: inline-block; padding: 6px 12px; background: #4a7c23; color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
                  Edit Property
                </a>
              </div>
            `;

            marker.bindPopup(popupContent);

            // Add to bounds for auto-fitting
            bounds.push([lat, lng]);
          }
        }
      });

      // Fit map to show all markers
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      // Update instruction text
      const instruction = document.querySelector('.map-instruction');
      if (instruction) {
        instruction.textContent = `Showing ${bounds.length} ${
          bounds.length === 1 ? 'property' : 'properties'
        } on the map`;
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
