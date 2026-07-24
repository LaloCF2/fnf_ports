import { db } from './firebase-config.js';
import { ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

window.abrirPerfil = async function () {
  const contenedor = document.getElementById('perfil-dinamico-contenido');
  if (!contenedor) return;

  document.getElementById('profile-popup').classList.add('show');

  if (!window.usuarioActualFirebase) {
    contenedor.innerHTML = `
      <img src="https://cdn-icons-png.flaticon.com/128/149/149071.png" style="width: 80px; filter: grayscale(1); margin-bottom: 10px;">
      <p style="color: #ccc; margin-bottom: 20px; font-size: 13px;">Estás en modo invitado. Inicia sesión para guardar likes, comentar y descargar.</p>
      <button onclick="iniciarSesionConGoogle()" class="btn" style="width: 100%; background: white; color: black; font-weight: bold; padding: 12px; border-radius: 12px; border: none; cursor: pointer;">
        <img src="https://cdn-icons-png.flaticon.com/128/300/300221.png" style="width: 18px; vertical-align: middle; margin-right: 5px;">
        Conectar con Google
      </button>
    `;
    return;
  }

  contenedor.innerHTML = `<p style="color: #aaa; font-size: 14px;">⏳ Cargando datos de perfil...</p>`;

  try {
    const snap = await get(ref(db, 'usuarios/' + window.usuarioActualFirebase.uid));
    const datos = snap.val() || {};

    const nombreUsuario = datos.nombre || window.usuarioActualFirebase.displayName || "Usuario FNF";
    const fotoUsuario = datos.foto || window.usuarioActualFirebase.photoURL || "https://cdn-icons-png.flaticon.com/128/149/149071.png";
    const correoUsuario = datos.correo || window.usuarioActualFirebase.email || "Sin correo";
    
    // Privacy mask for email
    const [nombreCorreo, dominioCorreo] = correoUsuario.split("@");
    const correoOculto = nombreCorreo && dominioCorreo 
      ? nombreCorreo.substring(0, 3) + "***@" + dominioCorreo 
      : correoUsuario;

    const fechaRegString = datos.fechaRegistro || new Date().toISOString();
    const fechaObj = new Date(fechaRegString);
    const opcionesFecha = { year: 'numeric', month: 'long' };
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opcionesFecha);
    const fechaFinal = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);

    const marcoActivo = datos.marcoAvatar || "var(--neon-blue)";
    const totalFavoritos = datos.favoritos ? Object.keys(datos.favoritos).length : 0;

    const ultimaFecha = datos.ultimaFechaCambio || 0;
    const ahora = Date.now();
    const diasPasados = Math.floor((ahora - ultimaFecha) / (1000 * 60 * 60 * 24));
    
    const diasRegistrado = Math.floor((ahora - fechaObj.getTime()) / (1000 * 60 * 60 * 24));
    let rango = "🥉 Port-Boy (Nuevo)";
    if (diasRegistrado > 30) rango = "🥈 Funkin' Gamer";
    if (diasRegistrado > 180) rango = "🥇 Leyenda FNF";

    let bloqueado = "";
    let textoBoton = "✨ Guardar Perfil";

    if (diasPasados < 15 && ultimaFecha !== 0) {
      const diasFaltantes = 15 - diasPasados;
      bloqueado = "disabled";
      textoBoton = `✨ Guardar Preferencias (Nombre bloqueado ${diasFaltantes} d)`;
    }

    contenedor.innerHTML = `
      <div style="position: relative; display: inline-block;">
        <img src="${fotoUsuario}" style="width: 90px; height: 90px; border-radius: 50%; border: 3px solid ${marcoActivo}; box-shadow: 0 0 20px ${marcoActivo}; margin-bottom: 5px; object-fit: cover;">
        <div style="position: absolute; bottom: 5px; right: 0; background: #00eaff; border-radius: 50%; width: 22px; height: 22px; border: 2px solid #141419; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px #00eaff;" title="Online">
          <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
        </div>
      </div>
      
      <h3 style="color: white; margin: 10px 0 2px 0; font-size: 20px; text-shadow: 0 0 10px rgba(255,255,255,0.2);">${nombreUsuario}</h3>
      <p style="color: #00eaff; font-size: 13px; font-weight: bold; margin: 0 0 15px 0;">${rango}</p>

      <!-- Stats Dashboard -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <div style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 5px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'" onclick="document.getElementById('profile-popup').classList.remove('show'); abrirFavoritos();">
          <h4 style="margin: 0; font-size: 20px; color: var(--neon-yellow); text-shadow: 0 0 10px rgba(255,234,0,0.3);">${totalFavoritos}</h4>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #aaa; font-weight: bold; text-transform: uppercase;">Favoritos</p>
        </div>
        <div style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 5px;">
          <h4 style="margin: 0; font-size: 14px; color: var(--neon-pink); text-shadow: 0 0 10px rgba(255,0,200,0.3); margin-bottom: 2px; line-height: 1.2;">${fechaFinal}</h4>
          <p style="margin: 3px 0 0 0; font-size: 11px; color: #aaa; font-weight: bold; text-transform: uppercase;">Registro</p>
        </div>
      </div>
      
      <!-- Preferencias Card -->
      <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 16px; margin-bottom: 20px; text-align: left; border: 1px solid rgba(255,255,255,0.05);">
        
        <label style="color: #bbb; font-size: 11px; font-weight: bold; text-transform: uppercase;">Tu Apodo Gamer</label>
        <input type="text" id="input-nuevo-apodo" value="${nombreUsuario}" ${bloqueado} class="reg-input" style="width: 100%; margin-top: 6px; margin-bottom: 12px; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px; border-radius: 8px; font-size: 13px;">
        
        <label style="color: #bbb; font-size: 11px; font-weight: bold; text-transform: uppercase;">Color de Marco Neón</label>
        <select id="select-marco" class="reg-input" style="width: 100%; margin-top: 6px; margin-bottom: 12px; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px; border-radius: 8px; font-size: 13px; outline: none; appearance: none;">
          <option value="var(--neon-blue)" style="background: #222;" ${marcoActivo==='var(--neon-blue)'?'selected':''}>🔵 Azul Neón Clásico</option>
          <option value="var(--neon-pink)" style="background: #222;" ${marcoActivo==='var(--neon-pink)'?'selected':''}>🌸 Rosa Neón</option>
          <option value="var(--neon-yellow)" style="background: #222;" ${marcoActivo==='var(--neon-yellow)'?'selected':''}>⭐ Dorado VIP</option>
          <option value="var(--neon-green)" style="background: #222;" ${marcoActivo==='var(--neon-green)'?'selected':''}>🟢 Verde Tóxico</option>
          <option value="#ff003c" style="background: #222;" ${marcoActivo==='#ff003c'?'selected':''}>🔴 Fuego Infernal</option>
        </select>

        <label style="color: #bbb; font-size: 11px; font-weight: bold; text-transform: uppercase;">URL de Avatar Personalizado (Opcional)</label>
        <input type="url" id="input-nuevo-avatar" placeholder="https://..." value="${datos.foto || ''}" class="reg-input" style="width: 100%; margin-top: 6px; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px; border-radius: 8px; font-size: 13px;">

        <button onclick="guardarNuevoApodo()" class="btn" style="width: 100%; margin-top: 15px; background: var(--neon-blue); color: black; font-weight: bold; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; box-shadow: 0 0 10px rgba(0,234,255,0.4); text-transform: uppercase; letter-spacing: 0.5px;">${textoBoton}</button>
      </div>

      <!-- Seguridad Card -->
      <div style="background: rgba(255,0,60,0.05); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,0,60,0.2); display: flex; align-items: center; justify-content: space-between;">
        <div style="text-align: left;">
          <p style="color: #fff; font-size: 13px; margin: 0; font-weight: bold;">Google Connect</p>
          <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 2px 0 0 0;">${correoOculto}</p>
        </div>
        <button onclick="cerrarSesion()" class="btn" style="background: #ff003c; color: white; border: none; padding: 8px 15px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; box-shadow: 0 4px 10px rgba(255,0,60,0.3);">Salir</button>
      </div>
    `;
  } catch (error) {
    console.error("Error al cargar el perfil:", error);
    contenedor.innerHTML = `
      <img src="${window.usuarioActualFirebase.photoURL || 'https://cdn-icons-png.flaticon.com/128/149/149071.png'}" style="width: 85px; height: 85px; border-radius: 50%; border: 2px solid #ff003c; margin-bottom: 12px; object-fit: cover;">
      <h3 style="color: white; margin: 0 0 5px 0;">${window.usuarioActualFirebase.displayName || 'Usuario'}</h3>
      <p style="color: #ff003c; font-size: 12px; margin-bottom: 20px;">⚠️ Hubo un pequeño retraso de seguridad al conectar con Firebase. Cierra esta ventana y ábrela de nuevo.</p>
      <button onclick="cerrarSesion()" class="btn" style="width: 100%; background: #ff003c; color: white; border: none; padding: 11px; border-radius: 12px; font-weight: bold; cursor: pointer;">🚪 Cerrar Sesión</button>
    `;
  }
};

window.guardarNuevoApodo = async function () {
  const nuevoNombreInput = document.getElementById('input-nuevo-apodo');
  const nuevoAvatarInput = document.getElementById('input-nuevo-avatar');
  const nuevoMarcoSelect = document.getElementById('select-marco');

  if (!nuevoNombreInput) return;

  const nuevoNombre = nuevoNombreInput.value.trim();
  const nuevoAvatar = nuevoAvatarInput.value.trim();
  const nuevoMarco = nuevoMarcoSelect ? nuevoMarcoSelect.value : "var(--neon-blue)";

  if (nuevoNombre.length < 3) return alert("El apodo debe tener mínimo 3 letras.");

  let mensajeConfirmacion = "¿Guardar cambios en tus preferencias?";
  if (!nuevoNombreInput.disabled) {
    mensajeConfirmacion = "¿Seguro que quieres este apodo? Se bloqueará por 15 días. (Tus otras preferencias también se guardarán).";
  }

  if (confirm(mensajeConfirmacion)) {

    let updateData = {
      marcoAvatar: nuevoMarco
    };
    if (nuevoAvatar) updateData.foto = nuevoAvatar;

    if (!nuevoNombreInput.disabled) {
      updateData.nombre = nuevoNombre;
      updateData.ultimaFechaCambio = Date.now();
      updateData.usernameModificado = false;
    }

    await update(ref(db, 'usuarios/' + window.usuarioActualFirebase.uid), updateData);

    const perfilActual = JSON.parse(localStorage.getItem('fnf_user_profile')) || {};
    if (!nuevoNombreInput.disabled) perfilActual.nombre = nuevoNombre;
    if (nuevoAvatar) perfilActual.foto = nuevoAvatar;
    perfilActual.marcoAvatar = nuevoMarco;
    localStorage.setItem('fnf_user_profile', JSON.stringify(perfilActual));

    alert("¡Preferencias actualizadas exitosamente!");
    abrirPerfil();
  }
};

window.exigirRegistro = function () {
  if (!window.usuarioActualFirebase) {
    alert("🔒 Debes iniciar sesión con Google para usar esta función.");
    document.getElementById('auth-overlay').style.display = 'flex';
    return true;
  }
  return false;
};
