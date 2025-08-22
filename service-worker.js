// Tiny cache‑first SW for offline shell + queued uploads handled by the page
const CACHE = "pov-sw-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (ASSETS.some((a) => url.pathname.endsWith(a.replace("./", "/")))) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  } else {
    // network‑first for API/others, with offline fallback to cached shell if HTML
    e.respondWith(
      fetch(e.request).catch(async () => {
        if (e.request.mode === "navigate") return caches.match("./index.html");
        const cached = await caches.match(e.request);
        return cached || new Response("Offline", { status: 503 });
      })
    );
  }
});
