import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getWeights, createWeight, deleteWeight } from '../lib/api'
import type { Weight } from '../lib/database.types'
import { TopBar } from '../components/ui/TopBar'
import { BottomNav } from '../components/ui/BottomNav'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate } from '../lib/utils'
import { Plus, Weight as WeightIcon, Trash2, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ── SVG Weight Chart ──────────────────────────────────────────────────────────
function WeightChart({ weights }: { weights: Weight[] }) {
  if (weights.length < 2) return null

  const sorted = [...weights].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  const values = sorted.map(w => w.weight_kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const W = 320, H = 120, PX = 12, PY = 16
  const iW = W - PX * 2
  const iH = H - PY * 2

  const pts = sorted.map((w, i) => {
    const x = PX + (i / (sorted.length - 1)) * iW
    const y = PY + iH - ((w.weight_kg - min) / range) * iH
    return { x, y, w }
  })

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(PY + iH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PY + iH).toFixed(1)} Z`

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
      <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Evolução do Peso</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
        <defs>
          <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* area fill */}
        <path d={areaD} fill="url(#wGrad)" />
        {/* line */}
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* dots + labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#22c55e" stroke="#fff" strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="#15803d" fontWeight="600">
              {p.w.weight_kg}
            </text>
          </g>
        ))}
        {/* x-axis dates — show first, mid, last */}
        {[0, Math.floor((pts.length - 1) / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i).map(i => (
          <text key={i} x={pts[i].x} y={H - 2} textAnchor="middle" fontSize="8" fill="#57606a">
            {sorted[i].recorded_at.slice(5)}
          </text>
        ))}
      </svg>
      <div className="flex items-center justify-between text-xs text-green-700 mt-1">
        <span>Mín: <strong>{min} kg</strong></span>
        <span>Máx: <strong>{max} kg</strong></span>
        <span>{sorted.length} medições</span>
      </div>
    </div>
  )
}

export default function WeightsPage() {
  const { id: petId } = useParams<{ id: string }>()
  const [weights, setWeights] = useState<Weight[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  async function load() {
    if (!petId) return
    const { data } = await getWeights(petId)
    if (data) setWeights(data)
  }

  useEffect(() => { load() }, [petId])

  function resetForm() {
    setWeightKg(''); setRecordedAt(new Date().toISOString().slice(0, 10)); setNotes('')
    setShowForm(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!petId || !weightKg) return
    setSaving(true)
    await createWeight({ pet_id: petId, weight_kg: parseFloat(weightKg), recorded_at: recordedAt, notes: notes || null })
    resetForm()
    await load()
    setSaving(false)
  }

  async function handleDelete(weightId: string) {
    if (!confirm('Remover esta pesagem?')) return
    await deleteWeight(weightId)
    setWeights(w => w.filter(x => x.id !== weightId))
  }

  function getTrend(index: number) {
    if (index >= weights.length - 1) return null
    const diff = weights[index].weight_kg - weights[index + 1].weight_kg
    if (diff > 0.1) return 'up'
    if (diff < -0.1) return 'down'
    return 'stable'
  }

  return (
    <div className="pb-20">
      <TopBar
        title="Peso"
        back
        action={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Registrar
          </Button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Current weight hero */}
        {weights.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl px-5 py-4 flex items-center justify-between text-white">
            <div>
              <p className="text-xs text-green-100 uppercase tracking-wider font-medium">Peso atual</p>
              <p className="text-4xl font-bold mt-1">{weights[0].weight_kg}<span className="text-lg font-normal ml-1">kg</span></p>
              <p className="text-xs text-green-100 mt-0.5">{formatDate(weights[0].recorded_at)}</p>
            </div>
            <WeightIcon size={44} className="text-green-200 opacity-60" />
          </div>
        )}

        {/* Chart */}
        <WeightChart weights={weights} />

        {/* Form */}
        {showForm && (
          <Card className="flex flex-col gap-3 border-green-100 bg-green-50/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Nova pesagem</h3>
              <button onClick={resetForm} className="p-1 rounded-full hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Input label="Peso (kg) *" type="number" step="0.01" min="0" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="Ex: 12.5" required />
                <Input label="Data *" type="date" value={recordedAt} onChange={e => setRecordedAt(e.target.value)} required />
              </div>
              <Textarea label="Observações" value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={saving || !weightKg}>
                  {saving ? 'Salvando...' : 'Salvar pesagem'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {weights.length === 0 && !showForm && (
          <EmptyState icon={<WeightIcon size={52} />} title="Nenhuma pesagem registrada"
            description="Registre o peso regularmente para acompanhar a saúde do seu pet."
            action={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Registrar peso</Button>} />
        )}

        {/* History */}
        {weights.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Histórico</p>
            <div className="flex flex-col gap-2">
              {weights.map((w, i) => {
                const trend = getTrend(i)
                return (
                  <Card key={w.id} className="flex items-center gap-3 py-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-gray-100'}`}>
                      {trend === 'up' ? <TrendingUp size={16} className="text-green-600" /> : trend === 'down' ? <TrendingDown size={16} className="text-red-500" /> : <Minus size={16} className="text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{w.weight_kg} <span className="text-sm font-normal text-gray-500">kg</span></p>
                      <p className="text-xs text-gray-400">{formatDate(w.recorded_at)}{w.notes ? ` · ${w.notes}` : ''}</p>
                    </div>
                    <button onClick={() => handleDelete(w.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
