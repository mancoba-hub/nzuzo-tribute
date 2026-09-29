// Service worker: keeps the app usable offline, but always checks the network
// first for page loads so updates appear immediately.
// API and photo requests always go straight to the network.
const CACHE = "nzuzo-tribute-v2";
const ASSETS = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/uploads")) return;

  // Page loads: network first, so new versions appear straight away.
  // Falls back to the cached page only when offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/index.html", clone));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Other assets (JS/CSS bundles): cache first. Each build has unique
  // hashed file names, so cached copies are always the right ones.
  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ||
        fetch(event.request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((cache) => cache.put(event.request, clone));
            }
            return res;
          })
          .catch(() => caches.match("/index.html"))
    )
  );
});
