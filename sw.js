// Actualizamos a tu versión más reciente (vi en tu main.js que ya vas en la v5.1.2)
const CACHE_NAME = 'fnf-mobile-v6.2.0';

// 🚀 Lista de Archivos Esenciales para el Modo Offline
const urlsToCache = [
  './',
  './index.html',
  './fnf.html',
  './manifest.json',
  './assets/fonts/funkin.ttf',
  
  // Archivos maestros que agregamos para el diseño y rendimiento
  './css/style.css',
  './css/style_liquidglass.css', 
  './js/main.js',
  
  // Imágenes súper esenciales para que la interfaz no se vea rota sin internet
  './assets/icons/logo192.png',
  './assets/images/webp/iconopsych.webp',
  './assets/images/webp/campana.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché abierto: Guardando archivos de la App');
        return cache.addAll(urlsToCache);
      })
  );
});

// ¡Esta parte tuya es ORO PURO! Limpia la basura de versiones viejas.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Borrando caché antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// El interceptor que da la cara cuando no hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
