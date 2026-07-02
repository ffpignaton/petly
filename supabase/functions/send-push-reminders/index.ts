import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:ffpignaton@gmail.com'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── helpers ───────────────────────────────────────────────────────────────────

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
}

// ── Web Push via VAPID (manual implementation for Deno) ───────────────────────

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; badge?: string; tag?: string }
) {
  // Encode payload
  const payloadStr = JSON.stringify(payload)

  // Import VAPID private key
  const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Build VAPID JWT
  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600

  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const claims = base64UrlEncode(JSON.stringify({ aud: audience, exp: expiry, sub: VAPID_SUBJECT }))
  const signingInput = `${header}.${claims}`

  const sigKey = await crypto.subtle.importKey(
    'pkcs8',
    await exportPkcs8(privateKeyBytes),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    sigKey,
    new TextEncoder().encode(signingInput)
  )
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      TTL: '86400',
    },
    body: payloadStr,
  })

  // 410 Gone = subscription expired, caller should remove it
  return { ok: res.ok || res.status === 201, gone: res.status === 410 }
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlDecode(str: string): Uint8Array {
  const s = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(s)
  return new Uint8Array([...bin].map(c => c.charCodeAt(0)))
}

// Convert raw 32-byte EC private key → PKCS#8 DER for ECDSA import
async function exportPkcs8(rawPrivate: Uint8Array): Promise<ArrayBuffer> {
  // Import as ECDH first (accepts raw), then export PKCS8 via JWK round-trip
  const tempKey = await crypto.subtle.importKey(
    'raw', rawPrivate, { name: 'ECDH', namedCurve: 'P-256' }, true, []
  )
  // Re-import as ECDSA using JWK
  const jwk = await crypto.subtle.exportKey('jwk', tempKey)
  jwk.key_ops = ['sign']
  const ecdsaKey = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']
  )
  return crypto.subtle.exportKey('pkcs8', ecdsaKey)
}

// ── main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const { data: users } = await supabase.auth.admin.listUsers()
    if (!users) return new Response(JSON.stringify({ ok: false }), { status: 500 })

    let sent = 0
    let removed = 0

    for (const user of users.users) {
      // Get subscriptions for this user
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', user.id)

      if (!subs || subs.length === 0) continue

      // Get pets
      const { data: pets } = await supabase
        .from('pets').select('id, name').eq('user_id', user.id)
      if (!pets || pets.length === 0) continue

      const petIds = pets.map(p => p.id)
      const petMap = Object.fromEntries(pets.map(p => [p.id, p.name]))

      const alerts: string[] = []

      // Vaccines
      const { data: vaccines } = await supabase
        .from('vaccines').select('pet_id, name, next_due_at, alert_days_before')
        .in('pet_id', petIds).not('next_due_at', 'is', null)

      for (const v of vaccines ?? []) {
        const days = daysUntil(v.next_due_at)
        if (days === null) continue
        if (days <= (v.alert_days_before ?? 30)) {
          const label = days < 0 ? `vencida há ${Math.abs(days)}d` : days === 0 ? 'vence hoje' : `em ${days}d`
          alerts.push(`💉 ${petMap[v.pet_id]}: vacina ${v.name} — ${label}`)
        }
      }

      // Medications (periodic + daily)
      const { data: meds } = await supabase
        .from('medications').select('pet_id, name, med_type, next_due_at, alert_days_before, daily_time')
        .in('pet_id', petIds)

      for (const m of meds ?? []) {
        if (m.med_type === 'periodic' && m.next_due_at) {
          const days = daysUntil(m.next_due_at)
          if (days === null) continue
          if (days <= (m.alert_days_before ?? 7)) {
            const label = days < 0 ? `vencida há ${Math.abs(days)}d` : days === 0 ? 'hoje' : `em ${days}d`
            alerts.push(`💊 ${petMap[m.pet_id]}: ${m.name} — próxima dose ${label}`)
          }
        }
        if (m.med_type === 'daily') {
          alerts.push(`💊 ${petMap[m.pet_id]}: ${m.name} — lembrete diário${m.daily_time ? ` às ${m.daily_time.slice(0,5)}` : ''}`)
        }
      }

      if (alerts.length === 0) continue

      const title = alerts.some(a => a.includes('vencida')) ? '🚨 Petly — Alertas urgentes' : '🐾 Petly — Lembretes de hoje'
      const body = alerts.slice(0, 3).join('\n') + (alerts.length > 3 ? `\n+${alerts.length - 3} mais...` : '')

      for (const sub of subs) {
        const { ok, gone } = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', tag: 'petly-reminder' }
        )
        if (gone) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          removed++
        } else if (ok) {
          sent++
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, removed }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
})
