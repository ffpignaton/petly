const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL = 'ffpignaton@gmail.com'

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const { name, subject, message, userEmail } = await req.json()

    if (!name || !subject || !message) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#3b82f6;padding:24px 28px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">🐾 Petly — Nova mensagem</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">Formulário de contato do app</p>
    </div>
    <div style="padding:24px 28px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#57606a;font-weight:600;width:90px;">De:</td>
          <td style="padding:8px 0;font-size:14px;color:#1f2328;">${name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#57606a;font-weight:600;">E-mail:</td>
          <td style="padding:8px 0;font-size:14px;color:#1f2328;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#57606a;font-weight:600;">Assunto:</td>
          <td style="padding:8px 0;font-size:14px;color:#1f2328;font-weight:600;">${subject}</td>
        </tr>
      </table>
      <div style="background:#f7f8fa;border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;">
        <p style="margin:0;font-size:14px;color:#1f2328;line-height:1.7;white-space:pre-wrap;">${message}</p>
      </div>
      <p style="margin-top:20px;font-size:12px;color:#57606a;">
        Para responder, basta responder este e-mail ou escrever para: <strong>${userEmail}</strong>
      </p>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #e5e7eb;background:#f7f8fa;">
      <p style="margin:0;font-size:12px;color:#57606a;text-align:center;">
        Petly · Mensagem enviada pelo app
      </p>
    </div>
  </div>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Petly <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        reply_to: userEmail,
        subject: `📬 Petly — ${subject}`,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      throw new Error(err)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
