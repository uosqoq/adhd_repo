/* =========================================================
   ADHD (에드헤드) — API + Auth Layer
   All data now served from the Railway backend / MongoDB
   ========================================================= */

const ADHD = {

  API: 'https://adhdbackend-production-8caa.up.railway.app/api',

  // -------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------
  async _req(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const token = this.getToken();
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body)  opts.body = JSON.stringify(body);
    const res = await fetch(this.API + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get:    (path)        => ADHD._req('GET',    path),
  post:   (path, body)  => ADHD._req('POST',   path, body),
  patch:  (path, body)  => ADHD._req('PATCH',  path, body),
  del:    (path)        => ADHD._req('DELETE', path),

  // -------------------------------------------------------
  // TOKEN / SESSION
  // -------------------------------------------------------
  getToken()  { return sessionStorage.getItem('adhd_token'); },
  getSession(){ const s = sessionStorage.getItem('adhd_session'); return s ? JSON.parse(s) : null; },

  setSession(token, user) {
    sessionStorage.setItem('adhd_token',   token);
    sessionStorage.setItem('adhd_session', JSON.stringify(user));
  },

  logout() {
    sessionStorage.removeItem('adhd_token');
    sessionStorage.removeItem('adhd_session');
    window.location.href = 'index.html';
  },

  requireAuth(role) {
    const session = this.getSession();
    if (!session) { window.location.href = 'login.html'; return null; }
    if (role === 'admin' && session.role !== 'admin') { window.location.href = 'index.html'; return null; }
    return session;
  },

  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------
  async login(email, password) {
    try {
      const data = await this.post('/auth/login', { email, password });
      this.setSession(data.token, data.user);
      return { ok: true, type: data.user.role };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  async register(name, email, password) {
    try {
      const data = await this.post('/auth/register', { name, email, password });
      this.setSession(data.token, data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // -------------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------------
  getProducts(category)  { return this.get('/products' + (category ? '?category=' + category : '')); },
  addProduct(data)        { return this.post('/products', data); },
  updateProduct(id, data) { return this.patch('/products/' + id, data); },
  deleteProduct(id)       { return this.del('/products/' + id); },

  // -------------------------------------------------------
  // ORDERS
  // -------------------------------------------------------
  getOrders()              { return this.get('/orders'); },
  createOrder(data)        { return this.post('/orders', data); },
  updateOrderStatus(id, status) { return this.patch('/orders/' + id + '/status', { status }); },
  updateOrder(id, data)    { return this.patch('/orders/' + id, data); },
  refundOrder(id, reason)  { return this.post('/orders/' + id + '/refund', { reason: reason || '' }); },

  // -------------------------------------------------------
  // CUSTOMERS
  // -------------------------------------------------------
  getCustomers()           { return this.get('/customers'); },
  getCustomer(id)          { return this.get('/customers/' + id); },
  updateCustomer(id, data) { return this.patch('/customers/' + id, data); },

  // -------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------
  getCategories()          { return this.get('/categories'); },
  addCategory(data)        { return this.post('/categories', data); },
  updateCategory(id, data) { return this.patch('/categories/' + id, data); },
  deleteCategory(id)       { return this.del('/categories/' + id); },

  // -------------------------------------------------------
  // MEDIA
  // -------------------------------------------------------
  getMedia()               { return this.get('/media'); },
  updateMedia(id, data)    { return this.patch('/media/' + id, data); },
  deleteMedia(id)          { return this.del('/media/' + id); },

  // -------------------------------------------------------
  // DISCOUNTS
  // -------------------------------------------------------
  getDiscounts()       { return this.get('/discounts'); },
  addDiscount(data)    { return this.post('/discounts', data); },
  deleteDiscount(id)   { return this.del('/discounts/' + id); },

  // -------------------------------------------------------
  // DROPS
  // -------------------------------------------------------
  getDrops()          { return this.get('/drops'); },
  addDrop(data)       { return this.post('/drops', data); },
  updateDrop(id, data){ return this.patch('/drops/' + id, data); },
  deleteDrop(id)      { return this.del('/drops/' + id); },

  // -------------------------------------------------------
  // SETTINGS
  // -------------------------------------------------------
  getSettings()       { return this.get('/settings'); },
  saveSettings(data)  { return this.patch('/settings', data); },

  // -------------------------------------------------------
  // NAV AUTH RENDERING
  // -------------------------------------------------------
  renderNavAuth() {
    const session = this.getSession();
    const el = document.getElementById('navAuth');
    if (!el) return;
    if (!session) {
      el.innerHTML = `<a href="login.html" style="font-size:12px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--gray-300);transition:color var(--transition);" onmouseover="this.style.color='white'" onmouseout="this.style.color='var(--gray-300)'">Login</a>`;
    } else if (session.role === 'admin') {
      el.innerHTML = `<a href="admin.html" style="font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--accent);">Admin</a>`;
    } else {
      el.innerHTML = `<a href="account.html" style="font-size:12px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--gray-300);" onmouseover="this.style.color='white'" onmouseout="this.style.color='var(--gray-300)'">Account</a>`;
    }
  },
};
