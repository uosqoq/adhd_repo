/* =========================================================
   ADHD (에드헤드) — Main JS
   ========================================================= */

// --- Cart state ---
let cartCount = 0;

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCart();
  initShopFilters();
  initCountdown();
  initPageFade();
});

// =========================================================
// NAV
// =========================================================
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  const mobileClose = document.getElementById('mobileNavClose');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (mobileClose && mobileNav) {
    mobileClose.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  // Highlight active nav link
  const links = document.querySelectorAll('.nav__links a, .mobile-nav a');
  const path = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// =========================================================
// CART DRAWER
// =========================================================
function initCart() {
  const cartBtn = document.getElementById('cartBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartClose = document.getElementById('cartClose');

  function openCart() {
    cartOverlay?.classList.add('open');
    cartDrawer?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartOverlay?.classList.remove('open');
    cartDrawer?.classList.remove('open');
    document.body.style.overflow = '';
  }

  cartBtn?.addEventListener('click', openCart);
  cartOverlay?.addEventListener('click', closeCart);
  cartClose?.addEventListener('click', closeCart);

  // Add-to-cart buttons
  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      cartCount++;
      const countEl = document.getElementById('cartCount');
      if (countEl) countEl.textContent = cartCount;
      openCart();
    });
  });
}

// =========================================================
// SHOP FILTERS
// =========================================================
function initShopFilters() {
  const filters = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.product-card[data-category]');

  if (!filters.length) return;

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.dataset.filter;

      cards.forEach(card => {
        if (cat === 'all' || card.dataset.category === cat) {
          card.style.display = '';
          card.style.animation = 'pageFade 0.3s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// =========================================================
// COUNTDOWN TIMER
// =========================================================
function initCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  // Next drop: set to 7 days from now
  const target = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      el.innerHTML = '<span style="color:var(--accent);font-family:var(--font-display);font-size:20px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Live Now</span>';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    el.innerHTML = `
      <div class="countdown__unit"><span class="countdown__num">${String(d).padStart(2,'0')}</span><span class="countdown__label">Days</span></div>
      <span class="countdown__sep">:</span>
      <div class="countdown__unit"><span class="countdown__num">${String(h).padStart(2,'0')}</span><span class="countdown__label">Hours</span></div>
      <span class="countdown__sep">:</span>
      <div class="countdown__unit"><span class="countdown__num">${String(m).padStart(2,'0')}</span><span class="countdown__label">Mins</span></div>
      <span class="countdown__sep">:</span>
      <div class="countdown__unit"><span class="countdown__num">${String(s).padStart(2,'0')}</span><span class="countdown__label">Secs</span></div>
    `;
  }

  tick();
  setInterval(tick, 1000);
}

// =========================================================
// PAGE FADE
// =========================================================
function initPageFade() {
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http')) return;

    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.2s ease';
      setTimeout(() => { window.location.href = href; }, 200);
    });
  });

  document.body.style.opacity = '1';
  document.body.style.transition = 'opacity 0.3s ease';
}
