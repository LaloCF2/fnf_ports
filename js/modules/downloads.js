// Popup de detalle (mods / bases / scripts) + contador de descargas.
window.fbReady.then((FB) => {
const { db, auth, googleProvider, ref, get, set, update, remove, push, onValue, runTransaction, signInWithPopup, onAuthStateChanged, signOut, APP_VERSION } = FB;
const { store, t, esc, icon, vibrate, openPopup, closePopup, toast, getProfile, profileName, profilePhoto, stringToColor } = FNF;

window.trackDownload = (id) => {
  runTransaction(ref(db, `downloads/${id}`), (current) => (current || 0) + 1);
};

let images = [];
let imgIndex = 0;

function setImage() {
  const img = document.getElementById('detail-img');
  img.removeAttribute('data-fallback');
  img.classList.remove('img-error');
  img.src = images[imgIndex] || '';
  document.getElementById('carousel-count').textContent = `${imgIndex + 1} / ${images.length}`;
}

window.carouselStep = (dir) => {
  if (images.length < 2) return;
  imgIndex = (imgIndex + dir + images.length) % images.length;
  setImage();
};

function showDetail(type, id, d) {
  if (!d) return;
  window.currentItemRatingId = id;
  window.currentItemType = type;

  document.getElementById('detail-title').textContent = d.title;
  document.getElementById('detail-desc').textContent = (d.desc || '').replace(/\/n/g, '\n');
  const version = document.getElementById('detail-version');
  version.textContent = d.version || '';
  version.style.display = d.version ? '' : 'none';

  images = d.images && d.images.length ? d.images : [d.img];
  imgIndex = 0;
  setImage();
  document.getElementById('detail-media').classList.toggle('is-logo', type === 'apk');
  const multi = images.length > 1;
  document.querySelectorAll('#detail-media .carousel-btn, #carousel-count').forEach(b => b.classList.toggle('hidden', !multi));

  let h = (d.downloads || []).map(dl => `
    <a class="dl-link" href="${esc(dl.link)}" target="_blank" rel="noopener" onclick="trackDownload('${id}')">
      <span class="tile-icon">${icon('download', 'icon icon-sm')}</span><span>${esc(dl.name)}</span>
    </a>`).join('');
  h += `<button class="btn btn-ghost btn-block" style="margin-top:6px;color:var(--danger)" onclick="reportError('${id}')">${icon('alert', 'icon icon-sm')} ${t('Reportar link caído', 'Report broken link')}</button>`;
  if (window.isSuperUser) h += `<button class="btn btn-ghost btn-block" onclick="fixBrokenLink('${id}')">🛠️ ${t('Limpiar reportes', 'Clear reports')}</button>`;
  document.getElementById('detail-downloads').innerHTML = h;

  if (window.loadItemRating) window.loadItemRating(id);
  openPopup('detail-popup');
}

const guard = () => window.exigirRegistro && window.exigirRegistro();

window.openModInfo = (id) => {
  if (guard()) return;
  if (window.brokenLinksData && window.brokenLinksData[id] && !window.isSuperUser) {
    const d = window.MOD_DATA[id];
    document.getElementById('maintenance-mod-name').textContent = d ? d.title : '';
    openPopup('maintenance-popup');
    return;
  }
  showDetail('mod', id, window.MOD_DATA[id]);
};

window.openApkInfo = (id) => { if (!guard()) showDetail('apk', id, window.APK_DATA[id]); };
window.openScriptInfo = (id) => { if (!guard()) showDetail('script', id, window.SCRIPTS_DATA[id]); };

window.closeDetail = () => {
  closePopup('detail-popup');
  window.currentItemRatingId = null;
};
// Nombres antiguos (por si quedan enlaces en otros archivos)
window.closeModInfo = window.closeApkInfo = window.closeScriptInfo = window.closeDetail;
}).catch(err => console.error(err));
