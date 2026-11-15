// Light Time service worker: offline app shell and alert-notification actions.
const CACHE = "light-time-v1";
const SHELL = "/base-station";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch(SHELL);
      // Never keep an error page as the offline shell: fail the install and retry next load.
      if (!res.ok) throw new Error(`shell ${res.status}`);
      const html = await res.clone().text();
      await cache.put(SHELL, res);
      // The page's own scripts and styles, so the overview renders offline after one visit.
      const assets = [
        ...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g),
      ].map((m) => m[1]);
      await cache.addAll([...new Set(assets)]).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// Network first, so a new deploy shows at once; the cache answers only when offline.
// Only page loads and hashed static files are kept: RSC and prefetch requests would grow the cache forever.
// shortcut: old deploys' static files stay cached until CACHE is renamed; rename it if the cache grows.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const keep =
    req.mode === "navigate" || url.pathname.startsWith("/_next/static/");
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (keep && res.status === 200) {
          const copy = res.clone();
          event.waitUntil(
            caches
              .open(CACHE)
              .then((c) => c.put(req, copy))
              .catch(() => {}),
          );
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match(SHELL);
        return Response.error();
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const alertId = event.notification.data?.alertId;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (event.action === "ack" && windows.length > 0) {
        for (const w of windows)
          w.postMessage({ type: "acknowledge", alertId });
        return;
      }
      const url = `/base-station/alerts/${alertId}`;
      const win = windows[0];
      if (win) {
        await win.focus();
        await win.navigate?.(url).catch(() => {});
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
