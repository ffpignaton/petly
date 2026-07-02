/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; icon?: string; badge?: string; tag?: string } = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { title: 'Petly', body: event.data?.text() ?? '' }
  }

  const title = data.title ?? '🐾 Petly'
  const options: NotificationOptions & { renotify?: boolean } = {
    body: data.body ?? '',
    icon: data.icon ?? '/pwa-192x192.png',
    badge: data.badge ?? '/pwa-192x192.png',
    tag: data.tag ?? 'petly',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification click — open / focus the app ─────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    })
  )
})
