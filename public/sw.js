const CACHE_NAME = "pockland-v148";
const scopeUrl = new URL(self.registration.scope);
const scopedUrl = (path) => new URL(path, scopeUrl).toString();
const ASSETS = [
  scopedUrl("."),
  scopedUrl("index.html"),
  scopedUrl("manifest.webmanifest"),
  scopedUrl("covers/frankenstein.jpg"),
  scopedUrl("covers/jane-eyre.jpg"),
  scopedUrl("covers/little-women.jpg"),
  scopedUrl("covers/pride-and-prejudice.jpg"),
  scopedUrl("avatars/anya.jpg"),
  scopedUrl("avatars/lera.jpg"),
  scopedUrl("avatars/mila.jpg"),
  scopedUrl("avatars/you.jpg"),
  scopedUrl("icons/icon-192.png"),
  scopedUrl("icons/icon-512.png")
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match(scopedUrl(".")));
    })
  );
});
