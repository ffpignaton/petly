import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getVetVisits, createVetVisit, updateVetVisit, deleteVetVisit } from '../lib/api'
import type { VetVisit } from '../lib/database.types'
import { TopBar } from '../components/ui/TopBar'
import { BottomNav } from '../components/ui/BottomNav'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { Card } from '../components/ui/Card'
import { formatDate } from '../lib/utils'
import { Plus, Stethoscope, Trash2, X, Pencil, MapPin, User } from 'lucide-react'

type FormState = {
  visitedAt: string; vetName: string; vetClinic: string
  reason: string; diagnosis: string; notes: string
}
const EMPTY_FORM: FormState = {
  visitedAt: new Date().toISOString().slice(0, 10),
  vetName: '', vetClinic: '', reason: '', diagnosis: '', notes: '',
}

export default function VetVisitsPage() {
  const { id: petId } = useParams<{ id: string }>()
  const [visits, setVisits] = useState<VetVisit[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function load() {
    if (!petId) return
    const { data } = await getVetVisits(petId)
    if (data) setVisits(data)
  }

  useEffect(() => { load() }, [petId])

  function startEdit(v: VetVisit) {
    setEditingId(v.id)
    setForm({
      visitedAt: v.visited_at,
      vetName: v.vet_name ?? '',
      vetClinic: v.vet_clinic ?? '',
      reason: v.reason ?? '',
      diagnosis: v.diagnosis ?? '',
      notes: v.notes ?? '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setForm(EMPTY_FORM); setEditingId(null); setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!petId) return
    setSaving(true)
    const payload = {
      pet_id: petId,
      visited_at: form.visitedAt,
      vet_name: form.vetName || null,
      vet_clinic: form.vetClinic || null,
      reason: form.reason || null,
      diagnosis: form.diagnosis || null,
      notes: form.notes || null,
    }
    if (editingId) {
      await updateVetVisit(editingId, payload)
    } else {
      await createVetVisit(payload)
    }
    resetForm()
    await load()
    setSaving(false)
  }

  async function handleDelete(visitId: string) {
    if (!confirm('Remover esta consulta?')) return
    await deleteVetVisit(visitId)
    setVisits(v => v.filter(x => x.id !== visitId))
  }

  return (
    <div className="pb-20">
      <TopBar
        title="Consultas Veterinárias"
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
          <Card className="flex flex-col gap-3 border-orange-100 bg-orange-50/30">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Editar consulta' : 'Nova consulta'}</h3>
              <button onClick={resetForm} className="p-1 rounded-full hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input label="Data da consulta *" type="date" value={form.visitedAt} onChange={e => set('visitedAt', e.target.value)} required />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Veterinário" value={form.vetName} onChange={e => set('vetName', e.target.value)} placeholder="Nome do vet" />
                <Input label="Clínica" value={form.vetClinic} onChange={e => set('vetClinic', e.target.value)} placeholder="Nome da clínica" />
              </div>
              <Input label="Motivo" value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Ex: Check-up anual, Vômito" />
              <Input label="Diagnóstico" value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="Ex: Gastrite leve" />
              <Textarea label="Observações" value={form.notes} onChange={e => set('notes', e.target.value)} />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Salvar consulta'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── Empty ── */}
        {visits.length === 0 && !showForm && (
          <EmptyState
            icon={<Stethoscope size={52} />}
            title="Nenhuma consulta registrada"
            description="Registre as visitas ao veterinário para manter o histórico completo."
            action={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Registrar consulta</Button>}
          />
        )}

        {/* ── Timeline ── */}
        {visits.length > 0 && !showForm && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico de Consultas</p>
            <div className="relative">
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-100" />
              <div className="flex flex-col gap-3">
                {visits.map(v => (
                  <div key={v.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 z-10">
                      <Stethoscope size={16} className="text-orange-500" />
                    </div>
                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-gray-900 text-sm">{formatDate(v.visited_at)}</p>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEdit(v)} className="p-1.5 hover:bg-orange-50 rounded-lg transition-colors">
                            <Pencil size={13} className="text-orange-400" />
                          </button>
                          <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={13} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                      {(v.vet_name || v.vet_clinic) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                          {v.vet_name && (
                            <span className="flex items-center gap-1"><User size={11} /><span className="text-gray-700">{v.vet_name}</span></span>
                          )}
                          {v.vet_clinic && (
                            <span className="flex items-center gap-1"><MapPin size={11} /><span className="text-gray-700">{v.vet_clinic}</span></span>
                          )}
                        </div>
                      )}
                      {v.reason && <p className="text-xs text-gray-500 mt-1">Motivo: <span className="text-gray-700">{v.reason}</span></p>}
                      {v.diagnosis && (
                        <div className="mt-2 bg-orange-50 rounded-xl px-3 py-2">
                          <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Diagnóstico</p>
                          <p className="text-sm text-orange-900 mt-0.5">{v.diagnosis}</p>
                        </div>
                      )}
                      {v.notes && <p className="text-xs text-gray-400 italic mt-1.5">{v.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
