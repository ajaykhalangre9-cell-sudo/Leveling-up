const CACHE_NAME = 'leveling-up-v51';
const APP_SHELL = [
  './',
  './index.html',
  './index.js',
  './auth.js',
  './pwa-install.js',
  './login.html',
  './login.js',
  './signup.html',
  './signup.js',
  './dashboard.html',
  './dashboard.js',
  './website-chat.js',
  './chess.html',
  './chess.js',
  './theme.js',
  './mission.html',
  './assets/mission/children-waiting-for-food.jpg',
  './assets/leveling-up-library.jpg',
  './assets/mission/global-hunger-child-malnutrition-report.pdf',
  './tasks.html',
  './tasks.js',
  './habits.html',
  './habits.js',
  './habitScheduler.js',
  './progression.js',
  './goals.html',
  './goals.js',
  './skills.html',
  './skills.js',
  './blog.html',
  './blog.js',
  './budget.html',
  './budget.js',
  './bucket-list.html',
  './bucket-list.js',
  './notes.html',
  './notes.js',
  './styles.css',
  './manifest.json',
  './assets/icons/leveling-up-192.png',
  './assets/icons/leveling-up-512.png',
  './assets/products/hologram-watch/hologram-watch-community.jpeg',
  './assets/products/hologram-watch/hologram-watch-vision.jpeg',
  './assets/products/hologram-watch/hologram-watch-interface.jpeg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  const isFreshAsset = ['document', 'style', 'script'].includes(event.request.destination)
    || ['.html', '.css', '.js'].some((extension) => requestUrl.pathname.endsWith(extension));

  if (isFreshAsset) {
    // HTML references versioned files (for example styles.css?v=...). The app
    // shell stores their canonical URLs, so fall back to that URL when offline.
    // Without this, an installed app can render unstyled HTML after a refresh.
    event.respondWith(
      fetch(event.request).catch(async () => {
        const exactMatch = await caches.match(event.request);
        if (exactMatch) return exactMatch;

        const canonicalUrl = new URL(event.request.url);
        canonicalUrl.search = '';
        return caches.match(canonicalUrl.toString());
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
