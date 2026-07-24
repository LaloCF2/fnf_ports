import { db, auth, googleProvider } from './firebase-config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export let usuarioActualFirebase = null;
window.usuarioActualFirebase = null;

onAuthStateChanged(auth, async (user) => {
  const overlayAuth = document.getElementById('auth-overlay');

  if (user) {
    usuarioActualFirebase = user;
    window.usuarioActualFirebase = user;

    if (overlayAuth) overlayAuth.style.display = 'none';

    const nombreSeguro = user.displayName || "Usuario FNF";
    const fotoSegura = user.photoURL || "https://cdn-icons-png.flaticon.com/128/149/149071.png";

    const userRef = ref(db, 'usuarios/' + user.uid);
    const snap = await get(userRef);

    if (!snap.exists()) {
      await set(userRef, {
        nombre: nombreSeguro,
        foto: fotoSegura,
        correo: user.email,
        usernameModificado: false,
        fechaRegistro: new Date().toISOString()
      });
    }

    const datosBD = snap.exists() ? snap.val() : { nombre: nombreSeguro, foto: fotoSegura };
    localStorage.setItem('fnf_user_profile', JSON.stringify({
      nombre: datosBD.nombre,
      foto: datosBD.foto,
      key: user.uid
    }));

    const favRef = ref(db, 'usuarios/' + user.uid + '/favoritos');
    const favSnap = await get(favRef);
    if (favSnap.exists()) {
      const fbFavs = favSnap.val();
      const localFavs = JSON.parse(localStorage.getItem('fnf_favorites') || '{}');
      const mergedFavs = { ...localFavs, ...fbFavs };
      localStorage.setItem('fnf_favorites', JSON.stringify(mergedFavs));
      await set(favRef, mergedFavs);
    } else {
      const localFavs = JSON.parse(localStorage.getItem('fnf_favorites') || '{}');
      if (Object.keys(localFavs).length > 0) {
        await set(favRef, localFavs);
      }
    }

    if (window.refreshFavoritesUI) {
      window.refreshFavoritesUI();
    }

    if (window.listenToPersonalNotifications) {
      window.listenToPersonalNotifications(user.uid);
    }

  } else {
    usuarioActualFirebase = null;
    window.usuarioActualFirebase = null;
    if (localStorage.getItem('fnf_guest_mode') === 'true') {
      if (overlayAuth) overlayAuth.style.display = 'none';
    } else {
      if (overlayAuth) overlayAuth.style.display = 'flex';
    }
  }
});

window.iniciarSesionConGoogle = async function () {
  const btn = document.getElementById('btn-google-login');

  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const esNavegadorInterno = (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Instagram") > -1) || (ua.indexOf("Telegram") > -1);

  if (esNavegadorInterno) {
    alert("⚠️ Estás usando el navegador interno de una app.\n\nPara iniciar sesión, toca los 3 puntitos de arriba (o abajo) y selecciona 'Abrir en el navegador' (Chrome o Safari).");
    if (btn) btn.innerHTML = "❌ Abre en Chrome/Safari";
    return;
  }

  if (btn) {
    btn.innerHTML = "⏳ Accediendo a Google...";
    btn.style.background = "#ffea00";
    btn.style.color = "#000";
  }

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    if (btn) {
      btn.innerHTML = "❌ Falló, intenta de nuevo";
      btn.style.background = "#ff003c";
      btn.style.color = "#fff";
    }

    if (error.code === 'auth/popup-closed-by-user') {
      console.log("Inicio de sesión cancelado por el usuario.");
    } else {
      alert("🚨 Error: " + error.message);
    }
  }
};

window.entrarComoInvitado = function () {
  localStorage.setItem('fnf_guest_mode', 'true');
  const overlayAuth = document.getElementById('auth-overlay');
  if (overlayAuth) overlayAuth.style.display = 'none';
};

window.cerrarSesion = function () {
  signOut(auth).then(() => {
    localStorage.removeItem('fnf_guest_mode');
    localStorage.removeItem('fnf_user_profile');
    location.reload();
  });
};
