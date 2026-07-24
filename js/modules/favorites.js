import { db } from './firebase-config.js';
import { ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

window.toggleFavorite = (modId, btn, card) => {
  let favs = JSON.parse(localStorage.getItem('fnf_favorites') || '{}');
  if (favs[modId]) {
    delete favs[modId];
    btn.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/128/1077/1077035.png" style="width:20px; height:20px; filter: invert(1);">';
    btn.style.background = 'rgba(255,255,255,0.1)';
    btn.style.borderColor = 'rgba(255,255,255,0.2)';
  } else {
    const h3 = card.querySelector('h3');
    const title = h3 ? h3.textContent.trim().replace(/^\s+/, '') : 'Mod FNF';
    const imgEl = card.querySelector('img');
    const img = imgEl ? imgEl.src : '';
    favs[modId] = { title, img, modId, timestamp: Date.now() };
    btn.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/128/833/833472.png" style="width:20px; height:20px; filter: invert(27%) sepia(85%) saturate(3033%) hue-rotate(322deg) brightness(102%) contrast(102%);">';
    btn.style.background = 'rgba(255, 0, 100, 0.2)';
    btn.style.borderColor = '#ff0064';
  }
  localStorage.setItem('fnf_favorites', JSON.stringify(favs));
  
  if (window.usuarioActualFirebase) {
    const favRef = ref(db, 'usuarios/' + window.usuarioActualFirebase.uid + '/favoritos');
    set(favRef, favs).catch(e => console.error("Error guardando favoritos en FB:", e));
  }

  btn.style.transform = 'scale(1.3)';
  setTimeout(() => { btn.style.transform = 'scale(1)'; }, 200);
};

window.refreshFavoritesUI = () => {
  document.querySelectorAll('.apk-card, .mod-card, .script-card').forEach(card => {
    const allBtns = card.querySelectorAll('button');
    let modId = null;
    let favBtn = null;
    allBtns.forEach(b => {
      const oc = b.getAttribute('onclick') || '';
      if (oc.includes('openModComments')) {
        const m = oc.match(/openModComments\(['"](.*?)['"]/);
        if (m) modId = m[1];
      }
      if (b.classList.contains('btn-fav')) {
        favBtn = b;
      }
    });
    if (modId && favBtn) {
      const favs = JSON.parse(localStorage.getItem('fnf_favorites') || '{}');
      const isFav = !!favs[modId];
      favBtn.innerHTML = isFav 
        ? '<img src="https://cdn-icons-png.flaticon.com/128/833/833472.png" style="width:20px; height:20px; filter: invert(27%) sepia(85%) saturate(3033%) hue-rotate(322deg) brightness(102%) contrast(102%);">' 
        : '<img src="https://cdn-icons-png.flaticon.com/128/1077/1077035.png" style="width:20px; height:20px; filter: invert(1);">';
      favBtn.title = isFav ? 'Quitar de favoritos' : 'Añadir a favoritos';
      favBtn.style.background = isFav ? 'rgba(255, 0, 100, 0.2)' : 'rgba(255,255,255,0.07)';
      favBtn.style.borderColor = isFav ? '#ff0064' : 'rgba(255,255,255,0.2)';
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.querySelectorAll('.apk-card, .mod-card, .script-card').forEach(card => {
      const allBtns = card.querySelectorAll('button');
      let modId = null;
      let chatBtn = null;
      allBtns.forEach(b => {
        const oc = b.getAttribute('onclick') || '';
        if (oc.includes('openModComments')) {
          const m = oc.match(/openModComments\(['"](.*?)['"]/);
          if (m) { modId = m[1]; chatBtn = b; }
        }
      });

      if (modId && chatBtn && !card.querySelector('.btn-fav')) {
        const favs = JSON.parse(localStorage.getItem('fnf_favorites') || '{}');
        const isFav = !!favs[modId];

        const favBtn = document.createElement('button');
        favBtn.className = 'btn btn-fav';
        favBtn.innerHTML = isFav 
          ? '<img src="https://cdn-icons-png.flaticon.com/128/833/833472.png" style="width:20px; height:20px; filter: invert(27%) sepia(85%) saturate(3033%) hue-rotate(322deg) brightness(102%) contrast(102%);">' 
          : '<img src="https://cdn-icons-png.flaticon.com/128/1077/1077035.png" style="width:20px; height:20px; filter: invert(1);">';
        favBtn.title = isFav ? 'Quitar de favoritos' : 'Añadir a favoritos';
        favBtn.style.cssText = `display:inline-flex; align-items:center; justify-content:center; padding: 8px 10px; font-size: 16px; margin-left: 5px; background: ${isFav ? 'rgba(255, 0, 100, 0.2)' : 'rgba(255,255,255,0.07)'}; border: 1px solid ${isFav ? '#ff0064' : 'rgba(255,255,255,0.2)'}; border-radius: 8px; cursor:pointer; transition: transform 0.2s, background 0.2s;`;
        favBtn.onclick = (e) => {
          e.stopPropagation();
          window.toggleFavorite(modId, favBtn, card);
        };
        chatBtn.insertAdjacentElement('afterend', favBtn);
      }
    });
  }, 1500);
});

window.abrirFavoritos = () => {
  document.getElementById('favorites-popup').classList.add('show');
  const container = document.getElementById('favorites-list');
  const favs = JSON.parse(localStorage.getItem('fnf_favorites') || '{}');

  container.innerHTML = '';
  const keys = Object.keys(favs);

  if (keys.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <img src="https://cdn-icons-png.flaticon.com/128/1077/1077035.png" style="width: 50px; opacity: 0.5; filter: invert(1); margin-bottom: 10px;">
        <p style="color:#aaa; font-size:13px; margin:0;">No has guardado ningún mod aún.<br>¡Toca el corazón en tus mods favoritos!</p>
      </div>
    `;
    return;
  }

  keys.sort((a, b) => favs[b].timestamp - favs[a].timestamp).forEach(id => {
    const data = favs[id];
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:12px; gap:10px; text-align:left; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: background 0.2s, transform 0.2s;';
    
    div.onmouseover = () => { div.style.background = 'rgba(255,255,255,0.1)'; div.style.transform = 'scale(1.02)'; };
    div.onmouseout = () => { div.style.background = 'rgba(255,255,255,0.05)'; div.style.transform = 'scale(1)'; };
    
    div.onclick = () => {
      document.getElementById('favorites-popup').classList.remove('show');
      document.getElementById('profile-popup').classList.remove('show');
      if (window.openModInfo) window.openModInfo(id);
    };

    div.innerHTML = `
      <img src="${data.img}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
      <div style="flex: 1;">
        <h4 style="margin:0; color:white; font-size:14px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${data.title}</h4>
      </div>
      <div style="background:var(--neon-blue); width: 32px; height: 32px; border-radius:8px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 10px rgba(0, 234, 255, 0.4);">
        <img src="https://cdn-icons-png.flaticon.com/128/271/271228.png" style="width:16px; height:16px; filter: invert(1);">
      </div>
    `;
    container.appendChild(div);
  });
};
