import { useEffect, useRef, useState } from 'react'
import { UserCircle, LogOut, MessageCircle, X, Send } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { signOut } from '../../lib/api'
import { supabase } from '../../lib/supabase'

export function UserMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await signOut()
  }

  return (
    <>
      {/* Icon button */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Menu do usuário"
        >
          <UserCircle size={24} className="text-gray-500" />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-400">Logado como</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.email}</p>
            </div>

            {/* Actions */}
            <button
              onClick={() => { setOpen(false); setShowContact(true) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <MessageCircle size={16} className="text-blue-500" />
              Entrar em contato
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        )}
      </div>

      {/* Contact modal */}
      {showContact && (
        <ContactModal
          userEmail={user?.email ?? ''}
          onClose={() => setShowContact(false)}
        />
      )}
    </>
  )
}

// ── Contact Modal ─────────────────────────────────────────────────────────────

function ContactModal({ userEmail, onClose }: { userEmail: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !subject.trim() || !message.trim()) return
    setSending(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ name: name.trim(), subject: subject.trim(), message: message.trim(), userEmail }),
        }
      )
      if (!res.ok) throw new Error('Erro ao enviar')
      setSent(true)
    } catch {
      setError('Não foi possível enviar. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900">Entrar em contato</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Sent state */}
        {sent ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <div className="text-5xl">✅</div>
            <h3 className="font-semibold text-gray-900">Mensagem enviada!</h3>
            <p className="text-sm text-gray-500">Recebemos sua mensagem e entraremos em contato em breve.</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seu nome *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: João Silva"
                required
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
              />
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assunto *</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ex: Dúvida sobre vacinas"
                required
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
              />
            </div>

            {/* Message */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensagem *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                required
                rows={4}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <button
              type="submit"
              disabled={sending || !name.trim() || !subject.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              <Send size={15} />
              {sending ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
