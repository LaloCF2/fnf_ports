// Datos en vivo con Firebase. La página ya fue pintada por boot.js.
window.fbReady.then((FB) => {
const { db, auth, googleProvider, ref, get, set, update, remove, push, onValue, runTransaction, signInWithPopup, onAuthStateChanged, signOut, APP_VERSION } = FB;
const { store, t, esc, icon, vibrate, openPopup, closePopup, toast, getProfile, profileName, profilePhoto, stringToColor } = FNF;

const isSuperUser = window.isSuperUser;
const urlParams = new URLSearchParams(location.search);
document.getElementById('footer-version').textContent = APP_VERSION;
document.getElementById('update-title').textContent = t('Versión ', 'Version ') + APP_VERSION.replace(/^v/, '');
window.refreshFavoritesUI();

// ==========================================
// DATOS EN VIVO (Firebase)
// ==========================================
const live = { downloads: {}, likes: {}, leds: {}, comments: {}, pinned: {}, newMods: {}, broken: {}, ratings: {}, verified: {}, recomendados: {} };
window.brokenLinksData = live.broken;

const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

function paintDownloads() { Object.keys(live.downloads).forEach(id => setText('dl-' + id, live.downloads[id])); }
function paintLikes() { Object.keys(live.likes).forEach(id => setText('count-' + id, live.likes[id])); syncLikeButtons(); }

function paintLeds() {
  document.querySelectorAll('.led-green').forEach(el => { el.style.display = 'none'; });
  document.querySelectorAll('.admin-led-btn').forEach(btn => { btn.textContent = '🟢 Act. LED'; });
  Object.keys(live.leds).forEach(id => {
    const el = document.getElementById('led-green-' + id);
    if (el) el.style.display = 'inline-block';
    const btn = document.getElementById('btn-led-' + id);
    if (btn) btn.textContent = '⭕ Quitar LED';
  });
}

function paintCommentLeds() {
  document.querySelectorAll('.led-yellow').forEach(el => { el.style.display = 'none'; });
  Object.keys(live.comments).forEach(id => {
    if (live.comments[id] > Number(store.get(`seen_comments_${id}`, 0))) {
      const el = document.getElementById('led-yellow-' + id);
      if (el) el.style.display = 'inline-block';
    }
  });
}

function paintPinned() {
  const container = document.getElementById('modsContainer');
  const cards = [...container.querySelectorAll('.mod-card')];
  cards.forEach(card => {
    const pinned = !!live.pinned[card.dataset.id];
    card.classList.toggle('pinned-mod', pinned);
    const btn = card.querySelector('.admin-pin-btn');
    if (btn) btn.textContent = pinned ? '❌ Desfijar' : '📌 Fijar';
  });
  cards.sort((a, b) => (live.pinned[b.dataset.id] ? 1 : 0) - (live.pinned[a.dataset.id] ? 1 : 0))
    .forEach(card => container.appendChild(card));
}

function paintFlags() {
  document.querySelectorAll('.item-card').forEach(card => {
    card.classList.toggle('is-new-mod', live.newMods[card.id] === true);
    card.classList.toggle('is-broken-mod', !!live.broken[card.dataset.id]);
  });
}

function paintRecomendados() {
  document.querySelectorAll('.script-card').forEach(card => {
    const media = card.querySelector('.media-badges');
    let badge = media.querySelector('.badge-top');
    if (live.recomendados[card.dataset.id]) {
      if (!badge) media.insertAdjacentHTML('afterbegin', '<span class="pill-badge badge-top">🔥 TOP</span>');
    } else if (badge) badge.remove();
  });
}

function repaintLiveData() {
  paintDownloads(); paintLikes(); paintLeds(); paintCommentLeds(); paintPinned(); paintFlags(); paintRecomendados();
}
window.repaintLiveData = repaintLiveData;

onValue(ref(db, 'downloads'), s => { live.downloads = s.val() || {}; paintDownloads(); });
onValue(ref(db, 'likes'), s => { live.likes = s.val() || {}; paintLikes(); });
onValue(ref(db, 'updates_led'), s => { live.leds = s.val() || {}; paintLeds(); });
onValue(ref(db, 'last_comment_time'), s => { live.comments = s.val() || {}; paintCommentLeds(); });
onValue(ref(db, 'pinned_mods'), s => { live.pinned = s.val() || {}; paintPinned(); });
onValue(ref(db, 'new_mods_status'), s => { live.newMods = s.val() || {}; paintFlags(); });
onValue(ref(db, 'broken_links'), s => { live.broken = s.val() || {}; window.brokenLinksData = live.broken; paintFlags(); });
onValue(ref(db, 'verified_users'), s => { live.verified = s.val() || {}; });
onValue(ref(db, 'scripts_recomendados'), s => { live.recomendados = s.val() || {}; paintRecomendados(); });
onValue(ref(db, 'ratings'), s => {
  live.ratings = s.val() || {};
  if (window.currentItemRatingId) window.loadItemRating(window.currentItemRatingId);
});

onValue(ref(db, '.info/connected'), (snap) => {
  const on = snap.val() === true;
  document.getElementById('statusDot').classList.toggle('online', on);
  setText('statusText', on ? t('Servidor activo', 'Server online') : t('Desconectado', 'Offline'));
});

// ==========================================
// ACCIONES DE ADMIN EN TARJETAS
// ==========================================
const toggleNode = async (path) => {
  const r = ref(db, path);
  const snap = await get(r);
  await set(r, snap.exists() ? null : true);
};

window.toggleGreenLed = (id, e) => { e && e.stopPropagation(); if (isSuperUser) toggleNode(`updates_led/${id}`); };
window.toggleModPin = (id, e) => { e && e.stopPropagation(); if (isSuperUser) toggleNode(`pinned_mods/${id}`); };
window.toggleNewMod = async (cardId) => {
  if (!isSuperUser) return alert('No tienes permisos de administrador.');
  const esNuevo = live.newMods[cardId] === true;
  if (confirm(esNuevo ? '¿Quitar la etiqueta de NUEVO a este mod?' : '¿Marcar este mod como NUEVO?')) {
    await set(ref(db, `new_mods_status/${cardId}`), esNuevo ? null : true);
  }
};
window.toggleRecomendarScript = (id) => {
  if (!isSuperUser) return;
  set(ref(db, 'scripts_recomendados/' + id), live.recomendados[id] ? null : true);
};
window.fixBrokenLink = async (id) => {
  if (isSuperUser && confirm('🛠️ ¿Ya solucionaste el link de este mod?')) await set(ref(db, `broken_links/${id}`), null);
};

// ==========================================
// BANEOS
// ==========================================
async function checkBanStatus() {
  const p = getProfile();
  if (!p) return false;
  const snap = await get(ref(db, `banned_users/${p.key}`));
  if (!snap.exists()) return false;
  const ban = snap.val();
  if (Date.now() < ban.expiresAt) {
    alert(`⛔ ACCESO DENEGADO\nMotivo: ${ban.reason}\nExpira en: ${Math.ceil((ban.expiresAt - Date.now()) / 3600000)}h`);
    return true;
  }
  await set(ref(db, `banned_users/${p.key}`), null);
  return false;
}

window.openBanPanel = (userKey, userName) => {
  if (!isSuperUser) return;
  document.getElementById('ban-target-info').textContent = `Gestionando a: ${userName}`;
  openPopup('ban-popup');
  document.getElementById('confirmBanBtn').onclick = async () => {
    const reason = document.getElementById('banReason').value || 'Normas';
    const hours = parseInt(document.getElementById('banDuration').value) || 24;
    await set(ref(db, `banned_users/${userKey}`), { userName, reason, expiresAt: Date.now() + hours * 3600000 });
    toast('Usuario baneado.', 'shield');
    closePopup('ban-popup');
  };
};

// ==========================================
// LIKES
// ==========================================
function syncLikeButtons() {
  const mine = store.json('my_liked_items', {});
  document.querySelectorAll('.item-card .stat-btn[id^="like-"]').forEach(b => b.classList.toggle('active', !!mine[b.id.slice(5)]));
}

window.handleLike = async (id, el) => {
  if (window.exigirRegistro()) return;
  if (await checkBanStatus()) return;
  const uid = window.usuarioActualFirebase.uid;
  const mine = store.json('my_liked_items', {});
  const likeRef = ref(db, `likes_registry/${id}/${uid}`);
  const snap = await get(likeRef);
  if (snap.exists()) {
    await set(likeRef, null);
    runTransaction(ref(db, `likes/${id}`), c => Math.max(0, (c || 1) - 1));
    delete mine[id];
  } else {
    await set(likeRef, true);
    runTransaction(ref(db, `likes/${id}`), c => (c || 0) + 1);
    mine[id] = true;
  }
  store.setJson('my_liked_items', mine);
  if (el) el.classList.toggle('active', !!mine[id]);
  vibrate(20);
};

// ==========================================
// COMENTARIOS
// ==========================================
let currentCommentsId = null;
let commentsUnsub = null;
const safeUrl = (u) => /^https?:\/\//i.test(u || '') ? u : '#';

window.openModComments = (id, title) => {
  if (window.exigirRegistro()) return;
  currentCommentsId = id;
  document.getElementById('mc-title').textContent = t('Comentarios: ', 'Comments: ') + title;

  store.set(`seen_comments_${id}`, Date.now());
  const led = document.getElementById('led-yellow-' + id);
  if (led) led.style.display = 'none';

  const user = getProfile();
  const nombre = profileName(user);
  const foto = profilePhoto(user);
  const display = document.getElementById('mc-displayMyName');
  display.textContent = t('Comentando como: ', 'Commenting as: ') + nombre;
  display.classList.toggle('admin-name', nombre.toLowerCase() === 'lalocf');

  const avatar = document.getElementById('mc-myAvatar');
  avatar.innerHTML = foto ? `<img src="${esc(foto)}" alt="">` : esc(nombre.charAt(0).toUpperCase());
  avatar.style.background = foto ? 'transparent' : stringToColor(nombre);

  openPopup('mod-comments-popup');

  if (commentsUnsub) commentsUnsub();
  commentsUnsub = onValue(ref(db, `mod_comments/${id}`), (snapshot) => {
    const list = document.getElementById('mc-commentList');
    const data = snapshot.val();
    if (!data) {
      list.innerHTML = `<p class="empty">${t('Sé el primero en comentar aquí.', 'Be the first to comment.')}</p>`;
      return;
    }
    const me = getProfile();
    const liked = store.json('my_liked_mod_comments', {});
    const comments = Object.keys(data).map(k => ({ id: k, ...data[k] }))
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.id.localeCompare(a.id));

    list.innerHTML = comments.map(c => {
      const name = c.user || 'Usuario';
      const jsName = esc(name.replace(/['"\\]/g, ''));
      const isLalo = name.toLowerCase() === 'lalocf';
      const verified = live.verified[c.ownerKey] || isLalo;
      let actions = '';
      if (isSuperUser) {
        actions = `<span class="gold-link" onclick="togglePinModComment('${esc(c.id)}', ${!!c.isPinned})">${c.isPinned ? 'Desfijar' : '📌 Fijar'}</span>
                   <span class="danger-link" onclick="deleteModComment('${esc(c.id)}')">Eliminar</span>`;
      } else if (me && c.ownerKey === me.key) {
        actions = `<span class="danger-link" onclick="deleteModComment('${esc(c.id)}')">${t('Eliminar', 'Delete')}</span>`;
      }
      const av = c.avatar ? `<img src="${esc(c.avatar)}" alt="">` : esc(name.charAt(0).toUpperCase());
      return `
        <div class="yt-comment-container ${c.isPinned ? 'pinned' : ''}">
          <div class="yt-avatar" style="background:${c.avatar ? 'transparent' : stringToColor(name)}">${av}</div>
          <div class="yt-content">
            ${c.isPinned ? '<div class="pinned-badge">📌 FIJADO</div>' : ''}
            <div class="yt-header">
              <span class="yt-name ${isLalo ? 'admin-name' : ''}" onclick="openBanPanel('${esc(c.ownerKey)}', '${jsName}')">
                <a href="${esc(safeUrl(c.link))}" target="_blank" rel="noopener">${esc(name)}</a>${verified ? ' ☑️' : ''}
              </span>
              <span class="yt-date">${esc(c.date)}</span>
            </div>
            <div class="yt-text">${esc(c.text)}</div>
            <div class="yt-actions">
              <span class="yt-action-btn ${liked[c.id] ? 'active' : ''}" onclick="likeModComment('${esc(c.id)}')">👍 ${Number(c.likes) || 0}</span>
              <span class="yt-action-btn" onclick="replyModComment('${jsName}')">${t('Responder', 'Reply')}</span>
              ${actions}
            </div>
          </div>
        </div>`;
    }).join('');
  });
};

window.closeModComments = () => {
  closePopup('mod-comments-popup');
  if (commentsUnsub) { commentsUnsub(); commentsUnsub = null; }
};

window.addModComment = async () => {
  if (window.exigirRegistro()) return;
  if (await checkBanStatus()) return;
  const p = getProfile();
  const box = document.getElementById('mc-commentText');
  const text = box.value.trim();
  if (!text) return toast(t('Escribe algo...', 'Write something...'), 'chat');

  await push(ref(db, `mod_comments/${currentCommentsId}`), {
    ownerKey: p.key, user: profileName(p), link: p.link || '#', avatar: profilePhoto(p),
    text, date: new Date().toLocaleString(), likes: 0, isPinned: false
  });
  set(ref(db, `last_comment_time/${currentCommentsId}`), Date.now());
  store.set(`seen_comments_${currentCommentsId}`, Date.now() + 1000);
  box.value = '';
  document.getElementById('mc-charCounter').textContent = '0';
};

window.likeModComment = async (commentId) => {
  if (window.exigirRegistro()) return;
  if (await checkBanStatus()) return;
  const uid = window.usuarioActualFirebase.uid;
  const liked = store.json('my_liked_mod_comments', {});
  const base = `mod_comments/${currentCommentsId}/${commentId}`;
  const likeRef = ref(db, `${base}/userLikes/${uid}`);
  const snap = await get(likeRef);
  if (snap.exists()) {
    await set(likeRef, null);
    runTransaction(ref(db, `${base}/likes`), c => Math.max(0, (c || 1) - 1));
    delete liked[commentId];
  } else {
    await set(likeRef, true);
    runTransaction(ref(db, `${base}/likes`), c => (c || 0) + 1);
    liked[commentId] = true;
  }
  store.setJson('my_liked_mod_comments', liked);
};

window.deleteModComment = (id) => {
  if (confirm(t('¿Borrar comentario?', 'Delete comment?'))) remove(ref(db, `mod_comments/${currentCommentsId}/${id}`));
};
window.togglePinModComment = (id, state) => update(ref(db, `mod_comments/${currentCommentsId}/${id}`), { isPinned: !state });
window.replyModComment = (name) => { const tx = document.getElementById('mc-commentText'); tx.value = `@${name} `; tx.focus(); };
window.toggleVerify = (key) => { if (confirm('¿Dar insignia de verificado?')) update(ref(db, 'verified_users'), { [key]: true }); };

document.getElementById('mc-commentText').addEventListener('input', function () {
  document.getElementById('mc-charCounter').textContent = this.value.length;
});

// ==========================================
// CALIFICACIONES
// ==========================================
function paintStars(n) {
  document.querySelectorAll('#detail-rating .stars button').forEach((b, i) => b.classList.toggle('on', i < n));
}

window.loadItemRating = (id) => {
  const votes = Object.values(live.ratings[id] || {});
  const avg = votes.length ? (votes.reduce((a, v) => a + v, 0) / votes.length).toFixed(1) : 0;
  const mine = store.json('my_ratings', {})[id];
  paintStars(mine || 0);
  const base = mine ? t('Tu calificación', 'Your rating') : t('Califica este contenido', 'Rate this content');
  setText('detail-rating-text', votes.length ? `${base} · ${t('Promedio', 'Average')}: ${avg} ⭐ (${votes.length})` : base);
};

window.rateAppItem = async (a, b) => {
  const stars = typeof a === 'number' ? a : b;
  const id = window.currentItemRatingId;
  if (!id) return;
  const p = getProfile();
  if (!p) return window.exigirRegistro();
  const mine = store.json('my_ratings', {});
  if (mine[id]) return toast(t('Ya calificaste esto. ¡Gracias!', 'You already rated this. Thanks!'), 'sparkle');
  mine[id] = stars;
  store.setJson('my_ratings', mine);
  await set(ref(db, `ratings/${id}/${p.key}`), stars);
  paintStars(stars);
  vibrate(20);
  toast(t('¡Gracias por calificar!', 'Thanks for rating!'), 'sparkle');
};

// ==========================================
// PEDIDOS DE MODS
// ==========================================
const STATUS_COLORS = { 'Pendiente': '#d9a400', 'Seleccionado': '#3d8bff', 'En Progreso': '#ff8800', 'No Seleccionado': '#ef3e6d', 'Completado': '#19b56b' };
let requestsListening = false;

window.abrirPedidos = () => {
  openPopup('requests-popup');
  if (requestsListening) return;
  requestsListening = true;
  onValue(ref(db, 'mod_requests'), (snapshot) => {
    const container = document.getElementById('requests-list');
    const data = snapshot.val();
    if (!data) {
      container.innerHTML = `<p class="empty">${t('No hay solicitudes aún. ¡Sé el primero!', 'No requests yet. Be the first!')}</p>`;
      return;
    }
    const voted = store.json('fnf_voted_requests', {});
    container.innerHTML = Object.keys(data).map(k => ({ id: k, ...data[k] }))
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .map(req => {
        const status = req.status || 'Pendiente';
        const prog = Number(req.progress) || 0;
        const rid = esc(req.id);
        const admin = isSuperUser ? `
          <div class="req-admin">
            <button style="background:#3d8bff" onclick="updateRequestStatus('${rid}', 'Seleccionado')">Selec.</button>
            <button style="background:#ef3e6d" onclick="updateRequestStatus('${rid}', 'No Seleccionado')">No sel.</button>
            <button style="background:#ff8800" onclick="updateRequestStatus('${rid}', 'En Progreso')">Progreso</button>
            <button style="background:#19b56b" onclick="updateRequestStatus('${rid}', 'Completado')">Listo</button>
            <button style="background:#555;flex:0 0 auto" onclick="deleteRequest('${rid}')">🗑️</button>
            ${status === 'En Progreso' ? `<input type="range" min="0" max="100" value="${prog}" style="width:100%" onchange="updateRequestProgress('${rid}', this.value)">` : ''}
          </div>` : '';
        return `
          <div class="list-item" style="flex-wrap:wrap;align-items:flex-start">
            <div class="grow">
              <span class="status-tag" style="background:${STATUS_COLORS[status] || '#999'}">${esc(status)}</span>
              <h4 style="margin-top:6px">${esc(req.modName)}</h4>
              ${req.link && /^https?:\/\//i.test(req.link) ? `<a href="${esc(req.link)}" target="_blank" rel="noopener" style="font-size:12px">${t('Ver link original', 'Original link')}</a>` : ''}
              <p>${t('Pedido por', 'Requested by')}: <b>${esc(req.user || 'Anónimo')}</b></p>
              ${status === 'En Progreso' ? `<div class="progress"><div style="width:${prog}%"></div></div><p style="text-align:right">${prog}%</p>` : ''}
            </div>
            <button class="vote-btn ${voted[req.id] ? 'voted' : ''}" onclick="voteRequest('${rid}')">▲<span>${Number(req.votes) || 0}</span></button>
            ${admin}
          </div>`;
      }).join('');
  });
};
window.loadModRequests = window.abrirPedidos;

window.enviarSolicitudMod = async () => {
  if (window.exigirRegistro()) return;
  const p = getProfile();
  const name = document.getElementById('req-mod-name').value.trim();
  const link = document.getElementById('req-mod-link').value.trim();
  if (!name) return toast(t('Escribe el nombre del mod que quieres pedir.', 'Type the name of the mod.'), 'list');

  const lastKey = 'fnf_last_req_' + (p.key || 'guest');
  const last = Number(store.get(lastKey, 0));
  const days = (Date.now() - last) / 86400000;
  if (last > 0 && days < 10) {
    return alert(`⏳ Solo puedes pedir un mod cada 10 días. Te faltan ${Math.ceil(10 - days)} día(s).`);
  }

  const btn = document.getElementById('btn-enviar-solicitud');
  btn.disabled = true; btn.textContent = t('Enviando...', 'Sending...');
  try {
    const all = (await get(ref(db, 'mod_requests'))).val() || {};
    const active = Object.values(all).filter(r => r.status !== 'Completado').length;
    if (active >= 5) {
      alert('🛑 La lista de peticiones está llena (máximo 5 activas). Espera a que se terminen los ports pendientes.');
      return;
    }
    const snap = await push(ref(db, 'mod_requests'), {
      modName: name, link: link || '', user: profileName(p), ownerKey: p.key || 'guest',
      votes: 1, status: 'Pendiente', timestamp: Date.now()
    });
    store.set(lastKey, String(Date.now()));
    update(ref(db, 'usuarios/' + window.usuarioActualFirebase.uid), { ultimaSolicitudPort: Date.now() }).catch(() => { });
    const voted = store.json('fnf_voted_requests', {});
    voted[snap.key] = true;
    store.setJson('fnf_voted_requests', voted);
    document.getElementById('req-mod-name').value = '';
    document.getElementById('req-mod-link').value = '';
    toast(t('¡Solicitud enviada! Ahora otros pueden votar.', 'Request sent! Others can vote now.'), 'list');
  } catch (err) {
    console.error('Error al enviar solicitud:', err);
    alert('❌ Hubo un error al enviar la solicitud. Verifica tu conexión.');
  } finally {
    btn.disabled = false; btn.textContent = t('Enviar solicitud', 'Send request');
  }
};

window.voteRequest = (id) => {
  if (window.exigirRegistro()) return;
  const voted = store.json('fnf_voted_requests', {});
  if (voted[id]) { delete voted[id]; runTransaction(ref(db, `mod_requests/${id}/votes`), v => Math.max(0, (v || 1) - 1)); }
  else { voted[id] = true; runTransaction(ref(db, `mod_requests/${id}/votes`), v => (v || 0) + 1); }
  store.setJson('fnf_voted_requests', voted);
  vibrate(15);
};

window.updateRequestStatus = async (id, status) => {
  if (!isSuperUser) return;
  const req = (await get(ref(db, `mod_requests/${id}`))).val();
  if (!req) return;
  await update(ref(db, `mod_requests/${id}`), { status });
  const msgs = {
    'Seleccionado': `Hola ${req.user}, tu mod "${req.modName}" fue seleccionado con éxito, puedes ver el progreso que lleva este port.`,
    'No Seleccionado': `Hola ${req.user}, lamentablemente tu mod "${req.modName}" no fue seleccionado por pocos votos, puedes intentar pedirlo después.`,
    'Completado': `Hola ${req.user}, tu mod "${req.modName}" fue completado con éxito, ya puedes encontrarlo en el menú de mods.`
  };
  if (req.ownerKey && req.ownerKey !== 'guest' && msgs[status]) {
    await set(ref(db, `user_notifications/${req.ownerKey}`), { message: msgs[status], timestamp: Date.now(), id: Math.random().toString(36).slice(2, 11) });
  }
};
window.updateRequestProgress = (id, v) => { if (isSuperUser) update(ref(db, `mod_requests/${id}`), { progress: parseInt(v) }); };
window.deleteRequest = (id) => { if (isSuperUser && confirm('¿Eliminar esta solicitud?')) remove(ref(db, `mod_requests/${id}`)); };

// ==========================================
// REPORTES DE LINKS + TELEGRAM
// ==========================================
const TELEGRAM_BOT_TOKEN = '7599981153:AAH6tPHek2C02UeVHc-lACFtfVK_XleB6VI';
const TELEGRAM_CHAT_ID = '5429172831';

const sendTelegram = (text) => fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' })
});

window.reportError = async (id) => {
  if (window.exigirRegistro()) return;
  const p = getProfile();
  if (!confirm('🚨 ¿Estás seguro? Esto apagará la descarga para todos y alertará al administrador.')) return;
  await set(ref(db, `broken_links/${id}`), { reportedBy: profileName(p), timestamp: Date.now() });
  window.closeDetail();
  toast(t('¡Reporte enviado! El administrador fue notificado.', 'Report sent! The admin was notified.'), 'alert');
  const d = (window.MOD_DATA || {})[id] || (window.APK_DATA || {})[id] || (window.SCRIPTS_DATA || {})[id] || {};
  sendTelegram(`🚨 *ALERTA DE LINK CAÍDO* 🚨\n\nEl usuario *${profileName(p)}* reportó un enlace caído:\n\n📦 Mod: *${d.title || 'Desconocido'}*\n🆔 ID: \`${id}\`\n\n🛠️ ¡Ve a solucionarlo!`)
    .catch(err => console.error('Error Telegram:', err));
};

window.enviarMensajeAlBot = async () => {
  const box = document.getElementById('txt-mensaje-telegram');
  const btn = document.getElementById('btn-enviar-telegram');
  const msg = box.value.trim();
  if (!msg) return toast(t('¡Escribe un mensaje primero!', 'Write a message first!'), 'send');

  const p = getProfile();
  const label = btn.querySelector('span');
  btn.disabled = true;
  label.textContent = t('Enviando...', 'Sending...');
  try {
    const res = await sendTelegram(`🚨 *NUEVO TICKET DE SOPORTE* 🚨\n\n👤 *De:* ${p ? profileName(p) : 'Usuario invitado'}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n💬 *Mensaje:*\n${msg}`);
    if (!res.ok) throw new Error('API');
    box.value = '';
    toast(t('¡Mensaje enviado con éxito!', 'Message sent!'), 'send');
  } catch (e) {
    toast(t('No se pudo enviar. Intenta de nuevo.', 'Could not send. Try again.'), 'alert');
  } finally {
    btn.disabled = false;
    label.textContent = t('Enviar mensaje', 'Send message');
  }
};

// ==========================================
// COMPARTIR
// ==========================================
let shareLink = '';
let shareText = '';

window.abrirMenuCompartir = (id, nombre) => {
  shareLink = `${location.origin}${location.pathname}?share=${id}`;
  shareText = `¡Mira esto: *${nombre}*! Descárgalo aquí:\n`;
  if (navigator.share) {
    navigator.share({ title: nombre, text: shareText.replace(/\*/g, ''), url: shareLink }).catch(() => { });
    return;
  }
  openPopup('share-modal');
};
window.enviarWhatsApp = () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + shareLink)}`, '_blank');
window.enviarTelegram = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`, '_blank');
window.copiarEnlace = () => {
  navigator.clipboard.writeText(shareText + shareLink).then(() => {
    toast(t('¡Enlace copiado!', 'Link copied!'), 'share');
    closePopup('share-modal');
  });
};

const sharedId = urlParams.get('share');
if (sharedId) {
  history.replaceState({}, document.title, location.pathname);
  setTimeout(() => {
    if (sharedId.startsWith('apk')) window.openApkInfo(sharedId);
    else if (sharedId.startsWith('script')) window.openScriptInfo(sharedId);
    else window.openModInfo(sharedId);
    const box = document.querySelector('#detail-popup .popup-content');
    if (box) { box.classList.add('brillo-epico'); setTimeout(() => box.classList.remove('brillo-epico'), 5000); }
  }, 1200);
}

// ==========================================
// ACCESO OCULTO (mantener presionado el título 5 s)
// ==========================================
const fnfTitle = document.getElementById('fnf-title');
let holdTimer;
const startHold = () => { holdTimer = setTimeout(() => openPopup('admin-popup'), 5000); };
const endHold = () => clearTimeout(holdTimer);
fnfTitle.addEventListener('pointerdown', startHold);
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => fnfTitle.addEventListener(ev, endHold));

window.verifyAdmin = () => {
  if (btoa(document.getElementById('adminCode').value) === 'bGFsb2NmbW9kczE=') {
    store.set('superUser', 'true');
    alert('Modo superusuario activado.');
    location.reload();
  } else {
    alert('Código incorrecto.');
  }
};

// ==========================================
// NOVEDADES (.txt), FAQ y GALERÍA
// ==========================================
window.cargarNovedadesTXT = (id, tipo) => {
  const box = document.getElementById('texto-novedades-ios');
  box.textContent = t('Cargando información...', 'Loading...');
  openPopup('modal-novedades-ios');
  const path = tipo === 'script' ? `assets/scripts/update/${id}.txt` : `assets/bases/update/${id}.txt`;
  fetch(path)
    .then(r => r.ok ? r : fetch('https://raw.githubusercontent.com/LaloCF2/fnf_ports/main/' + path))
    .then(r => { if (!r.ok) throw new Error('404'); return r.text(); })
    .then(txt => { box.textContent = txt; })
    .catch(() => { box.textContent = t('No hay novedades registradas para esta versión aún.', 'No update notes yet.'); });
};
window.cerrarModalNovedades = () => closePopup('modal-novedades-ios');

window.toggleFaq = (btn) => {
  btn.classList.toggle('active');
  btn.nextElementSibling.classList.toggle('open');
  vibrate(10);
};

const GALERIAS = {
  zarchiver: [1, 2, 3, 4, 5].map(n => `assets/images/help/za/za${n}.webp`),
  gestor: [1, 2, 3, 4].map(n => `assets/images/help/gestor/gestor${n}.webp`),
  files: [1, 2, 3, 4, 5, 6, 7].map(n => `assets/images/help/files/files${n}.webp`)
};
let galeria = [];
let galIdx = 0;
const pintarGaleria = () => {
  const img = document.getElementById('imagen-gigante');
  img.removeAttribute('data-fallback');
  img.src = galeria[galIdx];
  setText('contador-imagenes', `${galIdx + 1} / ${galeria.length}`);
};
window.abrirGaleria = (app) => { galeria = GALERIAS[app] || []; galIdx = 0; pintarGaleria(); document.getElementById('mi-lightbox').classList.add('show'); };
window.cerrarGaleria = () => document.getElementById('mi-lightbox').classList.remove('show');
window.cambiarImagen = (d) => { galIdx = (galIdx + d + galeria.length) % galeria.length; pintarGaleria(); };

// ==========================================
// AJUSTES
// ==========================================
const root = document.documentElement.style;

const applyCustomFont = (dataUrl) => {
  const st = document.createElement('style');
  st.textContent = `@font-face{font-family:'CustomUserFont';src:url('${dataUrl}') format('truetype');font-display:swap}body,button,input,textarea,select{font-family:'CustomUserFont',sans-serif!important}`;
  document.head.appendChild(st);
};
const savedFont = store.get('customUserFont');
if (savedFont) applyCustomFont(savedFont);

function bindSwitch(id, key, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.checked = store.get(key) === 'true';
  el.addEventListener('change', () => { store.set(key, String(el.checked)); onChange && onChange(el.checked); vibrate(20); });
}

// Tema oscuro
const darkToggle = document.getElementById('darkToggle');
darkToggle.checked = document.documentElement.getAttribute('data-theme') === 'dark';
darkToggle.addEventListener('change', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (darkToggle.checked !== isDark) window.toggleTheme();
});

// Color de acento (el valor viejo #00eaff era del diseño anterior)
const colorInput = document.getElementById('themeColor');
const savedColor = store.get('customThemeColor');
if (savedColor && savedColor !== '#00eaff') colorInput.value = savedColor;
colorInput.addEventListener('input', (e) => { root.setProperty('--accent', e.target.value); store.set('customThemeColor', e.target.value); });

// Cristal
const blurSlider = document.getElementById('blurSlider');
blurSlider.value = store.get('glassBlur', '16');
blurSlider.addEventListener('input', (e) => { root.setProperty('--glass-blur', e.target.value + 'px'); store.set('glassBlur', e.target.value); });

// Gama baja
if (store.get('lowEndMode') === 'true') document.body.classList.add('low-end-mode');
bindSwitch('lowEndToggle', 'lowEndMode', (on) => {
  document.body.classList.toggle('low-end-mode', on);
  toggleParticles(!on && store.get('particlesMode') === 'true');
});

// Vibración
bindSwitch('hapticToggle', 'hapticMode', (on) => { if (on && navigator.vibrate) navigator.vibrate(50); });

// Partículas FNF
let particleTimer;
const ARROWS = ['down', 'left', 'right', 'up'];
function toggleParticles(enable) {
  const box = document.getElementById('particles-container');
  clearInterval(particleTimer);
  if (!enable) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = 'block';
  const spawnRate = Math.max(250, 2500 - Number(store.get('particlesSpawn', '25')) * 22);
  const baseSpeed = 14 - Number(store.get('particlesSpeed', '50')) * 0.12;
  particleTimer = setInterval(() => {
    if (document.hidden || box.childElementCount > 25) return;
    const img = document.createElement('img');
    img.className = 'fnf-particle';
    img.alt = '';
    img.src = `assets/images/Particles/${ARROWS[Math.random() * 4 | 0]}.webp`;
    img.style.left = Math.random() * 100 + 'vw';
    const dur = Math.random() * (baseSpeed / 2) + baseSpeed;
    img.style.animationDuration = dur + 's';
    box.appendChild(img);
    setTimeout(() => img.remove(), (dur + 1) * 1000);
  }, spawnRate);
}
const particleSettings = document.getElementById('particle-settings-container');
particleSettings.style.display = store.get('particlesMode') === 'true' ? 'block' : 'none';
bindSwitch('particlesToggle', 'particlesMode', (on) => {
  particleSettings.style.display = on ? 'block' : 'none';
  toggleParticles(on && store.get('lowEndMode') !== 'true');
});
if (store.get('particlesMode') === 'true' && store.get('lowEndMode') !== 'true') toggleParticles(true);

const scale = document.getElementById('particleScaleSlider');
scale.value = store.get('particlesScale', '40');
root.setProperty('--escala-particulas', scale.value + 'px');
scale.addEventListener('input', (e) => { root.setProperty('--escala-particulas', e.target.value + 'px'); store.set('particlesScale', e.target.value); });
[['particleSpawnSlider', 'particlesSpawn', '25'], ['particleSpeedSlider', 'particlesSpeed', '50']].forEach(([id, key, def]) => {
  const s = document.getElementById(id);
  s.value = store.get(key, def);
  s.addEventListener('change', (e) => {
    store.set(key, e.target.value);
    if (store.get('particlesMode') === 'true' && store.get('lowEndMode') !== 'true') toggleParticles(true);
  });
});

// Fuente propia
document.getElementById('customFontUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file || !file.name.toLowerCase().endsWith('.ttf')) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    applyCustomFont(evt.target.result);
    try { localStorage.setItem('customUserFont', evt.target.result); }
    catch (err) { alert('Archivo muy pesado para guardarse permanente, pero se aplicará ahora.'); }
  };
  reader.readAsDataURL(file);
});

window.resetSettings = () => {
  if (!confirm(t('¿Restablecer el diseño predeterminado?', 'Reset to default design?'))) return;
  ['customThemeColor', 'customUserFont', 'lowEndMode', 'hapticMode', 'glassBlur', 'particlesMode', 'particlesScale', 'particlesSpawn', 'particlesSpeed', 'fnf_theme']
    .forEach(k => store.remove(k));
  location.reload();
};

// ==========================================
// ACTUALIZACIÓN E INSTALACIÓN (PWA)
// ==========================================
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

window.closeUpdatePopup = () => {
  closePopup('update-popup');
  store.set('lastVersionSeen', APP_VERSION);
  if (deferredPrompt) setTimeout(() => openPopup('install-popup'), 400);
};
window.installApp = async () => {
  closePopup('install-popup');
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
};
window.dismissInstall = () => closePopup('install-popup');

if (store.get('lastVersionSeen') !== APP_VERSION) setTimeout(() => openPopup('update-popup'), 600);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(err => console.log('Service Worker no disponible:', err.message));
}
}).catch(err => console.error(err));
