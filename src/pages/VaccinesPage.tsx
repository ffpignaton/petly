import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getVaccines, createVaccine, updateVaccine, deleteVaccine } from '../lib/api'
import type { Vaccine } from '../lib/database.types'
import { TopBar } from '../components/ui/TopBar'
import { BottomNav } from '../components/ui/BottomNav'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate, isOverdue, daysUntil } from '../lib/utils'
import { Plus, Syringe, Trash2, X, AlertTriangle, CheckCircle, RefreshCw, Pencil, CheckCheck } from 'lucide-react'

function computeNextDue(appliedAt: string, intervalMonths: number): string {
  const d = new Date(appliedAt)
  d.setMonth(d.getMonth() + intervalMonths)
  return d.toISOString().slice(0, 10)
}

const INTERVAL_OPTIONS = [
  { value: '', label: 'Não se repete' },
  { value: '1', label: 'Mensal (1 mês)' },
  { value: '3', label: 'Trimestral (3 meses)' },
  { value: '6', label: 'Semestral (6 meses)' },
  { value: '12', label: 'Anual (12 meses)' },
  { value: '24', label: 'A cada 2 anos' },
  { value: '36', label: 'A cada 3 anos' },
]

type FormState = {
  name: string; appliedAt: string; intervalMonths: string; nextDueAt: string
  alertDays: string; vetName: string; vetClinic: string; notes: string
}

const EMPTY_FORM: FormState = {
  name: '', appliedAt: '', intervalMonths: '', nextDueAt: '',
  alertDays: '30', vetName: '', vetClinic: '', notes: '',
}

export default function VaccinesPage() {
  const { id: petId } = useParams<{ id: string }>()
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function load() {
    if (!petId) return
    const { data } = await getVaccines(petId)
    if (data) setVaccines(data)
  }

  useEffect(() => { load() }, [petId])

  useEffect(() => {
    if (form.appliedAt && form.intervalMonths) {
      set('nextDueAt', computeNextDue(form.appliedAt, parseInt(form.intervalMonths)))
    } else if (!form.intervalMonths) {
      set('nextDueAt', '')
    }
  }, [form.appliedAt, form.intervalMonths])

  function startEdit(v: Vaccine) {
    setEditingId(v.id)
    setForm({
      name: v.name,
      appliedAt: v.applied_at,
      intervalMonths: v.interval_months?.toString() ?? '',
      nextDueAt: v.next_due_at ?? '',
      alertDays: v.alert_days_before?.toString() ?? '30',
      vetName: v.vet_name ?? '',
      vetClinic: v.vet_clinic ?? '',
      notes: v.notes ?? '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!petId || !form.name.trim() || !form.appliedAt) return
    setSaving(true)
    const payload = {
      pet_id: petId,
      name: form.name.trim(),
      applied_at: form.appliedAt,
      next_due_at: form.nextDueAt || null,
      interval_months: form.intervalMonths ? parseInt(form.intervalMonths) : null,
      alert_days_before: parseInt(form.alertDays) || 30,
      vet_name: form.vetName || null,
      vet_clinic: form.vetClinic || null,
      notes: form.notes || null,
    }
    if (editingId) {
      await updateVaccine(editingId, payload)
    } else {
      await createVaccine(payload)
    }
    resetForm()
    await load()
    setSaving(false)
  }

  async function handleApplyToday(v: Vaccine) {
    if (!petId || !v.interval_months) return
    const today = new Date().toISOString().slice(0, 10)
    const nextDue = computeNextDue(today, v.interval_months)
    await updateVaccine(v.id, { applied_at: today, next_due_at: nextDue })
    await load()
  }

  async function handleDelete(vaccineId: string) {
    if (!confirm('Remover esta vacina?')) return
    await deleteVaccine(vaccineId)
    setVaccines(v => v.filter(x => x.id !== vaccineId))
  }

  return (
    <div className="pb-20">
      <TopBar
        title="Vacinas"
        back
        action={
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus size={16} /> Nova
          </Button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── Form ── */}
        {showForm && (
          <Card className="flex flex-col gap-3 border-blue-100 bg-blue-50/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Editar vacina' : 'Nova vacina'}</h3>
              <button onClick={resetForm} className="p-1 rounded-full hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input label="Nome da vacina *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: V10, Antirrábica, Gripe" required />
              <Input label="Data de aplicação *" type="date" value={form.appliedAt} onChange={e => set('appliedAt', e.target.value)} required />
              <Select label="Reforço / repetição" value={form.intervalMonths} onChange={e => set('intervalMonths', e.target.value)} options={INTERVAL_OPTIONS} />
              {(form.intervalMonths || form.nextDueAt) && (
                <Input label="Próxima dose" type="date" value={form.nextDueAt} onChange={e => set('nextDueAt', e.target.value)} />
              )}
              <Select
                label="Avisar com antecedência"
                value={form.alertDays}
                onChange={e => set('alertDays', e.target.value)}
                options={[{ value: '7', label: '7 dias antes' }, { value: '14', label: '14 dias antes' }, { value: '30', label: '30 dias antes' }, { value: '60', label: '60 dias antes' }]}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Veterinário" value={form.vetName} onChange={e => set('vetName', e.target.value)} placeholder="Nome do vet" />
                <Input label="Clínica" value={form.vetClinic} onChange={e => set('vetClinic', e.target.value)} placeholder="Nome da clínica" />
              </div>
              <Textarea label="Observações" value={form.notes} onChange={e => set('notes', e.target.value)} />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={saving || !form.name.trim() || !form.appliedAt}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Adicionar vacina'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── Empty ── */}
        {vaccines.length === 0 && !showForm && (
          <EmptyState
            icon={<Syringe size={52} />}
            title="Nenhuma vacina registrada"
            description="Adicione as vacinas para manter o histórico em dia."
            action={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Adicionar vacina</Button>}
          />
        )}

        {/* ── Timeline ── */}
        {vaccines.length > 0 && !showForm && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico de Vacinas</p>
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-100" />
              <div className="flex flex-col gap-3">
                {vaccines.map(v => {
                  const overdue = isOverdue(v.next_due_at)
                  const days = daysUntil(v.next_due_at)
                  const nearDue = days !== null && days >= 0 && days <= (v.alert_days_before ?? 30)
                  return (
                    <div key={v.id} className="flex gap-3">
                      {/* dot */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${overdue ? 'bg-red-100' : nearDue ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        <Syringe size={16} className={overdue ? 'text-red-500' : nearDue ? 'text-amber-500' : 'text-blue-500'} />
                      </div>
                      {/* card */}
                      <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{v.name}</p>
                            {v.interval_months && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <RefreshCw size={10} />
                                Reforço {v.interval_months >= 12 ? `${v.interval_months / 12}x/ano` : `a cada ${v.interval_months} meses`}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEdit(v)} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors">
                              <Pencil size={13} className="text-blue-400" />
                            </button>
                            <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1.5">
                          <span>Aplicada: <span className="text-gray-700 font-medium">{formatDate(v.applied_at)}</span></span>
                          {v.vet_name && <span>Vet: <span className="text-gray-700">{v.vet_name}</span></span>}
                          {v.vet_clinic && <span>Clínica: <span className="text-gray-700">{v.vet_clinic}</span></span>}
                        </div>
                        {v.next_due_at && (
                          <div className={`mt-2 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 font-medium ${overdue ? 'bg-red-50 text-red-600' : nearDue ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                            {overdue || nearDue ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                            Próxima dose: {formatDate(v.next_due_at)}
                            {overdue ? ` — vencida há ${Math.abs(days!)}d` : days !== null ? ` — ${days}d` : ''}
                          </div>
                        )}
                        {/* Apply today button — only for periodic vaccines */}
                        {v.interval_months && (overdue || nearDue) && (
                          <button
                            onClick={() => handleApplyToday(v)}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-semibold rounded-xl py-2 transition-all"
                          >
                            <CheckCheck size={13} /> Aplicar hoje e calcular próxima dose
                          </button>
                        )}
                        {v.notes && <p className="text-xs text-gray-400 italic mt-1.5">{v.notes}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
