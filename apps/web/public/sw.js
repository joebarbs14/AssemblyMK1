// Assembly service worker — M4 baseline.
//
// Responsibilities:
//   1. Install + activate cleanly, no aggressive caching of HTML.
//   2. Network-first for navigations with an offline fallback page.
//   3. Cache-first for the app shell static assets.
//   4. Background sync hook for the offline draft queue (Dexie writes
//      a 'pending-report-draft' record; SW posts when online).
//   5. Push event handler for Web Push notifications (M4+ once VAPID
//      keys + subscribe flow ship — payload format stable here).
//
// Versioning: bump SW_VERSION to invalidate caches.

const SW_VERSION = "v1";
const STATIC_CACHE = `assembly-static-${SW_VERSION}`;
const OFFLINE_URL = "/offline";

const STATIC_ASSETS = ["/", "/manifest.json", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("assembly-") && k !== STATIC_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Same-origin navigations: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return offline ?? new Response("Offline", { status: 503 });
        }
      })(),
    );
    return;
  }

  // App-shell static assets: cache-first, refresh in background.
  if (url.origin === self.location.origin && /\.(?:js|css|woff2?|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return cached ?? (await network) ?? new Response("", { status: 504 });
      })(),
    );
  }
});

// --- Background sync: drains pending-report-drafts from IndexedDB ---

self.addEventListener("sync", (event) => {
  if (event.tag === "drain-pending-reports") {
    event.waitUntil(drainPendingReports());
  }
});

async function drainPendingReports() {
  // Tell open clients to flush. The Dexie store lives in their page context,
  // and they already have the auth cookie attached for fetch. Simple +
  // resilient: the SW doesn't need to know the API surface.
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const c of clients) {
    c.postMessage({ type: "drain-pending-reports" });
  }
}

// --- Web Push (server-side VAPID + subscribe flow lands in a follow-up) ---

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: "Assembly", body: event.data?.text() ?? "Update" };
  }
  const title = payload.title || "Assembly";
  const body = payload.body || "";
  const url = payload.url || "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(async (clients) => {
      for (const c of clients) {
        if ("focus" in c && c.url.endsWith(url)) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
