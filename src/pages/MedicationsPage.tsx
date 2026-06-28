import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getMedications, createMedication, updateMedication, deleteMedication } from '../lib/api'
import type { Medication, MedicationType } from '../lib/database.types'
import { TopBar } from '../components/ui/TopBar'
import { BottomNav } from '../components/ui/BottomNav'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate, isOverdue, daysUntil } from '../lib/utils'
import { Plus, Pill, Trash2, X, AlertTriangle, CheckCircle, RefreshCw, Clock, Calendar, Pencil, CheckCheck } from 'lucide-react'

function computeNextDue(startDate: string, intervalDays: number): string {
  const d = new Date(startDate)
  d.setDate(d.getDate() + intervalDays)
  return d.toISOString().slice(0, 10)
}

const TYPE_LABELS: Record<MedicationType, string> = {
  daily: 'Diário', periodic: 'Periódico', course: 'Tratamento',
}
const INTERVAL_OPTIONS = [
  { value: '30', label: 'Mensal (30 dias)' },
  { value: '60', label: 'Bimestral (60 dias)' },
  { value: '90', label: 'Trimestral (90 dias)' },
  { value: '180', label: 'Semestral (180 dias)' },
  { value: '365', label: 'Anual (365 dias)' },
  { value: 'custom', label: 'Personalizado...' },
]

type FormState = {
  medType: MedicationType; name: string; dosage: string; dailyTime: string
  intervalPreset: string; intervalCustom: string; startDate: string
  endDate: string; nextDueAt: string; alertDays: string; notes: string
}
const EMPTY_FORM: FormState = {
  medType: 'course', name: '', dosage: '', dailyTime: '08:00',
  intervalPreset: '180', intervalCustom: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '', nextDueAt: '', alertDays: '7', notes: '',
}

export default function MedicationsPage() {
  const { id: petId } = useParams<{ id: string }>()
  const [medications, setMedications] = useState<Medication[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function load() {
    if (!petId) return
    const { data } = await getMedications(petId)
    if (data) setMedications(data)
  }

  useEffect(() => { load() }, [petId])

  useEffect(() => {
    if (form.medType !== 'periodic' || !form.startDate) return
    const days = form.intervalPreset === 'custom' ? parseInt(form.intervalCustom) : parseInt(form.intervalPreset)
    if (!isNaN(days) && days > 0) set('nextDueAt', computeNextDue(form.startDate, days))
  }, [form.medType, form.startDate, form.intervalPreset, form.intervalCustom])

  function startEdit(med: Medication) {
    setEditingId(med.id)
    const intervalDays = med.interval_days?.toString() ?? '180'
    const isPreset = INTERVAL_OPTIONS.some(o => o.value === intervalDays && o.value !== 'custom')
    setForm({
      medType: med.med_type,
      name: med.name,
      dosage: med.dosage ?? '',
      dailyTime: med.daily_time?.slice(0, 5) ?? '08:00',
      intervalPreset: isPreset ? intervalDays : 'custom',
      intervalCustom: isPreset ? '' : intervalDays,
      startDate: med.start_date,
      endDate: med.end_date ?? '',
      nextDueAt: med.next_due_at ?? '',
      alertDays: med.alert_days_before?.toString() ?? '7',
      notes: med.notes ?? '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(false)
  }

  function getIntervalDays(): number | null {
    if (form.medType !== 'periodic') return null
    const days = form.intervalPreset === 'custom' ? parseInt(form.intervalCustom) : parseInt(form.intervalPreset)
    return isNaN(days) ? null : days
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!petId || !form.name.trim()) return
    setSaving(true)
    const payload = {
      pet_id: petId,
      name: form.name.trim(),
      med_type: form.medType,
      dosage: form.dosage || null,
      daily_time: form.medType === 'daily' ? form.dailyTime || null : null,
      interval_days: getIntervalDays(),
      start_date: form.startDate,
      next_due_at: form.medType === 'periodic' ? form.nextDueAt || null : null,
      end_date: form.medType === 'course' && form.endDate ? form.endDate : null,
      alert_days_before: parseInt(form.alertDays) || 7,
      notes: form.notes || null,
    }
    if (editingId) {
      await updateMedication(editingId, payload)
    } else {
      await createMedication(payload)
    }
    resetForm()
    await load()
    setSaving(false)
  }

  async function handleApplyToday(med: Medication) {
    if (!petId || !med.interval_days) return
    const today = new Date().toISOString().slice(0, 10)
    const d = new Date(today)
    d.setDate(d.getDate() + med.interval_days)
    const nextDue = d.toISOString().slice(0, 10)
    await updateMedication(med.id, { start_date: today, next_due_at: nextDue })
    await load()
  }

  async function handleDelete(medId: string) {
    if (!confirm('Remover este medicamento?')) return
    await deleteMedication(medId)
    setMedications(m => m.filter(x => x.id !== medId))
  }

  function isActive(med: Medication) {
    if (med.med_type === 'daily' || med.med_type === 'periodic') return true
    if (!med.end_date) return true
    return new Date(med.end_date) >= new Date()
  }

  const typeColor: Record<MedicationType, string> = {
    daily: 'bg-blue-100 text-blue-500',
    periodic: 'bg-purple-100 text-purple-500',
    course: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="pb-20">
      <TopBar
        title="Remédios"
        back
        action={
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus size={16} /> Novo
          </Button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── Form ── */}
        {showForm && (
          <div className="bg-purple-50/40 border border-purple-100 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Editar medicamento' : 'Novo medicamento'}</h3>
              <button onClick={resetForm} className="p-1 rounded-full hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Type selector */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1.5">Tipo</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['course', 'periodic', 'daily'] as MedicationType[]).map(t => (
                    <button key={t} type="button" onClick={() => set('medType', t)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${form.medType === t ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {t === 'daily' && <><Clock size={11} className="inline mr-1" />Diário</>}
                      {t === 'periodic' && <><RefreshCw size={11} className="inline mr-1" />Periódico</>}
                      {t === 'course' && <><Calendar size={11} className="inline mr-1" />Tratamento</>}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {form.medType === 'daily' && 'Remédio tomado todo dia num horário fixo'}
                  {form.medType === 'periodic' && 'Aplicado a cada X dias — vermífugo, antipulgas, etc.'}
                  {form.medType === 'course' && 'Tratamento com início e fim definidos'}
                </p>
              </div>
              <Input label="Nome *" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder={form.medType === 'periodic' ? 'Ex: Drontal, Bravecto, NexGard' : 'Ex: Antibiótico, Vitamina'} required />
              <Input label="Dosagem" value={form.dosage} onChange={e => set('dosage', e.target.value)} placeholder="Ex: 1 comprimido, 2ml" />
              {form.medType === 'daily' && (
                <Input label="Horário" type="time" value={form.dailyTime} onChange={e => set('dailyTime', e.target.value)} />
              )}
              {form.medType === 'periodic' && (
                <>
                  <Select label="Frequência" value={form.intervalPreset} onChange={e => set('intervalPreset', e.target.value)} options={INTERVAL_OPTIONS} />
                  {form.intervalPreset === 'custom' && (
                    <Input label="Intervalo em dias" type="number" min="1" value={form.intervalCustom} onChange={e => set('intervalCustom', e.target.value)} placeholder="Ex: 45" />
                  )}
                </>
              )}
              <Input
                label={form.medType === 'periodic' ? 'Última aplicação *' : 'Início *'}
                type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} required />
              {form.medType === 'periodic' && form.nextDueAt && (
                <Input label="Próxima aplicação (auto)" type="date" value={form.nextDueAt} onChange={e => set('nextDueAt', e.target.value)} />
              )}
              {form.medType === 'course' && (
                <Input label="Data de fim" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
              )}
              {form.medType === 'periodic' && (
                <Select label="Avisar com antecedência" value={form.alertDays} onChange={e => set('alertDays', e.target.value)}
                  options={[{ value: '3', label: '3 dias antes' }, { value: '7', label: '7 dias antes' }, { value: '14', label: '14 dias antes' }, { value: '30', label: '30 dias antes' }]} />
              )}
              <Textarea label="Observações" value={form.notes} onChange={e => set('notes', e.target.value)} />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={saving || !form.name.trim()}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── Empty ── */}
        {medications.length === 0 && !showForm && (
          <EmptyState icon={<Pill size={52} />} title="Nenhum medicamento registrado"
            description="Registre remédios, vermífugos, antipulgas e outros tratamentos."
            action={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Adicionar medicamento</Button>} />
        )}

        {/* ── Timeline ── */}
        {medications.length > 0 && !showForm && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico de Medicamentos</p>
            <div className="relative">
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-100" />
              <div className="flex flex-col gap-3">
                {medications.map(med => {
                  const overdue = med.med_type === 'periodic' && isOverdue(med.next_due_at)
                  const days = med.med_type === 'periodic' ? daysUntil(med.next_due_at) : null
                  const nearDue = days !== null && days >= 0 && days <= (med.alert_days_before ?? 7)
                  const active = isActive(med)
                  return (
                    <div key={med.id} className="flex gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${active ? typeColor[med.med_type] : 'bg-gray-100 text-gray-300'}`}>
                        <Pill size={16} />
                      </div>
                      <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{med.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${med.med_type === 'daily' ? 'bg-blue-50 text-blue-600' : med.med_type === 'periodic' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                              {TYPE_LABELS[med.med_type]}{!active ? ' · Concluído' : ''}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEdit(med)} className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors">
                              <Pencil size={13} className="text-purple-400" />
                            </button>
                            <button onClick={() => handleDelete(med.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1.5">
                          {med.dosage && <span>Dose: <span className="text-gray-700">{med.dosage}</span></span>}
                          {med.med_type === 'daily' && med.daily_time && (
                            <span className="flex items-center gap-1"><Clock size={11} /><span className="text-gray-700">{med.daily_time.slice(0, 5)}</span></span>
                          )}
                          {med.med_type === 'periodic' && med.interval_days && (
                            <span className="flex items-center gap-1">
                              <RefreshCw size={11} />
                              <span className="text-gray-700">
                                {med.interval_days < 60 ? `${med.interval_days}d` : med.interval_days < 365 ? `${Math.round(med.interval_days / 30)} meses` : `${Math.round(med.interval_days / 365)} ano(s)`}
                              </span>
                            </span>
                          )}
                          <span>Início: <span className="text-gray-700">{formatDate(med.start_date)}</span></span>
                          {med.med_type === 'course' && med.end_date && <span>Fim: <span className="text-gray-700">{formatDate(med.end_date)}</span></span>}
                        </div>
                        {med.med_type === 'periodic' && med.next_due_at && (
                          <div className={`mt-2 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 font-medium ${overdue ? 'bg-red-50 text-red-600' : nearDue ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                            {overdue || nearDue ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                            Próxima dose: {formatDate(med.next_due_at)}
                            {overdue ? ` — vencida há ${Math.abs(days!)}d` : days !== null ? ` — ${days}d` : ''}
                          </div>
                        )}
                        {/* Apply today — periodic only, when overdue or near due */}
                        {med.med_type === 'periodic' && med.interval_days && (overdue || nearDue) && (
                          <button
                            onClick={() => handleApplyToday(med)}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-purple-500 hover:bg-purple-600 active:scale-95 text-white text-xs font-semibold rounded-xl py-2 transition-all"
                          >
                            <CheckCheck size={13} /> Aplicar hoje e calcular próxima dose
                          </button>
                        )}
                        {med.med_type === 'daily' && med.daily_time && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 bg-blue-50 text-blue-600 font-medium">
                            <Clock size={12} /> Lembrete diário às {med.daily_time.slice(0, 5)}
                          </div>
                        )}
                        {med.notes && <p className="text-xs text-gray-400 italic mt-1.5">{med.notes}</p>}
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
