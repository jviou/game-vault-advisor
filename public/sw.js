// --- Service Worker (cache + auto-update) ---
// ⬅️ Si tu veux invalider manuellement tout l'ancien cache, change juste ce nom.
const CACHE_NAME = "game-vault-v4";
const OFFLINE_URLS = ["/", "/index.html"];

// Permet à la page de dire “active-toi tout de suite”
self.addEventListener("message", (evt) => {
  if (evt.data && evt.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Pré-cache le minimum pour l’offline et passe direct en “waiting”
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => {})
  );
});

// Prend le contrôle + nettoie les vieux caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Stratégies de fetch :
// - /api et /sgdb => network-first (pour toujours voir les dernières données)
// - Assets même origine => cache-first avec revalidation en arrière-plan
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Laisse passer les requêtes cross-origin (CDN externes, etc.)
  if (url.origin !== self.location.origin) return;

  // API et proxy SGDB : network-first
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/sgdb")) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Assets / pages : cache-first (stale-while-revalidate simplifié)
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => cached || caches.match("/"));
      return cached || fetchPromise;
    })
  );
});
