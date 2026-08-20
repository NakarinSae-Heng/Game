// Service worker: cache-first ทุกไฟล์ของเกม เพื่อให้เล่นออฟไลน์ได้
// เกมไม่มี asset ภายนอกเลย จึง cache ได้ครบทั้งหมดในครั้งแรก

const CACHE = 'pacrush-v1';

const ASSETS = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/game.js',
  'js/config.js',
  'js/maze.js',
  'js/mazeRenderer.js',
  'js/render.js',
  'js/movement.js',
  'js/dir.js',
  'js/ghostAI.js',
  'js/powerups.js',
  'js/combo.js',
  'js/fx.js',
  'js/audio.js',
  'js/input.js',
  'js/hud.js',
  'js/ui.js',
  'js/storage.js',
  'js/missions.js',
  'js/leaderboard.js',
  'js/entities/pacman.js',
  'js/entities/ghost.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE)
      // ไฟล์เดียวพลาดไม่ควรทำให้ติดตั้งล้มทั้งหมด
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(new Request(a, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) {
        // อัปเดตเบื้องหลังไว้ให้รอบหน้า
        fetch(req).then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
