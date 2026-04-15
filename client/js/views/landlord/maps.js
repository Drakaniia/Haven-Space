document.addEventListener('DOMContentLoaded', () => {
  // Initialize the map, centered on Malaybalay City, Bukidnon
  const defaultLat = 7.8183;
  const defaultLng = 125.1333;

  const map = L.map('map').setView([defaultLat, defaultLng], 15);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Set up the draggable pin
  const customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const marker = L.marker([defaultLat, defaultLng], {
    icon: customIcon,
    draggable: true,
  }).addTo(map);

  // DOM Elements
  const latInput = document.getElementById('prop-lat');
  const lngInput = document.getElementById('prop-lng');
  const locateBtn = document.getElementById('locate-me');
  const form = document.getElementById('map-property-form');

  // Initial values
  updateInputs(marker.getLatLng());

  // Auto-detect user location on load
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        marker.setLatLng(latlng);
        updateInputs(latlng);
        map.flyTo(latlng, 16);
      },
      () => {
        // Silently fail - stay on default Malaybalay City
      }
    );
  }

  // Update inputs when marker gets dragged
  marker.on('dragend', function (_e) {
    const latlng = marker.getLatLng();
    updateInputs(latlng);
    map.flyTo(latlng, map.getZoom());
  });

  // When clicking on map, move the marker
  map.on('click', function (e) {
    marker.setLatLng(e.latlng);
    updateInputs(e.latlng);
    map.flyTo(e.latlng, map.getZoom());
  });

  function updateInputs(latlng) {
    latInput.value = latlng.lat.toFixed(6);
    lngInput.value = latlng.lng.toFixed(6);
  }

  // Handle locate me button
  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      if (navigator.geolocation) {
        locateBtn.classList.add('loading');
        navigator.geolocation.getCurrentPosition(
          position => {
            const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
            marker.setLatLng(latlng);
            updateInputs(latlng);
            map.flyTo(latlng, 16);
            locateBtn.classList.remove('loading');
          },
          _error => {
            locateBtn.classList.remove('loading');
            alert('Could not get your location. Please check browser permissions.');
          }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    });
  }

  // Handle Form Submit
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      // Handle the save logic here (mock)
      const submitBtn = form.querySelector('.btn-save-property');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving...';

      setTimeout(() => {
        submitBtn.textContent = 'Saved Successfully!';
        submitBtn.style.backgroundColor = '#16a34a';

        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.style.backgroundColor = '';
          window.location.href = '../listings/index.html';
        }, 1500);
      }, 1000);
    });
  }
});
