/* =========================================================
   ADHD (에드헤드) — Admin Panel JS (MongoDB API version)
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  const session = ADHD.requireAuth('admin');
  if (!session) return;

  ADHD.renderNavAuth();
  initTabs();
  await Promise.all([renderDashboard(), renderProducts(), renderOrders(), renderCustomers(), renderDiscounts(), renderSettings()]);
});

// =========================================================
// TABS
// =========================================================
function initTabs() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// =========================================================
// DASHBOARD
// =========================================================
async function renderDashboard() {
  const [orders, products, customers] = await Promise.all([
    ADHD.getOrders(), ADHD.getProducts(), ADHD.getCustomers()
  ]);

  const revenue  = orders.filter(o => o.status !== 'Refunded').reduce((s, o) => s + o.total, 0);
  const pending  = orders.filter(o => o.status === 'Processing').length;
  const lowStock = products.filter(p => p.stock <= 5).length;

  document.getElementById('stat-revenue').textContent   = '$' + revenue.toLocaleString();
  document.getElementById('stat-orders').textContent    = orders.length;
  document.getElementById('stat-customers').textContent = customers.length;
  document.getElementById('stat-pending').textContent   = pending;
  document.getElementById('stat-low').textContent       = lowStock;
  document.getElementById('stat-products').textContent  = products.length;

  const tbody = document.getElementById('recent-orders-body');
  tbody.innerHTML = orders.slice(0, 5).map(o => `
    <tr>
      <td>${o._id.slice(-6).toUpperCase()}</td>
      <td>${o.customer}</td>
      <td>$${o.total}</td>
      <td><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
      <td>${new Date(o.createdAt).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

// =========================================================
// PRODUCTS
// =========================================================
async function renderProducts(filter = '') {
  let products = await ADHD.getProducts();
  if (filter) products = products.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.category.toLowerCase().includes(filter.toLowerCase())
  );

  const tbody = document.getElementById('products-body');
  tbody.innerHTML = products.map(p => `
    <tr data-id="${p._id}">
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="admin-product-thumb">${p.image}</div>
          <div>
            <p style="font-weight:500;font-size:13px;">${p.name}</p>
            <p style="color:var(--gray-500);font-size:11px;">${p.sub}</p>
          </div>
        </div>
      </td>
      <td style="text-transform:capitalize;">${p.category}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          $<input type="number" value="${p.price}" min="0" step="1"
            class="price-input"
            style="width:72px;background:#1a1a1a;border:1px solid #2a2a2a;color:var(--white);padding:5px 8px;font-size:13px;outline:none;"
            onchange="updatePrice('${p._id}', this.value)"
          />
        </div>
      </td>
      <td>
        <span style="color:${p.stock <= 5 ? 'var(--accent)' : 'var(--gray-300)'};">${p.stock}</span>
        &nbsp;<input type="number" value="${p.stock}" min="0"
          style="width:60px;background:#1a1a1a;border:1px solid #2a2a2a;color:var(--white);padding:5px 8px;font-size:12px;outline:none;"
          onchange="updateStock('${p._id}', this.value)"
        />
      </td>
      <td>${p.badge ? `<span class="badge-pill">${p.badge}</span>` : '—'}</td>
      <td>
        <div style="display:flex;gap:8px;">
          <button class="admin-btn admin-btn--sm" onclick="openEditModal('${p._id}')">Edit</button>
          <button class="admin-btn admin-btn--sm admin-btn--danger" onclick="deleteProduct('${p._id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function updatePrice(id, value) {
  await ADHD.updateProduct(id, { price: parseFloat(value) });
  showToast('Price updated.');
}

async function updateStock(id, value) {
  const stock = parseInt(value);
  await ADHD.updateProduct(id, { stock, badge: stock <= 5 ? 'Low Stock' : '' });
  await renderProducts();
  showToast('Stock updated.');
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await ADHD.deleteProduct(id);
  await renderProducts();
  await renderDashboard();
  showToast('Product deleted.');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addProductForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    await ADHD.addProduct({
      name:     f.pname.value,
      sub:      f.psub.value,
      price:    parseFloat(f.pprice.value),
      category: f.pcategory.value,
      badge:    f.pbadge.value,
      stock:    parseInt(f.pstock.value),
      image:    f.pimage.value || f.pname.value.charAt(0).toUpperCase(),
    });
    f.reset();
    await renderProducts();
    await renderDashboard();
    showToast('Product added!');
    document.querySelector('[data-tab="products"]').click();
  });

  document.getElementById('productSearch')?.addEventListener('input', e => {
    renderProducts(e.target.value);
  });
});

async function openEditModal(id) {
  const products = await ADHD.getProducts();
  const p = products.find(x => (x._id || x.id) === id);
  if (!p) return;
  document.getElementById('editId').value       = p._id;
  document.getElementById('editName').value     = p.name;
  document.getElementById('editSub').value      = p.sub;
  document.getElementById('editPrice').value    = p.price;
  document.getElementById('editCategory').value = p.category;
  document.getElementById('editBadge').value    = p.badge;
  document.getElementById('editStock').value    = p.stock;
  document.getElementById('editImage').value    = p.image;
  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('editProductForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    await ADHD.updateProduct(f.editId.value, {
      name:     f.editName.value,
      sub:      f.editSub.value,
      price:    parseFloat(f.editPrice.value),
      category: f.editCategory.value,
      badge:    f.editBadge.value,
      stock:    parseInt(f.editStock.value),
      image:    f.editImage.value,
    });
    closeEditModal();
    await renderProducts();
    await renderDashboard();
    showToast('Product updated!');
  });
});

// =========================================================
// ORDERS
// =========================================================
async function renderOrders(filter = '') {
  let orders = await ADHD.getOrders();
  if (filter && filter !== 'all') orders = orders.filter(o => o.status.toLowerCase() === filter);

  const tbody = document.getElementById('orders-body');
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="font-weight:500;">${o._id.slice(-6).toUpperCase()}</td>
      <td>
        <p style="font-size:13px;">${o.customer}</p>
        <p style="font-size:11px;color:var(--gray-500);">${o.email}</p>
      </td>
      <td style="font-size:12px;color:var(--gray-500);">${(o.items || []).join(', ')}</td>
      <td style="font-weight:600;">$${o.total}</td>
      <td>
        <select class="status-select" onchange="changeOrderStatus('${o._id}', this.value)">
          ${['Processing','Shipped','Delivered','Refunded'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td style="color:var(--gray-500);font-size:12px;">${new Date(o.createdAt).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

async function changeOrderStatus(id, status) {
  await ADHD.updateOrderStatus(id, status);
  await renderDashboard();
  showToast(`Order updated → ${status}`);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.order-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.order-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderOrders(btn.dataset.filter);
    });
  });
});

// =========================================================
// CUSTOMERS
// =========================================================
async function renderCustomers() {
  const customers = await ADHD.getCustomers();
  const tbody = document.getElementById('customers-body');

  if (!customers.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--gray-700);">No registered customers yet.</td></tr>';
    return;
  }

  tbody.innerHTML = customers.map(c => `
    <tr>
      <td>
        <p style="font-size:13px;font-weight:500;">${c.name}</p>
        <p style="font-size:11px;color:var(--gray-500);">${c.email}</p>
      </td>
      <td style="font-size:12px;color:var(--gray-500);">${new Date(c.createdAt).toLocaleDateString()}</td>
      <td>—</td>
      <td>—</td>
      <td><span class="status-badge status-delivered">Active</span></td>
    </tr>
  `).join('');
}

// =========================================================
// DISCOUNTS
// =========================================================
async function renderDiscounts() {
  const discounts = await ADHD.getDiscounts();
  const tbody = document.getElementById('discounts-body');
  if (!discounts.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--gray-700);">No discount codes yet.</td></tr>';
    return;
  }
  tbody.innerHTML = discounts.map(d => `
    <tr>
      <td style="font-family:var(--font-display);font-weight:700;letter-spacing:0.08em;">${d.code}</td>
      <td>${d.type === 'percent' ? d.value + '%' : '$' + d.value} off</td>
      <td style="color:var(--gray-500);font-size:12px;">${d.minOrder ? '$' + d.minOrder + ' min' : 'No minimum'}</td>
      <td style="color:var(--gray-500);font-size:12px;">${d.expires ? new Date(d.expires).toLocaleDateString() : 'Never'}</td>
      <td>
        <button class="admin-btn admin-btn--sm admin-btn--danger" onclick="deleteDiscount('${d._id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deleteDiscount(id) {
  await ADHD.deleteDiscount(id);
  await renderDiscounts();
  showToast('Discount code deleted.');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addDiscountForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    await ADHD.addDiscount({
      code:     f.dcode.value.toUpperCase(),
      type:     f.dtype.value,
      value:    parseFloat(f.dvalue.value),
      minOrder: f.dmin.value ? parseFloat(f.dmin.value) : 0,
      expires:  f.dexpires.value || null,
    });
    f.reset();
    await renderDiscounts();
    showToast('Discount code created!');
  });

  document.getElementById('generateCode')?.addEventListener('click', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = 'ADHD-' + Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    document.getElementById('dcodeInput').value = code;
  });
});

// =========================================================
// SETTINGS
// =========================================================
async function renderSettings() {
  const s = await ADHD.getSettings();
  document.getElementById('settingAnnouncement').value = s.announcementBar || '';
  document.getElementById('settingHeroTitle').value    = s.heroTitle || '';
  document.getElementById('settingHeroSub').value      = s.heroSub || '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('settingsForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    await ADHD.saveSettings({
      announcementBar: document.getElementById('settingAnnouncement').value,
      heroTitle:       document.getElementById('settingHeroTitle').value,
      heroSub:         document.getElementById('settingHeroSub').value,
    });
    showToast('Settings saved!');
  });
});

// =========================================================
// TOAST
// =========================================================
function showToast(msg) {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.style.cssText = `
      position:fixed;bottom:32px;right:32px;background:var(--accent);color:var(--black);
      font-family:var(--font-display);font-size:11px;font-weight:700;letter-spacing:0.12em;
      text-transform:uppercase;padding:12px 20px;z-index:9999;
      opacity:0;transition:opacity 0.2s ease;pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}
