import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)
}

// ── send email via Resend ─────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Petly <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Resend error:', err)
  }
}

// ── build HTML email ──────────────────────────────────────────────────────────

function buildEmail(
  userName: string,
  alerts: { petName: string; type: string; name: string; dueDate: string | null; days: number | null; category: string }[]
): string {
  const rows = alerts.map(a => {
    const urgency = a.days !== null && a.days < 0
      ? `<span style="color:#ef4444;font-weight:600;">VENCIDO há ${Math.abs(a.days)} dia${Math.abs(a.days) !== 1 ? 's' : ''}</span>`
      : a.days !== null && a.days === 0
      ? `<span style="color:#ef4444;font-weight:600;">VENCE HOJE</span>`
      : `<span style="color:#d97706;font-weight:600;">em ${a.days} dia${a.days !== 1 ? 's' : ''} (${fmtDate(a.dueDate)})</span>`

    const icon = a.category === 'vaccine' ? '💉' : a.category === 'medication' ? '💊' : '🩺'

    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
          <strong>${icon} ${a.petName}</strong><br>
          <span style="color:#57606a;font-size:13px;">${a.type}: ${a.name}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">
          ${urgency}
        </td>
      </tr>`
  }).join('')

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    
    <!-- header -->
    <div style="background:#3b82f6;padding:24px 28px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">🐾 Petly</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">Lembretes de saúde dos seus pets</p>
    </div>

    <!-- body -->
    <div style="padding:24px 28px;">
      <p style="margin:0 0 16px;color:#1f2328;font-size:15px;">
        Olá${userName ? `, ${userName}` : ''}! Aqui estão os lembretes de hoje:
      </p>

      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <thead>
          <tr style="background:#f7f8fa;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#57606a;text-transform:uppercase;letter-spacing:.5px;">Pet / Item</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#57606a;text-transform:uppercase;letter-spacing:.5px;">Prazo</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <p style="margin:20px 0 0;font-size:13px;color:#57606a;">
        Acesse o app para registrar as aplicações e manter o histórico em dia.
      </p>
    </div>

    <!-- footer -->
    <div style="padding:16px 28px;border-top:1px solid #e5e7eb;background:#f7f8fa;">
      <p style="margin:0;font-size:12px;color:#57606a;text-align:center;">
        Petly · Você recebe este e-mail porque tem alertas configurados no app.
      </p>
    </div>
  </div>
</body>
</html>`
}

// ── main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) throw usersError

    let emailsSent = 0

    for (const user of users.users) {
      const userEmail = user.email
      if (!userEmail) continue

      // Get all pets for this user
      const { data: pets } = await supabase
        .from('pets')
        .select('id, name')
        .eq('user_id', user.id)

      if (!pets || pets.length === 0) continue

      const petIds = pets.map(p => p.id)
      const petMap = Object.fromEntries(pets.map(p => [p.id, p.name]))

      const alerts: {
        petName: string; type: string; name: string
        dueDate: string | null; days: number | null; category: string
      }[] = []

      // ── Vaccines ──────────────────────────────────────────────────────────
      const { data: vaccines } = await supabase
        .from('vaccines')
        .select('pet_id, name, next_due_at, alert_days_before')
        .in('pet_id', petIds)
        .not('next_due_at', 'is', null)

      for (const v of vaccines ?? []) {
        const days = daysUntil(v.next_due_at)
        if (days === null) continue
        const threshold = v.alert_days_before ?? 30
        if (days <= threshold) {
          alerts.push({
            petName: petMap[v.pet_id],
            type: 'Vacina',
            name: v.name,
            dueDate: v.next_due_at,
            days,
            category: 'vaccine',
          })
        }
      }

      // ── Medications (periodic) ─────────────────────────────────────────────
      const { data: meds } = await supabase
        .from('medications')
        .select('pet_id, name, med_type, next_due_at, alert_days_before, daily_time')
        .in('pet_id', petIds)

      for (const m of meds ?? []) {
        if (m.med_type === 'periodic' && m.next_due_at) {
          const days = daysUntil(m.next_due_at)
          if (days === null) continue
          const threshold = m.alert_days_before ?? 7
          if (days <= threshold) {
            alerts.push({
              petName: petMap[m.pet_id],
              type: 'Remédio periódico',
              name: m.name,
              dueDate: m.next_due_at,
              days,
              category: 'medication',
            })
          }
        }
        // Daily reminder — always send
        if (m.med_type === 'daily') {
          alerts.push({
            petName: petMap[m.pet_id],
            type: 'Remédio diário',
            name: m.name + (m.daily_time ? ` (${m.daily_time.slice(0, 5)})` : ''),
            dueDate: null,
            days: 0,
            category: 'medication',
          })
        }
      }

      // Only send email if there are alerts
      if (alerts.length === 0) continue

      // Sort: overdue first
      alerts.sort((a, b) => (a.days ?? 0) - (b.days ?? 0))

      const petCount = pets.length
      const subject = alerts.some(a => a.days !== null && a.days <= 0)
        ? `🚨 Petly — ${alerts.filter(a => a.days !== null && a.days <= 0).length} lembrete(s) VENCIDO(S)`
        : `🐾 Petly — ${alerts.length} lembrete${alerts.length > 1 ? 's' : ''} para ${petCount} pet${petCount > 1 ? 's' : ''}`

      const html = buildEmail(user.user_metadata?.name ?? '', alerts)
      await sendEmail(userEmail, subject, html)
      emailsSent++

      console.log(`Email sent to ${userEmail} with ${alerts.length} alerts`)
    }

    return new Response(
      JSON.stringify({ ok: true, emailsSent }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
