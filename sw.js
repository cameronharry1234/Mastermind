// Mastermind — service worker for offline app-shell caching.
// This file only matters for the real hosted copy of the site (e.g. GitHub Pages),
// where it sits alongside index.html at the same origin. It is never shipped inside
// the single-file Claude artifact itself — a browser cannot register a service
// worker from a blob:/data: URL, so there is no way to inline this into index.html.
// The index.html registration (`navigator.serviceWorker.register('./sw.js')`) simply
// no-ops wherever this file isn't actually present alongside it, such as inside the
// Claude artifact preview.

const CACHE_NAME = "mastermind-shell-v1";
const SHELL_URL = "./index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([SHELL_URL, "./"]).catch(() => {
        // best-effort: if either request fails (e.g. "./" 404s on some hosts),
        // don't fail the whole install - just cache what we can.
        return cache.add(SHELL_URL).catch(() => {});
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for navigations (so people always get a fresh app shell when
// online, with live AI calls etc. working normally), falling back to the cached
// shell when offline. Everything else (fonts, API calls) just passes through -
// this service worker only guarantees the page itself still opens offline.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(SHELL_URL).then((cached) => cached || Response.error()))
    );
  }
});
