/* =========================================================
   ADHD (에드헤드) — Admin Panel JS
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const session = ADHD.requireAuth('admin');
  if (!session) return;

  ADHD.renderNavAuth();
  initTabs();
  renderDashboard();
  renderProducts();
  renderOrders();
  renderCustomers();
  renderDiscounts();
  renderSettings();
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
function renderDashboard() {
  const orders  = ADHD.getOrders();
  const products = ADHD.getProducts();
  const customers = ADHD.getCustomers();

  const revenue   = orders.filter(o => o.status !== 'Refunded').reduce((s, o) => s + o.total, 0);
  const pending   = orders.filter(o => o.status === 'Processing').length;
  const lowStock  = products.filter(p => p.stock <= 5).length;

  document.getElementById('stat-revenue').textContent   = '$' + revenue.toLocaleString();
  document.getElementById('stat-orders').textContent    = orders.length;
  document.getElementById('stat-customers').textContent = customers.length;
  document.getElementById('stat-pending').textContent   = pending;
  document.getElementById('stat-low').textContent       = lowStock;
  document.getElementById('stat-products').textContent  = products.length;

  // Recent orders
  const tbody = document.getElementById('recent-orders-body');
  tbody.innerHTML = orders.slice(0, 5).map(o => `
    <tr>
      <td>${o.id}</td>
      <td>${o.customer}</td>
      <td>$${o.total}</td>
      <td><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
      <td>${o.date}</td>
    </tr>
  `).join('');
}

// =========================================================
// PRODUCTS
// =========================================================
function renderProducts(filter = '') {
  let products = ADHD.getProducts();
  if (filter) products = products.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.category.toLowerCase().includes(filter.toLowerCase())
  );

  const tbody = document.getElementById('products-body');
  tbody.innerHTML = products.map(p => `
    <tr data-id="${p.id}">
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
            class="price-input" data-id="${p.id}"
            style="width:72px;background:#1a1a1a;border:1px solid #2a2a2a;color:var(--white);padding:5px 8px;font-size:13px;outline:none;"
            onchange="updatePrice('${p.id}', this.value)"
          />
        </div>
      </td>
      <td>
        <span style="color:${p.stock <= 5 ? 'var(--accent)' : 'var(--gray-300)'};">${p.stock}</span>
        &nbsp;<input type="number" value="${p.stock}" min="0"
          style="width:60px;background:#1a1a1a;border:1px solid #2a2a2a;color:var(--white);padding:5px 8px;font-size:12px;outline:none;"
          onchange="updateStock('${p.id}', this.value)"
        />
      </td>
      <td>${p.badge ? `<span class="badge-pill">${p.badge}</span>` : '—'}</td>
      <td>
        <div style="display:flex;gap:8px;">
          <button class="admin-btn admin-btn--sm" onclick="openEditModal('${p.id}')">Edit</button>
          <button class="admin-btn admin-btn--sm admin-btn--danger" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updatePrice(id, value) {
  ADHD.updateProduct(id, { price: parseFloat(value) });
  showToast('Price updated.');
}

function updateStock(id, value) {
  const stock = parseInt(value);
  const p = ADHD.updateProduct(id, { stock, badge: stock <= 5 ? 'Low Stock' : '' });
  renderProducts();
  showToast('Stock updated.');
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  ADHD.deleteProduct(id);
  renderProducts();
  renderDashboard();
  showToast('Product deleted.');
}

// Add Product
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addProductForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    ADHD.addProduct({
      name:     f.pname.value,
      sub:      f.psub.value,
      price:    parseFloat(f.pprice.value),
      category: f.pcategory.value,
      badge:    f.pbadge.value,
      stock:    parseInt(f.pstock.value),
      image:    f.pimage.value || f.pname.value.charAt(0).toUpperCase(),
    });
    f.reset();
    renderProducts();
    renderDashboard();
    showToast('Product added!');
    // Switch to product list
    document.querySelector('[data-tab="products"]').click();
  });

  // Product search
  document.getElementById('productSearch')?.addEventListener('input', e => {
    renderProducts(e.target.value);
  });
});

// Edit Modal
function openEditModal(id) {
  const p = ADHD.getProducts().find(x => x.id === id);
  if (!p) return;
  document.getElementById('editId').value       = p.id;
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
  document.getElementById('editProductForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    ADHD.updateProduct(f.editId.value, {
      name:     f.editName.value,
      sub:      f.editSub.value,
      price:    parseFloat(f.editPrice.value),
      category: f.editCategory.value,
      badge:    f.editBadge.value,
      stock:    parseInt(f.editStock.value),
      image:    f.editImage.value,
    });
    closeEditModal();
    renderProducts();
    renderDashboard();
    showToast('Product updated!');
  });
});

// =========================================================
// ORDERS
// =========================================================
function renderOrders(filter = '') {
  let orders = ADHD.getOrders();
  if (filter && filter !== 'all') orders = orders.filter(o => o.status.toLowerCase() === filter);

  const tbody = document.getElementById('orders-body');
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td style="font-weight:500;">${o.id}</td>
      <td>
        <p style="font-size:13px;">${o.customer}</p>
        <p style="font-size:11px;color:var(--gray-500);">${o.email}</p>
      </td>
      <td style="font-size:12px;color:var(--gray-500);">${o.items.join(', ')}</td>
      <td style="font-weight:600;">$${o.total}</td>
      <td>
        <select class="status-select" onchange="changeOrderStatus('${o.id}', this.value)">
          ${['Processing','Shipped','Delivered','Refunded'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td style="color:var(--gray-500);font-size:12px;">${o.date}</td>
    </tr>
  `).join('');
}

function changeOrderStatus(id, status) {
  ADHD.updateOrderStatus(id, status);
  renderDashboard();
  showToast(`Order ${id} → ${status}`);
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
function renderCustomers() {
  const customers = ADHD.getCustomers();
  const orders    = ADHD.getOrders();
  const tbody     = document.getElementById('customers-body');

  if (!customers.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--gray-700);">No registered customers yet.</td></tr>';
    return;
  }

  tbody.innerHTML = customers.map(c => {
    const customerOrders = orders.filter(o => o.email === c.email);
    const spent = customerOrders.reduce((s, o) => s + o.total, 0);
    return `
      <tr>
        <td>
          <p style="font-size:13px;font-weight:500;">${c.name}</p>
          <p style="font-size:11px;color:var(--gray-500);">${c.email}</p>
        </td>
        <td style="font-size:12px;color:var(--gray-500);">${c.joined}</td>
        <td>${customerOrders.length}</td>
        <td style="font-weight:600;">$${spent}</td>
        <td><span class="status-badge status-delivered">Active</span></td>
      </tr>
    `;
  }).join('');
}

// =========================================================
// DISCOUNTS
// =========================================================
function renderDiscounts() {
  const discounts = ADHD.getDiscounts();
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
      <td style="color:var(--gray-500);font-size:12px;">${d.expires || 'Never'}</td>
      <td>
        <button class="admin-btn admin-btn--sm admin-btn--danger" onclick="deleteDiscount('${d.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

function deleteDiscount(id) {
  ADHD.deleteDiscount(id);
  renderDiscounts();
  showToast('Discount code deleted.');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addDiscountForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    ADHD.addDiscount({
      code:     f.dcode.value.toUpperCase(),
      type:     f.dtype.value,
      value:    parseFloat(f.dvalue.value),
      minOrder: f.dmin.value ? parseFloat(f.dmin.value) : null,
      expires:  f.dexpires.value || null,
    });
    f.reset();
    renderDiscounts();
    showToast('Discount code created!');
  });

  // Auto-generate code
  document.getElementById('generateCode')?.addEventListener('click', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = 'ADHD-' + Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    document.getElementById('dcodeInput').value = code;
  });
});

// =========================================================
// SETTINGS
// =========================================================
function renderSettings() {
  const s = ADHD.getSettings();
  document.getElementById('settingAnnouncement').value = s.announcementBar;
  document.getElementById('settingHeroTitle').value    = s.heroTitle;
  document.getElementById('settingHeroSub').value      = s.heroSub;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('settingsForm')?.addEventListener('submit', e => {
    e.preventDefault();
    ADHD.saveSettings({
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
