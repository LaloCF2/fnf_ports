// Utilidades compartidas (window.FNF).
(() => {

const store = {
  get(k, fallback = null) { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { } },
  json(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch (e) { return fallback; } },
  setJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};

const getProfile = () => store.json('fnf_user_profile', null);
const profileName = (p) => (p && (p.nombre || p.name)) || 'Usuario';
const profilePhoto = (p) => (p && (p.foto || p.avatar)) || '';

// Idioma
window.currentLang = store.get('fnf_lang', 'es');
const t = (es, en) => (window.currentLang === 'en' ? en : es);

// Escapa texto de usuarios antes de meterlo en innerHTML
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const icon = (name, cls = 'icon') => `<svg class="${cls}"><use href="#i-${name}"/></svg>`;

const vibrate = (ms = 15) => {
  if (store.get('hapticMode') === 'true' && navigator.vibrate) navigator.vibrate(ms);
};
window.triggerVibrate = vibrate;

// Popups
const openPopup = (id) => { const el = document.getElementById(id); if (el) el.classList.add('show'); };
const closePopup = (id) => { const el = document.getElementById(id); if (el) el.classList.remove('show'); };
window.openPopup = openPopup;
window.closePopup = closePopup;

// Tocar el fondo oscuro cierra el popup (llama a su botón de cerrar si tiene lógica propia)
document.addEventListener('click', (e) => {
  const popup = e.target.classList && e.target.classList.contains('popup') ? e.target : null;
  if (!popup || ['update-popup', 'install-popup'].includes(popup.id)) return;
  const closeBtn = popup.querySelector('.popup-close');
  if (closeBtn) closeBtn.click(); else popup.classList.remove('show');
});

const toast = (msg, iconName = 'bell') => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="tile-icon">${icon(iconName, 'icon icon-sm')}</span><span>${esc(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 400); }, 5000);
};
window.showToast = toast;

const stringToColor = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 55%)`;
};

// Imágenes: si un asset local no existe (p. ej. probando en local), se carga desde el repo de GitHub.
const REMOTE_ASSETS = 'https://raw.githubusercontent.com/LaloCF2/fnf_ports/main/';
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  const src = img.getAttribute('src') || '';
  if (src.startsWith('assets/') && !img.dataset.fallback) {
    img.dataset.fallback = '1';
    img.style.visibility = 'hidden';
    img.addEventListener('load', () => { img.style.visibility = ''; }, { once: true });
    img.src = REMOTE_ASSETS + src;
  } else {
    img.classList.add('img-error');
  }
}, true);

window.FNF = { store, getProfile, profileName, profilePhoto, t, esc, icon, vibrate, openPopup, closePopup, toast, stringToColor };
})();
