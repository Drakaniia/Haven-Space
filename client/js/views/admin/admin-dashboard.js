/**
 * Super Admin dashboard — panels, API wiring, hash navigation
 */

import CONFIG from '../../config.js';
import { getAuthHeadersOnly } from '../../shared/auth-headers.js';

const SECTIONS = [
  'overview',
  'verification',
  'users',
  'properties',
  'applications',
  'analytics',
  'reports',
  'settings',
];

function adminApi(path, options = {}) {
  const url = `${CONFIG.API_BASE_URL}/api/admin/${path}`;
  return fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeadersOnly(),
      ...(options.headers || {}),
    },
  }).then(async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.detail || res.statusText || 'Request failed');
    }
    return data;
  });
}

function showToast(message, isError = false) {
  const el = document.createElement('div');
  el.className = 'admin-toast';
  el.textContent = message;
  if (isError) {
    el.style.borderColor = 'rgba(239,68,68,0.5)';
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function setHashSection(hash) {
  const id = (hash || '').replace(/^#/, '') || 'overview';
  if (!SECTIONS.includes(id)) return;

  SECTIONS.forEach(s => {
    const panel = document.getElementById(`panel-${s}`);
    if (panel) panel.classList.toggle('hidden', s !== id);
  });

  document.querySelectorAll('.sidebar-nav-item, .sidebar-nav-child-item').forEach(a => {
    const href = a.getAttribute('href') || '';
    const match = href.includes(`#${id}`);
    a.classList.toggle('active', match);
  });

  const titles = {
    overview: 'Command Center',
    verification: 'Landlord Verification',
    users: 'User Management',
    properties: 'Property Moderation',
    applications: 'Application Oversight',
    analytics: 'Analytics',
    reports: 'Reports & Disputes',
    settings: 'System Settings',
  };
  const sub = document.getElementById('admin-section-subtitle');
  if (sub) sub.textContent = titles[id] || '';

  const loaders = {
    overview: loadOverview,
    verification: loadVerification,
    users: loadUsers,
    properties: loadProperties,
    applications: loadApplications,
    analytics: loadAnalytics,
    reports: loadReports,
    settings: loadSettings,
  };
  loaders[id]?.();
}

function openModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `<div class="admin-modal" role="dialog">${html}</div>`;
  const close = () => overlay.remove();
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });
  overlay
    .querySelectorAll('[data-close-modal]')
    .forEach(btn => btn.addEventListener('click', close));
  document.body.appendChild(overlay);
  return { overlay, close };
}

async function loadOverview() {
  const root = document.getElementById('admin-overview-root');
  if (!root) return;
  try {
    const { data } = await adminApi('summary.php');
    const c = data.counts;
    root.innerHTML = `
      <div class="admin-stat-grid">
        <div class="admin-stat-card accent-violet"><div class="label">Total users</div><div class="value">${
          c.users_total
        }</div></div>
        <div class="admin-stat-card"><div class="label">Boarders</div><div class="value">${
          c.users_boarder
        }</div></div>
        <div class="admin-stat-card"><div class="label">Landlords</div><div class="value">${
          c.users_landlord
        }</div></div>
        <div class="admin-stat-card accent-light-green"><div class="label">Pending landlord KYC</div><div class="value">${
          c.landlords_pending_verification
        }</div></div>
        <div class="admin-stat-card"><div class="label">Properties</div><div class="value">${
          c.properties_total
        }</div></div>
        <div class="admin-stat-card"><div class="label">Listings pending review</div><div class="value">${
          c.properties_pending_moderation
        }</div></div>
        <div class="admin-stat-card"><div class="label">Applications</div><div class="value">${
          c.applications_total
        }</div></div>
        <div class="admin-stat-card"><div class="label">Open reports / disputes</div><div class="value">${
          c.property_reports_open + c.disputes_open
        }</div></div>
      </div>
      <div class="admin-card">
        <h2>Revenue & fees</h2>
        <p style="color:var(--admin-text-secondary);font-size:0.9rem;margin:0;">${
          data.revenue.note
        } Platform fee: <strong style="color:var(--admin-text-primary)">${
      data.revenue.platform_fee_percent
    }%</strong> (${data.revenue.currency}).</p>
      </div>`;
  } catch (e) {
    root.innerHTML = `<p class="admin-pill bad">Could not load overview: ${e.message}</p>`;
  }
}

async function loadVerification() {
  const list = document.getElementById('admin-verification-list');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--admin-text-muted)">Loading…</p>';
  try {
    const { data } = await adminApi('landlords.php?status=pending');
    if (!data.length) {
      list.innerHTML =
        '<p style="color:var(--admin-text-muted)">No pending landlord verifications.</p>';
      return;
    }
    list.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Landlord</th><th>Email</th><th>Boarding house</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            ${data
              .map(
                row => `
              <tr>
                <td><strong style="color:var(--admin-text-primary)">${row.first_name} ${
                  row.last_name
                }</strong></td>
                <td>${row.email}</td>
                <td>${row.boarding_house_name || '—'}</td>
                <td>${row.created_at?.slice(0, 10) || '—'}</td>
                <td style="white-space:nowrap">
                  <button type="button" class="admin-btn admin-btn-ghost admin-btn-sm" data-vdetail="${
                    row.id
                  }">Review</button>
                  <button type="button" class="admin-btn admin-btn-success admin-btn-sm" data-vapp="${
                    row.id
                  }">Approve</button>
                  <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-vrej="${
                    row.id
                  }">Reject</button>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`;

    list.querySelectorAll('[data-vdetail]').forEach(btn => {
      btn.addEventListener('click', () => openLandlordDetail(Number(btn.dataset.vdetail)));
    });
    list.querySelectorAll('[data-vapp]').forEach(btn => {
      btn.addEventListener('click', () => openVerifyModal(Number(btn.dataset.vapp), 'approve'));
    });
    list.querySelectorAll('[data-vrej]').forEach(btn => {
      btn.addEventListener('click', () => openVerifyModal(Number(btn.dataset.vrej), 'reject'));
    });
  } catch (e) {
    list.innerHTML = `<p class="admin-pill bad">${e.message}</p>`;
  }
}

async function openLandlordDetail(id) {
  try {
    const { data } = await adminApi(`landlords.php?id=${id}`);
    const { data: history } = await adminApi(`landlords.php?history=${id}`);
    const locs = (data.property_locations || [])
      .map(
        l => `
      <li style="margin-bottom:8px;color:var(--admin-text-secondary)">
        ${l.address_line_1 || ''} ${l.city || ''} ${l.province || ''}
        <span style="color:var(--admin-text-muted)"> (${l.latitude}, ${l.longitude})</span>
      </li>`
      )
      .join('');
    const hist = history
      .slice(0, 8)
      .map(
        h => `<li style="margin-bottom:6px;color:var(--admin-text-secondary);font-size:0.85rem">
        ${h.created_at?.slice(0, 19)} — <strong style="color:var(--admin-text-primary)">${
          h.action
        }</strong> by ${h.admin_first} ${h.admin_last}
        ${h.comment ? ` — ${h.comment}` : ''}
      </li>`
      )
      .join('');

    openModal(`
      <h3>Landlord review</h3>
      <div class="admin-subgrid">
        <div>Name</div><div><strong>${data.first_name} ${data.last_name}</strong></div>
        <div>Email</div><div><strong>${data.email}</strong></div>
        <div>Verified</div><div><strong>${data.is_verified ? 'Yes' : 'No'}</strong></div>
        <div>House</div><div><strong>${data.boarding_house_name || '—'}</strong></div>
      </div>
      <h4 style="margin:20px 0 8px;color:var(--admin-text-secondary);font-size:0.8rem;text-transform:uppercase;">Locations</h4>
      <ul style="margin:0;padding-left:18px;">${
        locs || '<li style="color:var(--admin-text-muted)">No locations on file</li>'
      }</ul>
      <h4 style="margin:20px 0 8px;color:var(--admin-text-secondary);font-size:0.8rem;text-transform:uppercase;">Verification history</h4>
      <ul style="margin:0;padding-left:18px;max-height:160px;overflow:auto;">${
        hist || '<li style="color:var(--admin-text-muted)">No history</li>'
      }</ul>
      <div class="admin-modal-actions"><button type="button" class="admin-btn admin-btn-ghost" data-close-modal>Close</button></div>
    `);
  } catch (e) {
    showToast(e.message, true);
  }
}

function openVerifyModal(landlordId, action) {
  const { close } = openModal(`
    <h3>${action === 'approve' ? 'Approve' : 'Reject'} landlord</h3>
    <p style="color:var(--admin-text-secondary);font-size:0.9rem;margin:0;">Optional note stored in the verification audit log.</p>
    <textarea id="admin-v-comment" placeholder="Comment for internal records…"></textarea>
    <div class="admin-modal-actions">
      <button type="button" class="admin-btn admin-btn-ghost" data-close-modal>Cancel</button>
      <button type="button" class="admin-btn ${
        action === 'approve' ? 'admin-btn-success' : 'admin-btn-danger'
      }" id="admin-v-confirm">${action === 'approve' ? 'Approve' : 'Reject'}</button>
    </div>
  `);
  document.getElementById('admin-v-confirm').addEventListener('click', async () => {
    const comment = document.getElementById('admin-v-comment').value.trim();
    try {
      await adminApi('landlords.php', {
        method: 'POST',
        body: JSON.stringify({ landlordId, action, comment }),
      });
      showToast('Saved');
      close();
      loadVerification();
    } catch (e) {
      showToast(e.message, true);
    }
  });
}

let usersOffset = 0;

async function loadUsers() {
  const body = document.getElementById('admin-users-tbody');
  const q = document.getElementById('admin-users-search')?.value.trim() || '';
  const role = document.getElementById('admin-users-role')?.value || '';
  if (!body) return;
  body.innerHTML = '<tr><td colspan="6" style="color:var(--admin-text-muted)">Loading…</td></tr>';
  try {
    const params = new URLSearchParams({ limit: '40', offset: String(usersOffset) });
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    const { data, meta } = await adminApi(`users.php?${params}`);
    if (!data.length) {
      body.innerHTML =
        '<tr><td colspan="6" style="color:var(--admin-text-muted)">No users found.</td></tr>';
      return;
    }
    body.innerHTML = data
      .map(row => {
        const statusClass =
          row.account_status === 'active'
            ? 'ok'
            : row.account_status === 'suspended'
            ? 'pending'
            : 'bad';
        return `<tr data-uid="${row.id}">
        <td><strong style="color:var(--admin-text-primary)">${row.first_name} ${
          row.last_name
        }</strong></td>
        <td>${row.email}</td>
        <td><span class="admin-pill neutral">${row.role}</span></td>
        <td>${
          row.role === 'landlord'
            ? row.is_verified
              ? '<span class="admin-pill ok">Verified</span>'
              : '<span class="admin-pill pending">Pending</span>'
            : '—'
        }</td>
        <td><span class="admin-pill ${statusClass}">${row.account_status}</span></td>
        <td>
          <select class="admin-select admin-user-status" style="min-width:140px;padding:6px 10px;font-size:0.8rem" data-uid="${
            row.id
          }" data-role="${row.role}">
            <option value="active" ${
              row.account_status === 'active' ? 'selected' : ''
            }>active</option>
            <option value="suspended" ${
              row.account_status === 'suspended' ? 'selected' : ''
            }>suspended</option>
            <option value="banned" ${
              row.account_status === 'banned' ? 'selected' : ''
            }>banned</option>
          </select>
        </td>
      </tr>`;
      })
      .join('');

    body.querySelectorAll('.admin-user-status').forEach(sel => {
      sel.addEventListener('change', async () => {
        const uid = Number(sel.dataset.uid);
        const account_status = sel.value;
        try {
          await adminApi('users.php', {
            method: 'PATCH',
            body: JSON.stringify({ userId: uid, account_status }),
          });
          showToast('User status updated');
        } catch (e) {
          showToast(e.message, true);
          loadUsers();
        }
      });
    });

    const pg = document.getElementById('admin-users-pager');
    if (pg) {
      pg.textContent = `Showing ${meta.offset + 1}–${meta.offset + data.length} of ${meta.total}`;
    }
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="admin-pill bad">${e.message}</td></tr>`;
  }
}

async function loadProperties() {
  const mod = document.getElementById('admin-prop-filter')?.value || 'pending_review';
  const body = document.getElementById('admin-properties-tbody');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="6" style="color:var(--admin-text-muted)">Loading…</td></tr>';
  try {
    const { data } = await adminApi(`properties.php?moderation=${encodeURIComponent(mod)}`);
    if (!data.length) {
      body.innerHTML =
        '<tr><td colspan="6" style="color:var(--admin-text-muted)">No properties in this queue.</td></tr>';
      return;
    }
    body.innerHTML = data
      .map(p => {
        const ms = p.listing_moderation_status || 'published';
        const pc = ms === 'published' ? 'ok' : ms === 'pending_review' ? 'pending' : 'bad';
        return `<tr data-pid="${p.id}">
        <td><strong style="color:var(--admin-text-primary)">${p.title}</strong></td>
        <td>${p.landlord_first} ${p.landlord_last}</td>
        <td>${p.landlord_email}</td>
        <td>₱${Number(p.price).toLocaleString()}</td>
        <td><span class="admin-pill ${pc}">${ms}</span></td>
        <td style="white-space:nowrap">
          <button type="button" class="admin-btn admin-btn-success admin-btn-sm" data-pub="${
            p.id
          }">Publish</button>
          <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-prej="${
            p.id
          }">Reject</button>
          <button type="button" class="admin-btn admin-btn-ghost admin-btn-sm" data-pflag="${
            p.id
          }">Flag</button>
        </td>
      </tr>`;
      })
      .join('');

    const run = (id, action) =>
      adminApi('properties.php', {
        method: 'POST',
        body: JSON.stringify({ propertyId: id, action }),
      }).then(() => {
        showToast('Property updated');
        loadProperties();
      });

    body
      .querySelectorAll('[data-pub]')
      .forEach(b => b.addEventListener('click', () => run(Number(b.dataset.pub), 'publish')));
    body
      .querySelectorAll('[data-prej]')
      .forEach(b => b.addEventListener('click', () => run(Number(b.dataset.prej), 'reject')));
    body
      .querySelectorAll('[data-pflag]')
      .forEach(b => b.addEventListener('click', () => run(Number(b.dataset.pflag), 'flag')));
  } catch (e) {
    body.innerHTML = `<tr><td colspan="6" class="admin-pill bad">${e.message}</td></tr>`;
  }
}

async function loadApplications() {
  const root = document.getElementById('admin-applications-root');
  if (!root) return;
  root.innerHTML = '<p style="color:var(--admin-text-muted)">Loading…</p>';
  try {
    const { data } = await adminApi('applications.php');
    const stats = data.stats;
    const rows = data.applications
      .map(
        a => `<tr>
        <td>#${a.id}</td>
        <td>${a.boarder_first} ${
          a.boarder_last
        }<div style="font-size:0.75rem;color:var(--admin-text-muted)">${a.boarder_email}</div></td>
        <td>${a.landlord_first} ${a.landlord_last}</td>
        <td>${a.room_title || '—'}</td>
        <td><span class="admin-pill ${a.status === 'pending' ? 'pending' : 'neutral'}">${
          a.status
        }</span></td>
        <td>${a.created_at?.slice(0, 16) || '—'}</td>
      </tr>`
      )
      .join('');
    root.innerHTML = `
      <div class="admin-stat-grid" style="margin-bottom:20px">
        <div class="admin-stat-card"><div class="label">Total applications</div><div class="value">${
          stats.total
        }</div></div>
        <div class="admin-stat-card accent-light-green"><div class="label">Pending</div><div class="value">${
          stats.pending
        }</div></div>
        <div class="admin-stat-card"><div class="label">Processed rate</div><div class="value">${
          stats.processed_rate_percent
        }%</div></div>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>ID</th><th>Boarder</th><th>Landlord</th><th>Room</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>${
            rows ||
            '<tr><td colspan="6" style="color:var(--admin-text-muted)">No applications yet.</td></tr>'
          }</tbody>
        </table>
      </div>`;
  } catch (e) {
    root.innerHTML = `<p class="admin-pill bad">${e.message}</p>`;
  }
}

async function loadAnalytics() {
  const root = document.getElementById('admin-analytics-root');
  if (!root) return;
  root.innerHTML = '<p style="color:var(--admin-text-muted)">Loading…</p>';
  try {
    const [{ data: sum }, { data: apps }] = await Promise.all([
      adminApi('summary.php'),
      adminApi('applications.php'),
    ]);
    const by = apps.stats.by_status || {};
    const max = Math.max(1, ...Object.values(by));
    const bars = Object.entries(by)
      .map(([k, v]) => {
        const pct = Math.round((v / max) * 100);
        return `<div class="admin-bar-row"><span>${k}</span><div class="admin-bar-track"><div class="admin-bar-fill" style="width:${pct}%"></div></div><span>${v}</span></div>`;
      })
      .join('');
    root.innerHTML = `
      <div class="admin-card">
        <h2>Application funnel (status mix)</h2>
        <div class="admin-chart-bars">${
          bars || '<p style="color:var(--admin-text-muted)">No application data.</p>'
        }</div>
      </div>
      <div class="admin-card">
        <h2>Platform footprint</h2>
        <div class="admin-subgrid" style="grid-template-columns:160px 1fr">
          <div>Total users</div><div><strong>${sum.counts.users_total}</strong></div>
          <div>Active listings (all moderation states)</div><div><strong>${
            sum.counts.properties_total
          }</strong></div>
          <div>Listings awaiting review</div><div><strong>${
            sum.counts.properties_pending_moderation
          }</strong></div>
          <div>Open compliance queue</div><div><strong>${
            sum.counts.property_reports_open + sum.counts.disputes_open
          }</strong></div>
        </div>
        <p style="color:var(--admin-text-muted);font-size:0.85rem;margin-top:16px;margin-bottom:0;">User growth charts can be layered on once historical snapshots are stored.</p>
      </div>`;
  } catch (e) {
    root.innerHTML = `<p class="admin-pill bad">${e.message}</p>`;
  }
}

async function loadReports() {
  const rep = document.getElementById('admin-reports-prop');
  const dis = document.getElementById('admin-reports-disputes');
  if (!rep || !dis) return;
  rep.innerHTML = '<p style="color:var(--admin-text-muted)">Loading…</p>';
  dis.innerHTML = '<p style="color:var(--admin-text-muted)">Loading…</p>';
  try {
    const { data } = await adminApi('reports.php');
    rep.innerHTML = data.property_reports.length
      ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Property</th><th>Reporter</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${data.property_reports
          .map(
            r => `<tr>
          <td>${r.property_title}</td>
          <td>${r.reporter_email}</td>
          <td>${r.reason}</td>
          <td><span class="admin-pill neutral">${r.status}</span></td>
          <td>
            <select class="admin-select admin-report-status" style="min-width:130px;padding:4px 8px;font-size:0.75rem" data-id="${
              r.id
            }">
              ${['open', 'reviewing', 'resolved', 'dismissed']
                .map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`)
                .join('')}
            </select>
          </td>
        </tr>`
          )
          .join('')}
      </tbody></table></div>`
      : '<p style="color:var(--admin-text-muted)">No property reports.</p>';

    dis.innerHTML = data.disputes.length
      ? `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Title</th><th>Type</th><th>Opened by</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${data.disputes
          .map(
            d => `<tr>
          <td><strong style="color:var(--admin-text-primary)">${d.title}</strong></td>
          <td>${d.type}</td>
          <td>${d.opened_by_email}</td>
          <td><span class="admin-pill neutral">${d.status}</span></td>
          <td>
            <select class="admin-select admin-dispute-status" style="min-width:130px;padding:4px 8px;font-size:0.75rem" data-id="${
              d.id
            }">
              ${['open', 'in_review', 'resolved', 'escalated']
                .map(s => `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s}</option>`)
                .join('')}
            </select>
          </td>
        </tr>`
          )
          .join('')}
      </tbody></table></div>`
      : '<p style="color:var(--admin-text-muted)">No disputes logged.</p>';

    rep.querySelectorAll('.admin-report-status').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await adminApi('reports.php', {
            method: 'PATCH',
            body: JSON.stringify({
              kind: 'report',
              id: Number(sel.dataset.id),
              status: sel.value,
            }),
          });
          showToast('Report updated');
        } catch (e) {
          showToast(e.message, true);
          loadReports();
        }
      });
    });

    dis.querySelectorAll('.admin-dispute-status').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await adminApi('reports.php', {
            method: 'PATCH',
            body: JSON.stringify({
              kind: 'dispute',
              id: Number(sel.dataset.id),
              status: sel.value,
            }),
          });
          showToast('Dispute updated');
        } catch (e) {
          showToast(e.message, true);
          loadReports();
        }
      });
    });
  } catch (e) {
    rep.innerHTML = `<p class="admin-pill bad">${e.message}</p>`;
    dis.innerHTML = '';
  }
}

async function loadSettings() {
  const root = document.getElementById('admin-settings-form');
  if (!root) return;
  try {
    const { data } = await adminApi('settings.php');
    root.innerHTML = `
      <div style="display:grid;gap:16px;max-width:520px">
        <label style="color:var(--admin-text-secondary);font-size:0.8rem;">Maintenance banner message (shown when non-empty)</label>
        <textarea class="admin-input" style="min-height:72px;width:100%" id="set-maint">${
          data.maintenance_message || ''
        }</textarea>
        <label style="color:var(--admin-text-secondary);font-size:0.8rem;">Terms version</label>
        <input class="admin-input" id="set-terms" value="${data.terms_version || ''}" />
        <label style="color:var(--admin-text-secondary);font-size:0.8rem;">Privacy policy version</label>
        <input class="admin-input" id="set-privacy" value="${data.privacy_version || ''}" />
        <label style="color:var(--admin-text-secondary);font-size:0.8rem;">Platform fee (%)</label>
        <input class="admin-input" id="set-fee" type="number" step="0.01" value="${
          data.platform_fee_percent ?? '0'
        }" />
        <label style="display:flex;align-items:center;gap:10px;color:var(--admin-text-secondary);font-size:0.9rem;">
          <input type="checkbox" id="set-notify" ${
            data.notify_admin_new_landlord === '1' ? 'checked' : ''
          } />
          Email / notify admins on new landlord signup
        </label>
        <div><button type="button" class="admin-btn admin-btn-primary" id="admin-save-settings">Save settings</button></div>
      </div>
      <p style="color:var(--admin-text-muted);font-size:0.8rem;margin-top:20px;max-width:520px;">Policy text lives in your legal pages; versions here are labels for change control.</p>
    `;
    document.getElementById('admin-save-settings').addEventListener('click', async () => {
      try {
        await adminApi('settings.php', {
          method: 'PATCH',
          body: JSON.stringify({
            settings: {
              maintenance_message: document.getElementById('set-maint').value,
              terms_version: document.getElementById('set-terms').value,
              privacy_version: document.getElementById('set-privacy').value,
              platform_fee_percent: document.getElementById('set-fee').value,
              notify_admin_new_landlord: document.getElementById('set-notify').checked ? '1' : '0',
            },
          }),
        });
        showToast('Settings saved');
      } catch (e) {
        showToast(e.message, true);
      }
    });
  } catch (e) {
    root.innerHTML = `<p class="admin-pill bad">${e.message}</p>`;
  }
}

function bindChrome() {
  window.addEventListener('hashchange', () => setHashSection(window.location.hash));

  document.getElementById('admin-users-search')?.addEventListener('input', () => {
    usersOffset = 0;
    loadUsers();
  });
  document.getElementById('admin-users-role')?.addEventListener('change', () => {
    usersOffset = 0;
    loadUsers();
  });
  document.getElementById('admin-users-search-btn')?.addEventListener('click', () => {
    usersOffset = 0;
    loadUsers();
  });
  document.getElementById('admin-users-prev')?.addEventListener('click', () => {
    usersOffset = Math.max(0, usersOffset - 40);
    loadUsers();
  });
  document.getElementById('admin-users-next')?.addEventListener('click', () => {
    usersOffset += 40;
    loadUsers();
  });
  document.getElementById('admin-prop-filter')?.addEventListener('change', loadProperties);
  document.getElementById('admin-prop-filter-btn')?.addEventListener('click', loadProperties);
}

/**
 * @param {object} currentUser from /api/auth/me.php
 */
export function initAdminDashboardPanels(currentUser) {
  const greet = document.getElementById('admin-shell-greet');
  if (greet && currentUser) {
    const n = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ').trim();
    greet.textContent = n ? `Signed in as ${n}` : 'Super admin console';
  }
  bindChrome();
  const initial = window.location.hash.replace(/^#/, '') || 'overview';
  if (!SECTIONS.includes(initial)) {
    window.location.hash = 'overview';
  } else {
    setHashSection(window.location.hash);
  }
}
