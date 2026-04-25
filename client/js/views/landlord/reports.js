import CONFIG from '../../config.js';

/**
 * Landlord Reports Page
 * Fetches all data from /api/landlord/reports and renders charts + table.
 */

// Module-level state
let currentRange = '30';
let currentStartDate = '';
let currentEndDate = '';
let currentPage = 1;
let currentSearch = '';
let currentStatusFilter = 'all';
let totalPages = 1;

/**
 * Initialize Reports Page
 */
export function initReports() {
  initFilters();
  initExportReport();
  loadReportsData();
}

// ============================================================
// API
// ============================================================

/**
 * Fetch reports data from the backend.
 * @param {Object} params
 * @returns {Promise<Object|null>}
 */
async function fetchReports(params = {}) {
  const query = new URLSearchParams();

  if (params.days) query.set('days', params.days);
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  if (params.page) query.set('page', params.page);
  if (params.per_page) query.set('per_page', params.per_page);
  if (params.search) query.set('search', params.search);
  if (params.status_filter && params.status_filter !== 'all') {
    query.set('status_filter', params.status_filter);
  }

  // Get authentication token
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/reports?${query.toString()}`,
      {
        method: 'GET',
        headers,
        credentials: 'include',
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    return result.data ?? null;
  } catch (error) {
    console.error('Failed to fetch reports data:', error);
    return null;
  }
}

// ============================================================
// LOAD & RENDER
// ============================================================

/**
 * Build query params from current filter state and load everything.
 */
async function loadReportsData() {
  showLoadingState();

  const params = { page: currentPage, per_page: 10 };

  if (currentRange === 'custom' && currentStartDate && currentEndDate) {
    params.start_date = currentStartDate;
    params.end_date = currentEndDate;
  } else {
    params.days = currentRange;
  }

  if (currentSearch) params.search = currentSearch;
  if (currentStatusFilter !== 'all') params.status_filter = currentStatusFilter;

  const data = await fetchReports(params);

  if (!data) {
    showErrorState();
    return;
  }

  renderSummaryStats(data.summary);
  renderRevenueChart(data.revenue_trend);
  renderOccupancyChart(data.occupancy_trend);
  renderPaymentStatusChart(data.payment_distribution);
  renderPropertyRevenueChart(data.property_revenue);
  renderPaymentTable(data.payment_history);
}

// ============================================================
// SUMMARY STATS
// ============================================================

function renderSummaryStats(summary) {
  if (!summary) return;

  setStatCard('totalRevenue', formatCurrency(summary.total_revenue), summary.revenue_change, true);
  setStatCard('avgOccupancy', `${summary.occupancy_rate}%`, summary.occupancy_change, true);
  setStatCard(
    'totalBoarders',
    summary.total_boarders,
    summary.new_boarders > 0 ? `${summary.new_boarders} new` : '0 new',
    summary.new_boarders >= 0
  );
  setStatCard(
    'outstandingPayments',
    formatCurrency(summary.outstanding_payments),
    summary.outstanding_change,
    summary.outstanding_change <= 0 // lower outstanding = positive
  );
}

/**
 * Update a stat card's value and change indicator.
 * @param {string} id - Element ID prefix
 * @param {string|number} value - Main value to display
 * @param {string|number} change - Change value (number = %, string = label)
 * @param {boolean} isPositive - Whether the change is good
 */
function setStatCard(id, value, change, isPositive) {
  const valueEl = document.getElementById(`${id}Value`);
  const changeEl = document.getElementById(`${id}Change`);
  const arrowEl = document.getElementById(`${id}Arrow`);
  const changeValueEl = document.getElementById(`${id}ChangeValue`);

  if (valueEl) valueEl.textContent = value;

  if (changeEl) {
    changeEl.className = `report-stat-change ${isPositive ? 'positive' : 'negative'}`;
  }

  if (arrowEl) {
    arrowEl.textContent = isPositive ? '↑' : '↓';
  }

  if (changeValueEl) {
    const displayChange = typeof change === 'number' ? `${Math.abs(change)}%` : String(change);
    changeValueEl.textContent = displayChange;
  }
}

// ============================================================
// CHARTS
// ============================================================

function renderRevenueChart(trend) {
  const labels = trend?.labels?.length ? trend.labels : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const data = trend?.data?.length ? trend.data.map(Number) : [0, 0, 0, 0];

  drawLineChart('revenueChart', {
    labels,
    data,
    color: '#22c55e',
    fill: true,
    formatY: value => `₱${(value / 1000).toFixed(0)}k`,
  });
}

function renderOccupancyChart(trend) {
  const labels = trend?.labels?.length ? trend.labels : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  const data = trend?.data?.length ? trend.data.map(Number) : [0, 0, 0, 0];

  drawLineChart('occupancyChart', {
    labels,
    data,
    color: '#3b82f6',
    fill: true,
    formatY: value => `${value.toFixed(0)}%`,
  });
}

function renderPaymentStatusChart(distribution) {
  const labels = distribution?.labels?.length
    ? distribution.labels
    : ['Paid', 'Pending', 'Overdue'];
  const data = distribution?.data?.length ? distribution.data.map(Number) : [0, 0, 0];
  const colors = ['#22c55e', '#f59e0b', '#ef4444', '#6b7280'];

  drawPieChart('paymentStatusChart', { labels, data, colors, donut: true });
}

function renderPropertyRevenueChart(propertyRevenue) {
  const labels = propertyRevenue?.labels?.length ? propertyRevenue.labels : ['No Data'];
  const data = propertyRevenue?.data?.length ? propertyRevenue.data.map(Number) : [0];
  const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

  drawBarChart('propertyRevenueChart', {
    labels,
    data,
    color: colors,
    formatY: value => `₱${(value / 1000).toFixed(0)}k`,
  });
}

// ============================================================
// PAYMENT TABLE
// ============================================================

function renderPaymentTable(paymentHistory) {
  const tableBody = document.getElementById('paymentTableBody');
  const tableInfo = document.querySelector('.table-info');
  if (!tableBody) return;

  const payments = paymentHistory?.payments ?? [];
  const pagination = paymentHistory?.pagination ?? {};

  totalPages = pagination.total_pages ?? 1;
  currentPage = pagination.current_page ?? 1;

  if (tableInfo) {
    const start = payments.length > 0 ? (currentPage - 1) * (pagination.per_page ?? 10) + 1 : 0;
    const end = start + payments.length - 1;
    tableInfo.textContent = `Showing ${start}–${end} of ${pagination.total ?? 0} entries`;
  }

  if (payments.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--dashboard-text-secondary);">
          No payment records found.
        </td>
      </tr>
    `;
    renderPagination(0, 0);
    return;
  }

  tableBody.innerHTML = payments.map(createPaymentRow).join('');
  renderPagination(currentPage, totalPages);
}

function createPaymentRow(payment) {
  const fullName = payment.full_name || 'Unknown';
  const email = payment.boarder_email || '';
  const propertyRoom = `${payment.property_title || ''} - ${payment.room_title || ''}`;
  const amount = formatCurrency(payment.total_amount ?? payment.amount);
  const dueDate = formatDate(payment.due_date);
  const statusBadge = getStatusBadge(payment.status);

  return `
    <tr>
      <td>
        <div class="boarder-info">
          <strong>${escapeHtml(fullName)}</strong>
          <span class="boarder-email">${escapeHtml(email)}</span>
        </div>
      </td>
      <td>${escapeHtml(propertyRoom)}</td>
      <td class="amount">${amount}</td>
      <td>${dueDate}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="table-btn table-btn-outline" type="button">View Details</button>
      </td>
    </tr>
  `;
}

function renderPagination(page, pages) {
  const container = document.querySelector('.table-pagination');
  if (!container) return;

  if (pages <= 1) {
    container.innerHTML = '';
    return;
  }

  const buttons = [];

  // Previous
  buttons.push(
    `<button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${
      page - 1
    }">Previous</button>`
  );

  // Page numbers (show up to 5 around current)
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);

  for (let i = start; i <= end; i++) {
    buttons.push(
      `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`
    );
  }

  // Next
  buttons.push(
    `<button class="pagination-btn" ${page >= pages ? 'disabled' : ''} data-page="${
      page + 1
    }">Next</button>`
  );

  container.innerHTML = buttons.join('');

  // Attach click handlers
  container.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page, 10);
      loadReportsData();
    });
  });
}

// ============================================================
// LOADING / ERROR STATES
// ============================================================

function showLoadingState() {
  const tableBody = document.getElementById('paymentTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--dashboard-text-secondary);">
          Loading payment data...
        </td>
      </tr>
    `;
  }

  // Blank out stat values while loading
  ['totalRevenue', 'avgOccupancy', 'totalBoarders', 'outstandingPayments'].forEach(id => {
    const el = document.getElementById(`${id}Value`);
    if (el) el.textContent = '—';
  });
}

function showErrorState() {
  const tableBody = document.getElementById('paymentTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: #ef4444;">
          Unable to load data. Please try again later.
        </td>
      </tr>
    `;
  }
}

// ============================================================
// FILTERS
// ============================================================

function initFilters() {
  const dateRangeFilter = document.getElementById('dateRangeFilter');
  const customDateRange = document.getElementById('customDateRange');

  if (dateRangeFilter && customDateRange) {
    dateRangeFilter.addEventListener('change', e => {
      currentRange = e.target.value;
      if (currentRange === 'custom') {
        customDateRange.style.display = 'flex';
      } else {
        customDateRange.style.display = 'none';
        currentPage = 1;
        loadReportsData();
      }
    });
  }

  const applyBtn = document.getElementById('applyDateRange');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const startDate = document.getElementById('startDate')?.value;
      const endDate = document.getElementById('endDate')?.value;

      if (startDate && endDate) {
        currentStartDate = startDate;
        currentEndDate = endDate;
        if (customDateRange) customDateRange.style.display = 'none';
        currentPage = 1;
        loadReportsData();
      }
    });
  }

  // Debounced search
  const searchInput = document.getElementById('paymentSearch');
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce(e => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadReportsData();
      }, 400)
    );
  }

  // Status filter
  const statusFilter = document.getElementById('paymentStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', e => {
      currentStatusFilter = e.target.value;
      currentPage = 1;
      loadReportsData();
    });
  }
}

// ============================================================
// EXPORT
// ============================================================

function initExportReport() {
  const exportBtn = document.getElementById('exportReport');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', exportToCSV);
}

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
        let text = cell.textContent.trim().replace(/\s+/g, ' ');
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

// ============================================================
// CHART HELPERS
// ============================================================

/**
 * Simple Canvas-based Line Chart
 */
function drawLineChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const data = config.data;
  const labels = config.labels;
  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  // Grid lines
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  const gridLines = 5;

  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const value = maxValue - (range / gridLines) * i;
    ctx.fillStyle = '#555555';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.formatY ? config.formatY(value) : value.toFixed(0), padding.left - 8, y);
  }

  // X-axis labels
  ctx.fillStyle = '#555555';
  ctx.font = '11px Plus Jakarta Sans';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const stepX = labels.length > 1 ? chartWidth / (labels.length - 1) : chartWidth;
  labels.forEach((label, i) => {
    const x = padding.left + stepX * i;
    ctx.fillText(label, x, height - padding.bottom + 10);
  });

  if (data.length < 2) return;

  // Line
  ctx.strokeStyle = config.color || '#22c55e';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  data.forEach((value, i) => {
    const x = padding.left + stepX * i;
    const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Area fill
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

  // Data points
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
 */
function drawBarChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const data = config.data;
  const labels = config.labels;
  const maxValue = Math.max(...data, 1);

  // Grid lines
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  const gridLines = 5;

  for (let i = 0; i <= gridLines; i++) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    const value = maxValue - (maxValue / gridLines) * i;
    ctx.fillStyle = '#555555';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.formatY ? config.formatY(value) : value.toFixed(0), padding.left - 8, y);
  }

  // Bars
  const barWidth = chartWidth / labels.length;
  const barGap = barWidth * 0.2;
  const actualBarWidth = barWidth - barGap;

  data.forEach((value, i) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding.left + barWidth * i + barGap / 2;
    const y = padding.top + chartHeight - barHeight;
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

    // X-axis label
    ctx.fillStyle = '#555555';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(labels[i], x + actualBarWidth / 2, height - padding.bottom + 10);
  });
}

/**
 * Simple Canvas-based Pie/Donut Chart
 */
function drawPieChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40;
  const innerRadius = config.donut ? radius * 0.6 : 0;

  ctx.clearRect(0, 0, width, height);

  const data = config.data;
  const labels = config.labels;
  const colors = config.colors;
  const total = data.reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    ctx.fillStyle = '#e5e5e5';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.fillStyle = '#555555';
    ctx.font = '13px Plus Jakarta Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data', centerX, centerY);
    return;
  }

  let currentAngle = -Math.PI / 2;

  data.forEach((value, i) => {
    const sliceAngle = (value / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();

    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    if (sliceAngle > 0.3) {
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelRadius = (radius + innerRadius) / 2;
      const labelX = centerX + Math.cos(labelAngle) * labelRadius;
      const labelY = centerY + Math.sin(labelAngle) * labelRadius;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${((value / total) * 100).toFixed(0)}%`, labelX, labelY);
    }

    currentAngle += sliceAngle;
  });

  // Legend
  const legendY = height - 30;
  const legendItemWidth = 100;
  const totalLegendWidth = labels.length * legendItemWidth;
  const legendStartX = (width - totalLegendWidth) / 2;

  labels.forEach((label, i) => {
    const x = legendStartX + legendItemWidth * i;

    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.arc(x + 5, legendY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#555555';
    ctx.font = '11px Plus Jakarta Sans';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 14, legendY);
  });
}

// ============================================================
// UTILITIES
// ============================================================

function formatCurrency(amount) {
  return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusBadge(status) {
  const map = {
    paid: { cls: 'status-paid', label: 'Paid' },
    pending: { cls: 'status-pending', label: 'Pending' },
    overdue: { cls: 'status-overdue', label: 'Overdue' },
  };
  const { cls, label } = map[status] ?? { cls: 'status-pending', label: status };
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ============================================================
// RESIZE HANDLER
// ============================================================

function redrawAllCharts() {
  // Charts will be redrawn on next data load; for immediate resize just redraw with last data.
  // Re-trigger load to get fresh canvas dimensions.
  loadReportsData();
}

window.addEventListener('resize', debounce(redrawAllCharts, 300));
