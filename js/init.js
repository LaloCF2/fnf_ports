document.addEventListener('DOMContentLoaded', () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  if (isIOS) {
    document.body.classList.add('ios-theme');
    console.log("🍏 iOS Detectado: Activando diseño Apple.");
  } else {
    console.log("🤖 Android/PC Detectado: Manteniendo diseño.");
  }
});

// ==========================================
// 🔥 SISTEMA DE SCRIPTS RECOMENDADOS
// ==========================================
let scriptsRecomendadosBD = {};

// Escuchar en tiempo real qué scripts están recomendados en la base de datos
const recomendadosRef = ref(db, 'scripts_recomendados');
onValue(recomendadosRef, (snapshot) => {
  scriptsRecomendadosBD = snapshot.val() || {};
  actualizarBadgesRecomendados();
});

// Función que dibuja el letrero de "RECOMENDADO" en la pantalla de todos
function actualizarBadgesRecomendados() {
  // Buscamos todas las tarjetas de scripts
  const tarjetasScripts = document.querySelectorAll('.script-card');
  
  tarjetasScripts.forEach(tarjeta => {
    const scriptId = tarjeta.getAttribute('data-id') || tarjeta.id; // Depende de cómo armaste tu HTML
    
    // Si la tarjeta no tiene el elemento del badge, se lo creamos
    let badge = tarjeta.querySelector('.badge-recomendado');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'badge-recomendado';
      badge.innerHTML = '🔥 TOP';
      tarjeta.style.position = 'relative'; // Para que el badge se acomode en la esquina
      tarjeta.appendChild(badge);
    }

    // Si el ID de este script está en Firebase, mostramos el badge, si no, lo ocultamos
    if (scriptsRecomendadosBD[scriptId]) {
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  });
}

// 👑 FUNCIÓN EXCLUSIVA DEL ADMINISTRADOR
window.toggleRecomendarScript = function(scriptId) {
  if (!comprobarSiEsAdmin()) return; // Si no eres tú, no hace nada

  const estadoActual = scriptsRecomendadosBD[scriptId];
  
  if (estadoActual) {
    // Si ya estaba recomendado, se lo quitamos
    remove(ref(db, 'scripts_recomendados/' + scriptId));
  } else {
    // Si no estaba, lo ponemos como recomendado
    set(ref(db, 'scripts_recomendados/' + scriptId), true);
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('App lista para instalar'))
      .catch(err => console.log('Error al registrar SW', err));
  });
}
