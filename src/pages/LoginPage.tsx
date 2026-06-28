import { useState } from 'react'
import { signInWithEmail } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await signInWithEmail(email, password)
      if (error) setError('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-center">
        <div className="text-5xl mb-3">🐾</div>
        <h1 className="text-2xl font-bold text-gray-900">Petly</h1>
        <p className="text-sm text-gray-500 mt-1">Saúde dos seus pets, sempre em dia</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Button type="submit" fullWidth size="lg" disabled={loading}>
          {loading ? 'Aguarde...' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
