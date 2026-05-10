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
  loadBanners();
  loadFeaturedDrop();
  loadDropsPage();
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
// DYNAMIC CONTENT — BANNERS + DROPS
// =========================================================
async function loadBanners() {
  if (!document.getElementById('announcementBar') && !document.getElementById('heroTitle')) return;
  try {
    const s = await ADHD.getSettings();
    const bar = document.getElementById('announcementBar');
    if (bar && s.announcementBar) bar.textContent = s.announcementBar;
    const eyebrow = document.getElementById('heroEyebrow');
    if (eyebrow && s.heroEyebrow) eyebrow.textContent = s.heroEyebrow;
    const title = document.getElementById('heroTitle');
    if (title && s.heroTitle) title.innerHTML = s.heroTitle;
    const sub = document.getElementById('heroSub');
    if (sub && s.heroSub) sub.textContent = s.heroSub;
  } catch (e) { /* silently fail — show fallback HTML */ }
}

async function loadFeaturedDrop() {
  const section = document.getElementById('featuredDropSection');
  const card    = document.getElementById('featuredDrop');
  if (!card) return;
  try {
    const drops = await ADHD.getDrops();
    const drop = (drops || []).find(d => d.status === 'upcoming') ||
                 (drops || []).find(d => d.status === 'active') ||
                 (drops || [])[0];

    if (!drop) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = '';

    const imgHtml = drop.images && drop.images[0]
      ? `<img src="${drop.images[0]}" style="width:100%;height:100%;object-fit:cover;" />`
      : `<span style="color:#1e1e1e;font-size:clamp(80px,14vw,180px);">${drop.title.charAt(0).toUpperCase()}</span>`;

    let statusLabel = 'Live Now';
    if (drop.status === 'upcoming' && drop.date)
      statusLabel = 'Dropping ' + new Date(drop.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    else if (drop.status === 'sold-out') statusLabel = 'Sold Out';

    card.innerHTML = `
      <div class="drop-card__img" style="background:#111;">${imgHtml}</div>
      <div class="drop-card__body">
        <span class="drop-card__season">${drop.season || ''}</span>
        <h3 class="drop-card__title">에드헤드<br />${drop.title}</h3>
        <p class="drop-card__desc">${drop.description || ''}</p>
        <span class="drop-card__status${drop.status !== 'sold-out' ? ' live' : ''}">${statusLabel}</span>
        <div style="margin-top:24px;"><a href="drops.html" class="btn btn--accent">View Drop</a></div>
      </div>
    `;
  } catch (e) {
    if (section) section.style.display = 'none';
  }
}

async function loadDropsPage() {
  const heroTitle = document.getElementById('dropsHeroTitle');
  const pastList  = document.getElementById('pastDropsList');
  if (!heroTitle && !pastList) return;

  try {
    const [drops, settings] = await Promise.all([ADHD.getDrops(), ADHD.getSettings()]);

    // Announcement bar
    const bar = document.getElementById('announcementBar');
    if (bar && settings.announcementBar) bar.textContent = settings.announcementBar;

    // Find the featured (upcoming/active) drop for the hero
    const featured = drops.find(d => d.status === 'upcoming') ||
                     drops.find(d => d.status === 'active');

    const countdown  = document.getElementById('countdown');
    const notifyBtn  = document.getElementById('dropsHeroNotify');

    if (featured) {
      if (heroTitle) heroTitle.innerHTML = `에드헤드<br />${featured.title}`;
      const sub = document.getElementById('dropsHeroSub');
      if (sub && featured.description) sub.textContent = featured.description;

      if (featured.date) {
        _countdownTarget = new Date(featured.date);
        if (countdown) countdown.style.display = '';
        if (notifyBtn)  notifyBtn.style.display  = '';
      }

      const heroImg = document.getElementById('dropsHeroImg');
      if (heroImg) {
        heroImg.innerHTML = featured.images && featured.images[0]
          ? `<img src="${featured.images[0]}" alt="${featured.title}" />`
          : '<div class="drops-hero__bg-text">DROPS</div>';
      }

      const marquee = document.getElementById('marqueeTrack');
      if (marquee) {
        const dateStr = featured.date
          ? new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : 'Coming Soon';
        const chunk = `
          <span>${featured.season || 'Limited Edition'}</span><span class="accent">${featured.title}</span>
          <span>${dateStr}</span><span class="accent">·</span>
          <span>Limited Units</span><span class="accent">·</span>
          <span>ADHD</span><span class="accent">에드헤드</span>
          <span>·</span>`;
        marquee.innerHTML = chunk + chunk;
      }
    } else {
      if (countdown) countdown.style.display = 'none';
      if (notifyBtn)  notifyBtn.style.display  = 'none';
    }

    // Render past drops (all non-featured)
    if (pastList) {
      const past = drops.filter(d => d !== featured);
      if (!past.length) { pastList.innerHTML = ''; return; }
      pastList.innerHTML = past.map((d, i) => {
        const imgHtml = d.images && d.images[0]
          ? `<img src="${d.images[0]}" style="width:100%;height:100%;object-fit:cover;" />`
          : `<span style="color:#1e1e1e;font-size:clamp(60px,10vw,140px);">${d.title.charAt(0).toUpperCase()}</span>`;
        const reversed = i % 2 === 1;
        return `
          <div style="margin-bottom:2px;">
            <div class="drop-card container" style="max-width:1440px;padding:0 40px;">
              ${reversed ? `
                <div class="drop-card__body" style="order:0;">
                  <span class="drop-card__season">${d.season || ''}</span>
                  <h3 class="drop-card__title">에드헤드<br />${d.title}</h3>
                  <p class="drop-card__desc">${d.description || ''}</p>
                  <span class="drop-card__status">${d.status === 'sold-out' ? 'Sold Out' : d.status}</span>
                </div>
                <div class="drop-card__img" style="background:#0f0f0f;">${imgHtml}</div>
              ` : `
                <div class="drop-card__img" style="background:#111;">${imgHtml}</div>
                <div class="drop-card__body">
                  <span class="drop-card__season">${d.season || ''}</span>
                  <h3 class="drop-card__title">에드헤드<br />${d.title}</h3>
                  <p class="drop-card__desc">${d.description || ''}</p>
                  <span class="drop-card__status">${d.status === 'sold-out' ? 'Sold Out' : d.status}</span>
                  ${d.status !== 'sold-out' ? `<div style="margin-top:20px;"><a href="shop.html" class="btn btn--outline" style="font-size:10px;padding:10px 20px;">View Stock</a></div>` : ''}
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (e) { /* silently fail — keep fallback */ }
}

// Poll drops page every 15 seconds so admin edits appear without a manual refresh
if (document.getElementById('pastDropsList')) {
  setInterval(loadDropsPage, 15000);
}

// =========================================================
// COUNTDOWN TIMER
// =========================================================
let _countdownTarget = null;

function initCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;

  // Default: 7 days from now (overridden by loadDropsPage when a drop date exists)
  _countdownTarget = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  function tick() {
    const diff = _countdownTarget - Date.now();
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
