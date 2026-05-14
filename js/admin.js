/* =========================================================
   ADHD (에드헤드) — Admin Panel JS (MongoDB API version)
   ========================================================= */

// =========================================================
// IMAGE UPLOADER
// =========================================================
let addImageURLs  = [];
let editImageURLs = [];

async function uploadImagesToAPI(files, barEl, fillEl) {
  if (!files || !files.length) return [];
  barEl.style.display = 'block';
  fillEl.style.width = '15%';

  const fd = new FormData();
  Array.from(files).forEach(f => fd.append('images', f));

  fillEl.style.width = '55%';
  const res = await fetch(ADHD.API + '/upload', {
    method:  'POST',
    headers: { Authorization: 'Bearer ' + ADHD.getToken() },
    body:    fd,
  });
  fillEl.style.width = '100%';
  setTimeout(() => { barEl.style.display = 'none'; fillEl.style.width = '0%'; }, 400);

  if (!res.ok) { showToast('Upload failed — check console'); throw new Error(await res.text()); }
  const { urls } = await res.json();
  return urls;
}

function renderImgPreview(previewEl, urls, removeFn, reorderFn = null) {
  if (!urls.length) { previewEl.innerHTML = ''; return; }

  previewEl.innerHTML = urls.map((url, i) => `
    <div class="img-preview-item${reorderFn ? ' img-preview-item--draggable' : ''}"
         data-idx="${i}" ${reorderFn ? 'draggable="true"' : ''}>
      <img src="${url}" alt="" loading="lazy" />
      ${i === 0 ? '<span class="img-preview-item__primary">Primary</span>' : ''}
      ${reorderFn ? '<span class="img-preview-item__drag" title="Drag to reorder">⠿</span>' : ''}
      <button class="img-preview-item__remove" type="button" data-idx="${i}">✕</button>
    </div>`).join('');

  previewEl.querySelectorAll('.img-preview-item__remove').forEach(btn => {
    btn.addEventListener('click', () => removeFn(parseInt(btn.dataset.idx)));
  });

  if (!reorderFn) return;

  let dragSrcIdx = null;
  previewEl.querySelectorAll('.img-preview-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrcIdx = parseInt(item.dataset.idx);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      previewEl.querySelectorAll('.img-preview-item').forEach(el => el.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      previewEl.querySelectorAll('.img-preview-item').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      const targetIdx = parseInt(item.dataset.idx);
      if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
      const newUrls = [...urls];
      const [moved] = newUrls.splice(dragSrcIdx, 1);
      newUrls.splice(targetIdx, 0, moved);
      dragSrcIdx = null;
      reorderFn(newUrls);
    });
  });
}

function initImgUploader(zoneId, inputId, previewId, getURLs, setURLs, barId, fillId) {
  const zone    = document.getElementById(zoneId);
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const bar     = document.getElementById(barId);
  const fill    = document.getElementById(fillId);
  if (!zone || !input) return;

  let removeFn, reorderFn;

  removeFn = idx => {
    const urls = getURLs().filter((_, i) => i !== idx);
    setURLs(urls);
    renderImgPreview(preview, urls, removeFn, reorderFn);
  };

  reorderFn = newUrls => {
    setURLs(newUrls);
    renderImgPreview(preview, newUrls, removeFn, reorderFn);
  };

  const handleFiles = async files => {
    const existing = getURLs();
    const slots = 8 - existing.length;
    if (slots <= 0) { showToast('Maximum 8 images reached'); return; }
    const chosen = Array.from(files).slice(0, slots);
    try {
      const newURLs = await uploadImagesToAPI(chosen, bar, fill);
      const merged  = [...existing, ...newURLs];
      setURLs(merged);
      renderImgPreview(preview, merged, removeFn, reorderFn);
    } catch (e) { console.error(e); }
  };

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { handleFiles(input.files); input.value = ''; });
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = ADHD.requireAuth('admin');
  if (!session) return;

  ADHD.renderNavAuth();
  initTabs();
  await loadCategories();
  await Promise.all([renderDashboard(), renderProducts(), renderOrders(), renderCustomers(), renderDiscounts(), renderBanners(), renderDrops(), renderCategories()]);
});

// =========================================================
// CATEGORIES (cached, loaded once at startup)
// =========================================================
let CATEGORIES = [];

async function loadCategories() {
  try {
    CATEGORIES = await ADHD.getCategories();
  } catch (e) {
    CATEGORIES = [];
  }
  populateCategoryDropdowns();
}

function populateCategoryDropdowns() {
  const opts = ['<option value="">Select category</option>']
    .concat(CATEGORIES.map(c => `<option value="${c.slug}">${c.label}</option>`)).join('');
  const add = document.getElementById('addProductCategory');
  if (add) add.innerHTML = opts;
  const edit = document.getElementById('editCategory');
  if (edit) edit.innerHTML = CATEGORIES.map(c => `<option value="${c.slug}">${c.label}</option>`).join('');
}

async function renderCategories() {
  const tbody = document.getElementById('categories-body');
  if (!tbody) return;
  if (!CATEGORIES.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:48px;color:var(--gray-700);">No categories.</td></tr>';
    return;
  }
  tbody.innerHTML = CATEGORIES.map(c => `
    <tr>
      <td>${c.label}</td>
      <td style="color:var(--gray-500);font-size:12px;">${c.slug}</td>
      <td>${c.order || 0}</td>
      <td><button class="admin-btn admin-btn--sm admin-btn--danger" onclick="deleteCategory('${c._id}')">Delete</button></td>
    </tr>
  `).join('');
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Existing products keep their category string but you won\'t be able to assign new products to it.')) return;
  await ADHD.deleteCategory(id);
  await loadCategories();
  await renderCategories();
  showToast('Category deleted.');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addCategoryForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    try {
      await ADHD.addCategory({
        label: f.clabel.value.trim(),
        slug:  f.cslug.value.trim() || undefined,
        order: f.corder.value ? parseInt(f.corder.value) : undefined,
      });
      f.reset();
      await loadCategories();
      await renderCategories();
      showToast('Category added!');
    } catch (err) {
      showToast(err.message || 'Failed to add category', 'error');
    }
  });
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
let PRODUCT_CACHE = [];

async function renderProducts(filter = '') {
  PRODUCT_CACHE = await ADHD.getProducts();
  let products = PRODUCT_CACHE;
  if (filter) products = products.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(filter.toLowerCase())
  );

  const tbody = document.getElementById('products-body');
  tbody.innerHTML = products.map(p => {
    const flags = [
      p.featured   ? '<span class="badge-pill">Featured</span>' : '',
      p.bestSeller ? '<span class="badge-pill">Best Seller</span>' : '',
    ].filter(Boolean).join(' ');
    return `
    <tr data-id="${p._id}">
      <td><input type="checkbox" class="product-row-check" data-id="${p._id}" style="cursor:pointer;" /></td>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="admin-product-thumb">${p.images && p.images[0] ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover;" />` : p.image}</div>
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
      <td>${flags || '—'}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="admin-btn admin-btn--sm" onclick="openEditModal('${p._id}')">Edit</button>
          <button class="admin-btn admin-btn--sm" onclick="duplicateProduct('${p._id}')">Duplicate</button>
          <button class="admin-btn admin-btn--sm admin-btn--danger" onclick="deleteProduct('${p._id}')">Delete</button>
        </div>
      </td>
    </tr>
  `;}).join('');

  bindProductRowChecks();
}

function bindProductRowChecks() {
  const checks = document.querySelectorAll('.product-row-check');
  checks.forEach(c => c.addEventListener('change', updateBulkBar));
  const selectAll = document.getElementById('productSelectAll');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.onchange = () => {
      checks.forEach(c => { c.checked = selectAll.checked; });
      updateBulkBar();
    };
  }
  updateBulkBar();
}

function getSelectedProductIds() {
  return Array.from(document.querySelectorAll('.product-row-check:checked')).map(c => c.dataset.id);
}

function updateBulkBar() {
  const ids = getSelectedProductIds();
  const bar = document.getElementById('productBulkBar');
  const count = document.getElementById('productBulkCount');
  if (!bar) return;
  bar.style.display = ids.length ? 'flex' : 'none';
  if (count) count.textContent = `${ids.length} selected`;
}

async function bulkProductAction(action) {
  const ids = getSelectedProductIds();
  if (!ids.length) return;
  if (action === 'delete' && !confirm(`Delete ${ids.length} product(s)?`)) return;

  const byId = Object.fromEntries(PRODUCT_CACHE.map(p => [p._id, p]));

  try {
    await Promise.all(ids.map(id => {
      const p = byId[id];
      if (action === 'delete')      return ADHD.deleteProduct(id);
      if (action === 'clearBadge')  return ADHD.updateProduct(id, { badge: '' });
      if (action === 'badgeNew')    return ADHD.updateProduct(id, { badge: 'New' });
      if (action === 'featured')    return ADHD.updateProduct(id, { featured: !p?.featured });
      if (action === 'bestSeller')  return ADHD.updateProduct(id, { bestSeller: !p?.bestSeller });
    }));
    await renderProducts(document.getElementById('productSearch')?.value || '');
    await renderDashboard();
    showToast(`${ids.length} product(s) updated.`);
  } catch (err) {
    showToast('Bulk action failed', 'error');
  }
}

async function duplicateProduct(id) {
  const p = PRODUCT_CACHE.find(x => x._id === id);
  if (!p) return;
  const copy = { ...p };
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.__v;
  copy.name = p.name + ' (Copy)';
  try {
    await ADHD.addProduct(copy);
    await renderProducts();
    showToast('Product duplicated.');
  } catch (err) {
    showToast('Duplicate failed', 'error');
  }
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
  // Init add-product image uploader
  initImgUploader(
    'addImgUploader', 'addImgInput', 'addImgPreview',
    () => addImageURLs, v => { addImageURLs = v; },
    'addImgBar', 'addImgBarFill'
  );

  document.getElementById('addProductForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f   = e.target;
    const btn = f.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await ADHD.addProduct({
        name:       f.pname.value,
        sub:        f.psub.value,
        price:      parseFloat(f.pprice.value),
        category:   f.pcategory.value,
        badge:      f.pbadge.value,
        stock:      parseInt(f.pstock.value),
        image:      f.pname.value.charAt(0).toUpperCase(),
        images:     addImageURLs,
        sizes:      f.psizes.value.split(',').map(s => s.trim()).filter(Boolean),
        featured:   f.pfeatured.checked,
        bestSeller: f.pbestSeller.checked,
      });
      f.reset();
      addImageURLs = [];
      document.getElementById('addImgPreview').innerHTML = '';
      await renderProducts();
      await renderDashboard();
      showToast('Product added!');
      document.querySelector('[data-tab="products"]').click();
    } finally {
      btn.disabled = false; btn.textContent = 'Add Product';
    }
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
  document.getElementById('editSizes').value    = (p.sizes || []).join(', ');
  document.getElementById('editFeatured').checked   = !!p.featured;
  document.getElementById('editBestSeller').checked = !!p.bestSeller;

  // Load existing images
  editImageURLs = Array.isArray(p.images) ? [...p.images] : [];
  const preview = document.getElementById('editImgPreview');
  const removeFn = idx => {
    editImageURLs = editImageURLs.filter((_, i) => i !== idx);
    renderImgPreview(preview, editImageURLs, removeFn);
  };
  renderImgPreview(preview, editImageURLs, removeFn);

  document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  // Init edit-product image uploader
  initImgUploader(
    'editImgUploader', 'editImgInput', 'editImgPreview',
    () => editImageURLs, v => { editImageURLs = v; },
    'editImgBar', 'editImgBarFill'
  );

  document.getElementById('editProductForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f   = e.target;
    const btn = f.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await ADHD.updateProduct(f.editId.value, {
        name:       f.editName.value,
        sub:        f.editSub.value,
        price:      parseFloat(f.editPrice.value),
        category:   f.editCategory.value,
        badge:      f.editBadge.value,
        stock:      parseInt(f.editStock.value),
        images:     editImageURLs,
        sizes:      document.getElementById('editSizes').value.split(',').map(s => s.trim()).filter(Boolean),
        featured:   document.getElementById('editFeatured').checked,
        bestSeller: document.getElementById('editBestSeller').checked,
      });
      closeEditModal();
      await renderProducts();
      await renderDashboard();
      showToast('Product updated!');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes';
    }
  });
});

// =========================================================
// ORDERS
// =========================================================
let ORDER_CACHE = [];

async function renderOrders(filter = '') {
  ORDER_CACHE = await ADHD.getOrders();
  let orders = ORDER_CACHE;
  if (filter && filter !== 'all') orders = orders.filter(o => o.status.toLowerCase() === filter);

  const tbody = document.getElementById('orders-body');
  tbody.innerHTML = orders.map(o => {
    const itemsLabel = (o.lineItems && o.lineItems.length)
      ? o.lineItems.map(li => `${li.name}${li.size ? ' · ' + li.size : ''}${li.qty > 1 ? ' ×' + li.qty : ''}`).join(', ')
      : (o.items || []).join(', ');
    return `
    <tr style="cursor:pointer;" onclick="openOrderModal('${o._id}')">
      <td style="font-weight:500;">${o._id.slice(-6).toUpperCase()}</td>
      <td>
        <p style="font-size:13px;">${o.customer}</p>
        <p style="font-size:11px;color:var(--gray-500);">${o.email}</p>
      </td>
      <td style="font-size:12px;color:var(--gray-500);">${itemsLabel}</td>
      <td style="font-weight:600;">$${o.total}</td>
      <td onclick="event.stopPropagation()">
        <select class="status-select" onchange="changeOrderStatus('${o._id}', this.value)">
          ${['Processing','Shipped','Delivered','Refunded'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td style="color:var(--gray-500);font-size:12px;">${new Date(o.createdAt).toLocaleDateString()}</td>
    </tr>
  `;}).join('');
}

function openOrderModal(id) {
  const o = ORDER_CACHE.find(x => x._id === id);
  if (!o) return;

  const addr = o.shipping || {};
  const hasAddr = addr.line1 || addr.city || addr.postal;

  const lineItemRows = (o.lineItems && o.lineItems.length) ? o.lineItems.map(li => `
    <tr>
      <td style="font-size:13px;">${li.name}${li.size ? ` <span style="color:var(--gray-500);">— ${li.size}</span>` : ''}</td>
      <td>×${li.qty}</td>
      <td>$${(li.price * li.qty).toFixed(2)}</td>
    </tr>
  `).join('') : (o.items || []).map(s => `<tr><td colspan="3" style="font-size:13px;color:var(--gray-500);">${s}</td></tr>`).join('');

  document.getElementById('orderModalTitle').textContent = 'Order ' + o._id.slice(-6).toUpperCase();
  document.getElementById('orderModalBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px;">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gray-500);margin-bottom:6px;">Customer</p>
          <p style="font-size:13px;font-weight:500;">${o.customer}</p>
          <p style="font-size:12px;color:var(--gray-500);">${o.email}</p>
        </div>
        <div>
          <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gray-500);margin-bottom:6px;">Placed</p>
          <p style="font-size:13px;">${new Date(o.createdAt).toLocaleString()}</p>
          <p style="font-size:12px;color:var(--gray-500);">Status: <span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></p>
        </div>
      </div>

      <div>
        <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gray-500);margin-bottom:8px;">Items</p>
        <div class="admin-table-wrap">
          <table class="admin-table"><tbody>${lineItemRows}</tbody></table>
        </div>
        <p style="text-align:right;margin-top:8px;font-weight:700;">Total: $${o.total}</p>
      </div>

      <div>
        <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gray-500);margin-bottom:8px;">Shipping Address</p>
        ${hasAddr ? `
          <p style="font-size:13px;line-height:1.6;">
            ${addr.line1 || ''}${addr.line2 ? '<br>' + addr.line2 : ''}<br>
            ${[addr.city, addr.region, addr.postal].filter(Boolean).join(', ')}<br>
            ${addr.country || ''}
          </p>
        ` : `<p style="font-size:12px;color:var(--gray-700);">No address on file.</p>`}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="admin-form-group">
          <label>Carrier</label>
          <input type="text" id="orderCarrier" value="${o.carrier || ''}" placeholder="USPS / UPS / FedEx" />
        </div>
        <div class="admin-form-group">
          <label>Tracking Number</label>
          <input type="text" id="orderTracking" value="${o.tracking || ''}" placeholder="1Z..." />
        </div>
        <div class="admin-form-group admin-form-full">
          <label>Internal Notes</label>
          <textarea id="orderNotes" rows="3" style="background:#1a1a1a;border:1px solid #222;color:var(--white);font-family:var(--font-sans);font-size:13px;padding:11px 14px;outline:none;width:100%;resize:vertical;box-sizing:border-box;">${o.notes || ''}</textarea>
        </div>
      </div>

      ${o.refundedAt ? `
        <div style="padding:12px 14px;background:#2a1a1a;border:1px solid #4a2222;">
          <p style="font-size:12px;color:#e88;">Refunded ${new Date(o.refundedAt).toLocaleString()}</p>
          ${o.refundReason ? `<p style="font-size:12px;color:var(--gray-500);margin-top:4px;">Reason: ${o.refundReason}</p>` : ''}
        </div>
      ` : ''}

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="admin-btn admin-btn--primary" onclick="saveOrderDetails('${o._id}')">Save Changes</button>
        ${o.status !== 'Refunded' ? `<button class="admin-btn admin-btn--danger" onclick="refundOrderFromModal('${o._id}')">Issue Refund</button>` : ''}
        <button class="admin-btn" onclick="closeOrderModal()">Close</button>
      </div>
    </div>
  `;
  document.getElementById('orderModal').style.display = 'flex';
}

function closeOrderModal() {
  document.getElementById('orderModal').style.display = 'none';
}

async function saveOrderDetails(id) {
  try {
    await ADHD.updateOrder(id, {
      carrier:  document.getElementById('orderCarrier').value,
      tracking: document.getElementById('orderTracking').value,
      notes:    document.getElementById('orderNotes').value,
    });
    await renderOrders(currentOrderFilter());
    closeOrderModal();
    showToast('Order updated.');
  } catch (err) {
    showToast('Save failed', 'error');
  }
}

async function refundOrderFromModal(id) {
  const reason = prompt('Refund reason (optional):') || '';
  if (!confirm('Issue refund? This sets order status to Refunded.')) return;
  try {
    await ADHD.refundOrder(id, reason);
    await renderOrders(currentOrderFilter());
    await renderDashboard();
    closeOrderModal();
    showToast('Refund issued.');
  } catch (err) {
    showToast('Refund failed', 'error');
  }
}

function currentOrderFilter() {
  const active = document.querySelector('.order-filter-btn.active');
  return active ? active.dataset.filter : 'all';
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
let CUSTOMER_CACHE = [];
let CUSTOMER_STATS = {}; // email → { orders, spent }

async function renderCustomers(filter = '') {
  const [customers, orders] = await Promise.all([ADHD.getCustomers(), ADHD.getOrders()]);
  CUSTOMER_CACHE = customers;
  CUSTOMER_STATS = {};
  for (const o of orders) {
    const key = (o.email || '').toLowerCase();
    if (!CUSTOMER_STATS[key]) CUSTOMER_STATS[key] = { orders: 0, spent: 0 };
    CUSTOMER_STATS[key].orders += 1;
    if (o.status !== 'Refunded') CUSTOMER_STATS[key].spent += o.total || 0;
  }

  const tbody = document.getElementById('customers-body');
  const q = filter.toLowerCase();
  const filtered = q
    ? customers.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
    : customers;

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--gray-700);">No customers match.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const stats = CUSTOMER_STATS[c.email.toLowerCase()] || { orders: 0, spent: 0 };
    return `
    <tr>
      <td>
        <p style="font-size:13px;font-weight:500;">${c.name}</p>
        <p style="font-size:11px;color:var(--gray-500);">${c.email}</p>
      </td>
      <td style="font-size:12px;color:var(--gray-500);">${new Date(c.createdAt).toLocaleDateString()}</td>
      <td>${stats.orders}</td>
      <td>$${stats.spent.toLocaleString()}</td>
      <td><button class="admin-btn admin-btn--sm" onclick="openCustomerModal('${c._id}')">View</button></td>
    </tr>
  `;}).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('customerSearch')?.addEventListener('input', e => {
    renderCustomers(e.target.value);
  });
});

async function openCustomerModal(id) {
  const customer = CUSTOMER_CACHE.find(c => c._id === id);
  if (!customer) return;
  const orders = (await ADHD.getOrders()).filter(o => (o.email || '').toLowerCase() === customer.email.toLowerCase());
  const stats = CUSTOMER_STATS[customer.email.toLowerCase()] || { orders: 0, spent: 0 };

  document.getElementById('customerModalTitle').textContent = customer.name;
  document.getElementById('customerModalBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div class="stat-card"><p class="stat-card__label">Orders</p><p class="stat-card__value">${stats.orders}</p></div>
        <div class="stat-card"><p class="stat-card__label">Lifetime Spent</p><p class="stat-card__value accent">$${stats.spent.toLocaleString()}</p></div>
        <div class="stat-card"><p class="stat-card__label">Joined</p><p class="stat-card__value" style="font-size:14px;">${new Date(customer.createdAt).toLocaleDateString()}</p></div>
      </div>

      <div>
        <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gray-500);margin-bottom:8px;">Email</p>
        <p style="font-size:13px;">${customer.email}</p>
      </div>

      <div>
        <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gray-500);margin-bottom:8px;">Admin Notes</p>
        <textarea id="customerNotesField" rows="4" style="background:#1a1a1a;border:1px solid #222;color:var(--white);font-family:var(--font-sans);font-size:13px;padding:11px 14px;outline:none;width:100%;resize:vertical;box-sizing:border-box;">${customer.notes || ''}</textarea>
        <div style="margin-top:8px;"><button class="admin-btn admin-btn--primary admin-btn--sm" onclick="saveCustomerNotes('${customer._id}')">Save Notes</button></div>
      </div>

      <div>
        <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gray-500);margin-bottom:8px;">Order History</p>
        ${orders.length ? `
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>Order</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                ${orders.map(o => `
                  <tr>
                    <td style="font-weight:500;">${o._id.slice(-6).toUpperCase()}</td>
                    <td>$${o.total}</td>
                    <td><span class="status-badge status-${o.status.toLowerCase()}">${o.status}</span></td>
                    <td style="font-size:12px;color:var(--gray-500);">${new Date(o.createdAt).toLocaleDateString()}</td>
                    <td><button class="admin-btn admin-btn--sm" onclick="closeCustomerModal();openOrderModal('${o._id}')">Open</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<p style="font-size:12px;color:var(--gray-700);">No orders yet.</p>`}
      </div>
    </div>
  `;
  document.getElementById('customerModal').style.display = 'flex';
}

function closeCustomerModal() {
  document.getElementById('customerModal').style.display = 'none';
}

async function saveCustomerNotes(id) {
  const notes = document.getElementById('customerNotesField').value;
  try {
    await ADHD.updateCustomer(id, { notes });
    const c = CUSTOMER_CACHE.find(x => x._id === id);
    if (c) c.notes = notes;
    showToast('Notes saved.');
  } catch (err) {
    showToast('Save failed', 'error');
  }
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
// BANNERS
// =========================================================
let SETTINGS_CACHE = null;

async function renderBanners() {
  const s = await ADHD.getSettings();
  SETTINGS_CACHE = s;
  document.getElementById('settingAnnouncement').value = s.announcementBar || '';
  document.getElementById('settingHeroEyebrow').value  = s.heroEyebrow || '';
  document.getElementById('settingHeroTitle').value    = s.heroTitle || '';
  document.getElementById('settingHeroSub').value      = s.heroSub || '';
  document.getElementById('settingHeroCta').value      = s.heroCta || '';
  document.getElementById('settingHeroCtaLink').value  = s.heroCtaLink || '';
  document.getElementById('settingHeroCta2').value     = s.heroCta2 || '';
  document.getElementById('settingHeroCta2Link').value = s.heroCta2Link || '';
  document.getElementById('settingHeroImage').value    = s.heroImage || '';
  document.getElementById('settingMarquee').value      = (s.marqueeItems || []).join('\n');
  const social = s.social || {};
  document.getElementById('settingSocialInstagram').value = social.instagram || '';
  document.getElementById('settingSocialTiktok').value    = social.tiktok || '';
  document.getElementById('settingSocialTwitter').value   = social.twitter || '';
  document.getElementById('settingSocialEmail').value     = social.email || '';
  const shopToggle = document.getElementById('settingShopHidden');
  if (shopToggle) shopToggle.checked = !!s.shopHidden;

  renderPages(s);
}

function renderPages(s) {
  const pages = s.pages || {};
  const about = pages.about || {};
  if (document.getElementById('aboutEyebrow')) {
    document.getElementById('aboutEyebrow').value  = about.eyebrow || '';
    document.getElementById('aboutTitle').value    = about.title || '';
    document.getElementById('aboutIntro').value    = (about.intro || []).join('\n');
    document.getElementById('aboutQuote').value    = about.quote || '';
    document.getElementById('aboutQuoteBy').value  = about.quoteBy || '';
    document.getElementById('aboutValues').value   = (about.values || []).map(v => `${v.num || ''} | ${v.title || ''} | ${v.text || ''}`).join('\n');
  }
  const contact = pages.contact || {};
  if (document.getElementById('contactEyebrow')) {
    document.getElementById('contactEyebrow').value = contact.eyebrow || '';
    document.getElementById('contactTitle').value   = contact.title || '';
    document.getElementById('contactSub').value     = contact.sub || '';
    document.getElementById('contactEmails').value  = (contact.emails || []).map(e => `${e.label || ''} | ${e.address || ''}`).join('\n');
  }
  const pol = pages.policies || {};
  if (document.getElementById('policiesShippingTitle')) {
    document.getElementById('policiesShippingTitle').value = (pol.shipping && pol.shipping.title) || 'Shipping';
    document.getElementById('policiesShippingBody').value  = (pol.shipping && pol.shipping.body) || '';
    document.getElementById('policiesReturnsTitle').value  = (pol.returns && pol.returns.title) || 'Returns';
    document.getElementById('policiesReturnsBody').value   = (pol.returns && pol.returns.body) || '';
  }
  const sg = pages.sizeGuide || {};
  if (document.getElementById('sizeEyebrow')) {
    document.getElementById('sizeEyebrow').value = sg.eyebrow || '';
    document.getElementById('sizeTitle').value   = sg.title || '';
    document.getElementById('sizeIntro').value   = sg.intro || '';
    document.getElementById('sizeNotes').value   = sg.notes || '';
    document.getElementById('sizeTables').value  = (sg.tables || []).map(t => {
      const headerLine = (t.headers || []).join(' | ');
      const rowLines   = (t.rows || []).map(r => r.join(' | ')).join('\n');
      return [t.name || '', headerLine, rowLines].filter(Boolean).join('\n');
    }).join('\n\n');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('bannersForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    await ADHD.saveSettings({
      announcementBar: document.getElementById('settingAnnouncement').value,
      heroEyebrow:     document.getElementById('settingHeroEyebrow').value,
      heroTitle:       document.getElementById('settingHeroTitle').value,
      heroSub:         document.getElementById('settingHeroSub').value,
      heroCta:         document.getElementById('settingHeroCta').value,
      heroCtaLink:     document.getElementById('settingHeroCtaLink').value,
      heroCta2:        document.getElementById('settingHeroCta2').value,
      heroCta2Link:    document.getElementById('settingHeroCta2Link').value,
      heroImage:       document.getElementById('settingHeroImage').value,
    });
    showToast('Banners saved!');
  });

  document.getElementById('aboutPageForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const intro = document.getElementById('aboutIntro').value.split('\n').map(s => s.trim()).filter(Boolean);
    const values = document.getElementById('aboutValues').value.split('\n').map(line => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 2) return null;
      return { num: parts[0], title: parts[1], text: parts[2] || '' };
    }).filter(Boolean);
    await ADHD.saveSettings({
      pages: {
        ...(SETTINGS_CACHE?.pages || {}),
        about: {
          eyebrow:  document.getElementById('aboutEyebrow').value,
          title:    document.getElementById('aboutTitle').value,
          intro,
          quote:    document.getElementById('aboutQuote').value,
          quoteBy:  document.getElementById('aboutQuoteBy').value,
          values,
        },
      },
    });
    SETTINGS_CACHE = await ADHD.getSettings();
    showToast('About page saved!');
  });

  document.getElementById('contactPageForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const emails = document.getElementById('contactEmails').value.split('\n').map(line => {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 2 || !parts[1]) return null;
      return { label: parts[0], address: parts[1] };
    }).filter(Boolean);
    await ADHD.saveSettings({
      pages: {
        ...(SETTINGS_CACHE?.pages || {}),
        contact: {
          eyebrow: document.getElementById('contactEyebrow').value,
          title:   document.getElementById('contactTitle').value,
          sub:     document.getElementById('contactSub').value,
          emails,
        },
      },
    });
    SETTINGS_CACHE = await ADHD.getSettings();
    showToast('Contact page saved!');
  });

  document.getElementById('sizeGuideForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const blocks = document.getElementById('sizeTables').value.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const tables = blocks.map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return null;
      const name    = lines[0];
      const headers = lines[1].split('|').map(s => s.trim());
      const rows    = lines.slice(2).map(l => l.split('|').map(s => s.trim()));
      return { name, headers, rows };
    }).filter(Boolean);
    await ADHD.saveSettings({
      pages: {
        ...(SETTINGS_CACHE?.pages || {}),
        sizeGuide: {
          eyebrow: document.getElementById('sizeEyebrow').value,
          title:   document.getElementById('sizeTitle').value,
          intro:   document.getElementById('sizeIntro').value,
          notes:   document.getElementById('sizeNotes').value,
          tables,
        },
      },
    });
    SETTINGS_CACHE = await ADHD.getSettings();
    showToast('Size guide saved!');
  });

  document.getElementById('policiesPageForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    await ADHD.saveSettings({
      pages: {
        ...(SETTINGS_CACHE?.pages || {}),
        policies: {
          shipping: {
            title: document.getElementById('policiesShippingTitle').value,
            body:  document.getElementById('policiesShippingBody').value,
          },
          returns: {
            title: document.getElementById('policiesReturnsTitle').value,
            body:  document.getElementById('policiesReturnsBody').value,
          },
        },
      },
    });
    SETTINGS_CACHE = await ADHD.getSettings();
    showToast('Policies saved!');
  });

  document.getElementById('marqueeForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const items = document.getElementById('settingMarquee').value
      .split('\n').map(s => s.trim()).filter(Boolean);
    await ADHD.saveSettings({ marqueeItems: items });
    showToast('Marquee saved!');
  });

  document.getElementById('socialForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    await ADHD.saveSettings({
      social: {
        instagram: document.getElementById('settingSocialInstagram').value.trim(),
        tiktok:    document.getElementById('settingSocialTiktok').value.trim(),
        twitter:   document.getElementById('settingSocialTwitter').value.trim(),
        email:     document.getElementById('settingSocialEmail').value.trim(),
      },
    });
    showToast('Social links saved!');
  });

  document.getElementById('storeSettingsForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    await ADHD.saveSettings({
      shopHidden: document.getElementById('settingShopHidden').checked,
    });
    showToast('Settings saved!');
  });
});

// =========================================================
// DROPS
// =========================================================
let addDropImageURLs  = [];
let editDropImageURLs = [];

async function renderDrops() {
  const tbody = document.getElementById('drops-body');
  let drops;
  try {
    drops = await ADHD.getDrops();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--gray-700);">Could not load drops — API unavailable.</td></tr>';
    return;
  }
  if (!drops.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:48px;color:var(--gray-700);">No drops yet. Use "Add Drop" to create one.</td></tr>';
    return;
  }
  tbody.innerHTML = drops.map(d => `
    <tr>
      <td style="font-weight:500;">${d.title}</td>
      <td style="color:var(--gray-500);font-size:12px;">${d.season || '—'}</td>
      <td style="color:var(--gray-500);font-size:12px;">${d.date ? new Date(d.date).toLocaleDateString() : '—'}</td>
      <td><span class="status-badge status-${d.status === 'upcoming' ? 'processing' : d.status === 'active' ? 'shipped' : 'refunded'}">${d.status}</span></td>
      <td>
        <div style="display:flex;gap:8px;">
          <button class="admin-btn admin-btn--sm" onclick="openEditDropModal('${d._id}')">Edit</button>
          <button class="admin-btn admin-btn--sm admin-btn--danger" onclick="deleteDrop('${d._id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function deleteDrop(id) {
  if (!confirm('Delete this drop?')) return;
  await ADHD.deleteDrop(id);
  await renderDrops();
  showToast('Drop deleted.');
}

async function openEditDropModal(id) {
  const drops = await ADHD.getDrops();
  const d = drops.find(x => x._id === id);
  if (!d) return;

  document.getElementById('editDropId').value     = d._id;
  document.getElementById('editDropTitle').value  = d.title;
  document.getElementById('editDropSeason').value = d.season || '';
  document.getElementById('editDropDesc').value   = d.description || '';
  document.getElementById('editDropStatus').value = d.status;

  if (d.date) {
    const local = new Date(d.date);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    document.getElementById('editDropDate').value = local.toISOString().slice(0, 16);
  } else {
    document.getElementById('editDropDate').value = '';
  }

  editDropImageURLs = Array.isArray(d.images) ? [...d.images] : [];
  const preview = document.getElementById('editDropImgPreview');

  let removeFn, reorderFn;
  removeFn = idx => {
    editDropImageURLs = editDropImageURLs.filter((_, i) => i !== idx);
    renderImgPreview(preview, editDropImageURLs, removeFn, reorderFn);
  };
  reorderFn = newUrls => {
    editDropImageURLs = newUrls;
    renderImgPreview(preview, editDropImageURLs, removeFn, reorderFn);
  };
  renderImgPreview(preview, editDropImageURLs, removeFn, reorderFn);

  document.getElementById('editDropModal').style.display = 'flex';
}

function closeEditDropModal() {
  document.getElementById('editDropModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  initImgUploader(
    'addDropImgUploader', 'addDropImgInput', 'addDropImgPreview',
    () => addDropImageURLs, v => { addDropImageURLs = v; },
    'addDropImgBar', 'addDropImgBarFill'
  );

  initImgUploader(
    'editDropImgUploader', 'editDropImgInput', 'editDropImgPreview',
    () => editDropImageURLs, v => { editDropImageURLs = v; },
    'editDropImgBar', 'editDropImgBarFill'
  );

  document.getElementById('addDropForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f   = e.target;
    const btn = f.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await ADHD.addDrop({
        title:       f.dtitle.value,
        season:      f.dseason.value,
        description: f.ddesc.value,
        date:        f.ddate.value || null,
        status:      f.dstatus.value,
        images:      addDropImageURLs,
      });
      f.reset();
      addDropImageURLs = [];
      document.getElementById('addDropImgPreview').innerHTML = '';
      await renderDrops();
      showToast('Drop published.');
      document.querySelector('[data-tab="drops"]').click();
    } catch (err) {
      showToast('Failed — try again.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Add Drop';
    }
  });

  document.getElementById('editDropForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await ADHD.updateDrop(document.getElementById('editDropId').value, {
        title:       document.getElementById('editDropTitle').value,
        season:      document.getElementById('editDropSeason').value,
        description: document.getElementById('editDropDesc').value,
        date:        document.getElementById('editDropDate').value || null,
        status:      document.getElementById('editDropStatus').value,
        images:      editDropImageURLs,
      });
      closeEditDropModal();
      await renderDrops();
      showToast('Drop saved.');
    } catch (err) {
      showToast('Failed — try again.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes';
    }
  });
});

// =========================================================
// MEDIA LIBRARY
// =========================================================
let MEDIA_CACHE = [];

async function renderMedia() {
  const grid = document.getElementById('mediaGrid');
  if (!grid) return;
  try {
    MEDIA_CACHE = await ADHD.getMedia();
  } catch (e) {
    grid.innerHTML = '<p style="color:var(--gray-700);font-size:12px;padding:24px;">Could not load media.</p>';
    return;
  }
  const count = document.getElementById('mediaCount');
  if (count) count.textContent = MEDIA_CACHE.length ? `${MEDIA_CACHE.length} item(s)` : '';
  if (!MEDIA_CACHE.length) {
    grid.innerHTML = '<p style="color:var(--gray-700);font-size:12px;padding:24px;">No images yet. Upload above, or upload via Products / Drops — those go here automatically too.</p>';
    return;
  }
  grid.innerHTML = MEDIA_CACHE.map(m => `
    <div class="media-tile" style="position:relative;background:#0f0f0f;border:1px solid #1c1c1c;aspect-ratio:1;display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <img src="${m.url}" alt="${m.alt || ''}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);opacity:0;transition:opacity 0.15s ease;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
        <button class="admin-btn admin-btn--sm" onclick="copyMediaUrl('${m.url}')">Copy URL</button>
        <button class="admin-btn admin-btn--sm admin-btn--danger" onclick="deleteMedia('${m._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function copyMediaUrl(url) {
  navigator.clipboard.writeText(url).then(
    () => showToast('URL copied to clipboard'),
    () => showToast('Copy failed — select manually', 'error')
  );
}

async function deleteMedia(id) {
  if (!confirm('Delete this image? This removes it from Cloudinary too. Products/drops that reference it will keep the URL but the image will 404.')) return;
  try {
    await ADHD.deleteMedia(id);
    await renderMedia();
    showToast('Image deleted.');
  } catch (e) {
    showToast('Delete failed', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Tab activation triggers a fresh load of media
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    if (btn.dataset.tab === 'media') {
      btn.addEventListener('click', renderMedia);
    }
    if (btn.dataset.tab === 'analytics') {
      btn.addEventListener('click', renderAnalytics);
    }
  });

  // Media library uploader — uploads & refreshes the grid (no preview state)
  const zone  = document.getElementById('mediaUploader');
  const input = document.getElementById('mediaInput');
  const bar   = document.getElementById('mediaBar');
  const fill  = document.getElementById('mediaBarFill');
  if (zone && input) {
    const handle = async files => {
      if (!files.length) return;
      try {
        await uploadImagesToAPI(Array.from(files).slice(0, 8), bar, fill);
        await renderMedia();
        showToast('Uploaded.');
      } catch (e) { /* uploadImagesToAPI already toasts */ }
    };
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { handle(input.files); input.value = ''; });
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      handle(e.dataTransfer.files);
    });
  }
});

// =========================================================
// ANALYTICS
// =========================================================
let chartRevenueObj = null;
let chartStatusObj = null;
let chartTopProductsObj = null;

async function renderAnalytics() {
  if (typeof Chart === 'undefined') return;
  const orders = await ADHD.getOrders();

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Build last-30-day buckets
  const buckets = [];
  const labels = [];
  for (let i = 29; i >= 0; i--) {
    const ts = startOfToday - i * dayMs;
    buckets.push({ ts, revenue: 0, orders: 0 });
    labels.push(new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  let recentRevenue = 0;
  let recentOrderCount = 0;
  let refundedCount = 0;
  const statusCounts = { Processing: 0, Shipped: 0, Delivered: 0, Refunded: 0 };
  const productTotals = {};

  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    if (o.status === 'Refunded') refundedCount++;

    const orderDay = new Date(new Date(o.createdAt).getFullYear(), new Date(o.createdAt).getMonth(), new Date(o.createdAt).getDate()).getTime();
    const bucket = buckets.find(b => b.ts === orderDay);
    if (bucket) {
      bucket.orders += 1;
      if (o.status !== 'Refunded') bucket.revenue += o.total || 0;
    }
    if (orderDay >= buckets[0].ts) {
      recentOrderCount++;
      if (o.status !== 'Refunded') recentRevenue += o.total || 0;
    }

    // Top products from lineItems (with summary-string fallback)
    if (o.lineItems && o.lineItems.length) {
      for (const li of o.lineItems) {
        const key = li.name;
        productTotals[key] = (productTotals[key] || 0) + (li.qty || 1);
      }
    } else if (o.items && o.items.length) {
      for (const name of o.items) {
        productTotals[name] = (productTotals[name] || 0) + 1;
      }
    }
  }

  const aov = recentOrderCount ? (recentRevenue / recentOrderCount) : 0;
  const refundRate = orders.length ? (refundedCount / orders.length) * 100 : 0;

  document.getElementById('an-revenue-30').textContent = '$' + recentRevenue.toLocaleString();
  document.getElementById('an-aov').textContent        = '$' + aov.toFixed(2);
  document.getElementById('an-refund-rate').textContent = refundRate.toFixed(1) + '%';
  document.getElementById('an-orders-30').textContent  = recentOrderCount;

  const accent = getCSSVar('--accent') || '#ff3b3b';
  const grayLine = '#222';
  const txt = '#888';

  Chart.defaults.color = txt;
  Chart.defaults.borderColor = grayLine;

  // Revenue line
  if (chartRevenueObj) chartRevenueObj.destroy();
  chartRevenueObj = new Chart(document.getElementById('chartRevenue'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: buckets.map(b => b.revenue),
        borderColor: accent,
        backgroundColor: accent + '22',
        tension: 0.3,
        fill: true,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: grayLine } },
        y: { grid: { color: grayLine }, ticks: { callback: v => '$' + v } },
      },
    },
  });

  // Status donut
  if (chartStatusObj) chartStatusObj.destroy();
  chartStatusObj = new Chart(document.getElementById('chartStatus'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#888', '#5a8', '#48a', '#a44'],
        borderColor: '#0f0f0f',
        borderWidth: 2,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
    },
  });

  // Top products bar
  const topEntries = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (chartTopProductsObj) chartTopProductsObj.destroy();
  chartTopProductsObj = new Chart(document.getElementById('chartTopProducts'), {
    type: 'bar',
    data: {
      labels: topEntries.length ? topEntries.map(e => e[0]) : ['No order data yet'],
      datasets: [{
        label: 'Units sold',
        data: topEntries.length ? topEntries.map(e => e[1]) : [0],
        backgroundColor: accent,
      }],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: grayLine }, beginAtZero: true, ticks: { precision: 0 } },
        y: { grid: { color: grayLine } },
      },
    },
  });
}

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// =========================================================
// TOAST
// =========================================================
function showToast(msg, type = 'success') {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    toast.style.cssText = `
      position:fixed;bottom:32px;right:32px;
      font-family:var(--font-display);font-size:11px;font-weight:700;letter-spacing:0.12em;
      text-transform:uppercase;padding:12px 20px;z-index:9999;
      opacity:0;transition:opacity 0.2s ease;pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'error' ? '#c0392b' : 'var(--accent)';
  toast.style.color      = type === 'error' ? '#fff'    : 'var(--black)';
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
