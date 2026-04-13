/**
 * Landlord Reports Page
 * Handles charts, data filtering, and export functionality
 */

/**
 * Initialize Reports Page
 */
export function initReports() {
  // Initialize charts
  initRevenueChart();
  initOccupancyChart();
  initPaymentStatusChart();
  initPropertyRevenueChart();

  // Initialize filters and event listeners
  initFilters();
  initExportReport();

  console.log('Reports: Initialized');
}

/**
 * Simple Canvas-based Line Chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} config - Chart configuration
 */
function drawLineChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Set actual size in memory (for retina displays)
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Set display size
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  // Scale for retina
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Calculate min/max
  const data = config.data;
  const labels = config.labels;
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  // Draw grid lines
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  const gridLines = 5;

  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Draw Y-axis labels
    const value = maxValue - (range / gridLines) * i;
    ctx.fillStyle = '#555555';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.formatY ? config.formatY(value) : value.toFixed(0), padding.left - 8, y);
  }

  // Draw X-axis labels
  ctx.fillStyle = '#555555';
  ctx.font = '11px Plus Jakarta Sans';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const stepX = chartWidth / (labels.length - 1);
  labels.forEach((label, i) => {
    const x = padding.left + stepX * i;
    ctx.fillText(label, x, height - padding.bottom + 10);
  });

  // Draw line
  ctx.strokeStyle = config.color || '#22c55e';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  data.forEach((value, i) => {
    const x = padding.left + stepX * i;
    const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw area fill
  if (config.fill !== false) {
    ctx.lineTo(padding.left + stepX * (data.length - 1), padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, config.color + '40');
    gradient.addColorStop(1, config.color + '05');
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Draw data points
  data.forEach((value, i) => {
    const x = padding.left + stepX * i;
    const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = config.color || '#22c55e';
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

/**
 * Simple Canvas-based Bar Chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} config - Chart configuration
 */
function drawBarChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Set actual size in memory (for retina displays)
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Set display size
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  // Scale for retina
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Calculate min/max
  const data = config.data;
  const labels = config.labels;
  const maxValue = Math.max(...data);
  const range = maxValue || 1;

  // Draw grid lines
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  const gridLines = 5;

  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Draw Y-axis labels
    const value = maxValue - (maxValue / gridLines) * i;
    ctx.fillStyle = '#555555';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.formatY ? config.formatY(value) : value.toFixed(0), padding.left - 8, y);
  }

  // Draw bars
  const barWidth = chartWidth / labels.length;
  const barGap = barWidth * 0.2;
  const actualBarWidth = barWidth - barGap;

  data.forEach((value, i) => {
    const barHeight = (value / range) * chartHeight;
    const x = padding.left + barWidth * i + barGap / 2;
    const y = padding.top + chartHeight - barHeight;

    // Draw bar with rounded top
    const radius = 4;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + actualBarWidth - radius, y);
    ctx.quadraticCurveTo(x + actualBarWidth, y, x + actualBarWidth, y + radius);
    ctx.lineTo(x + actualBarWidth, padding.top + chartHeight);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    const colors = Array.isArray(config.color) ? config.color : [config.color];
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // Draw X-axis labels
    ctx.fillStyle = '#555555';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelX = x + actualBarWidth / 2;
    ctx.fillText(labels[i], labelX, height - padding.bottom + 10);
  });
}

/**
 * Simple Canvas-based Pie/Donut Chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} config - Chart configuration
 */
function drawPieChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Set actual size in memory (for retina displays)
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Set display size
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  // Scale for retina
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40;
  const innerRadius = config.donut ? radius * 0.6 : 0;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  const data = config.data;
  const labels = config.labels;
  const colors = config.colors;
  const total = data.reduce((sum, val) => sum + val, 0);

  // Draw segments
  let currentAngle = -Math.PI / 2;

  data.forEach((value, i) => {
    const sliceAngle = (value / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();

    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // Draw label
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelRadius = (radius + innerRadius) / 2;
    const labelX = centerX + Math.cos(labelAngle) * labelRadius;
    const labelY = centerY + Math.sin(labelAngle) * labelRadius;

    if (sliceAngle > 0.3) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${((value / total) * 100).toFixed(0)}%`, labelX, labelY);
    }

    currentAngle += sliceAngle;
  });

  // Draw legend
  const legendY = height - 30;
  const legendItemWidth = 100;
  const totalLegendWidth = labels.length * legendItemWidth;
  const legendStartX = (width - totalLegendWidth) / 2;

  labels.forEach((label, i) => {
    const x = legendStartX + legendItemWidth * i;

    // Draw color dot
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(x + 5, legendY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw label
    ctx.fillStyle = '#555555';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 14, legendY);
  });
}

/**
 * Initialize Revenue Trend Chart
 */
function initRevenueChart() {
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const data = [32000, 35500, 38200, 42500];

  drawLineChart('revenueChart', {
    labels,
    data,
    color: '#22c55e',
    fill: true,
    formatY: value => `₱${(value / 1000).toFixed(0)}k`,
  });
}

/**
 * Initialize Occupancy Rate Chart
 */
function initOccupancyChart() {
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const data = [82, 85, 86, 87.3];

  drawLineChart('occupancyChart', {
    labels,
    data,
    color: '#3b82f6',
    fill: true,
    formatY: value => `${value.toFixed(0)}%`,
  });
}

/**
 * Initialize Payment Status Distribution Chart
 */
function initPaymentStatusChart() {
  const labels = ['Paid', 'Pending', 'Overdue'];
  const data = [24, 7, 3];
  const colors = ['#22c55e', '#f59e0b', '#ef4444'];

  drawPieChart('paymentStatusChart', {
    labels,
    data,
    colors,
    donut: true,
  });
}

/**
 * Initialize Property Revenue Chart
 */
function initPropertyRevenueChart() {
  const labels = ['Sunrise Dorm', 'Green Valley', 'Metro Boarding'];
  const data = [55000, 45000, 42500];
  const colors = ['#22c55e', '#3b82f6', '#8b5cf6'];

  drawBarChart('propertyRevenueChart', {
    labels,
    data,
    color: colors,
    formatY: value => `₱${(value / 1000).toFixed(0)}k`,
  });
}

/**
 * Initialize filters and event listeners
 */
function initFilters() {
  // Date range filter
  const dateRangeFilter = document.getElementById('dateRangeFilter');
  const customDateRange = document.getElementById('customDateRange');

  if (dateRangeFilter && customDateRange) {
    dateRangeFilter.addEventListener('change', e => {
      if (e.target.value === 'custom') {
        customDateRange.style.display = 'flex';
      } else {
        customDateRange.style.display = 'none';
        updateCharts(e.target.value);
      }
    });
  }

  // Apply custom date range
  const applyBtn = document.getElementById('applyDateRange');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const startDate = document.getElementById('startDate').value;
      const endDate = document.getElementById('endDate').value;

      if (startDate && endDate) {
        customDateRange.style.display = 'none';
        updateCharts('custom');
      }
    });
  }

  // Payment search
  const searchInput = document.getElementById('paymentSearch');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      filterPaymentTable(
        e.target.value,
        document.getElementById('paymentStatusFilter')?.value || 'all'
      );
    });
  }

  // Payment status filter
  const statusFilter = document.getElementById('paymentStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', e => {
      filterPaymentTable(document.getElementById('paymentSearch')?.value || '', e.target.value);
    });
  }
}

/**
 * Update charts based on date range
 * @param {string} range - Date range value
 */
function updateCharts(range) {
  // Simulate data update (in real app, fetch from API)
  const _multiplier = range === '7' ? 0.25 : range === '30' ? 1 : range === '90' ? 3 : 6;

  // Update revenue chart with new data
  const revenueData = [32000, 35500, 38200, 42500].map(v => v * (1 + Math.random() * 0.1));
  drawLineChart('revenueChart', {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    data: revenueData,
    color: '#22c55e',
    fill: true,
    formatY: value => `₱${(value / 1000).toFixed(0)}k`,
  });

  // Update occupancy chart
  const occupancyData = [82, 85, 86, 87.3].map(v => v + (Math.random() - 0.5) * 2);
  drawLineChart('occupancyChart', {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    data: occupancyData,
    color: '#3b82f6',
    fill: true,
    formatY: value => `${value.toFixed(0)}%`,
  });
}

/**
 * Filter payment table
 * @param {string} searchTerm - Search term
 * @param {string} statusFilter - Status filter
 */
function filterPaymentTable(searchTerm, statusFilter) {
  const table = document.getElementById('paymentTable');
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');
  const searchLower = searchTerm.toLowerCase();

  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const statusBadge = row.querySelector('.status-badge');
    const status = statusBadge ? statusBadge.textContent.toLowerCase() : '';

    const matchesSearch = !searchTerm || text.includes(searchLower);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    row.style.display = matchesSearch && matchesStatus ? '' : 'none';
  });
}

/**
 * Initialize export report functionality
 */
function initExportReport() {
  const exportBtn = document.getElementById('exportReport');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    exportToCSV();
  });
}

/**
 * Export payment table to CSV
 */
function exportToCSV() {
  const table = document.getElementById('paymentTable');
  if (!table) return;

  const rows = table.querySelectorAll('tr');
  const csvData = [];

  rows.forEach(row => {
    const cells = row.querySelectorAll('th, td');
    const rowData = [];

    cells.forEach((cell, index) => {
      if (index < 5) {
        // Skip actions column
        let text = cell.textContent.trim().replace(/\s+/g, ' ');
        // Escape commas and quotes
        if (text.includes(',') || text.includes('"')) {
          text = `"${text.replace(/"/g, '""')}"`;
        }
        rowData.push(text);
      }
    });

    csvData.push(rowData.join(','));
  });

  const csvContent = csvData.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `payment-report-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Redraw all charts on window resize
 */
function redrawAllCharts() {
  initRevenueChart();
  initOccupancyChart();
  initPaymentStatusChart();
  initPropertyRevenueChart();
}

// Debounce function for resize
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

// Handle window resize
window.addEventListener('resize', debounce(redrawAllCharts, 250));

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReports);
} else {
  initReports();
}
