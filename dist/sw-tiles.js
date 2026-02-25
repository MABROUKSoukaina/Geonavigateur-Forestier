const CACHE = 'geonav-tiles-v1';
const TILE_ORIGINS = [
  'mt0.google.com',
  'mt1.google.com',
  'mt2.google.com',
  'mt3.google.com',
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org',
  'b.tile.openstreetmap.org',
  'c.tile.openstreetmap.org',
  'basemaps.cartocdn.com',
  'tile.opentopomap.org',
];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!TILE_ORIGINS.some(o => url.hostname.includes(o))) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      } catch {
        // Offline and not cached — return transparent 1x1 PNG tile
        if (cached) return cached;
        return new Response(
          atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
          { status: 200, headers: { 'Content-Type': 'image/png' } }
        );
      }
    })
  );
});
