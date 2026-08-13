const CACHE_NAME = "lumber-tally-shell-v1";
const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);

  const indexResponse = await fetch("/", { cache: "no-store" });
  if (!indexResponse.ok) return;

  await cache.put("/", indexResponse.clone());
  const html = await indexResponse.text();
  const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => `${url.pathname}${url.search}`);
  await cache.addAll([...new Set(assetUrls)]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheApplicationShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put("/", copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match("/")) || caches.match("/offline.html")),
    );
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
    }
    return response;
  })());
});
