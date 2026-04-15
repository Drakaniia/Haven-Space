import { getIcon, getSolidIcon } from '../../shared/icons.js';
import { initFindARoomEnhanced } from './find-a-room.js';

const state = {
  view: 'grid',
};

export function initPublicFindARoom() {
  if (!document.querySelector('.find-room-main')) {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupEventListeners();
      initFindARoomEnhanced();
    });
  } else {
    setupEventListeners();
    initFindARoomEnhanced();
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('main-search-input');
  const searchBtn = document.getElementById('main-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        searchInput.dispatchEvent(new CustomEvent('apply-filters'));
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      searchInput.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }

  document.querySelectorAll('.find-room-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const location = chip.dataset.location;
      if (location && searchInput) {
        searchInput.value = location;
        searchInput.dispatchEvent(new CustomEvent('apply-filters'));
      }
    });
  });

  const priceFilter = document.getElementById('price-filter');
  const roomTypeFilter = document.getElementById('room-type-filter');
  const distanceFilter = document.getElementById('distance-filter');
  const sortSelect = document.getElementById('sort-select');

  if (priceFilter) {
    priceFilter.addEventListener('change', () => {
      priceFilter.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }
  if (roomTypeFilter) {
    roomTypeFilter.addEventListener('change', () => {
      roomTypeFilter.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }
  if (distanceFilter) {
    distanceFilter.addEventListener('change', () => {
      distanceFilter.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortSelect.dispatchEvent(new CustomEvent('apply-filters'));
    });
  }

  const amenitiesToggle = document.getElementById('amenities-toggle');
  const amenitiesPanel = document.getElementById('amenities-panel');

  if (amenitiesToggle && amenitiesPanel) {
    amenitiesToggle.addEventListener('click', e => {
      e.stopPropagation();
      amenitiesToggle.classList.toggle('active');
      amenitiesPanel.classList.toggle('active');
    });

    document.addEventListener('click', e => {
      if (!amenitiesToggle.contains(e.target) && !amenitiesPanel.contains(e.target)) {
        amenitiesToggle.classList.remove('active');
        amenitiesPanel.classList.remove('active');
      }
    });

    amenitiesPanel.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        amenitiesPanel.dispatchEvent(new CustomEvent('apply-filters'));
      });
    });
  }

  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetBtn.dispatchEvent(new CustomEvent('reset-filters'));
    });
  }

  document.querySelectorAll('.find-room-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.find-room-view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.view = btn.dataset.view;

      const grid = document.getElementById('properties-grid');
      if (grid) {
        if (state.view === 'list') {
          grid.classList.add('list-view');
        } else {
          grid.classList.remove('list-view');
        }
      }
    });
  });

  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      loadMoreBtn.dispatchEvent(new CustomEvent('load-more'));
    });
  }

  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      clearFiltersBtn.dispatchEvent(new CustomEvent('reset-filters'));
    });
  }
}

function handleSearchInput(e) {
  const searchInput = e.target;
  if (searchInput) {
    searchInput.dispatchEvent(new CustomEvent('apply-filters'));
  }
}

function debounce(func, wait) {
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

if (typeof window !== 'undefined') {
  window.initPublicFindARoom = initPublicFindARoom;
}
