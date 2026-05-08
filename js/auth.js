/* =========================================================
   ADHD (에드헤드) — Auth & Data Layer
   All data persisted in localStorage (no backend required)
   ========================================================= */

const ADHD = {

  // -------------------------------------------------------
  // PRODUCTS (seeded defaults, editable via admin)
  // -------------------------------------------------------
  defaultProducts: [
    { id: 'p1',  name: 'Hyperfocus Oversized Tee',     sub: '에드헤드 — Vol. 3', price: 65,  category: 'tops',        badge: 'New',       stock: 24, image: '에' },
    { id: 'p2',  name: 'Divergent Bomber Jacket',       sub: '에드헤드 — Vol. 3', price: 295, category: 'outerwear',   badge: 'New',       stock: 8,  image: 'AD' },
    { id: 'p3',  name: 'Focus Mode Cargo Pants',        sub: '에드헤드 — Vol. 2', price: 185, category: 'bottoms',     badge: '',          stock: 15, image: 'HD' },
    { id: 'p4',  name: '에드헤드 6-Panel Cap',           sub: '에드헤드 — Accessories', price: 55, category: 'accessories', badge: 'New',  stock: 40, image: '드' },
    { id: 'p5',  name: 'Scattered Thoughts Hoodie',     sub: '에드헤드 — Vol. 2', price: 145, category: 'tops',        badge: '',          stock: 11, image: '헤' },
    { id: 'p6',  name: 'Dopamine Crewneck',             sub: '에드헤드 — Vol. 1', price: 125, category: 'tops',        badge: '',          stock: 6,  image: '드' },
    { id: 'p7',  name: 'Signal Tote Bag',               sub: '에드헤드 — Accessories', price: 45, category: 'accessories', badge: '',     stock: 33, image: 'AD' },
    { id: 'p8',  name: 'Impulse Control Shorts',        sub: '에드헤드 — Vol. 2', price: 95,  category: 'bottoms',     badge: 'Low Stock', stock: 3,  image: 'HD' },
    { id: 'p9',  name: 'Attention Span Coach Jacket',   sub: '에드헤드 — Vol. 2', price: 245, category: 'outerwear',   badge: '',          stock: 9,  image: '에' },
    { id: 'p10', name: 'Intrusive Thoughts L/S Tee',    sub: '에드헤드 — Vol. 1', price: 75,  category: 'tops',        badge: '',          stock: 18, image: '드' },
    { id: 'p11', name: 'Frequency Beanie',              sub: '에드헤드 — Accessories', price: 38, category: 'accessories', badge: '',     stock: 27, image: 'HD' },
    { id: 'p12', name: 'Restless Legs Track Pants',     sub: '에드헤드 — Vol. 3', price: 135, category: 'bottoms',     badge: 'New',       stock: 20, image: '에' },
  ],

  getProducts() {
    const stored = localStorage.getItem('adhd_products');
    if (!stored) {
      localStorage.setItem('adhd_products', JSON.stringify(this.defaultProducts));
      return this.defaultProducts;
    }
    return JSON.parse(stored);
  },

  saveProducts(products) {
    localStorage.setItem('adhd_products', JSON.stringify(products));
  },

  addProduct(product) {
    const products = this.getProducts();
    product.id = 'p' + Date.now();
    products.unshift(product);
    this.saveProducts(products);
    return product;
  },

  updateProduct(id, updates) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...updates };
    this.saveProducts(products);
    return products[idx];
  },

  deleteProduct(id) {
    const products = this.getProducts().filter(p => p.id !== id);
    this.saveProducts(products);
  },

  // -------------------------------------------------------
  // ORDERS (mock seed + real cart orders)
  // -------------------------------------------------------
  defaultOrders: [
    { id: 'ORD-1001', customer: 'Jay Kim',       email: 'jay@email.com',    date: '2026-05-07', total: 210, status: 'Delivered', items: ['Hyperfocus Oversized Tee', 'Frequency Beanie'] },
    { id: 'ORD-1002', customer: 'Mia Park',      email: 'mia@email.com',    date: '2026-05-06', total: 295, status: 'Shipped',   items: ['Divergent Bomber Jacket'] },
    { id: 'ORD-1003', customer: 'Alex Seo',      email: 'alex@email.com',   date: '2026-05-05', total: 330, status: 'Processing',items: ['Focus Mode Cargo Pants', 'Signal Tote Bag'] },
    { id: 'ORD-1004', customer: 'Dana Cho',      email: 'dana@email.com',   date: '2026-05-04', total: 145, status: 'Delivered', items: ['Scattered Thoughts Hoodie'] },
    { id: 'ORD-1005', customer: 'Sam Yoon',      email: 'sam@email.com',    date: '2026-05-03', total: 95,  status: 'Refunded',  items: ['Impulse Control Shorts'] },
  ],

  getOrders() {
    const stored = localStorage.getItem('adhd_orders');
    if (!stored) {
      localStorage.setItem('adhd_orders', JSON.stringify(this.defaultOrders));
      return this.defaultOrders;
    }
    return JSON.parse(stored);
  },

  updateOrderStatus(id, status) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return;
    orders[idx].status = status;
    localStorage.setItem('adhd_orders', JSON.stringify(orders));
  },

  // -------------------------------------------------------
  // CUSTOMERS
  // -------------------------------------------------------
  getCustomers() {
    const stored = localStorage.getItem('adhd_customers');
    if (!stored) return [];
    return JSON.parse(stored);
  },

  // -------------------------------------------------------
  // DISCOUNTS
  // -------------------------------------------------------
  getDiscounts() {
    const stored = localStorage.getItem('adhd_discounts');
    if (!stored) return [];
    return JSON.parse(stored);
  },

  addDiscount(discount) {
    const discounts = this.getDiscounts();
    discount.id = 'DC' + Date.now();
    discounts.unshift(discount);
    localStorage.setItem('adhd_discounts', JSON.stringify(discounts));
    return discount;
  },

  deleteDiscount(id) {
    const discounts = this.getDiscounts().filter(d => d.id !== id);
    localStorage.setItem('adhd_discounts', JSON.stringify(discounts));
  },

  // -------------------------------------------------------
  // SITE SETTINGS
  // -------------------------------------------------------
  getSettings() {
    const defaults = {
      announcementBar: 'Free shipping on orders over $150 · New Drop: 에드헤드 Vol. 3 — June 7',
      heroTitle: 'Wear Your Frequency.',
      heroSub: 'Built for the divergent mind. ADHD is a lifestyle brand for those who think sideways, move fast, and feel everything at full volume.',
      heroCta: 'Shop Now',
    };
    const stored = localStorage.getItem('adhd_settings');
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  },

  saveSettings(settings) {
    localStorage.setItem('adhd_settings', JSON.stringify(settings));
  },

  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------
  ADMIN_EMAIL: 'admin@adhd-brand.com',
  ADMIN_PASS:  'adhd2026',

  register(name, email, password) {
    const customers = this.getCustomers();
    if (customers.find(c => c.email === email)) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    const customer = {
      id: 'C' + Date.now(),
      name,
      email,
      password,
      joined: new Date().toISOString().split('T')[0],
      orders: [],
    };
    customers.push(customer);
    localStorage.setItem('adhd_customers', JSON.stringify(customers));
    this.setSession({ type: 'customer', ...customer });
    return { ok: true, user: customer };
  },

  login(email, password) {
    if (email === this.ADMIN_EMAIL && password === this.ADMIN_PASS) {
      this.setSession({ type: 'admin', name: 'Admin', email });
      return { ok: true, type: 'admin' };
    }
    const customers = this.getCustomers();
    const user = customers.find(c => c.email === email && c.password === password);
    if (user) {
      this.setSession({ type: 'customer', ...user });
      return { ok: true, type: 'customer', user };
    }
    return { ok: false, error: 'Invalid email or password.' };
  },

  setSession(data) {
    sessionStorage.setItem('adhd_session', JSON.stringify(data));
  },

  getSession() {
    const s = sessionStorage.getItem('adhd_session');
    return s ? JSON.parse(s) : null;
  },

  logout() {
    sessionStorage.removeItem('adhd_session');
    window.location.href = 'index.html';
  },

  requireAuth(role) {
    const session = this.getSession();
    if (!session) { window.location.href = 'login.html'; return null; }
    if (role === 'admin' && session.type !== 'admin') { window.location.href = 'index.html'; return null; }
    return session;
  },

  // -------------------------------------------------------
  // NAV HELPERS
  // -------------------------------------------------------
  renderNavAuth() {
    const session = this.getSession();
    const el = document.getElementById('navAuth');
    if (!el) return;
    if (!session) {
      el.innerHTML = `<a href="login.html" style="font-size:12px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--gray-300);transition:color var(--transition);" onmouseover="this.style.color='white'" onmouseout="this.style.color='var(--gray-300)'">Login</a>`;
    } else if (session.type === 'admin') {
      el.innerHTML = `<a href="admin.html" style="font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--accent);">Admin</a>`;
    } else {
      el.innerHTML = `<a href="account.html" style="font-size:12px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--gray-300);" onmouseover="this.style.color='white'" onmouseout="this.style.color='var(--gray-300)'">Account</a>`;
    }
  },
};
