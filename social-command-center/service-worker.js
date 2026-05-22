const CACHE_NAME = "jcue-social-command-center-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data/social-plan.js",
  "./data/daily-updates.js",
  "./manifest.webmanifest",
  "./assets/icon.svg"
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
  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname.includes("/api/")) return;
  const isDashboardAsset = [
    "/social-command-center/",
    "/social-command-center/index.html",
    "/social-command-center/styles.css",
    "/social-command-center/app.js",
    "/social-command-center/data/social-plan.js",
    "/social-command-center/data/daily-updates.js"
  ].some((path) => requestUrl.pathname === path);

  event.respondWith(
    (isDashboardAsset
      ? fetch(event.request).catch(() => caches.match(event.request))
      : caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
      .then((response) => {
        if (event.request.method === "GET" && response?.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match("./index.html"))
  );
});
