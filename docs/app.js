// ─────────────────────────────────────────────
//  Sitecore Changelog Reels
//  "Turn Doom Scrolling Into Value"
// ─────────────────────────────────────────────

const FEED_URL = './changelog.json';

// ── State ─────────────────────────────────────
const state = {
  currentId:    null,
  currentItem:  null,
  currentIndex: 0,
  activeFilter: 'all',
};

let changelog     = [];
let bookmarks     = JSON.parse(localStorage.getItem('sc-bookmarks') || '{}');
let toastTimer    = null;
let hintDismissed = false;

// ── Theme ─────────────────────────────────────
const THEME_KEY = 'sc-theme';

function initTheme() {
  // Already set by inline script in <head> — this is the JS-side source of truth
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.dataset.theme = saved;
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
}

// Run immediately so theme is set before any rendering
initTheme();

// ── DOM refs ──────────────────────────────────
const $  = id => document.getElementById(id);
const feedEl        = $('feed');
const skeletonEl    = $('skeleton');
const fabsEl        = $('floatingButtons');
const bookmarkBtn   = $('bookmarkBtn');
const shareBtn      = $('shareBtn');
const openBtn       = $('openLinkBtn');
const toastEl       = $('toast');
const progressEl    = $('progress-bar');
const counterEl     = $('card-counter');
const filterNav     = $('product-filter');      // topbar (mobile)
const sidebarFilter = $('sidebar-filter');      // sidebar (desktop)
const themeToggleBtn = $('themeToggle');

// ─────────────────────────────────────────────
//  Text cleaning
// ─────────────────────────────────────────────
function clean(str) {
  if (!str) return '';
  return str
    .replace(/^\d+\.\s+/, '')
    .replace(/^\*\*Summary\*\*:?\s*/i, '')
    .replace(/^\*\*Why it matters\*\*:?\s*/i, '')
    .replace(/^Summary:\s*/i, '')
    .replace(/^Why it matters:\s*/i, '')
    .trim();
}

// ─────────────────────────────────────────────
//  Product info (from link URL slug)
// ─────────────────────────────────────────────
const PRODUCTS = {
  'sitecoreai':  'SitecoreAI',
  'content-hub': 'Content Hub',
  'marketplace': 'Marketplace',
  'ordercloud':  'OrderCloud',
  'xm-cloud':    'XM Cloud',
  'xp':          'Sitecore XP',
};

function getProduct(link) {
  if (!link) return { slug: 'sitecore', label: 'Sitecore' };
  const m = link.match(/\/changelog\/([^\/\?#\s]+)/);
  if (!m) return { slug: 'sitecore', label: 'Sitecore' };
  const slug = m[1].toLowerCase().replace(/%[0-9a-f]{2}/gi, '').trim();
  return { slug, label: PRODUCTS[slug] || 'Sitecore' };
}

// ─────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────
function isNew(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff >= 0 && diff < 7 * 86400000;
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function makeId(item) {
  if (!item.link) return encodeURIComponent(item.title || '');
  const parts = item.link.trim().replace(/%0a/gi, '').split('/');
  return parts[parts.length - 1] || encodeURIComponent(item.title || '');
}

// ─────────────────────────────────────────────
//  Toast
// ─────────────────────────────────────────────
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// ─────────────────────────────────────────────
//  Progress + counter
// ─────────────────────────────────────────────
function setProgress(index, total) {
  progressEl.style.width = (total < 2 ? 100 : (index / (total - 1)) * 100) + '%';
}

function setCounter(n, total) {
  counterEl.textContent = `${n} / ${total}`;
}

// ─────────────────────────────────────────────
//  Bookmark helpers
// ─────────────────────────────────────────────
function isSaved(id) { return !!bookmarks[id]; }

function syncBookmarkBtn() {
  bookmarkBtn.classList.toggle('saved', isSaved(state.currentId));
}

// Sync inline card-act bookmark button for a given card
function syncCardActBookmark(id) {
  const btn = feedEl.querySelector(`.card-act[data-action="bookmark"][data-id="${CSS.escape(id)}"]`);
  if (btn) btn.classList.toggle('act-saved', isSaved(id));
}

// ─────────────────────────────────────────────
//  Scroll hint
// ─────────────────────────────────────────────
function dismissHint() {
  if (hintDismissed) return;
  hintDismissed = true;
  document.querySelector('.scroll-hint')?.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  Action handlers (shared by FABs + card actions)
// ─────────────────────────────────────────────
function handleBookmark(item, id) {
  bookmarks[id] = !bookmarks[id];
  localStorage.setItem('sc-bookmarks', JSON.stringify(bookmarks));
  syncBookmarkBtn();
  syncCardActBookmark(id);
  toast(bookmarks[id] ? 'Saved' : 'Removed');
}

async function handleShare(item) {
  const link = item?.link?.trim();
  if (!link) return;
  if (navigator.share) {
    try { await navigator.share({ title: item.title, url: link }); return; }
    catch { /* dismissed */ }
  }
  try {
    await navigator.clipboard.writeText(link);
    toast('Link copied');
  } catch { toast('Copy failed'); }
}

function handleOpen(item) {
  const link = item?.link?.trim();
  if (link) window.open(link, '_blank', 'noopener');
}

// ─────────────────────────────────────────────
//  SVG icons (shared between FABs and card actions)
// ─────────────────────────────────────────────
const SVG = {
  heart: `<svg class="act-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  share: `<svg class="act-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
  open:  `<svg class="act-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
};

// ─────────────────────────────────────────────
//  Build one card
// ─────────────────────────────────────────────
function buildCard(item, index, total) {
  const id      = makeId(item);
  const product = getProduct(item.link);
  const hasImg  = !!(item.enclosure && item.enclosure.trim());
  const summary = clean(item.summary);
  const impact  = clean(item.impact);
  const novel   = isNew(item.date);

  const card = document.createElement('div');
  card.className     = 'card';
  card.dataset.id    = id;
  card.dataset.index = index;
  card.dataset.total = total;

  // ── Visual ────────────────────────────────
  const visual = document.createElement('div');
  visual.className = 'card-visual';

  if (hasImg) {
    const img  = document.createElement('img');
    img.src     = item.enclosure.trim();
    img.alt     = item.title || '';
    img.loading = 'lazy';
    visual.appendChild(img);
  } else {
    const lbl = document.createElement('div');
    lbl.className   = 'card-visual-label';
    lbl.textContent = product.label;
    visual.appendChild(lbl);
  }

  // ── Body ──────────────────────────────────
  const body = document.createElement('div');
  body.className = 'card-body';

  // Meta row
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.innerHTML = `
    <span class="product-badge">${product.label}</span>
    ${novel ? '<span class="new-chip">New</span>' : ''}
    <span class="card-date">${fmtDate(item.date)}</span>
  `;

  // Title
  const title = document.createElement('h2');
  title.className   = 'card-title';
  title.textContent = item.title || '';

  // AI Summary
  const sumBlock = document.createElement('div');
  sumBlock.className = 'info-block';
  sumBlock.innerHTML = `
    <span class="info-tag">AI Summary</span>
    <p class="info-text">${summary || '—'}</p>
  `;

  // Why it matters
  const impBlock = document.createElement('div');
  impBlock.className = 'info-block';
  impBlock.innerHTML = `
    <span class="info-tag impact">Why it matters</span>
    <p class="info-text">${impact || '—'}</p>
  `;

  // Inline actions (visible only on desktop via CSS)
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  actions.innerHTML = `
    <button class="card-act ${isSaved(id) ? 'act-saved' : ''}" data-action="bookmark" data-id="${id}">
      ${SVG.heart}<span>Save</span>
    </button>
    <button class="card-act" data-action="share" data-id="${id}">
      ${SVG.share}<span>Share</span>
    </button>
    <button class="card-act" data-action="open" data-id="${id}">
      ${SVG.open}<span>Read more</span>
    </button>
  `;

  body.appendChild(meta);
  body.appendChild(title);
  body.appendChild(sumBlock);
  body.appendChild(impBlock);
  body.appendChild(actions);

  // Scroll hint (first card, mobile only)
  if (index === 0) {
    const hint = document.createElement('div');
    hint.className = 'scroll-hint';
    hint.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <polyline points="19 12 12 19 5 12"/>
      </svg>
      Scroll to explore
    `;
    body.appendChild(hint);
  }

  card.appendChild(visual);
  card.appendChild(body);
  return card;
}

// ─────────────────────────────────────────────
//  Intersection Observer
// ─────────────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const card  = e.target;
    const index = +card.dataset.index;
    const total = +card.dataset.total;
    const id    = card.dataset.id;

    state.currentId    = id;
    state.currentIndex = index;
    state.currentItem  = changelog.find(c => makeId(c) === id) || null;

    setProgress(index, total);
    setCounter(index + 1, total);
    syncBookmarkBtn();
    if (index > 0) dismissHint();
  }
}, { threshold: 0.55 });

// ─────────────────────────────────────────────
//  Render
// ─────────────────────────────────────────────
function render(data) {
  observer.disconnect();
  feedEl.innerHTML = '';

  const items = state.activeFilter === 'all'
    ? data
    : data.filter(item => getProduct(item.link).slug === state.activeFilter);

  if (!items.length) {
    feedEl.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">No results</p>
        <p>No updates found for this filter.</p>
      </div>`;
    hideSkeleton();
    feedEl.hidden = false;
    return;
  }

  const total = items.length;
  for (let i = 0; i < total; i++) {
    const card = buildCard(items[i], i, total);
    feedEl.appendChild(card);
    observer.observe(card);
  }

  setCounter(1, total);
  setProgress(0, total);
  hideSkeleton();
  feedEl.hidden  = false;
  fabsEl.hidden  = false;
}

function showSkeleton() { skeletonEl.hidden = false; }
function hideSkeleton()  { skeletonEl.hidden = true; }

// ─────────────────────────────────────────────
//  Filter pill builders
// ─────────────────────────────────────────────
function buildFilterPills(data) {
  // Count items per slug
  const counts = { all: data.length };
  const slugMap = new Map();

  for (const item of data) {
    const p = getProduct(item.link);
    counts[p.slug] = (counts[p.slug] || 0) + 1;
    if (!slugMap.has(p.slug)) slugMap.set(p.slug, p.label);
  }

  // ── Topbar (mobile) pills ──────────────────
  filterNav.querySelector('[data-product="all"]')
    ?.addEventListener('click', () => activateFilter('all'));

  for (const [slug, label] of slugMap) {
    const btn = document.createElement('button');
    btn.className       = 'filter-pill';
    btn.dataset.product = slug;
    btn.textContent     = label;
    btn.addEventListener('click', () => activateFilter(slug));
    filterNav.appendChild(btn);
  }

  // ── Sidebar (desktop) items ────────────────
  if (!sidebarFilter) return;

  const allBtn = makeSidebarItem('all', 'All', data.length, true);
  sidebarFilter.appendChild(allBtn);

  for (const [slug, label] of slugMap) {
    const btn = makeSidebarItem(slug, label, counts[slug] || 0, false);
    sidebarFilter.appendChild(btn);
  }
}

function makeSidebarItem(slug, label, count, isActive) {
  const btn = document.createElement('button');
  btn.className       = `sb-item${isActive ? ' active' : ''}`;
  btn.dataset.product = slug;
  btn.innerHTML = `
    <span>${label}</span>
    <span class="sb-count">${count}</span>
  `;
  btn.addEventListener('click', () => activateFilter(slug));
  return btn;
}

// ─────────────────────────────────────────────
//  Activate a filter — syncs both navs
// ─────────────────────────────────────────────
function activateFilter(slug) {
  state.activeFilter = slug;

  // Sync topbar pills
  filterNav.querySelectorAll('.filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.product === slug);
  });

  // Sync sidebar items
  sidebarFilter?.querySelectorAll('.sb-item').forEach(p => {
    p.classList.toggle('active', p.dataset.product === slug);
  });

  observer.disconnect();
  render(changelog);
}

// ─────────────────────────────────────────────
//  Theme toggle
// ─────────────────────────────────────────────
themeToggleBtn.addEventListener('click', toggleTheme);

// ─────────────────────────────────────────────
//  Mobile floating button events
// ─────────────────────────────────────────────
bookmarkBtn.addEventListener('click', () => {
  if (!state.currentItem) return;
  handleBookmark(state.currentItem, state.currentId);
});

shareBtn.addEventListener('click', () => handleShare(state.currentItem));
openBtn.addEventListener('click',  () => handleOpen(state.currentItem));

// ─────────────────────────────────────────────
//  Desktop inline card action events (delegation)
// ─────────────────────────────────────────────
feedEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const id   = btn.dataset.id;
  const item = changelog.find(c => makeId(c) === id);
  if (!item) return;

  const action = btn.dataset.action;
  if (action === 'bookmark') handleBookmark(item, id);
  if (action === 'share')    handleShare(item);
  if (action === 'open')     handleOpen(item);
});

// ─────────────────────────────────────────────
//  Keyboard navigation ↑ ↓
// ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    snapTo(state.currentIndex + 1);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    snapTo(state.currentIndex - 1);
  }
});

function snapTo(index) {
  feedEl.querySelectorAll('.card')[index]?.scrollIntoView({ behavior: 'smooth' });
}

feedEl.addEventListener('scroll', dismissHint, { once: true, passive: true });

// ─────────────────────────────────────────────
//  Init
// ─────────────────────────────────────────────
async function init() {
  showSkeleton();
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(res.status);
    changelog = await res.json();
    buildFilterPills(changelog);
    render(changelog);
  } catch (err) {
    console.error('Failed to load changelog:', err);
    hideSkeleton();
    skeletonEl.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">Could not load changelog</p>
        <p>Check your connection and try again.</p>
      </div>`;
    skeletonEl.hidden = false;
  }
}

init();
