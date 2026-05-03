self.addEventListener("push", event => {
  if (!event.data) return;

  const data = event.data.json();

  self.registration.showNotification(data.title, {
    body: data.body,
    data: {
      url: data.url,
      type: data.type
    },
    icon: "https://xpcqiovfesvllsljxhac.supabase.co/storage/v1/object/public/uploads/1/logos/4f88da54-69ef-447b-a82b-209778bd5135.png"
  });
});



self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});


self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
