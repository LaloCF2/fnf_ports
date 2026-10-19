// Genera las tarjetas de Bases, MODs y Scripts a partir de data-*.js
(() => {
const { esc, icon, t, store } = FNF;

const GAMA = {
  low: ['Baja', 'Low'],
  mid: ['Media', 'Mid'],
  'mid-high': ['Media-Alta', 'Mid-High'],
  high: ['Alta', 'High']
};

const isFav = (id) => !!store.json('fnf_favorites', {})[id];
const jsArg = (s) => esc(String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"));

function card({ id, kind, title, img, logo, badges = '', tags = [], openFn, extraAction = '', adminBtns, i }) {
  const tagHtml = tags.filter(Boolean).map(x => `<span class="tag">${esc(x)}</span>`).join('');
  return `
  <article class="item-card glass ${kind}-card${logo ? ' is-logo' : ''}" id="card-${id}" data-id="${id}" style="--i:${Math.min(i, 12)}">
    <div class="item-media" onclick="${openFn}('${id}')">
      <img src="${esc(img)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('loaded')">
      <div class="media-badges">${badges}</div>
    </div>
    <div class="item-body">
      <h3 class="item-title">
        <span class="led-dot led-green" id="led-green-${id}"></span><span class="led-dot led-yellow" id="led-yellow-${id}"></span>
        <span>${esc(title)}</span>
      </h3>
      ${tagHtml ? `<div class="tags">${tagHtml}</div>` : ''}
      <div class="item-stats">
        <button class="stat-btn" id="like-${id}" onclick="handleLike('${id}', this)" aria-label="Like">${icon('heart', 'icon icon-sm')}<span id="count-${id}">0</span></button>
        <span class="stat-btn static" title="${t('Descargas', 'Downloads')}">${icon('download', 'icon icon-sm')}<span id="dl-${id}">0</span></span>
        <span class="spacer"></span>
        <button class="stat-btn${isFav(id) ? ' is-fav' : ''}" data-fav="${id}" onclick="toggleFavorite('${id}')" aria-label="${t('Favorito', 'Favorite')}">${icon('bookmark', 'icon icon-sm')}</button>
        <button class="stat-btn" onclick="abrirMenuCompartir('${id}', '${jsArg(title)}')" aria-label="${t('Compartir', 'Share')}">${icon('share', 'icon icon-sm')}</button>
      </div>
      <div class="item-actions">
        <button class="btn" onclick="${openFn}('${id}')">${icon('download', 'icon icon-sm')}<span data-es="Descargar" data-en="Download">${t('Descargar', 'Download')}</span></button>
        ${extraAction}
        <button class="btn btn-ghost" onclick="openModComments('${id}', '${jsArg(title)}')" aria-label="Chat">${icon('chat', 'icon icon-sm')}</button>
      </div>
      <div class="admin-row">${adminBtns}</div>
    </div>
  </article>`;
}

const ledBtn = (id) => `<button id="btn-led-${id}" class="admin-led-btn" onclick="toggleGreenLed('${id}', event)">🟢 Act. LED</button>`;

function renderAll() {
  const unlocked = store.json('unlocked_mods', []);
  const showSecrets = store.get('superUser') === 'true' || window.isSuperUser;

  // ---- Bases ----
  const apks = Object.entries(window.APK_DATA || {});
  document.getElementById('apksContainer').innerHTML = apks.map(([id, d], i) => card({
    id, kind: 'apk', title: d.title, img: d.img, logo: true, i,
    tags: [d.version && d.version.split('\n')[0]],
    openFn: 'openApkInfo',
    extraAction: `<button class="btn btn-ghost" onclick="cargarNovedadesTXT('${id}', 'base')" aria-label="${t('Novedades', 'Notes')}">${icon('info', 'icon icon-sm')}</button>`,
    adminBtns: ledBtn(id)
  })).join('');

  // ---- MODs ----
  const mods = Object.entries(window.MOD_DATA || {}).filter(([id, d]) => !d.hidden || showSecrets || unlocked.includes(id));
  document.getElementById('modsContainer').innerHTML = mods.map(([id, d], i) => {
    const g = GAMA[d.gama] || GAMA.low;
    const badges = `
      <span class="pill-badge gama-${d.gama || 'low'}"><span class="dot"></span>${t(g[0], g[1])}</span>
      <span><span class="pill-badge badge-pin">📌 ${t('Fijado', 'Pinned')}</span> <span class="pill-badge badge-new">${t('Nuevo', 'New')}</span></span>`;
    return card({
      id, kind: 'mod', title: d.title, img: d.img, badges, i,
      tags: [d.engine, d.ram, d.size],
      openFn: 'openModInfo',
      adminBtns: `
        <button class="admin-pin-btn" onclick="toggleModPin('${id}', event)">📌 Fijar</button>
        ${ledBtn(id)}
        <button onclick="toggleNewMod('card-${id}')">⭐ Nuevo</button>
        <button onclick="fixBrokenLink('${id}')">🛠️ Reparar</button>`
    });
  }).join('');
  // Datos para el buscador / filtro
  mods.forEach(([id, d]) => {
    const el = document.getElementById('card-' + id);
    el.dataset.gama = d.gama || 'low';
    el.dataset.tags = `${d.title} ${d.engine || ''} ${d.ram || ''} ${d.size || ''}`.toLowerCase();
  });

  // ---- Scripts ----
  const scripts = Object.entries(window.SCRIPTS_DATA || {});
  document.getElementById('scriptsContainer').innerHTML = scripts.map(([id, d], i) => card({
    id, kind: 'script', title: d.title, img: (d.images || [])[0] || '', i,
    tags: [d.version],
    openFn: 'openScriptInfo',
    adminBtns: ledBtn(id) + `<button onclick="toggleRecomendarScript('${id}')">🔥 Top</button>`
  })).join('');

  // Contadores
  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setTxt('tile-mods', `${mods.length} ${t('disponibles', 'available')}`);
  setTxt('tile-apks', `${apks.length} ${t('motores', 'engines')}`);
  setTxt('tile-scripts', `${scripts.length} ${t('utilidades', 'utilities')}`);
  setTxt('count-mods-label', mods.length);
  setTxt('count-apks-label', apks.length);
  setTxt('count-scripts-label', scripts.length);
  setTxt('tile-favs', `${Object.keys(store.json('fnf_favorites', {})).length} ${t('guardados', 'saved')}`);
}

window.renderAll = renderAll;
})();
