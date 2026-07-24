import { app, db, auth, googleProvider, APP_VERSION, MI_UID_ADMIN } from './modules/firebase-config.js';
import { ref, get, set, update, remove, push, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let usuarioActualFirebase = null;

import './modules/auth.js';

// ==========================================

import './modules/profile.js';

//=======================================

let isSuperUser = false;
window.isSuperUser = false;
const userProfile = JSON.parse(localStorage.getItem('fnf_user_profile'));

if (userProfile && (
  userProfile.key === MI_UID_ADMIN ||
  userProfile.key === "Mtsvw6hM8FYu19Sk3yPnbDLtfOf2" ||
  (userProfile.nombre && userProfile.nombre.toLowerCase() === 'lalocf')
)) {
  isSuperUser = true;
  window.isSuperUser = true;
  document.body.classList.add('is-admin');
}

const urlParams = new URLSearchParams(window.location.search);
const secretUid = urlParams.get('set_admin');

if (secretUid) {
  const newProfile = {
    key: secretUid,
    name: "Admin LaloCF",
    verified: true
  };
  localStorage.setItem('fnf_user_profile', JSON.stringify(newProfile));

  window.history.replaceState({}, document.title, window.location.pathname);

  alert("🛠️ ¡Privilegios de Administrador Activados en este dispositivo a travez de un enlace compartido!");
  window.location.reload();
}

let verifiedUsers = {};
let downloadCounts = {};

onValue(ref(db, 'downloads'), (snap) => {
  downloadCounts = snap.val() || {};
  Object.keys(downloadCounts).forEach(id => {
    const el = document.getElementById('dl-' + id);
    if (el) el.innerText = downloadCounts[id];
  });
});

onValue(ref(db, 'verified_users'), (snap) => {
  verifiedUsers = snap.val() || {};
});

import './modules/downloads.js';

// -------------------------------------------

window.toggleGreenLed = async (id, event) => {
  event.stopPropagation();
  if (!isSuperUser) return;
  const ledRef = ref(db, `updates_led/${id}`);
  const snap = await get(ledRef);
  if (snap.exists()) {
    await set(ledRef, null);
  } else {
    await set(ledRef, true);
  }
};

onValue(ref(db, 'updates_led'), (snap) => {
  const leds = snap.val() || {};
  document.querySelectorAll('.led-green').forEach(el => el.style.display = 'none');
  Object.keys(leds).forEach(id => {
    const el = document.getElementById(`led-green-${id}`);
    if (el) el.style.display = 'inline-block';
    const btn = document.getElementById(`btn-led-${id}`);
    if (btn) btn.innerText = '⭕ Quitar LED';
  });
  document.querySelectorAll('.admin-led-btn').forEach(btn => {
    const id = btn.id.replace('btn-led-', '');
    if (!leds[id]) btn.innerText = '🟢 Act. LED';
  });
});

onValue(ref(db, 'last_comment_time'), (snap) => {
  const times = snap.val() || {};
  document.querySelectorAll('.led-yellow').forEach(el => el.style.display = 'none');
  Object.keys(times).forEach(id => {
    const lastComment = times[id];
    const lastSeen = localStorage.getItem(`seen_comments_${id}`) || 0;
    if (lastComment > lastSeen) {
      const el = document.getElementById(`led-yellow-${id}`);
      if (el) el.style.display = 'inline-block';
    }
  });
});

window.toggleModPin = async (modId, event) => {
  event.stopPropagation();
  if (!isSuperUser) return;
  const pinRef = ref(db, `pinned_mods/${modId}`);
  const snap = await get(pinRef);
  if (snap.exists()) {
    await set(pinRef, null);
  } else {
    await set(pinRef, true);
  }
};

onValue(ref(db, 'pinned_mods'), (snap) => {
  const pinned = snap.val() || {};
  const container = document.getElementById('modsContainer');
  const cards = Array.from(container.querySelectorAll('.mod-card:not(.coming-soon-card)'));

  cards.forEach(card => {
    const modId = card.id.replace('card-', '');
    const btn = card.querySelector('.admin-pin-btn');
    if (pinned[modId]) {
      card.classList.add('pinned-mod');
      if (btn) btn.innerText = '❌ Desfijar';
    } else {
      card.classList.remove('pinned-mod');
      if (btn) btn.innerText = '📌 Fijar';
    }
  });

  cards.sort((a, b) => {
    const aId = a.id.replace('card-', '');
    const bId = b.id.replace('card-', '');
    const aPinned = pinned[aId] ? 1 : 0;
    const bPinned = pinned[bId] ? 1 : 0;
    return bPinned - aPinned;
  });

  cards.forEach(card => container.appendChild(card));
});

window.sendGlobalNotification = async () => {
  const text = document.getElementById('globalNotifText').value.trim();
  if (!text) return alert("Escribe un mensaje primero.");

  await set(ref(db, 'notifications/latest'), {
    message: text,
    timestamp: Date.now(),
    id: Math.random().toString(36).substr(2, 9)
  });

  document.getElementById('globalNotifText').value = '';
  document.getElementById('admin-tools-popup').classList.remove('show');
};

window.showToast = (msg) => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span style="font-size:20px;">🔔</span> <span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 500);
  }, 6000);
};

onValue(ref(db, 'notifications/latest'), (snap) => {
  const data = snap.val();
  if (!data) return;

  const lastSeen = localStorage.getItem('last_notif_id');
  const isRecent = (Date.now() - data.timestamp) < (24 * 60 * 60 * 1000);

  if (lastSeen !== data.id && isRecent) {
    window.showToast(data.message);
    localStorage.setItem('last_notif_id', data.id);
  }
});

let personalNotifListener = null;
window.listenToPersonalNotifications = (uid) => {
  if (personalNotifListener) return;

  const userNotifRef = ref(db, `user_notifications/${uid}`);
  personalNotifListener = onValue(userNotifRef, (snap) => {
    const data = snap.val();
    if (!data) return;

    const lastSeen = localStorage.getItem(`last_personal_notif_${uid}`);
    if (lastSeen !== data.id) {
      alert("🔔 Notificación sobre tu pedido:\n\n" + data.message);
      localStorage.setItem(`last_personal_notif_${uid}`, data.id);
    }
  });
};

let currentModCommentsId = null;
let modCommentsListener = null;

window.openModComments = (id, title) => {
  if (exigirRegistro()) return;
  currentModCommentsId = id;
  document.getElementById("mc-title").innerText = "Comentarios: " + title;

  localStorage.setItem(`seen_comments_${id}`, Date.now());
  const yellowLed = document.getElementById(`led-yellow-${id}`);
  if (yellowLed) yellowLed.style.display = 'none';

  const user = JSON.parse(localStorage.getItem('fnf_user_profile'));
  if (!user) {
    document.getElementById('register-popup').classList.add('show');
    return;
  }

  const display = document.getElementById('mc-displayMyName');
  const nombreUsuario = user.nombre || user.name || "Usuario";
  const fotoUsuario = user.foto || user.avatar || "";

  display.innerText = "Comentando como: " + nombreUsuario;
  if (nombreUsuario.toLowerCase() === 'lalocf') display.classList.add('admin-name');

  const avatar = document.getElementById('mc-myAvatar');
  if (fotoUsuario) {
    avatar.innerHTML = `<img src="${fotoUsuario}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    avatar.style.background = 'transparent';
  } else {
    avatar.innerHTML = nombreUsuario.charAt(0).toUpperCase();
    avatar.style.background = stringToColor(nombreUsuario);
  }

  document.getElementById("mod-comments-popup").classList.add("show");

  if (modCommentsListener) modCommentsListener();

  const commentsRef = ref(db, `mod_comments/${id}`);
  modCommentsListener = onValue(commentsRef, (snapshot) => {
    const list = document.getElementById('mc-commentList');
    list.innerHTML = '';
    const data = snapshot.val();
    const myProfile = JSON.parse(localStorage.getItem('fnf_user_profile'));

    if (data) {
      let commentsArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));

      commentsArray.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.id.localeCompare(a.id);
      });

      commentsArray.forEach(c => {
        const userName = c.user || "Usuario";
        const isLalo = userName.toLowerCase() === 'lalocf';
        const isVerified = verifiedUsers[c.ownerKey] || isLalo;
        const myLikedComments = JSON.parse(localStorage.getItem('my_liked_mod_comments') || '{}');
        const activeClass = myLikedComments[c.id] ? 'active' : '';

        const pinClass = c.isPinned ? 'pinned' : '';
        const pinBadge = c.isPinned ? '<div class="pinned-badge">📌 FIJADO</div>' : '';
        const verifyBadge = isVerified ? '<span class="verified-icon">☑️</span>' : '';

        let adminBtns = '';
        if (isSuperUser) {
          adminBtns = `
             <span style="color:gold; cursor:pointer" onclick="togglePinModComment('${c.id}', ${c.isPinned})">${c.isPinned ? 'Desfijar' : '📌 Fijar'}</span> • 
             <span style="color:red; cursor:pointer" onclick="deleteModComment('${c.id}')">Eliminar</span>
           `;
        } else if (myProfile && c.ownerKey === myProfile.key) {
          adminBtns = `<span style="color:red; cursor:pointer" onclick="deleteModComment('${c.id}')">Eliminar</span>`;
        }

        const avatarContent = c.avatar
          ? `<img src="${c.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`
          : userName.charAt(0).toUpperCase();

        const div = document.createElement('div');
        div.className = `yt-comment-container ${pinClass}`;
        div.innerHTML = `
          <div class="yt-avatar" style="background:${c.avatar ? 'transparent' : stringToColor(c.user)}">${avatarContent}</div>
          <div class="yt-content">
            ${pinBadge}
            <div class="yt-header">
              <span class="yt-name ${isLalo ? 'admin-name' : ''}" onclick="openBanPanel('${c.ownerKey}', '${userName}')">
                <a href="${c.link || '#'}" target="_blank" class="yt-name-link">${userName}</a>${verifyBadge}
              </span>
              <span class="yt-date">${c.date}</span>
            </div>
            <div class="yt-text">${c.text}</div>
            <div class="yt-actions">
              <span class="yt-action-btn ${activeClass}" id="btn-mclike-${c.id}" onclick="likeModComment('${c.id}')">👍 <span id="mcl-count-${c.id}">${c.likes || 0}</span></span> 
              <span class="yt-action-btn" onclick="replyModComment('${userName}')">Responder</span>
              ${adminBtns}
            </div>
          </div>`;
        list.appendChild(div);
      });
    } else {
      list.innerHTML = '<p style="text-align:center; color:#aaa; font-size:13px;">Sé el primero en comentar aquí.</p>';
    }
  });
};

window.closeModComments = () => {
  document.getElementById("mod-comments-popup").classList.remove("show");
  if (modCommentsListener) {
    modCommentsListener();
    modCommentsListener = null;
  }
};

window.addModComment = async () => {
  if (await checkBanStatus()) return;
  const profile = JSON.parse(localStorage.getItem('fnf_user_profile'));
  const text = document.getElementById('mc-commentText').value.trim();
  if (!profile) return checkUserStatus();
  if (!text) return alert("Escribe algo...");

  push(ref(db, `mod_comments/${currentModCommentsId}`), {
    ownerKey: profile.key,
    user: profile.nombre || profile.name || "Usuario",
    link: profile.link || "#",
    avatar: profile.foto || profile.avatar || "",
    text,
    date: new Date().toLocaleString(),
    likes: 0,
    isPinned: false
  });

  set(ref(db, `last_comment_time/${currentModCommentsId}`), Date.now());
  document.getElementById('mc-commentText').value = '';
};

window.likeModComment = async (commentId) => {
  if (await checkBanStatus()) return;

  if (!usuarioActualFirebase) {
    alert("🔒 Debes iniciar sesión con Google para dar Like a los comentarios.");
    document.getElementById('auth-overlay').style.display = 'flex';
    return;
  }

  const userKey = usuarioActualFirebase.uid;

  const myLikedComments = JSON.parse(localStorage.getItem('my_liked_mod_comments') || '{}');
  const likeRef = ref(db, `mod_comments/${currentModCommentsId}/${commentId}/userLikes/${userKey}`);
  const snap = await get(likeRef);

  if (snap.exists()) {
    await set(likeRef, null);
    runTransaction(ref(db, `mod_comments/${currentModCommentsId}/${commentId}/likes`), (c) => (c || 1) - 1);
    delete myLikedComments[commentId];
  } else {
    await set(likeRef, true);
    runTransaction(ref(db, `mod_comments/${currentModCommentsId}/${commentId}/likes`), (c) => (c || 0) + 1);
    myLikedComments[commentId] = true;
  }
  localStorage.setItem('my_liked_mod_comments', JSON.stringify(myLikedComments));
};

window.deleteModComment = (id) => {
  if (!usuarioActualFirebase) return alert("❌ Como Administrador, primero debes INICIAR SESIÓN con Google para tener permisos de base de datos y poder borrar.");
  if (confirm("¿Borrar comentario?")) remove(ref(db, `mod_comments/${currentModCommentsId}/${id}`));
};
window.togglePinModComment = (cId, currentState) => update(ref(db, `mod_comments/${currentModCommentsId}/${cId}`), { isPinned: !currentState });
window.replyModComment = (name) => { const txt = document.getElementById('mc-commentText'); txt.value = `@${name} `; txt.focus(); };

document.getElementById('mc-commentText').addEventListener('input', function () { document.getElementById('mc-charCounter').innerText = this.value.length; });

window.toggleVerify = (userKey) => { if (confirm("¿Dar insignia de verificado?")) { update(ref(db, `verified_users`), { [userKey]: true }); } };

onValue(ref(db, ".info/connected"), (snap) => {
  if (snap.val() === true) {
    document.getElementById("statusDot").classList.add("online");
    document.getElementById("statusText").innerText = "Servidor: Activo";
    document.getElementById("statusText").style.color = "#00ff41";
  } else {
    document.getElementById("statusDot").classList.remove("online");
    document.getElementById("statusText").innerText = "Servidor: Desconectado";
    document.getElementById("statusText").style.color = "#aaa";
  }
});

import './modules/ui-theme.js';
// ==========================================

let tiempoEsperaBusqueda;

window.filterContent = () => {
  clearTimeout(tiempoEsperaBusqueda);

  tiempoEsperaBusqueda = setTimeout(() => {

    const search = document.getElementById('globalSearch').value.toLowerCase();
    const items = document.querySelectorAll('.mod-card');
    const apks = document.querySelectorAll('.apk-card');

    items.forEach(item => {
      if (item.classList.contains('coming-soon-card')) return;
      const title = item.querySelector('h3').innerText.toLowerCase();
      const itemGama = item.getAttribute('data-gama') || 'mid';
      const tags = (item.getAttribute('data-tags') || '').toLowerCase();
      const matchesSearch = title.includes(search) || tags.includes(search);
      const matchesFilter = typeof currentFilter !== 'undefined' ? (currentFilter === 'all' || itemGama === currentFilter) : true;
      item.style.display = (matchesSearch && matchesFilter) ? "block" : "none";
    });

    apks.forEach(apk => {
      const title = apk.querySelector('h3').innerText.toLowerCase();
      apk.style.display = title.includes(search) ? "block" : "none";
    });

  }, 300);
};

async function checkBanStatus() {
  const profile = JSON.parse(localStorage.getItem('fnf_user_profile'));
  if (!profile) return false;
  const snap = await get(ref(db, `banned_users/${profile.key}`));
  if (snap.exists()) {
    const banData = snap.val();
    if (Date.now() < banData.expiresAt) {
      const timeLeft = Math.ceil((banData.expiresAt - Date.now()) / 3600000);
      alert(`⛔ ACCESO DENEGADO\nMotivo: ${banData.reason}\nExpira en: ${timeLeft}h`);
      return true;
    } else {
      await set(ref(db, `banned_users/${profile.key}`), null);
      return false;
    }
  }
  return false;
}

window.openBanPanel = (userKey, userName) => {
  if (!isSuperUser) return;
  document.getElementById('ban-target-info').innerText = `Gestionando a: ${userName}`;
  document.getElementById('ban-popup').classList.add('show');
  document.getElementById('confirmBanBtn').onclick = async () => {
    const reason = document.getElementById('banReason').value || "Normas";
    const hours = parseInt(document.getElementById('banDuration').value) || 24;
    await set(ref(db, `banned_users/${userKey}`), { userName, reason, expiresAt: Date.now() + (hours * 3600000) });
    alert("Usuario baneado.");
    document.getElementById('ban-popup').classList.remove('show');
  };
};

function checkUserStatus() {
  const user = JSON.parse(localStorage.getItem('fnf_user_profile'));
  if (!user) { document.getElementById('register-popup').classList.add('show'); }
  else { updateCommentInterface(user); syncLikeButtons(); }
}

function updateCommentInterface(user) {
  const display = document.getElementById('mc-displayMyName');
  if (display) {
    const nombreUsuario = user.nombre || user.name || "Usuario";
    const fotoUsuario = user.foto || user.avatar || "";

    display.innerText = "Comentando como: " + nombreUsuario;
    if (nombreUsuario.toLowerCase() === 'lalocf') display.classList.add('admin-name');

    const avatar = document.getElementById('mc-myAvatar');
    if (fotoUsuario) {
      avatar.innerHTML = `<img src="${fotoUsuario}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      avatar.style.background = 'transparent';
    } else {
      avatar.innerText = nombreUsuario.charAt(0).toUpperCase();
      avatar.style.background = stringToColor(nombreUsuario);
    }
  }
}

window.saveRegistration = () => {
  const name = document.getElementById('regName').value.trim();
  const link = document.getElementById('regLink').value.trim() || "#";
  const avatar = document.getElementById('regAvatar').value.trim() || "";
  if (name.length < 3) return alert("El nombre es corto, intenta agregarle mas caracteres.");

  const oldProfile = JSON.parse(localStorage.getItem('fnf_user_profile'));
  const key = oldProfile ? oldProfile.key : 'user_' + Math.random().toString(36).substr(2, 9);

  const profile = { name, link, avatar, key };
  localStorage.setItem('fnf_user_profile', JSON.stringify(profile));
  document.getElementById('register-popup').classList.remove('show');
  location.reload();
};

let holdTimer;
const fnfTitle = document.getElementById('fnf-title');
const _0xd1a4 = "bGFsb2NmbW9kczE=";

fnfTitle.addEventListener('mousedown', startHold);
fnfTitle.addEventListener('mouseup', endHold);
fnfTitle.addEventListener('touchstart', startHold);
fnfTitle.addEventListener('touchend', endHold);

function startHold() { holdTimer = setTimeout(() => { document.getElementById('admin-popup').classList.add('show'); }, 5000); }
function endHold() { clearTimeout(holdTimer); }

window.verifyAdmin = () => {
  const input = document.getElementById('adminCode').value;
  if (btoa(input) === _0xd1a4) {
    localStorage.setItem('superUser', 'true');
    alert("Modo Superusuario Activado.");
    location.reload();
  } else { alert("Código incorrecto."); }
};

function stringToColor(str) {
  let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
  return `hsl(${hash % 360}, 65%, 50%)`;
}

window.handleLike = async (id, el) => {

  if (await checkBanStatus()) return;

  if (exigirRegistro()) return;

  const userKey = usuarioActualFirebase.uid;

  const myLikedItems = JSON.parse(localStorage.getItem('my_liked_items') || '{}');
  const itemLikeRef = ref(db, `likes_registry/${id}/${userKey}`);
  const snap = await get(itemLikeRef);

  if (snap.exists()) {
    await set(itemLikeRef, null);
    runTransaction(ref(db, `likes/${id}`), (c) => (c || 1) - 1);
    delete myLikedItems[id];
    el.classList.remove('active');
  } else {
    await set(itemLikeRef, true);
    runTransaction(ref(db, `likes/${id}`), (c) => (c || 0) + 1);
    myLikedItems[id] = true;
    el.classList.add('active');
  }

  localStorage.setItem('my_liked_items', JSON.stringify(myLikedItems));
};

function syncLikeButtons() {
  const myLikedItems = JSON.parse(localStorage.getItem('my_liked_items') || '{}');
  Object.keys(myLikedItems).forEach(id => {
    const btn = document.getElementById('like-' + id);
    if (btn) btn.classList.add('active');
  });
}

import './modules/data-scripts.js';

let scriptImagesArray = [];
let currentScriptImgIndex = 0;

// ==========================================
window.cargarNovedadesTXT = function (id, tipo) {
  const modal = document.getElementById('modal-novedades-ios');
  const cajaTexto = document.getElementById('texto-novedades-ios');

  cajaTexto.innerHTML = `<div style="text-align: center; padding: 20px 0;"><span style="font-size: 24px;">⏳</span><br><br>Cargando información...</div>`;
  modal.classList.add('show');

  const rutaTXT = tipo === 'script' ? `assets/scripts/update/${id}.txt` : `assets/bases/update/${id}.txt`;

  fetch(rutaTXT)
    .then(response => {
      if (!response.ok) throw new Error("Archivo no encontrado");
      return response.text();
    })
    .then(textoLimpio => {
      cajaTexto.innerText = textoLimpio;
    })
    .catch(error => {
      console.error(error);
      const idioma = localStorage.getItem('idioma_guardado') || 'es';
      const msjError = idioma === 'en' ? "No update logs found." : "No hay novedades registradas para esta versión aún.";

      cajaTexto.innerHTML = `<div style="text-align: center; color: #ff453a; padding: 10px 0;">${msjError}</div>`;
    });
};

window.cerrarModalNovedades = function () {
  document.getElementById('modal-novedades-ios').classList.remove('show');
};

//===================================



import './modules/data-mods.js';
import './modules/data-apks.js';
import './modules/auth.js';
import './modules/profile.js';
import './modules/favorites.js';



onValue(ref(db, 'likes'), (s) => { const d = s.val() || {}; Object.keys(d).forEach(k => { if (document.getElementById('count-' + k)) document.getElementById('count-' + k).innerText = d[k]; }); });

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.closeUpdatePopup = () => {
  document.getElementById('update-popup').classList.remove('show');
  localStorage.setItem('lastVersionSeen', APP_VERSION);

  if (deferredPrompt) {
    document.getElementById('install-popup').classList.add('show');
  } else {
    checkUserStatus();
  }
};

window.installApp = async () => {
  document.getElementById('install-popup').classList.remove('show');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
  checkUserStatus();
};

window.dismissInstall = () => {
  document.getElementById('install-popup').classList.remove('show');
  checkUserStatus();
};

window.onload = () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  if (localStorage.getItem('lastVersionSeen') !== APP_VERSION) document.getElementById('update-popup').classList.add('show');
  else checkUserStatus();
};

let currentLang = localStorage.getItem('fnf_lang') || 'es';

window.toggleLanguage = () => {
  currentLang = currentLang === 'es' ? 'en' : 'es';
  localStorage.setItem('fnf_lang', currentLang);
  applyLanguage();
};

function applyLanguage() {
  const elements = document.querySelectorAll('[data-es][data-en]');
  elements.forEach(el => {
    el.classList.add('lang-fade');
    setTimeout(() => {
      el.innerHTML = el.getAttribute(`data-${currentLang}`);
      el.classList.remove('lang-fade');
    }, 150);
  });
  const btn = document.getElementById('langBtn');
  if (btn) btn.innerHTML = currentLang === 'es' ? '🇬🇧 EN' : '🇪🇸 ES';
}

const initV4 = setInterval(() => {
  if (document.getElementById('langBtn')) {
    clearInterval(initV4);
    applyLanguage();

    const profile = JSON.parse(localStorage.getItem('fnf_user_profile'));
    if (profile) {
      const nameInput = document.getElementById('editProfileName');
      const avatarInput = document.getElementById('editProfileAvatar');
      const preview = document.getElementById('profile-avatar-preview');

      if (nameInput && profile.name) nameInput.value = profile.name;
      if (avatarInput && profile.avatar) {
        avatarInput.value = profile.avatar;
        if (preview) preview.src = profile.avatar;
      }
    }

    const avatarInput = document.getElementById('editProfileAvatar');
    if (avatarInput) {
      avatarInput.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        const preview = document.getElementById('profile-avatar-preview');
        if (preview) {
          preview.src = url ? url : "https://via.placeholder.com/80/555/fff?text=?";
        }
      });
    }
  }
}, 500);

window.saveProfileChanges = () => {
  let profile = JSON.parse(localStorage.getItem('fnf_user_profile')) || { key: 'user_' + Math.random().toString(36).substr(2, 9), link: '#' };

  const name = document.getElementById('editProfileName').value.trim();
  const avatar = document.getElementById('editProfileAvatar').value.trim();

  if (name.length < 3) return alert(currentLang === 'es' ? "El nombre es corto, intenta agregarle mas caracteres." : "The name is too short, try adding more characters.");

  profile.name = name;
  profile.avatar = avatar;
  localStorage.setItem('fnf_user_profile', JSON.stringify(profile));

  document.getElementById('profile-popup').classList.remove('show');

  if (typeof window.showToast === 'function') {
    window.showToast(currentLang === 'es' ? "¡Perfil actualizado!" : "Profile updated!");
  } else {
    alert(currentLang === 'es' ? "¡Perfil actualizado!" : "Profile updated!");
  }
};

window.currentItemRatingId = null;

setTimeout(() => {
  if (window.openModInfo) {
    const origOpenModInfo = window.openModInfo;
    window.openModInfo = (id) => {
      window.currentItemRatingId = id;
      window.loadItemRating(id, 'mod');
      origOpenModInfo(id);
    };
  }
  if (window.openApkInfo) {
    const origOpenApkInfo = window.openApkInfo;
    window.openApkInfo = (id) => {
      window.currentItemRatingId = id;
      window.loadItemRating(id, 'apk');
      origOpenApkInfo(id);
    };
  }
  if (window.openScriptInfo) {
    const origOpenScriptInfo = window.openScriptInfo;
    window.openScriptInfo = (id) => {
      window.currentItemRatingId = id;
      window.loadItemRating(id, 'script');
      origOpenScriptInfo(id);
    };
  }
}, 1000);

// ==========================================

let globalRatings = {};
window.currentItemRatingId = null;
window.currentItemType = null;

onValue(ref(db, 'ratings'), (snap) => {
  globalRatings = snap.val() || {};

  if (window.currentItemRatingId && window.currentItemType) {
    window.loadItemRating(window.currentItemRatingId, window.currentItemType);
  }
});

setTimeout(() => {
  if (window.openModInfo) {
    const origModInfo = window.openModInfo;
    window.openModInfo = (id) => {
      window.currentItemRatingId = id;
      window.currentItemType = 'mod';
      origModInfo(id);
      window.loadItemRating(id, 'mod');
    };
  }
  if (window.openApkInfo) {
    const origApkInfo = window.openApkInfo;
    window.openApkInfo = (id) => {
      window.currentItemRatingId = id;
      window.currentItemType = 'apk';
      origApkInfo(id);
      window.loadItemRating(id, 'apk');
    };
  }
  if (window.openScriptInfo) {
    const origScriptInfo = window.openScriptInfo;
    window.openScriptInfo = (id) => {
      window.currentItemRatingId = id;
      window.currentItemType = 'script';
      origScriptInfo(id);
      window.loadItemRating(id, 'script');
    };
  }

  // ==========================================

  let modRequestsListener = null;

  window.loadModRequests = () => {
    const reqRef = ref(db, 'mod_requests');
    if (!modRequestsListener) {
      modRequestsListener = onValue(reqRef, (snapshot) => {
        const container = document.getElementById('requests-list');
        container.innerHTML = '';
        const data = snapshot.val();

        if (!data) {
          container.innerHTML = '<p style="color:#aaa; font-size:13px; text-align:center;">No hay solicitudes aún. ¡Sé el primero!</p>';
          return;
        }

        const requests = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        requests.sort((a, b) => (b.votes || 0) - (a.votes || 0));

        requests.forEach(req => {
          const statusColors = {
            'Pendiente': '#f2ff00ff',
            'Seleccionado': '#0091ffff',
            'En Progreso': '#ff8800ff',
            'No Seleccionado': '#ff0000ee',
            'Completado': '#00ff22ff'
          };
          const badgeColor = statusColors[req.status || 'Pendiente'] || '#ffaa00';

          let adminBtns = '';
          if (isSuperUser) {
            const isProgress = req.status === 'En Progreso';
            adminBtns = `
              <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #444; display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
                <button onclick="updateRequestStatus('${req.id}', 'Seleccionado')" style="flex:1; background:#0091ff; color:white; border:none; border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer; padding:8px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.1s;">Seleccionado</button>
                <button onclick="updateRequestStatus('${req.id}', 'No Seleccionado')" style="flex:1; background:#ff0040; color:white; border:none; border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer; padding:8px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.1s;">No Sel.</button>
                <button onclick="updateRequestStatus('${req.id}', 'En Progreso')" style="flex:1; background:#ff8800; color:white; border:none; border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer; padding:8px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.1s;">En Progreso</button>
                <button onclick="updateRequestStatus('${req.id}', 'Completado')" style="flex:1; background:#00ff22; color:black; border:none; border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer; padding:8px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.1s;">Completado</button>
                <button onclick="deleteRequest('${req.id}')" style="background:#444; color:white; border:none; border-radius:6px; font-size:10px; cursor:pointer; padding:8px;">🗑️</button>
              </div>
              ${isProgress ? `
                <div style="margin-top:10px; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px; border:1px solid #ff880055;">
                  <div style="display:flex; justify-content:space-between; font-size:11px; color:#ccc; margin-bottom:8px; font-weight:bold;">
                    <span>Progreso del Port</span>
                    <span id="prog-val-${req.id}" style="color:#ff8800;">${req.progress || 0}%</span>
                  </div>
                  <div style="display:flex; gap:10px; align-items:center;">
                    <input type="range" min="0" max="100" value="${req.progress || 0}" style="flex:1; cursor:pointer; accent-color:#ff8800;" 
                      oninput="document.getElementById('prog-val-${req.id}').innerText = this.value + '%'"
                      onchange="updateRequestProgress('${req.id}', this.value)">
                  </div>
                </div>
              ` : ''}
            `;
          }

          const myVoted = JSON.parse(localStorage.getItem('fnf_voted_requests') || '{}');
          const isVoted = myVoted[req.id];

          const div = document.createElement('div');
          div.style.cssText = 'background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); text-align:left;';
          div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="flex:1; padding-right:10px;">
                <span style="font-size:10px; color:${badgeColor}; border:1px solid ${badgeColor}; padding:2px 5px; border-radius:10px; text-transform:uppercase; font-weight:bold;">${req.status || 'Pendiente'}</span>
                <h4 style="margin:8px 0 5px 0; color:white; font-size:15px;">${req.modName}</h4>
                ${req.link ? `<a href="${req.link}" target="_blank" style="color:var(--neon-pink); font-size:11px; text-decoration:underline;">Ver Link Original</a>` : ''}
                <p style="color:#888; font-size:10px; margin-top:5px;">Pedido por: <b style="color:#aaa;">${req.user || 'Anónimo'}</b></p>
                ${req.status === 'En Progreso' ? `
                  <div style="margin-top:10px; background:rgba(255,255,255,0.05); border-radius:10px; height:6px; overflow:hidden; position:relative;">
                    <div style="position:absolute; top:0; left:0; height:100%; width:${req.progress || 0}%; background:linear-gradient(90deg, #ff8800, #ffaa00); box-shadow:0 0 5px #ff8800; transition:width 0.3s ease;"></div>
                  </div>
                  <div style="text-align:right; font-size:9px; color:#ff8800; margin-top:2px; font-weight:bold;">${req.progress || 0}%</div>
                ` : ''}
              </div>
              <div style="text-align:center;">
                <button onclick="voteRequest('${req.id}')" class="btn" style="background:${isVoted ? 'var(--neon-green)' : '#333'}; color:${isVoted ? 'black' : 'white'}; border:none; border-radius:8px; width:45px; height:40px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow: 0 4px 0 ${isVoted ? '#00cc00' : '#111'}; transform:${isVoted ? 'translateY(2px)' : 'none'}; transition:all 0.1s;">
                  ▲
                </button>
                <div style="color:var(--neon-green); font-weight:bold; font-size:16px; margin-top:8px;">${req.votes || 0}</div>
              </div>
            </div>
            ${adminBtns}
          `;
          container.appendChild(div);
        });
      });
    }
  };

  window.enviarSolicitudMod = async () => {
    const profile = JSON.parse(localStorage.getItem('fnf_user_profile'));
    if (!profile || !profile.nombre) {
      alert("🔒 Debes iniciar sesión con Google para poder solicitar mods.");
      if (document.getElementById('auth-overlay')) document.getElementById('auth-overlay').style.display = 'flex';
      return;
    }

    const name = document.getElementById('req-mod-name').value.trim();
    const link = document.getElementById('req-mod-link').value.trim();

    if (!name) return alert("Escribe el nombre del mod que quieres pedir.");

    const userKey = profile.key || 'guest';
    const lastReqKey = 'fnf_last_req_' + userKey;
    const lastReqTime = parseInt(localStorage.getItem(lastReqKey) || '0');
    const daysPassed = (Date.now() - lastReqTime) / (1000 * 60 * 60 * 24);

    if (lastReqTime > 0 && daysPassed < 10) {
      const daysLeft = Math.ceil(10 - daysPassed);
      return alert(`⏳ Solo puedes pedir un mod cada 10 días. Te faltan ${daysLeft} día(s) restantes para pedir otro mod. Esto es para evitar saturaciones.`);
    }

    const sendBtn = document.getElementById('btn-enviar-solicitud');
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Enviando...'; }

    try {
      const reqSnap = await get(ref(db, 'mod_requests'));
      const reqData = reqSnap.val() || {};

      let activeCount = 0;
      Object.values(reqData).forEach(req => {
        if (req.status !== 'Completado') activeCount++;
      });

      if (activeCount >= 5) {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar Solicitud'; }
        return alert("🛑 La lista de peticiones está llena (Máximo 5 activas). Por favor espera a que el Administrador termine los puertos pendientes. Esto es para evitar saturaciones.");
      }

      const snap = await push(ref(db, 'mod_requests'), {
        modName: name,
        link: link || '',
        user: profile.nombre || "Usuario",
        ownerKey: profile.key || 'guest',
        votes: 1,
        status: 'Pendiente',
        timestamp: Date.now()
      });

      localStorage.setItem(lastReqKey, Date.now().toString());

      if (usuarioActualFirebase) {
        update(ref(db, 'usuarios/' + usuarioActualFirebase.uid), { ultimaSolicitudPort: Date.now() }).catch(() => { });
      }

      let voted = JSON.parse(localStorage.getItem('fnf_voted_requests') || '{}');
      voted[snap.key] = true;
      localStorage.setItem('fnf_voted_requests', JSON.stringify(voted));

      document.getElementById('req-mod-name').value = '';
      document.getElementById('req-mod-link').value = '';
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar Solicitud'; }
      alert("¡Solicitud enviada! Ahora los demás usuarios pueden votar.");

    } catch (err) {
      console.error("Error al enviar solicitud:", err);
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Enviar Solicitud'; }
      alert("❌ Hubo un error al enviar la solicitud. Verifica tu conexión e intenta de nuevo.");
    }
  };

  window.voteRequest = (id) => {
    if (exigirRegistro()) return;
    let voted = JSON.parse(localStorage.getItem('fnf_voted_requests') || '{}');
    if (voted[id]) {
      delete voted[id];
      runTransaction(ref(db, `mod_requests/${id}/votes`), (v) => (v || 1) - 1);
    } else {
      voted[id] = true;
      runTransaction(ref(db, `mod_requests/${id}/votes`), (v) => (v || 0) + 1);
    }
    localStorage.setItem('fnf_voted_requests', JSON.stringify(voted));
  };

  window.updateRequestStatus = async (id, status) => {
    if (!isSuperUser) return;

    // -----------------------------------------------------------
    const reqSnap = await get(ref(db, `mod_requests/${id}`));
    const reqData = reqSnap.val();
    if (!reqData) return;

    await update(ref(db, `mod_requests/${id}`), { status });

    // ------------------------------------------------------------
    if (reqData.ownerKey && reqData.ownerKey !== 'guest') {
      let message = '';
      if (status === 'Seleccionado') {
        message = `Hola ${reqData.user}, tu mod "${reqData.modName}" fue seleccionado con exito, puedes ver el progreso que lleva este port.`;
      } else if (status === 'No Seleccionado') {
        message = `Hola ${reqData.user}, lamentablemente tu mod "${reqData.modName}" no fue seleccionado por pocos votos, puedes intentar despues pedir el mod.`;
      } else if (status === 'Completado') {
        message = `Hola ${reqData.user}, tu mod "${reqData.modName}" que pediste fue completado con exito, puedes encontrarlo en el menú de mods.`;
      }

      if (message) {
        await set(ref(db, `user_notifications/${reqData.ownerKey}`), {
          message: message,
          timestamp: Date.now(),
          id: Math.random().toString(36).substr(2, 9)
        });
      }
    }
  };

  window.updateRequestProgress = (id, progress) => {
    if (!isSuperUser) return;
    update(ref(db, `mod_requests/${id}`), { progress: parseInt(progress) });
  };

  window.deleteRequest = (id) => {
    if (!isSuperUser) return;
    if (confirm("¿Eliminar esta solicitud?")) remove(ref(db, `mod_requests/${id}`));
  };

}, 1500);

window.rateAppItem = async (type, stars) => {
  if (!window.currentItemRatingId) return;
  const profile = JSON.parse(localStorage.getItem('fnf_user_profile'));

  if (!profile) {
    alert(currentLang === 'es' ? "Debes registrarte o configurar tu perfil para calificar." : "You must register or set your profile to rate.");
    return;
  }

  const myRates = JSON.parse(localStorage.getItem('my_ratings') || '{}');

  if (myRates[window.currentItemRatingId]) {
    alert(currentLang === 'es' ? "Ya calificaste esto. ¡Gracias!" : "You already rated this. Thanks!");
    return;
  }

  myRates[window.currentItemRatingId] = stars;
  localStorage.setItem('my_ratings', JSON.stringify(myRates));

  await set(ref(db, `ratings/${window.currentItemRatingId}/${profile.key}`), stars);

  window.updateStarsUI(type, stars);
  const txt = document.getElementById(`${type}-rating-text`);
  if (txt) txt.innerText = currentLang === 'es' ? "¡Gracias por calificar!" : "Thanks for rating!";
};

window.loadItemRating = (id, type) => {
  const container = document.getElementById(`rating-container-${type}`);
  if (!container) return;

  const txt = document.getElementById(`${type}-rating-text`);
  const myRates = JSON.parse(localStorage.getItem('my_ratings') || '{}');

  const modRatings = globalRatings[id] || {};
  const votosArray = Object.values(modRatings);
  const totalVotos = votosArray.length;
  let promedio = 0;

  if (totalVotos > 0) {
    const suma = votosArray.reduce((acc, val) => acc + val, 0);
    promedio = (suma / totalVotos).toFixed(1);
  }

  const spans = container.querySelectorAll('span');

  if (myRates[id]) {
    window.updateStarsUI(type, myRates[id]);
    if (txt) {
      const baseText = currentLang === 'es' ? "Tu calificación" : "Your rating";
      txt.innerText = totalVotos > 0 ? `${baseText} • Promedio: ${promedio} ⭐ (${totalVotos})` : baseText;
    }
  } else {
    spans.forEach(s => { s.style.color = '#555'; s.style.textShadow = 'none'; });
    if (txt) {
      const baseText = currentLang === 'es' ? "Califica este contenido" : "Rate this content";
      txt.innerText = totalVotos > 0 ? `Promedio: ${promedio} ⭐ (${totalVotos}) • ${baseText}` : baseText;
    }
  }
};

window.updateStarsUI = (type, stars) => {
  const container = document.getElementById(`rating-container-${type}`);
  if (!container) return;
  const spans = container.querySelectorAll('span');
  spans.forEach((s, index) => {
    if (index < stars) {
      s.style.color = 'gold';
      s.style.textShadow = '0 0 10px gold';
    } else {
      s.style.color = '#555';
      s.style.textShadow = 'none';
    }
  });
};

// ==========================================


const savedColor = localStorage.getItem('customThemeColor') || '#00eaff';
document.documentElement.style.setProperty('--neon-blue', savedColor);

const savedPillInset = localStorage.getItem('pillInset') || '5';
document.documentElement.style.setProperty('--pill-inset', savedPillInset + 'px');

const savedBlur = localStorage.getItem('glassBlur') || '15';
document.documentElement.style.setProperty('--glass-blur', savedBlur + 'px');

if (localStorage.getItem('lowEndMode') === 'true') document.body.classList.add('low-end-mode');

const applyCustomFont = (base64Font) => {
  const newStyle = document.createElement('style');
  newStyle.appendChild(document.createTextNode(`@font-face { font-family: 'CustomUserFont'; src: url('${base64Font}') format('truetype'); } body, h1, h2, h3, p, span, div, button, input, textarea, a { font-family: 'CustomUserFont', sans-serif !important; }`));
  document.head.appendChild(newStyle);
};
const savedFont = localStorage.getItem('customUserFont');
if (savedFont) applyCustomFont(savedFont);

let chromaInterval;
const toggleChroma = (enable) => {
  if (enable) {
    let hue = 0;
    clearInterval(chromaInterval);
    chromaInterval = setInterval(() => {
      hue = (hue + 2) % 360;
      document.documentElement.style.setProperty('--neon-blue', `hsl(${hue}, 100%, 50%)`);
    }, 50);
  } else {
    clearInterval(chromaInterval);
    document.documentElement.style.setProperty('--neon-blue', localStorage.getItem('customThemeColor') || '#00eaff');
  }
};

let particleInterval;
const toggleParticles = (enable) => {
  const container = document.getElementById('particles-container');
  if (!container) return;
  if (enable) {
    if (particleInterval) clearInterval(particleInterval);
    container.style.display = 'block';

    const spawnValRaw = parseInt(localStorage.getItem('particlesSpawn') || '25');
    const spawnRate = Math.max(100, 2500 - (spawnValRaw * 24));

    const speedValRaw = parseInt(localStorage.getItem('particlesSpeed') || '50');
    const baseSpeed = 14 - (speedValRaw * 0.12);

    particleInterval = setInterval(() => {
      const p = document.createElement('div');
      p.className = 'fnf-particle';

      const flechas = [
        'assets/images/Particles/down.webp',
        'assets/images/Particles/left.webp',
        'assets/images/Particles/right.webp',
        'assets/images/Particles/up.webp'
      ];

      const img = document.createElement('img');
      img.src = flechas[Math.floor(Math.random() * flechas.length)];

      img.onerror = () => {
        const base = 'https://raw.githubusercontent.com/LaloCF2/fnf_ports/main/assets/images/Particles/';
        img.onerror = null;
        img.src = base + ['down', 'left', 'right', 'up'][Math.floor(Math.random() * 4)] + '.webp';
      };

      const escalaAleatoria = Math.random() * 0.5 + 0.8;
      img.style.transform = `scale(${escalaAleatoria})`;

      p.appendChild(img);

      p.style.left = Math.random() * 100 + 'vw';
      const dur = Math.random() * (baseSpeed / 2) + baseSpeed;
      p.style.animationDuration = dur + 's';
      container.appendChild(p);

      setTimeout(() => p.remove(), (dur + 2) * 1000);
    }, spawnRate);
  } else {
    clearInterval(particleInterval);
    container.style.display = 'none';
    container.innerHTML = '';
  }
};

const savedTheme = localStorage.getItem('activeTheme') || 'default';
const themeLink = document.getElementById('theme-stylesheet');

if (savedTheme === 'pro') {
  themeLink.href = 'css/style2.css';
}

window.toggleProMenu = () => {
  document.body.classList.toggle('pro-menu-open');
  window.triggerVibrate(15);
};

document.addEventListener('DOMContentLoaded', () => {
  window.currentLang = localStorage.getItem('fnf_lang') || 'es';

  window.triggerVibrate = (ms = 15) => { if (localStorage.getItem('hapticMode') === 'true' && navigator.vibrate) navigator.vibrate(ms); };
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('.btn, .nav-item, .settings-btn, .lang-btn, .profile-btn, .filter-btn, .admin-led-btn, .admin-pin-btn')) window.triggerVibrate(15);
  });

  window.toggleLanguage = () => {
    window.currentLang = window.currentLang === 'es' ? 'en' : 'es';
    localStorage.setItem('fnf_lang', window.currentLang);
    applyLanguage();
  };
  function applyLanguage() {
    document.querySelectorAll('[data-es][data-en]').forEach(el => {
      el.classList.add('lang-fade');
      setTimeout(() => { el.innerHTML = el.getAttribute(`data-${window.currentLang}`); el.classList.remove('lang-fade'); }, 150);
    });
    const btn = document.getElementById('langBtn');
    if (btn) btn.innerHTML = window.currentLang === 'es' ? '🇬🇧 EN' : '🇪🇸 ES';
  }
  applyLanguage();

  setTimeout(() => {
    const profile = JSON.parse(localStorage.getItem('fnf_user_profile'));
    if (profile) {
      if (document.getElementById('editProfileName') && profile.name) document.getElementById('editProfileName').value = profile.name;
      if (document.getElementById('editProfileAvatar') && profile.avatar) {
        document.getElementById('editProfileAvatar').value = profile.avatar;
        document.getElementById('profile-avatar-preview').src = profile.avatar;
      }
    }
  }, 500);

  const avInput = document.getElementById('editProfileAvatar');
  if (avInput) avInput.addEventListener('input', (e) => { document.getElementById('profile-avatar-preview').src = e.target.value.trim() || "https://via.placeholder.com/80/555/fff?text=?"; });

  window.saveProfileChanges = () => {
    let profile = JSON.parse(localStorage.getItem('fnf_user_profile')) || { key: 'user_' + Math.random().toString(36).substr(2, 9), link: '#' };
    const name = document.getElementById('editProfileName').value.trim();
    if (name.length < 3) return alert(window.currentLang === 'es' ? "Nombre muy corto." : "Name too short.");
    profile.name = name; profile.avatar = document.getElementById('editProfileAvatar').value.trim();
    localStorage.setItem('fnf_user_profile', JSON.stringify(profile));
    document.getElementById('profile-popup').classList.remove('show');
    alert(window.currentLang === 'es' ? "¡Perfil actualizado!" : "Profile updated!");
  };

  const colorInput = document.getElementById('themeColor');
  if (colorInput) {
    colorInput.value = savedColor;
    colorInput.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--neon-blue', e.target.value);
      localStorage.setItem('customThemeColor', e.target.value);
      if (document.getElementById('chromaToggle').checked) {
        document.getElementById('chromaToggle').checked = false;
        toggleChroma(false);
        localStorage.setItem('chromaMode', 'false');
      }
    });
  }

  const chromaToggle = document.getElementById('chromaToggle');
  if (chromaToggle) {
    chromaToggle.checked = localStorage.getItem('chromaMode') === 'true';
    if (chromaToggle.checked) toggleChroma(true);
    chromaToggle.addEventListener('change', (e) => {
      localStorage.setItem('chromaMode', e.target.checked);
      toggleChroma(e.target.checked);
    });
  }

  const particlesToggle = document.getElementById('particlesToggle');
  const particleSettings = document.getElementById('particle-settings-container');
  if (particlesToggle) {
    particlesToggle.checked = localStorage.getItem('particlesMode') === 'true';
    if (particleSettings) particleSettings.style.display = particlesToggle.checked ? 'block' : 'none';

    if (particlesToggle.checked && localStorage.getItem('lowEndMode') !== 'true') toggleParticles(true);
    particlesToggle.addEventListener('change', (e) => {
      localStorage.setItem('particlesMode', e.target.checked);
      if (particleSettings) particleSettings.style.display = e.target.checked ? 'block' : 'none';
      toggleParticles(e.target.checked);
    });
  }

  const particleScaleSlider = document.getElementById('particleScaleSlider');
  if (particleScaleSlider) {
    particleScaleSlider.value = localStorage.getItem('particlesScale') || '40';
    document.documentElement.style.setProperty('--escala-particulas', particleScaleSlider.value + 'px');
    particleScaleSlider.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--escala-particulas', e.target.value + 'px');
      localStorage.setItem('particlesScale', e.target.value);
    });
  }

  const particleSpawnSlider = document.getElementById('particleSpawnSlider');
  if (particleSpawnSlider) {
    particleSpawnSlider.value = localStorage.getItem('particlesSpawn') || '25';
    particleSpawnSlider.addEventListener('change', (e) => {
      localStorage.setItem('particlesSpawn', e.target.value);
      if (particlesToggle && particlesToggle.checked) {
        toggleParticles(false);
        toggleParticles(true);
      }
    });
  }

  const particleSpeedSlider = document.getElementById('particleSpeedSlider');
  if (particleSpeedSlider) {
    particleSpeedSlider.value = localStorage.getItem('particlesSpeed') || '50';
    particleSpeedSlider.addEventListener('change', (e) => {
      localStorage.setItem('particlesSpeed', e.target.value);
    });
  }

  const blurSlider = document.getElementById('blurSlider');
  if (blurSlider) {
    blurSlider.value = savedBlur;
    blurSlider.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--glass-blur', e.target.value + 'px');
      localStorage.setItem('glassBlur', e.target.value);
    });
  }

  const lowEndToggle = document.getElementById('lowEndToggle');
  if (lowEndToggle) {
    lowEndToggle.checked = localStorage.getItem('lowEndMode') === 'true';
    lowEndToggle.addEventListener('change', (e) => {
      localStorage.setItem('lowEndMode', e.target.checked);
      if (e.target.checked) {
        document.body.classList.add('low-end-mode');
        toggleParticles(false);
      } else {
        document.body.classList.remove('low-end-mode');
        if (document.getElementById('particlesToggle').checked) toggleParticles(true);
      }
      window.triggerVibrate(30);
    });
  }

  const hapticToggle = document.getElementById('hapticToggle');
  if (hapticToggle) {
    hapticToggle.checked = localStorage.getItem('hapticMode') === 'true';
    hapticToggle.addEventListener('change', (e) => {
      localStorage.setItem('hapticMode', e.target.checked);
      if (e.target.checked) navigator.vibrate(50);
    });
  }

  const pillSlider = document.getElementById('pillSizeSlider');
  if (pillSlider) {
    pillSlider.value = savedPillInset;
    pillSlider.addEventListener('input', (e) => {
      document.documentElement.style.setProperty('--pill-inset', e.target.value + 'px');
      localStorage.setItem('pillInset', e.target.value);
    });
  }

  const fontInput = document.getElementById('customFontUpload');
  if (fontInput) {
    fontInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.name.toLowerCase().endsWith('.ttf')) {
        const reader = new FileReader();
        reader.onload = function (evt) {
          try { localStorage.setItem('customUserFont', evt.target.result); applyCustomFont(evt.target.result); }
          catch (err) { applyCustomFont(evt.target.result); alert("Archivo muy pesado para guardarse permanente, pero se aplicará ahora."); }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  window.resetSettings = () => {
    if (confirm("¿Restablecer diseño predeterminado?")) {
      localStorage.clear();
      location.reload();
    }
  };

  const isTrueIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const forceIOS = localStorage.getItem('force_ios_ui') === 'true';
  const isIOS = isTrueIOS || forceIOS;

  window.toggleForceIOS = () => {
    const current = localStorage.getItem('force_ios_ui') === 'true';
    localStorage.setItem('force_ios_ui', !current);
    location.reload();
  };

  const initAdminBtn = setInterval(() => {
    const btn = document.getElementById('btnForceIOS');
    if (btn) { btn.innerHTML = forceIOS ? 'Quitar Interfaz iOS' : 'Forzar Interfaz iOS'; clearInterval(initAdminBtn); }
  }, 500);

  setTimeout(() => {
    const nav = document.querySelector('.bottom-nav');
    const pill = document.getElementById('ios-pill');
    const navItems = document.querySelectorAll('.nav-item');

    if (isIOS && nav && pill) {
      nav.classList.add('is-ios');
      if (navItems[0]) pill.style.width = `${navItems[0].offsetWidth}px`;

      const snapPill = (index) => {
        pill.classList.remove('is-dragging');
        const target = navItems[index];
        if (target) {
          let currentX = 0;
          const transformMatch = pill.style.transform.match(/translateX\(([^p]+)px\)/);
          if (transformMatch) currentX = parseFloat(transformMatch[1]);

          const targetX = target.offsetLeft;
          const distance = Math.abs(targetX - currentX);

          pill.style.width = `${target.offsetWidth}px`;

          if (distance > 30) {
            const stretch = Math.min(1 + (distance * 0.002), 1.35);
            const skew = targetX > currentX ? -10 : 10;

            pill.style.transform = `translateX(${currentX + (targetX - currentX) * 0.5}px) scaleX(${stretch}) scaleY(${1 / stretch}) skewX(${skew}deg)`;

            setTimeout(() => {
              pill.style.transform = `translateX(${targetX}px) scaleX(1) scaleY(1) skewX(0deg)`;
            }, 100);
          } else {
            pill.style.transform = `translateX(${targetX}px) scaleX(1) scaleY(1) skewX(0deg)`;
          }

          window.triggerVibrate(25);
        }
      };

      const originalSelectSection = window.selectSection;
      window.selectSection = (sec, el) => {
        if (originalSelectSection) originalSelectSection(sec, el);
        const index = Array.from(navItems).indexOf(el);
        if (index !== -1) snapPill(index);
      };

      let isDraggingPill = false;
      let lastXPos = null;

      const moveDrag = (e) => {
        if (!e.touches && !isDraggingPill) return;
        if (e.touches) e.preventDefault();
        isDraggingPill = true;
        pill.classList.add('is-dragging');

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const navRect = nav.getBoundingClientRect();
        let xPos = Math.max(0, Math.min(clientX - navRect.left, navRect.width));

        let stretch = 1.15;
        let skew = 0;
        if (lastXPos !== null) {
          const diff = xPos - lastXPos;
          const velocity = Math.min(Math.abs(diff), 25);
          stretch = 1 + (velocity * 0.02);
          skew = diff > 0 ? velocity * -0.6 : velocity * 0.6;
        }
        lastXPos = xPos;

        const itemWidth = navRect.width / navItems.length;
        let visualX = Math.max(0, Math.min(xPos - (itemWidth / 2), navRect.width - itemWidth));

        pill.style.transform = `translateX(${visualX}px) scaleX(${stretch}) scaleY(${1 / stretch}) skewX(${skew}deg)`;

        const hoveredIndex = Math.floor(xPos / itemWidth);
        const targetItem = navItems[hoveredIndex];

        if (targetItem && !targetItem.classList.contains('active')) {
          const sectionId = targetItem.getAttribute('onclick').match(/'([^']+)'/)[1];
          document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
          document.getElementById(sectionId).classList.add('active');
          document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
          targetItem.classList.add('active');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          window.triggerVibrate(15);
        }
      };

      const endDrag = () => {
        if (isDraggingPill) {
          isDraggingPill = false;
          lastXPos = null;
          const activeItem = document.querySelector('.nav-item.active');
          const index = Array.from(navItems).indexOf(activeItem);
          if (index !== -1) snapPill(index);
        }
      };

      nav.addEventListener('touchmove', moveDrag, { passive: false });
      nav.addEventListener('touchend', endDrag);
      nav.addEventListener('mousedown', () => isDraggingPill = true);
      nav.addEventListener('mousemove', moveDrag);
      nav.addEventListener('mouseup', endDrag);
      nav.addEventListener('mouseleave', endDrag);

      window.addEventListener('resize', () => {
        const activeItem = document.querySelector('.nav-item.active');
        const index = Array.from(navItems).indexOf(activeItem);
        if (index !== -1) snapPill(index);
      });
    }
  }, 1000);
});

let newModsData = {};

onValue(ref(db, 'new_mods_status'), (snap) => {
  newModsData = snap.val() || {};

  document.querySelectorAll('.mod-card').forEach(card => {
    card.classList.remove('is-new-mod');
  });

  Object.keys(newModsData).forEach(cardId => {
    if (newModsData[cardId] === true) {
      const cardElement = document.getElementById(cardId);
      if (cardElement) {
        cardElement.classList.add('is-new-mod');
      }
    }
  });
});

window.toggleNewMod = async (cardId) => {
  if (!isSuperUser) {
    alert("No tienes permisos de administrador.");
    return;
  }

  const isCurrentlyNew = newModsData[cardId] === true;

  if (confirm(isCurrentlyNew ? "¿Quitar la etiqueta de NUEVO a este mod?" : "¿Marcar este mod como NUEVO?")) {

    await set(ref(db, `new_mods_status/${cardId}`), isCurrentlyNew ? null : true);

  }
};

// ==========================================

window.brokenLinksData = {};

onValue(ref(db, 'broken_links'), (snap) => {
  window.brokenLinksData = snap.val() || {};

  document.querySelectorAll('.mod-card').forEach(card => {
    const exactModId = card.id.replace('card-', '');
    if (window.brokenLinksData[exactModId]) {
      card.classList.add('is-broken-mod');
    } else {
      card.classList.remove('is-broken-mod');
    }
  });
});

window.reportError = async (modId) => {
  const user = JSON.parse(localStorage.getItem('fnf_user_profile'));

  if (!user) {
    document.getElementById('register-popup').classList.add('show');
    return;
  }

  if (confirm('🚨 ¿ESTÁS SEGURO? Esto apagará la descarga para todos y alertará al administrador.')) {

    await set(ref(db, `broken_links/${modId}`), {
      reportedBy: user.name,
      timestamp: Date.now()
    });

    alert('🛑 ¡MOD BLOQUEADO! El Administrador ha sido notificado.');

    let modName = "Nombre Desconocido";
    const modTitleElement = document.querySelector('#card-' + modId + ' h3');
    if (modTitleElement) {
      modName = modTitleElement.textContent.trim();
    }

    const botToken = "7599981153:AAH6tPHek2C02UeVHc-lACFtfVK_XleB6VI";
    const chatId = "5429172831";

    const mensaje = `🚨 *ALERTA DE LINK CAÍDO* 🚨\n\nEl usuario *${user.name}* reportó el problema de un enlace caido:\n\n📦 Mod: *${modName}*\n🆔 ID: \`${modId}\`\n\n🛑El Mod se a cerrado.\n\n🛠️ ¡Ve a solucionarlo!`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: "Markdown" })
    }).catch(error => console.error("Error Telegram:", error));
  }
};

window.fixBrokenLink = async (modId) => {
  if (!isSuperUser) return;
  if (confirm('🛠️ ¿Ya solucionaste el link de este mod?')) {
    await set(ref(db, `broken_links/${modId}`), null);
  }
};

// ==========================================

onValue(ref(db, 'ratings'), (snap) => {
  const ratingsData = snap.val() || {};
  const userProfile = JSON.parse(localStorage.getItem('fnf_user_profile'));
  const miLlave = userProfile ? userProfile.key : null;

  document.querySelectorAll('.mod-card').forEach(card => {
    const exactModId = card.id.replace('card-', '');
    const modRatings = ratingsData[exactModId] || {};

    const votosArray = Object.values(modRatings);
    const totalVotos = votosArray.length;
    let promedio = 0;

    if (totalVotos > 0) {
      const suma = votosArray.reduce((acc, val) => acc + val, 0);
      promedio = (suma / totalVotos).toFixed(1);
    }

    const textoPromedio = document.getElementById(`rating-text-${exactModId}`);
    if (textoPromedio) {
      textoPromedio.innerText = `${promedio} ⭐ (${totalVotos})`;
    }

    const starsContainer = document.getElementById(`stars-${exactModId}`);
    if (starsContainer) {
      const miVotoAnterior = miLlave ? modRatings[miLlave] : 0;
      const spans = starsContainer.querySelectorAll('span');

      spans.forEach(span => {
        const valorEstrella = parseInt(span.getAttribute('data-val'));
        if (miVotoAnterior >= valorEstrella) {
          span.innerText = '★';
          span.style.color = '#ffd700';
          span.style.textShadow = '0 0 8px #ffd700';
        } else {
          span.innerText = '☆';
          span.style.color = '#555';
          span.style.textShadow = 'none';
        }
      });
    }
  });
});

window.rateMod = async (modId, calificacion) => {
  const user = JSON.parse(localStorage.getItem('fnf_user_profile'));

  if (!user) {
    document.getElementById('register-popup').classList.add('show');
    return;
  }

  await set(ref(db, `ratings/${modId}/${user.key}`), calificacion);

  if (window.triggerVibrate) window.triggerVibrate(15);
};

// ==========================================

window.toggleFaq = function (button) {
  button.classList.toggle('active');

  const content = button.nextElementSibling;

  if (content.classList.contains('open')) {
    content.classList.remove('open');
  } else {
    content.classList.add('open');
  }

  if (window.triggerVibrate) window.triggerVibrate(10);
};

// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const modToUnlock = urlParams.get('unlock');

  if (modToUnlock) {
    let misSecretos = JSON.parse(localStorage.getItem('unlocked_mods') || '[]');
    if (!misSecretos.includes(modToUnlock)) {
      misSecretos.push(modToUnlock);
      localStorage.setItem('unlocked_mods', JSON.stringify(misSecretos));

      setTimeout(() => {
        document.getElementById('secret-unlocked-popup').classList.add('show');
        if (window.triggerVibrate) window.triggerVibrate([30, 50, 30]);
      }, 1000);
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const misSecretosGuardados = JSON.parse(localStorage.getItem('unlocked_mods') || '[]');

  const esAdmin = localStorage.getItem('superUser') === 'true';

  document.querySelectorAll('.secret-mod').forEach(card => {

    const exactId = card.id.replace('card-', '');

    if (misSecretosGuardados.includes(exactId) || esAdmin) {
      card.classList.remove('hidden');
    }
  });
});

// ==========================================

let linkParaCompartir = "";
let textoParaCompartir = "";

window.abrirMenuCompartir = (id, nombreMod) => {
  if (exigirRegistro()) return;
  const baseUrl = window.location.origin + window.location.pathname;
  linkParaCompartir = `${baseUrl}?share=${id}`;
  textoParaCompartir = `¡Mira esto: *${nombreMod}*! Descárgalo aquí:\n`;

  document.getElementById('share-modal').classList.add('show');
};

window.enviarWhatsApp = () => {
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoParaCompartir + linkParaCompartir)}`;
  window.open(url, '_blank');
};

window.enviarTelegram = () => {
  const url = `https://t.me/share/url?url=${encodeURIComponent(linkParaCompartir)}&text=${encodeURIComponent(textoParaCompartir)}`;
  window.open(url, '_blank');
};

window.copiarEnlace = () => {
  navigator.clipboard.writeText(textoParaCompartir + linkParaCompartir).then(() => {
    const msg = document.getElementById('mensaje-copiado');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const idCompartido = urlParams.get('share');

  if (idCompartido) {


    setTimeout(() => {

      if (idCompartido.includes('mod') && window.openModInfo) {
        window.openModInfo(idCompartido);
      } else if (idCompartido.includes('apk') && window.openApkInfo) {
        window.openApkInfo(idCompartido);
      } else if (idCompartido.includes('script') && window.openScriptInfo) {
        window.openScriptInfo(idCompartido);
      }

      const contenidoPopup = document.querySelector('#mod-info-popup .popup-content') || document.querySelector('.popup.show .popup-content');

      if (contenidoPopup) {
        contenidoPopup.classList.add('brillo-epico');

        setTimeout(() => {
          contenidoPopup.classList.remove('brillo-epico');
        }, 6000);
      }

      window.history.replaceState({}, document.title, window.location.pathname);

    }, 1000);
  }
});

// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const todasLasImagenes = document.querySelectorAll('img');

  todasLasImagenes.forEach(img => {
    if (img.src.includes('assets/images/mods') || img.src.includes('webp')) {

      img.setAttribute('loading', 'lazy');

      const contenedor = img.parentElement;
      if (contenedor) {
        contenedor.style.position = 'relative';

        let ruedita = contenedor.querySelector('.ruedita-cargando');
        if (!ruedita) {
          ruedita = document.createElement('div');
          ruedita.className = 'ruedita-cargando';
          contenedor.insertBefore(ruedita, img);
        }

        const finalizarCarga = () => {
          if (ruedita) ruedita.style.display = 'none';
          img.classList.add('img-lazy-cargada');
        };

        if (img.complete && img.naturalHeight !== 0) {
          finalizarCarga();
        } else {

          img.onload = finalizarCarga;

          img.onerror = () => {
            if (ruedita) ruedita.style.display = 'none';
          };
        }
      }
    }
  });
});

// ==========================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registro => {
        console.log('¡Modo Offline activado! Alcance:', registro.scope);
      })
      .catch(error => {
        console.log('Falló el Service Worker:', error);
      });
  });
}

// ==========================================

document.addEventListener('touchstart', function () { }, { passive: true });
document.addEventListener('touchmove', function () { }, { passive: true });
document.addEventListener('wheel', function () { }, { passive: true });

// ==========================================

window.enviarMensajeAlBot = async function () {
  const cajaTexto = document.getElementById('txt-mensaje-telegram');
  const boton = document.getElementById('btn-enviar-telegram');
  const mensaje = cajaTexto.value.trim();

  if (mensaje === "") {
    alert("¡Escribe un mensaje primero!");
    return;
  }

  let nombreUsuario = "👤 Usuario Invitado";
  try {
    const perfil = JSON.parse(localStorage.getItem('fnf_user_profile'));
    if (perfil) {
      nombreUsuario = perfil.nombre || perfil.name || perfil.username || perfil.usuario || perfil.key || "👤 Usuario Registrado";
    }
  } catch (error) {
    console.log("No se encontró un perfil guardado.");
  }

  const TELEGRAM_BOT_TOKEN = "7599981153:AAH6tPHek2C02UeVHc-lACFtfVK_XleB6VI";
  const TELEGRAM_CHAT_ID = "5429172831";

  const textoFormateado =
    `🚨 *NUEVO TICKET DE SOPORTE* 🚨

👤 *De:* ${nombreUsuario}
━━━━━━━━━━━━━━━━━━━━━━━━━
💬 *Mensaje:*
${mensaje}
━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 _Enviado desde lalocf.2.gitgub/fnf-ports/_`;

  const urlApi = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  boton.innerText = "⏳ Enviando...";
  boton.style.background = "#ffea00";

  try {
    const respuesta = await fetch(urlApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: textoFormateado,
        parse_mode: 'Markdown'
      })
    });

    if (respuesta.ok) {
      cajaTexto.value = "";
      boton.innerText = "¡Enviado con éxito! ✨";
      boton.style.background = "#00ff41";

      setTimeout(() => {
        boton.innerText = "🚀 Enviar Mensaje";
        boton.style.background = "var(--neon-blue)";
      }, 3000);
    } else {
      throw new Error("Error en la API");
    }

  } catch (error) {
    boton.innerText = "❌ Error al enviar";
    boton.style.background = "#ff003c";
    setTimeout(() => {
      boton.innerText = "🚀 Intentar de nuevo";
      boton.style.background = "var(--neon-blue)";
    }, 3000);
  }
};

//===============================================//

document.addEventListener("DOMContentLoaded", () => {
  const modCards = document.querySelectorAll('.mod-card');

  modCards.forEach(card => {
    const oldTags = card.querySelector('.mod-tags-container');
    if (oldTags) oldTags.remove();

    const gama = card.getAttribute('data-gama') || 'low';

    let ramValue = card.getAttribute('data-ram');
    if (!ramValue) {
      ramValue = '2GB RAM';
      if (gama === 'mid') ramValue = '3GB RAM';
      if (gama === 'mid-high' || gama === 'high') ramValue = '4GB RAM';
    }

    let engineValue = card.getAttribute('data-engine');
    if (!engineValue) {
      engineValue = 'Psych Engine';
    } else {
      engineValue = engineValue.replace('⚙️', '').trim();
    }

    let sizeValue = card.getAttribute('data-size');
    if (!sizeValue) {
      const cardId = card.id || 'default';
      const hash = cardId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
      const sizeMB = 150 + Math.abs(hash % 300);
      sizeValue = `${sizeMB} MB`;
    } else {
      sizeValue = sizeValue.replace('📦', '').trim();
    }

    const searchTags = `${engineValue} ${ramValue} ${sizeValue}`.toLowerCase();
    card.setAttribute('data-tags', searchTags);

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'mod-tags-container';
    tagsContainer.style.cssText = 'display: flex; gap: 5px; justify-content: center; margin-bottom: 10px; flex-wrap: wrap;';

    const engineBadge = document.createElement('span');
    engineBadge.style.cssText = 'background: rgba(0, 234, 255, 0.1); color: var(--neon-blue); padding: 2px 6px; border-radius: 4px; font-size: 10px; border: 1px solid var(--neon-blue); display: inline-flex; align-items: center; gap: 3px;';
    engineBadge.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/128/8335/8335020.png" style="width: 12px; height: 12px; object-fit: contain; filter: invert(1);"> ${engineValue}`;

    const ramBadge = document.createElement('span');
    ramBadge.style.cssText = 'background: rgba(255, 0, 255, 0.1); color: var(--neon-pink); padding: 2px 6px; border-radius: 4px; font-size: 10px; border: 1px solid var(--neon-pink); display: inline-flex; align-items: center; gap: 3px;';
    ramBadge.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/128/10513/10513938.png" style="width: 12px; height: 12px; object-fit: contain; filter: invert(1);"> ${ramValue}`;

    const sizeBadge = document.createElement('span');
    sizeBadge.style.cssText = 'background: rgba(0, 255, 65, 0.1); color: #00ff41; padding: 2px 6px; border-radius: 4px; font-size: 10px; border: 1px solid #00ff41; display: inline-flex; align-items: center; gap: 3px;';
    sizeBadge.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/128/4007/4007698.png" style="width: 12px; height: 12px; object-fit: contain; filter: invert(1);"> ${sizeValue}`;

    tagsContainer.appendChild(engineBadge);
    tagsContainer.appendChild(ramBadge);
    tagsContainer.appendChild(sizeBadge);

    const cardButtons = card.querySelector('.card-buttons');
    if (cardButtons) {
      card.insertBefore(tagsContainer, cardButtons);
    }
  });

  let rafId = null;

  document.addEventListener('mousemove', (e) => {
    const card = e.target.closest('.apk-card, .mod-card');
    if (card) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -15;
        const rotateY = ((x - centerX) / centerX) * 15;

        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;

        card.style.setProperty('--rx', `${rotateX}deg`);
        card.style.setProperty('--ry', `${rotateY}deg`);
        card.style.setProperty('--gx', `${glareX}%`);
        card.style.setProperty('--gy', `${glareY}%`);
        card.style.setProperty('--g-opacity', '1');
      });
    }
  });

  document.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.apk-card, .mod-card');
    if (card && !card.contains(e.relatedTarget)) {
      if (rafId) cancelAnimationFrame(rafId);
      card.style.setProperty('--rx', `0deg`);
      card.style.setProperty('--ry', `0deg`);
      card.style.setProperty('--g-opacity', '0');
    }
  });

  let deviceRafId = null;
  window.addEventListener('deviceorientation', (e) => {
    if (e.beta === null || e.gamma === null) return;

    if (deviceRafId) cancelAnimationFrame(deviceRafId);
    deviceRafId = requestAnimationFrame(() => {
      let beta = e.beta;
      let gamma = e.gamma;

      if (beta > 30) beta = 30;
      if (beta < -30) beta = -30;
      if (gamma > 30) gamma = 30;
      if (gamma < -30) gamma = -30;

      const rotateX = (beta / 30) * 15;
      const rotateY = (gamma / 30) * 15;

      const glareX = ((gamma + 30) / 60) * 100;
      const glareY = ((beta + 30) / 60) * 100;

      const root = document.documentElement;
      root.style.setProperty('--m-rx', `${-rotateX}deg`);
      root.style.setProperty('--m-ry', `${rotateY}deg`);
      root.style.setProperty('--m-gx', `${glareX}%`);
      root.style.setProperty('--m-gy', `${glareY}%`);
      root.style.setProperty('--m-g-opacity', '0.6');
    });
  });

});