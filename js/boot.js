// Arranque rápido: pinta la página sin esperar a Firebase.
(() => {
const { store, t, esc, vibrate, openPopup, toast, getProfile, profileName, profilePhoto } = FNF;
// (main.js carga Firebase después y conecta los datos en vivo.)

const MI_UID_ADMIN = 'Mtsvw6hM8FYu19Sk3yPnbDLtfOf2';

// ---- Admin ----
const profile = getProfile();
window.isSuperUser = !!(profile && (profile.key === MI_UID_ADMIN || (profile.nombre && profile.nombre.toLowerCase() === 'lalocf')));
if (window.isSuperUser) {
  document.body.classList.add('is-admin');
  document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
}

const params = new URLSearchParams(location.search);

const secretUid = params.get('set_admin');
if (secretUid) {
  store.setJson('fnf_user_profile', { key: secretUid, name: 'Admin LaloCF', verified: true });
  history.replaceState({}, document.title, location.pathname);
  alert('🛠️ ¡Privilegios de administrador activados en este dispositivo!');
  location.reload();
}

// Mods secretos desbloqueados por enlace (?unlock=modId)
const modToUnlock = params.get('unlock');
if (modToUnlock) {
  const unlocked = store.json('unlocked_mods', []);
  if (!unlocked.includes(modToUnlock)) {
    unlocked.push(modToUnlock);
    store.setJson('unlocked_mods', unlocked);
    setTimeout(() => { openPopup('secret-unlocked-popup'); vibrate([30, 50, 30]); }, 900);
  }
  history.replaceState({}, document.title, location.pathname + location.hash);
}

// ---- Saludo y avatar del encabezado ----
window.updateHeaderUser = () => {
  const h = new Date().getHours();
  document.getElementById('greet-time').textContent =
    h < 12 ? t('¡Buenos días!', 'Good morning!') : h < 19 ? t('¡Buenas tardes!', 'Good afternoon!') : t('¡Buenas noches!', 'Good evening!');
  const p = getProfile();
  const loggedIn = !!window.usuarioActualFirebase;
  document.getElementById('greet-name').textContent = loggedIn && p ? profileName(p) : "FNF' Ports";
  const photo = loggedIn && profilePhoto(p);
  document.getElementById('profileBtn').innerHTML = photo ? `<img src="${esc(photo)}" alt="">` : '<svg class="icon"><use href="#i-user"/></svg>';
};

// ---- Idioma ----
function applyLanguage() {
  document.querySelectorAll('[data-es][data-en]').forEach(el => {
    el.innerHTML = el.getAttribute(`data-${window.currentLang}`);
  });
  const label = window.currentLang === 'es' ? 'English' : 'Español';
  ['langBtn', 'langBtn2'].forEach(id => { const b = document.getElementById(id); if (b) b.textContent = label; });
  document.documentElement.lang = window.currentLang;
  document.getElementById('globalSearch').placeholder = t('Buscar...', 'Search...');
  window.updateHeaderUser();
}

window.toggleLanguage = () => {
  window.currentLang = window.currentLang === 'es' ? 'en' : 'es';
  store.set('fnf_lang', window.currentLang);
  window.renderAll();
  if (window.repaintLiveData) window.repaintLiveData();
  applyLanguage();
  if (window.refreshFavoritesUI) window.refreshFavoritesUI();
  window.filterContent(true);
  vibrate(15);
};

window.entrarComoInvitado = () => {
  store.set('fnf_guest_mode', 'true');
  document.getElementById('auth-overlay').style.display = 'none';
};

// Mientras main.js (Firebase) termina de cargar, los botones avisan en vez de fallar.
['openModInfo', 'openApkInfo', 'openScriptInfo', 'handleLike', 'toggleFavorite', 'openModComments', 'abrirMenuCompartir',
  'abrirPerfil', 'toggleNotificaciones', 'abrirFavoritos', 'abrirPedidos', 'cargarNovedadesTXT', 'enviarMensajeAlBot',
  'iniciarSesionConGoogle', 'toggleFaq', 'abrirGaleria', 'resetSettings']
  .forEach(name => { if (!window[name]) window[name] = () => toast(t('Conectando...', 'Connecting...'), 'globe'); });

// ---- Pintar ----
window.renderAll();
window.initNav();
applyLanguage();
document.getElementById('year').textContent = new Date().getFullYear();
requestAnimationFrame(() => document.body.classList.add('loaded'));
})();
