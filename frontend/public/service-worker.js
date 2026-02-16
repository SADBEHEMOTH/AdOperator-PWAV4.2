const CACHE_NAME = "adoperator-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (cached) return cached;
          if (request.mode === "navigate") return offlineFallback();
          return new Response("", { status: 408 });
        });

      return cached || networkFetch;
    })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "AdOperator", body: "Novidade disponível!", url: "/" };

  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    // fallback
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "AdOperator", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "adoperator-notification",
      data: { url: data.url || "/" },
      actions: data.actions || [],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

function offlineFallback() {
  return new Response(
    `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AdOperator - Offline</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#09090b;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}
.c{max-width:400px}.i{width:64px;height:64px;border-radius:50%;border:1px solid #27272a;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;background:#111}
h1{font-size:1.5rem;font-weight:700;margin-bottom:.5rem}p{color:#71717a;font-size:.875rem;line-height:1.5}
.r{margin-top:2rem;padding:.75rem 1.5rem;background:#fff;color:#000;border:0;border-radius:4px;font-weight:600;cursor:pointer;font-size:.875rem}</style></head>
<body><div class="c"><div class="i"><svg width="24" height="24" fill="none" stroke="#52525b" stroke-width="1.5" viewBox="0 0 24 24"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></svg></div>
<h1>Sem conexão</h1><p>O AdOperator precisa de internet para funcionar. Verifique sua conexão e tente novamente.</p>
<button class="r" onclick="location.reload()">Tentar novamente</button></div></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
