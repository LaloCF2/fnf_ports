import { db } from './firebase-config.js';
import { ref, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

window.trackDownload = (id) => {
  runTransaction(ref(db, `downloads/${id}`), (current) => (current || 0) + 1);
};

window.openModInfo = (id) => {
  if (window.exigirRegistro && window.exigirRegistro()) return;
  if (window.brokenLinksData && window.brokenLinksData[id] && !window.isSuperUser) {
    const modName = document.querySelector('#card-' + id + ' h3').textContent;
    document.getElementById('maintenance-mod-name').innerText = modName;

    document.getElementById('maintenance-popup').classList.add('show');
    return;
  }
  const d = window.MOD_DATA[id];
  document.getElementById("popup-img").src = d.img;
  document.getElementById("popup-title").innerText = d.title;
  document.getElementById("popup-desc").innerText = d.desc;
  document.getElementById("popup-version").innerText = d.version;
  let h = "";
  d.downloads.forEach(dl => {
    h += `<a class="btn" style="display:block; margin-top:10px" href="${dl.link}" target="_blank" onclick="trackDownload('${id}')">${dl.name}</a>`;
  });
  h += `<button class="btn" style="display:block; margin-top:15px; background:var(--neon-red); width:100%; box-sizing:border-box;" onclick="reportError('${id}')">⚠️ Reportar Link Caído</button>`;
  if (window.isSuperUser) { h += `<button class="btn" style="display:block; margin-top:5px; background:#444; width:100%; box-sizing:border-box;" onclick="clearReports('${id}')">🛠️ Limpiar Reportes</button>`; }
  document.getElementById("popup-downloads").innerHTML = h;
  document.getElementById("mod-popup").classList.add("show");
};
window.closeModInfo = () => document.getElementById("mod-popup").classList.remove("show");

window.openApkInfo = (id) => {
  if (window.exigirRegistro && window.exigirRegistro()) return;
  const d = window.APK_DATA[id];
  document.getElementById("apk-img").src = d.img;
  document.getElementById("apk-title").innerText = d.title;
  document.getElementById("apk-desc").innerText = d.desc;
  document.getElementById("apk-version").innerText = d.version;
  let h = "";
  d.downloads.forEach(dl => {
    h += `<a class="btn" style="display:block; margin-top:10px" href="${dl.link}" target="_blank" onclick="trackDownload('${id}')">${dl.name}</a>`;
  });
  h += `<button class="btn" style="display:block; margin-top:15px; background:var(--neon-red); width:100%; box-sizing:border-box;" onclick="reportError('${id}')">⚠️ Reportar Link Caído</button>`;
  if (window.isSuperUser) { h += `<button class="btn" style="display:block; margin-top:5px; background:#444; width:100%; box-sizing:border-box;" onclick="clearReports('${id}')">🛠️ Limpiar Reportes</button>`; }
  document.getElementById("apk-downloads").innerHTML = h;
  document.getElementById("apk-popup").classList.add("show");
};
window.closeApkInfo = () => document.getElementById("apk-popup").classList.remove("show");

let scriptImagesArray = [];
let currentScriptImgIndex = 0;

window.openScriptInfo = (id) => {
  if (window.exigirRegistro && window.exigirRegistro()) return;
  const d = window.SCRIPTS_DATA[id];
  scriptImagesArray = d.images || [];
  currentScriptImgIndex = 0;

  document.getElementById("script-img").src = scriptImagesArray[currentScriptImgIndex] || '';
  document.getElementById("script-title").innerText = d.title;
  document.getElementById("script-desc").innerText = d.desc;
  document.getElementById("script-version").innerText = d.version;

  let h = "";
  d.downloads.forEach(dl => {
    h += `<a class="btn" style="display:block; margin-top:10px" href="${dl.link}" target="_blank" onclick="trackDownload('${id}')">${dl.name}</a>`;
  });
  h += `<button class="btn" style="display:block; margin-top:15px; background:var(--neon-red); width:100%; box-sizing:border-box;" onclick="reportError('${id}')">⚠️ Reportar Link Caído</button>`;
  if (window.isSuperUser) { h += `<button class="btn" style="display:block; margin-top:5px; background:#444; width:100%; box-sizing:border-box;" onclick="clearReports('${id}')">🛠️ Limpiar Reportes</button>`; }
  document.getElementById("script-downloads").innerHTML = h;

  const btns = document.querySelectorAll(".carousel-btn");
  if (scriptImagesArray.length <= 1) {
    btns.forEach(b => b.style.display = 'none');
  } else {
    btns.forEach(b => b.style.display = 'block');
  }

  document.getElementById("script-popup").classList.add("show");
};

window.closeScriptInfo = () => document.getElementById("script-popup").classList.remove("show");

window.nextScriptImage = () => {
  if (scriptImagesArray.length > 1) {
    currentScriptImgIndex = (currentScriptImgIndex + 1) % scriptImagesArray.length;
    document.getElementById("script-img").src = scriptImagesArray[currentScriptImgIndex];
  }
};

window.prevScriptImage = () => {
  if (scriptImagesArray.length > 1) {
    currentScriptImgIndex = (currentScriptImgIndex - 1 + scriptImagesArray.length) % scriptImagesArray.length;
    document.getElementById("script-img").src = scriptImagesArray[currentScriptImgIndex];
  }
};
