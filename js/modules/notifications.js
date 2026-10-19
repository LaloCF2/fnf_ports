// Campana de notificaciones, avisos emergentes globales y avisos personales.
window.fbReady.then((FB) => {
const { db, auth, googleProvider, ref, get, set, update, remove, push, onValue, runTransaction, signInWithPopup, onAuthStateChanged, signOut, APP_VERSION } = FB;
const { store, t, esc, icon, vibrate, openPopup, closePopup, toast, getProfile, profileName, profilePhoto, stringToColor } = FNF;

let notifs = [];
let leidas = store.json('notifsLeidas', []);

const isAdmin = () => !!window.isSuperUser;

function actualizarCampana() {
  const badge = document.getElementById('badge-contador');
  const n = notifs.filter(x => !leidas.includes(x.id)).length;
  badge.style.display = n ? 'block' : 'none';
  badge.textContent = n > 9 ? '9+' : n;
}

function marcarComoLeidas() {
  notifs.forEach(x => { if (!leidas.includes(x.id)) leidas.push(x.id); });
  store.setJson('notifsLeidas', leidas);
  actualizarCampana();
}

function render() {
  const lista = document.getElementById('lista-notificaciones');
  if (!notifs.length) {
    lista.innerHTML = `<p class="empty">${t('No hay notificaciones nuevas.', 'No new notifications.')}</p>`;
  } else {
    lista.innerHTML = [...notifs].reverse().map(n => `
      <div class="notif-item">
        <p>${esc(n.texto)}</p>
        <small>${esc(n.fecha)}</small>
        ${isAdmin() ? `<div class="row">
          <button class="btn btn-sm btn-soft" onclick="editarNotificacion('${esc(n.id)}')">Editar</button>
          <button class="btn btn-sm btn-ghost" style="color:var(--danger)" onclick="borrarNotificacion('${esc(n.id)}')">Borrar</button>
        </div>` : ''}
      </div>`).join('');
  }
  actualizarCampana();
}

window.toggleNotificaciones = () => {
  const panel = document.getElementById('panel-notificaciones');
  if (panel.classList.contains('show')) { closePopup('panel-notificaciones'); return; }
  document.getElementById('admin-notif-area').style.display = isAdmin() ? 'grid' : 'none';
  render();
  openPopup('panel-notificaciones');
  marcarComoLeidas();
};

window.enviarNotificacion = () => {
  if (!isAdmin()) return;
  const txt = document.getElementById('txt-nueva-notif');
  const texto = txt.value.trim();
  if (!texto) return;
  const fecha = new Date().toLocaleString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const id = 'notif_' + Date.now();
  set(ref(db, 'notificaciones/' + id), { id, texto, fecha });
  txt.value = '';
};

window.borrarNotificacion = (id) => {
  if (isAdmin() && confirm('¿Seguro que quieres borrar esta notificación?')) remove(ref(db, 'notificaciones/' + id));
};

window.editarNotificacion = (id) => {
  if (!isAdmin()) return;
  const actual = notifs.find(n => n.id === id);
  const nuevo = prompt('Edita tu notificación:', actual ? actual.texto : '');
  if (nuevo && nuevo.trim()) update(ref(db, 'notificaciones/' + id), { texto: nuevo.trim() });
};

onValue(ref(db, 'notificaciones'), (snap) => {
  notifs = [];
  snap.forEach(c => { notifs.push(c.val()); });
  render();
});

// ---- Aviso emergente global (panel de admin) ----
window.sendGlobalNotification = async () => {
  const el = document.getElementById('globalNotifText');
  const message = el.value.trim();
  if (!message) return alert('Escribe un mensaje primero.');
  await set(ref(db, 'notifications/latest'), { message, timestamp: Date.now(), id: Math.random().toString(36).slice(2, 11) });
  el.value = '';
  closePopup('admin-tools-popup');
};

onValue(ref(db, 'notifications/latest'), (snap) => {
  const data = snap.val();
  if (!data) return;
  const reciente = (Date.now() - data.timestamp) < 86400000;
  if (store.get('last_notif_id') !== data.id && reciente) {
    toast(data.message);
    store.set('last_notif_id', data.id);
  }
});

// ---- Avisos personales (estado de tus pedidos) ----
let personalListening = false;
window.listenToPersonalNotifications = (uid) => {
  if (personalListening) return;
  personalListening = true;
  onValue(ref(db, `user_notifications/${uid}`), (snap) => {
    const data = snap.val();
    if (!data) return;
    const key = `last_personal_notif_${uid}`;
    if (store.get(key) !== data.id) {
      alert('🔔 Notificación sobre tu pedido:\n\n' + data.message);
      store.set(key, data.id);
    }
  });
};
}).catch(err => console.error(err));
