/**
 * PlayVerse Ops — App Shell Service Worker
 * ─────────────────────────────────────────
 * Caches the app shell (HTML, JS, CSS, fonts) via a stale-while-revalidate
 * strategy so the PWA loads instantly even in weak-signal / offline scenarios.
 *
 * This file is separate from firebase-messaging-sw.js (which handles FCM push).
 * Vite builds output to /dist and this SW is copied to /dist/sw.js at build time.
 */

/* eslint-env serviceworker */

const CACHE_NAME = "pvops-shell-v3";

/** Max age (in ms) for non-hashed assets in the cache — 7 days */
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Files to pre-cache on install.
 * The index.html is the entry-point for the SPA; Vite-hashed assets are
 * captured at runtime by the fetch handler below.
 */
const PRE_CACHE_REQUIRED = ["/", "/index.html", "/manifest.json"];
const PRE_CACHE_OPTIONAL = ["/icon-192.png", "/icon-512.png"];

/* ── Install: cache the minimal app shell ── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Required assets — fail install if missing
      await cache.addAll(PRE_CACHE_REQUIRED);
      // Optional assets — continue even if icons are absent
      await Promise.allSettled(
        PRE_CACHE_OPTIONAL.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

/* ── Activate: clean up old caches ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  // Claim currently-open pages so we start intercepting immediately
  self.clients.claim();
});

/* ── Fetch: stale-while-revalidate for same-origin assets ── */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only cache GET requests to our own origin
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip chrome-extension, firebase auth popups, etc.
  if (url.pathname.startsWith("/__")) return;

  // For navigation requests, always serve index.html (SPA)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh index.html
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // For assets (/assets/*, fonts, images) — stale-while-revalidate
  // Vite-hashed assets (contain a hash in path) are immutable, cache forever.
  // Non-hashed assets expire after MAX_CACHE_AGE.
  event.respondWith(
    caches.match(request).then((cached) => {
      const isHashed = /\/assets\/.+\.[a-f0-9]{8,}\./i.test(url.pathname);

      const networkFetch = fetch(request)
        .then((response) => {
          // Only cache successful, full responses (skip 206 partial — Cache API rejects them)
          if (response.ok && response.status !== 206) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // If network fails and we have nothing cached, return a basic offline fallback
          return cached || new Response("Offline", { status: 503, statusText: "Offline" });
        });

      // For hashed assets, trust the cache indefinitely
      if (cached && isHashed) return cached;

      // For non-hashed assets, check cache freshness via the date header
      if (cached && !isHashed) {
        const dateHeader = cached.headers.get("date");
        if (dateHeader) {
          const cachedAge = Date.now() - new Date(dateHeader).getTime();
          if (cachedAge > MAX_CACHE_AGE) {
            // Cache is stale — prefer network, fall back to stale copy
            return networkFetch;
          }
        }
      }

      // Return cached version immediately, update in background
      return cached || networkFetch;
    })
  );
});
