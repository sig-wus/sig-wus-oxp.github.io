// main.js — SIG-WUS X-change catalog renderer
// Loads platforms/index.json, then each platforms/<id>/index.json.
import Fuse from './vendor/fuse.min.mjs';

const CATALOG_INDEX = 'platforms/index.json';


const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.36,
  ignoreLocation: true,
  keys: [
    { name: 'platform', weight: 0.35 },
    { name: 'manufacturer', weight: 0.2 },
    { name: 'application', weight: 0.15 },
    { name: 'category', weight: 0.1 },
    { name: 'description', weight: 0.1 },
    { name: 'access', weight: 0.05 },
    { name: 'transducer.config', weight: 0.05 },
  ],
};

const STATE = {
  platforms: [],
  filtered: [],
  fuse: null,
};

const $ = (id) => document.getElementById(id);

const els = {
  results: $('results'),
  emptyState: $('emptyState'),
  errorState: $('errorState'),
  errorDetail: $('errorDetail'),
  resultCount: $('resultCount'),
  statTotal: $('statTotal'),
  statHw: $('statHw'),
  statSw: $('statSw'),
  statBuy: $('statBuy'),
  searchInput: $('searchInput'),
  clearSearch: $('clearSearch'),
  resetFilters: $('resetFilters'),
  resetEmpty: $('resetEmpty'),
  hwOpenFilter: $('hwOpenFilter'),
  swOpenFilter: $('swOpenFilter'),
  buyableFilter: $('buyableFilter'),
  typeFilter: $('typeFilter'),
  timeline: $('timeline'),
  categoryFilter: $('categoryFilter'),
  manufacturerFilter: $('manufacturerFilter'),
  accessFilter: $('accessFilter'),
  yearFilter: $('yearFilter'),
  sortBy: $('sortBy'),
  detailDialog: $('detailDialog'),
  dialogBody: $('dialogBody'),
  closeDialog: $('closeDialog'),
};

// -- helpers ---------------------------------------------------------------

function uniq(arr) {
  return [...new Set(arr.filter((v) => v !== undefined && v !== null && v !== ''))].sort();
}

const ACCESS_ORDER = ['open-source', 'commercial', 'research', 'partial'];
const ACCESS_LABELS_SORTED = {
  'open-source': 'Open source',
  'commercial':  'Commercial',
  'research':    'Research only',
  'partial':     'Partial',
};

function sortValues(key, values) {
  if (key === 'access') {
    // Show in canonical order (open-source → commercial → research → partial)
    const present = new Set(values);
    return ACCESS_ORDER.filter((k) => present.has(k));
  }
  if (key === 'manufacturer') {
    // Alphabetical, case-insensitive
    return [...values].sort((a, b) => a.localeCompare(b));
  }
  if (key === 'category') {
    const order = [
      'Pulse-echo non-imaging',
      'Pulse-echo imaging',
      'Non-pulse-echo (continuous wave Doppler)',
      'Other',
    ];
    const present = new Set(values);
    return order.filter((k) => present.has(k));
  }
  // Default alphabetical
  return [...values].sort((a, b) => String(a).localeCompare(String(b)));
}

function populateSelect(select, values, placeholder, sortKey) {
  select.innerHTML = '';
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = placeholder;
  select.appendChild(ph);
  const ordered = sortKey ? sortValues(sortKey, values) : values;
  for (const v of ordered) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = sortKey === 'access' && ACCESS_LABELS_SORTED[v]
      ? ACCESS_LABELS_SORTED[v]
      : v;
    select.appendChild(opt);
  }
}

function formatSpec(value) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function powerWatts(p) {
  const spec = p.specs?.power;
  if (!spec || spec === 'n/a') return Infinity;
  const m = String(spec).match(/([\d.]+)\s*(m?W|watts?|milliwatts?)?/i);
  if (!m) return Infinity;
  const num = parseFloat(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit.startsWith('mw') || unit.startsWith('milli')) return num / 1000;
  return num;
}

function weightGrams(p) {
  const spec = p.specs?.weight;
  if (!spec || spec === 'n/a') return Infinity;
  const m = String(spec).match(/([\d.]+)\s*(g|gram|grams)?/i);
  if (!m) return Infinity;
  return parseFloat(m[1]);
}

const ACCESS_LABELS = {
  'open-source': 'Open source',
  'commercial': 'Commercial',
  'research': 'Research only',
  'partial': 'Partial',
};

function accessLabel(a) {
  return ACCESS_LABELS[a] || (a ? a.charAt(0).toUpperCase() + a.slice(1) : 'Unknown');
}

function accessClass(a) {
  return { 'open-source': '', 'commercial': 'commercial', 'research': 'research', 'partial': 'partial' }[a] || '';
}

function isOpenSource(p) {
  return p.availability?.hw?.open_source === true || p.availability?.sw?.open_source === true;
}



// -- render ----------------------------------------------------------------

function escapeHTML(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function mediaHTML(p) {
  const src = p.image ? encodeURI(p.image) : '';
  if (!src) return '';
  const ext = src.split('.').pop().toLowerCase();
  if (ext === 'svg') {
    return `<object data="${src}" type="image/svg+xml" aria-label="${escapeHTML(p.platform)} illustration" tabindex="-1"></object>`;
  }
  return `<img src="${src}" alt="${escapeHTML(p.platform)}" loading="lazy" decoding="async" />`;
}

function renderCard(p) {
  const badges = [];
  if (isOpenSource(p)) badges.push('<span class="badge badge-os">Open source</span>');
  if (p.category) badges.push(`<span class="badge badge-cat">${escapeHTML(p.category)}</span>`);

  // Source availability badges (compact, on the card)
  const av = p.availability || {};
  const srcBadges = [];
  const hwSrc = av.hw?.open_source;
  const swSrc = av.sw?.open_source;
  if (hwSrc === true) srcBadges.push('<span class="badge badge-hw" title="Hardware design open">HW open</span>');
  else if (hwSrc === false) srcBadges.push('<span class="badge badge-hw-closed" title="Hardware closed">HW closed</span>');
  const buyable = av.purchase?.available;
  if (buyable === true) srcBadges.push('<span class="badge badge-buy" title="Available for purchase">Buyable</span>');
  else srcBadges.push('<span class="badge badge-build" title="Build it yourself">Self-build</span>');
  badges.push(...srcBadges);

  const specs = [
    { l: 'Channels', v: formatSpec(p.transducer?.channels) },
    { l: 'Frequency', v: formatSpec(p.frequency) },
    { l: 'Power', v: formatSpec(p.specs?.power) },
    { l: 'Weight', v: formatSpec(p.specs?.weight) },
    { l: 'Size', v: formatSpec(p.specs?.size) },
    { l: 'Battery', v: formatSpec(p.specs?.operation) },
  ]
    .filter((s) => s.v !== '—')
    .slice(0, 4);

  const specsHTML = specs
    .map(
      (s) => `
      <div class="spec">
        <span class="spec-label">${s.l}</span>
        <span class="spec-value">${escapeHTML(s.v)}</span>
      </div>`,
    )
    .join('');

  // Compact price preview line
  const priceHTML = renderPricePreview(av.purchase);

  const tagClass = accessClass(p.access);
  const accessTag = p.access
    ? `<span class="tag tag-access ${tagClass}" title="${escapeHTML(p.access_detail || '')}">${escapeHTML(accessLabel(p.access))}</span>`
    : '';

  const linksHTML = `
    <div class="card-actions">
      <button type="button" class="card-link" data-detail="${escapeHTML(p.id)}">Details</button>
      ${p.paper ? `<a class="card-link ghost" href="${escapeHTML(p.paper)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Paper ↗</a>` : ''}
    </div>`;

  return `
    <article class="card" data-id="${escapeHTML(p.id)}" tabindex="0">
      <div class="card-media">
        <div class="card-badges">${badges.join('')}</div>
        ${mediaHTML(p)}
      </div>
      <div class="card-body">
        <div>
          <div class="card-title-row">
            <h3 class="card-title">${escapeHTML(p.platform)}</h3>
            ${p.year ? `<span class="card-year">${p.year}</span>` : ''}
          </div>
          <div class="card-mfr">${escapeHTML(p.manufacturer || '')}</div>
          ${p.affiliation && p.affiliation !== p.manufacturer
            ? `<div class="card-aff">${escapeHTML(p.affiliation)}</div>`
            : ''}
        </div>
        <dl class="specs">${specsHTML}</dl>
        ${priceHTML}
        <p class="card-desc">${escapeHTML(p.description || p.application || '')}</p>
        <div class="card-tags">${accessTag}<span class="tag">${escapeHTML(p.application || '')}</span></div>
      </div>
      ${linksHTML}
    </article>`;
}

function renderPricePreview(p) {
  if (!p) return '';
  const usd = typeof p.price_usd === 'number' ? p.price_usd : null;
  const eur = typeof p.price_eur === 'number' ? p.price_eur : null;
  let amount = '';
  if (usd != null && eur != null) amount = `~$${usd} / €${eur}`;
  else if (usd != null) amount = `~$${usd}`;
  else if (eur != null) amount = `~€${eur}`;
  if (!amount && !p.available) return '';
  const cls = p.available ? 'price-buy' : 'price-build';
  const label = p.available ? 'Buyable' : 'Self-build';
  return `<div class="price-row ${cls}">
    <span class="price-label">${label}</span>
    <span class="price-amount">${amount || (p.available ? 'Quote' : '—')}</span>
  </div>`;
}

function renderImageAttribution(attr) {
  if (!attr) return '';
  const sourceLink = attr.source_url
    ? `<a href="${escapeHTML(attr.source_url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(attr.source_url)} ↗</a>`
    : '<span class="muted">Original work (no external source)</span>';
  return `
    <div style="grid-column: 1 / -1;">
      <h3>Image attribution</h3>
      <dl class="dlg-spec-table">
        <tr><th>Credit</th><td>${escapeHTML(attr.credit || '—')}</td></tr>
        <tr><th>License</th><td>${escapeHTML(attr.license || '—')}</td></tr>
        <tr><th>Source</th><td>${sourceLink}</td></tr>
        <tr><th>Retrieved</th><td>${escapeHTML(attr.retrieved || '—')}</td></tr>
      </dl>
    </div>`;
}

function statusPill(level) {
  // level: 'open' | 'partial' | 'planned' | 'closed'
  const map = {
    open:    { cls: 'pill-open',    icon: '✓', text: 'Open' },
    partial: { cls: 'pill-partial', icon: '◐', text: 'Partial' },
    planned: { cls: 'pill-planned', icon: '◷', text: 'Planned' },
    closed:  { cls: 'pill-closed',  icon: '—', text: 'Closed' },
  };
  const m = map[level] || map.closed;
  return `<span class="pill ${m.cls}" title="${m.text}">${m.icon} ${m.text}</span>`;
}

function render(list) {
  els.results.innerHTML = list.map(renderCard).join('');
  els.resultCount.textContent = list.length.toString().padStart(2, '0');
  if (list.length === 0) {
    els.emptyState.hidden = false;
    els.results.hidden = true;
  } else {
    els.emptyState.hidden = true;
    els.results.hidden = false;
  }
}

function renderCatalogStats(list) {
  const total = list.length;
  const hwOpen = list.filter((p) => p.availability?.hw?.open_source === true).length;
  const swOpen = list.filter((p) => p.availability?.sw?.open_source === true).length;
  const buyable = list.filter((p) => p.availability?.purchase?.available === true).length;

  if (els.statTotal) els.statTotal.textContent = total;
  if (els.statHw) els.statHw.textContent = hwOpen;
  if (els.statSw) els.statSw.textContent = swOpen;
  if (els.statBuy) els.statBuy.textContent = buyable;
}

// -- institution type classifier (item 8) -----------------------------------
function inferInstitutionType(p) {
  const m = (p.manufacturer || '').toLowerCase();
  const a = (p.affiliation || '').toLowerCase();
  const hay = `${m} ${a}`;
  // Vendor/commercial heuristics: names containing "Inc", "LLC", "GmbH", "SA",
  // "Medical", "AG" or known vendors.
  const commercialKeywords = ['inc', 'llc', 'gmbh', 'medical', 'sa ', ' ag', 'vermon', 'flosonics', 'tena', 'essity'];
  if (commercialKeywords.some((k) => hay.includes(k))) return 'commercial';
  // Academic heuristics: university, ETH, KIT, USC, UMN, CAS, USTB, GMU, UMD
  const academicKeywords = ['university', 'eth', 'usc', 'umn', 'cas', 'ustb', 'gmu', 'umd', 'institute'];
  if (academicKeywords.some((k) => hay.includes(k))) return 'academic';
  return 'other';
}

// -- year timeline (item 7) -----------------------------------------------
function renderTimeline(list) {
  if (!els.timeline) return;
  const byYear = new Map();
  for (const p of list) {
    if (typeof p.year !== 'number') continue;
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year).push(p);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length === 0) { els.timeline.innerHTML = ''; return; }
  const activeYear = els.yearFilter ? els.yearFilter.value : '';
  // Each point is a button: click = filter to that year, click again = clear.
  // Inline styles guarantee the flex layout applies (CSS cascade can be fragile).
  const points = years.map((y) => {
    const items = byYear.get(y);
    const active = String(y) === activeYear;
    const n = items.length;
    const dotStyle = active
      ? 'width:14px;height:14px;border-radius:50%;background:var(--primary-strong);border:3px solid var(--primary-soft);box-shadow:0 0 0 2px var(--primary-strong);'
      : 'width:14px;height:14px;border-radius:50%;background:var(--primary);border:3px solid var(--bg-elev);box-shadow:0 0 0 1px var(--primary);';
    return `<button type="button" class="tl-point" data-year="${y}" aria-pressed="${active}" ` +
      `title="${y} — ${n} platform${n === 1 ? '' : 's'}${active ? ' — click again to clear' : ''}" ` +
      `style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:48px;position:relative;z-index:1;">` +
      `<div class="tl-dot" style="${dotStyle}" aria-hidden="true"></div>` +
      `<div class="tl-year" style="font-size:12px;font-weight:700;color:${active ? 'var(--primary-strong)' : 'var(--ink)'};font-variant-numeric:tabular-nums;line-height:1;">${y}</div>` +
      `<div class="tl-count" style="font-size:10px;color:${active ? 'var(--primary-strong)' : 'var(--muted)'};font-weight:700;line-height:1;">${n}</div>` +
      `<ul class="tl-list" style="display:none;">${items.map((p) => `<li style="padding:1px 0;color:var(--ink-2);">${escapeHTML(p.platform)}</li>`).join('')}</ul>` +
      `</button>`;
  }).join('');
  els.timeline.innerHTML = `
    <div class="timeline-title" style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:800;margin-bottom:12px;">Year timeline<span class="tl-hint">click a year to filter</span></div>
    <div class="tl-track" style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;padding:0 12px;">
      <div style="content:'';position:absolute;left:12px;right:12px;top:8px;height:2px;background:var(--line);border-radius:1px;z-index:0;"></div>
      ${points}
    </div>`;
}
// -- filter & sort ---------------------------------------------------------

function applyFilters() {
  const q = els.searchInput.value.trim();
  let list = q ? STATE.fuse.search(q).map((r) => r.item) : STATE.platforms.slice();

  if (els.categoryFilter.value) list = list.filter((p) => p.category === els.categoryFilter.value);
  if (els.manufacturerFilter.value) list = list.filter((p) => p.manufacturer === els.manufacturerFilter.value);
  if (els.accessFilter.value) list = list.filter((p) => p.access === els.accessFilter.value);
  if (els.yearFilter.value) list = list.filter((p) => String(p.year) === els.yearFilter.value);
  if (els.typeFilter.value) list = list.filter((p) => inferInstitutionType(p) === els.typeFilter.value);
  if (els.hwOpenFilter.checked) list = list.filter((p) => p.availability?.hw?.open_source === true);
  if (els.swOpenFilter.checked) list = list.filter((p) => p.availability?.sw?.open_source === true);
  if (els.buyableFilter.checked) list = list.filter((p) => p.availability?.purchase?.available === true);
  if (els.timeline) renderTimeline(list);
  const mode = els.sortBy.value;
  switch (mode) {
    case 'name':
      list.sort((a, b) => a.platform.localeCompare(b.platform));
      break;
    case 'year-desc':
      list.sort((a, b) => (b.year || 0) - (a.year || 0));
      break;
    case 'year-asc':
      list.sort((a, b) => (a.year || 0) - (b.year || 0));
      break;
    case 'power-asc':
      list.sort((a, b) => powerWatts(a) - powerWatts(b));
      break;
    case 'weight-asc':
      list.sort((a, b) => weightGrams(a) - weightGrams(b));
      break;
    case 'year-desc':
    default:
      list.sort((a, b) => (b.year || 0) - (a.year || 0));
  }

  return list;
}

// -- detail dialog ---------------------------------------------------------

function openDetail(id) {
  const p = STATE.platforms.find((x) => x.id === id);
  if (!p) return;
  const txRxRows = [
    ['Channels', formatSpec(p.transducer?.channels)],
    ['Configuration', formatSpec(p.transducer?.config)],
    ['Field of view', formatSpec(p.transducer?.field_of_view)],
    ['TX voltage', formatSpec(p.tx?.voltage)],
    ['TX frequency', formatSpec(p.tx?.frequency)],
    ['TX features', formatSpec(p.tx?.feature)],
    ['RX channels', formatSpec(p.rx?.channels)],
    ['RX sample rate', formatSpec(p.rx?.sample_rate)],
    ['RX topology', formatSpec(p.rx?.topology)],
    ['Controller', formatSpec(p.controller)],
    ['Data link', formatSpec(p.data_link)],
    ['Frequency', formatSpec(p.frequency)],
    ['Depth', formatSpec(p.depth)],
    ['Resolution', formatSpec(p.resolution)],
  ];

  const specRows = [
    ['Frame rate', formatSpec(p.specs?.framerate)],
    ['Power', formatSpec(p.specs?.power)],
    ['Weight', formatSpec(p.specs?.weight)],
    ['Size', formatSpec(p.specs?.size)],
    ['Battery life', formatSpec(p.specs?.operation)],
    ['Latency', formatSpec(p.specs?.latency)],
  ];

  const renderTable = (rows) => `
    <table class="dlg-spec-table">
      <tbody>${rows
        .filter(([_, v]) => v !== '—')
        .map(([k, v]) => `<tr><th>${k}</th><td>${escapeHTML(v)}</td></tr>`)
        .join('')}</tbody>
    </table>`;

  // Availability block (HW + SW sources + purchase)
  const av = p.availability || {};
  const hw = av.hw || {};
  const sw = av.sw || {};
  const buy = av.purchase || {};
  const availabilityBlock = `
    <div style="grid-column: 1 / -1;">
      <h3>Source availability &amp; purchase</h3>
      <div class="dlg-avail">
        <div class="avail-col">
          <div class="avail-col-title">Hardware</div>
          <ul class="avail-list">
            <li><span>Schematics</span>${statusPill(hw.schematics || 'closed')}</li>
            <li><span>Gerber / PCB</span>${statusPill(hw.gerber || 'closed')}</li>
            <li><span>Bill of materials</span>${statusPill(hw.bom || 'closed')}</li>
            ${hw.license ? `<li><span>License</span><code>${escapeHTML(hw.license)}</code></li>` : ''}
            ${hw.reference ? `<li><span>Reference</span><a href="${escapeHTML(hw.reference)}" target="_blank" rel="noopener noreferrer">link ↗</a></li>` : ''}
          </ul>
        </div>
        <div class="avail-col">
          <div class="avail-col-title">Software</div>
          <ul class="avail-list">
            <li><span>Firmware</span>${statusPill(sw.firmware || 'closed')}</li>
            <li><span>Host software</span>${statusPill(sw.host_software || 'closed')}</li>
            ${sw.license ? `<li><span>License</span><code>${escapeHTML(sw.license)}</code></li>` : ''}
            ${sw.reference ? `<li><span>Reference</span><a href="${escapeHTML(sw.reference)}" target="_blank" rel="noopener noreferrer">link ↗</a></li>` : ''}
          </ul>
        </div>
        <div class="avail-col">
          <div class="avail-col-title">Purchase</div>
          <ul class="avail-list">
            <li><span>Buyable</span>${buy.available ? '<span class="pill pill-open">✓ Yes</span>' : '<span class="pill pill-closed">— No</span>'}</li>
            ${buy.channel ? `<li><span>Channel</span><span class="muted">${escapeHTML(buy.channel)}</span></li>` : ''}
            ${typeof buy.price_usd === 'number' || typeof buy.price_eur === 'number'
              ? `<li><span>Price</span><strong>${buy.price_usd != null ? '$' + buy.price_usd : ''}${buy.price_usd != null && buy.price_eur != null ? ' / ' : ''}${buy.price_eur != null ? '€' + buy.price_eur : ''}</strong>${buy.price_usd != null && buy.price_eur != null ? ' (USD / EUR)' : ''}</li>`
              : ''}
            ${buy.url ? `<li><span>Sales page</span><a href="${escapeHTML(buy.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(buy.url)} ↗</a></li>` : ''}
            ${buy.price_note ? `<li class="avail-note"><span>Note</span><span class="muted">${escapeHTML(buy.price_note)}</span></li>` : ''}
          </ul>
        </div>
      </div>
    </div>`;

  const buyAction = buy.available && buy.url
    ? `<a class="btn btn-primary" href="${escapeHTML(buy.url)}" target="_blank" rel="noopener noreferrer">Sales page ↗</a>`
    : '';
  const sourceAction = (hw.reference || sw.reference || p.github)
    ? `<a class="btn btn-ghost" href="${escapeHTML(p.github || hw.reference || sw.reference)}" target="_blank" rel="noopener noreferrer">Source ↗</a>`
    : '';

  els.dialogBody.innerHTML = `
    <div class="dlg-head">
      <span class="eyebrow">${escapeHTML(p.category || '')}</span>
      <h2>${escapeHTML(p.platform)}</h2>
      <div class="dlg-mfr">${escapeHTML(p.manufacturer || '')} · ${p.year || ''}</div>
    </div>
    <div class="dlg-body">
      <div class="dlg-image">${mediaHTML(p)}</div>
      <div>
        <h3>Application</h3>
        <p>${escapeHTML(p.application || '—')}</p>
      </div>
      <div style="grid-column: 1 / -1;">
        <h3>Description</h3>
        <p>${escapeHTML(p.description || '—')}</p>
      </div>
      <div style="grid-column: 1 / -1;">
        <h3>Hardware &amp; signal chain</h3>
        ${renderTable(txRxRows)}
      </div>
      <div style="grid-column: 1 / -1;">
        <h3>Physical specifications</h3>
        ${renderTable(specRows)}
      </div>
      ${availabilityBlock}
      ${renderImageAttribution(p.image_attribution)}
    </div>
    <div class="dlg-actions">
      ${p.paper ? `<a class="btn btn-primary" href="${escapeHTML(p.paper)}" target="_blank" rel="noopener noreferrer">Read paper ↗</a>` : ''}
      ${buyAction}
      ${sourceAction}
      ${p.website && p.website !== buy.url ? `<a class="btn btn-ghost" href="${escapeHTML(p.website)}" target="_blank" rel="noopener noreferrer">Project page ↗</a>` : ''}
    </div>`;
  els.detailDialog.showModal();
}
function closeDetail() {
  if (els.detailDialog.open) els.detailDialog.close();
}

// -- catalog load ----------------------------------------------------------

async function fetchJSON(url) {
  let resp;
  try {
    resp = await fetch(url, { cache: 'no-cache' });
  } catch (err) {
    throw new Error(`${url}: ${err.message}`);
  }
  if (!resp.ok) {
    throw new Error(`${url}: HTTP ${resp.status} ${resp.statusText}`);
  }
  try {
    return await resp.json();
  } catch (err) {
    throw new Error(`${url}: invalid JSON`);
  }
}

function resolveImage(p) {
  const img = p.image;
  if (!img) return p;
  if (/^(https?:|data:)/i.test(img) || img.startsWith('/') || img.startsWith('platforms/')) {
    return p;
  }
  p.image = `platforms/${p.id}/${img}`;
  return p;
}

async function loadCatalog() {
  const ids = await fetchJSON(CATALOG_INDEX);
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('platforms/index.json must be a non-empty list of platform ids');
  }
  return Promise.all(ids.map(async (id) => {
    if (typeof id !== 'string' || !id) {
      throw new Error('platforms/index.json contains a non-string id');
    }
    const p = await fetchJSON(`platforms/${encodeURIComponent(id)}/index.json`);
    if (!p.id) p.id = id;
    return resolveImage(p);
  }));
}

// -- bootstrap -------------------------------------------------------------
async function init() {
  let platforms;
  try {
    platforms = await loadCatalog();
  } catch (err) {
    showError(err.message);
    return;
  }
  STATE.platforms = platforms;
  STATE.fuse = new Fuse(platforms, FUSE_OPTIONS);

  populateSelect(els.categoryFilter, uniq(platforms.map((p) => p.category)), 'All categories', 'category');
  populateSelect(els.manufacturerFilter, uniq(platforms.map((p) => p.manufacturer)), 'Any manufacturer', 'manufacturer');
  populateSelect(els.accessFilter, uniq(platforms.map((p) => p.access)), 'Any access', 'access');
  populateSelect(els.typeFilter, uniq(platforms.map((p) => inferInstitutionType(p))), 'Any type', 'type');
  populateSelect(els.yearFilter, uniq(platforms.map((p) => String(p.year))), 'Any year');
  renderCatalogStats(platforms);
  renderTimeline(platforms);

  // Wire events
  els.searchInput.addEventListener('input', debounce(update, 120));
  els.clearSearch.addEventListener('click', () => {
    els.searchInput.value = '';
    els.clearSearch.hidden = true;
    update();
  });
  els.searchInput.addEventListener('input', () => {
    els.clearSearch.hidden = els.searchInput.value.length === 0;
  });
  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      els.searchInput.value = '';
      els.clearSearch.hidden = true;
      update();
    }
  });

  // Year timeline: click a point to filter by that year (click again to clear)
  if (els.timeline) els.timeline.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-year]');
    if (!btn) return;
    els.yearFilter.value = els.yearFilter.value === btn.dataset.year ? '' : btn.dataset.year;
    update();
  });
  [els.hwOpenFilter, els.swOpenFilter, els.buyableFilter,
   els.categoryFilter, els.manufacturerFilter, els.accessFilter,
   els.typeFilter, els.yearFilter, els.sortBy].forEach((el) =>
    el.addEventListener('change', update),
  );
  els.resetFilters.addEventListener('click', resetAll);
  els.resetEmpty.addEventListener('click', resetAll);

  // Detail dialog: close button + backdrop click
  els.closeDialog.addEventListener('click', closeDetail);
  els.detailDialog.addEventListener('click', (e) => {
    const r = els.detailDialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDetail();
  });

  // Card interactions (event delegation)
  els.results.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-detail]');
    if (trigger) {
      openDetail(trigger.dataset.detail);
      return;
    }
    const card = e.target.closest('.card');
    if (card && !e.target.closest('a')) {
      openDetail(card.dataset.id);
    }
  });
  els.results.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.card');
      if (card) {
        e.preventDefault();
        openDetail(card.dataset.id);
      }
    }
  });

  // Initial render
  update();
}

function update() {
  const list = applyFilters();
  render(list);
}

function resetAll() {
  // Defaults: open HW + SW sources pre-selected, newest-first sort
  els.searchInput.value = '';
  els.clearSearch.hidden = true;
  els.hwOpenFilter.checked = true;
  els.swOpenFilter.checked = true;
  els.buyableFilter.checked = false;
  els.typeFilter.value = '';
  els.categoryFilter.value = '';
  els.manufacturerFilter.value = '';
  els.accessFilter.value = '';
  els.yearFilter.value = '';
  els.sortBy.value = 'year-desc';
  update();
}
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function showError(msg) {
  els.errorState.hidden = false;
  els.errorDetail.textContent = msg;
}

init();
