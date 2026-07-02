import { useState, useEffect, useCallback } from 'react'
import { savePushSubscription, deletePushSubscription, getPushSubscription } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export type PushStatus = 'unsupported' | 'loading' | 'denied' | 'subscribed' | 'unsubscribed'

export function usePushNotifications() {
  const { user } = useAuth()
  const [status, setStatus] = useState<PushStatus>('loading')

  // Check initial state
  useEffect(() => {
    if (!user) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    // Timeout de segurança — se o SW demorar mais de 3s, assume não inscrito
    const timeout = setTimeout(() => setStatus('unsubscribed'), 3000)

    navigator.serviceWorker.ready.then(async (reg) => {
      clearTimeout(timeout)
      const existing = await reg.pushManager.getSubscription()
      if (!existing) {
        setStatus('unsubscribed')
        return
      }
      // Verify it's still in DB
      const { data } = await getPushSubscription(user.id, existing.endpoint)
      setStatus(data ? 'subscribed' : 'unsubscribed')
    }).catch(() => { clearTimeout(timeout); setStatus('unsubscribed') })

    return () => clearTimeout(timeout)
  }, [user])

  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await savePushSubscription(user.id, sub.toJSON())
      setStatus('subscribed')
    } catch (err) {
      console.error('Push subscribe error:', err)
      setStatus('unsubscribed')
    }
  }, [user])

  const unsubscribe = useCallback(async () => {
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch (err) {
      console.error('Push unsubscribe error:', err)
      setStatus('subscribed')
    }
  }, [])

  return { status, subscribe, unsubscribe }
}
