import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Pet, Vaccine, Medication, VetVisit, Weight } from '../lib/database.types'
import { TopBar } from '../components/ui/TopBar'
import { BottomNav } from '../components/ui/BottomNav'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { calcAge, formatDate, daysUntil, isOverdue } from '../lib/utils'
import {
  Syringe, Weight as WeightIcon, Pill, Stethoscope, Trash2,
  Pencil, Camera, X, CheckCircle, AlertTriangle, Clock,
} from 'lucide-react'
import { deletePet, updatePet, uploadPetPhoto, getVaccines, getMedications, getVetVisits, getWeights } from '../lib/api'
import { PetPhoto } from '../components/ui/PetPhoto'
import { useAuth } from '../contexts/AuthContext'

export default function PetProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pet, setPet] = useState<Pet | null>(null)
  const [editing, setEditing] = useState(false)

  // health summary
  const [nextVaccine, setNextVaccine] = useState<Vaccine | null>(null)
  const [activeMed, setActiveMed] = useState<Medication | null>(null)
  const [lastVisit, setLastVisit] = useState<VetVisit | null>(null)
  const [lastWeight, setLastWeight] = useState<Weight | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // edit form
  const [editName, setEditName] = useState('')
  const [editBreed, setEditBreed] = useState('')
  const [editBirth, setEditBirth] = useState('')
  const [editSex, setEditSex] = useState<'male' | 'female' | ''>('')
  const [editNotes, setEditNotes] = useState('')
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadPet() {
    if (!id) return
    const { data } = await supabase.from('pets').select('*').eq('id', id).single() as { data: Pet | null }
    if (data) setPet(data)
  }

  async function loadSummary() {
    if (!id) return
    setSummaryLoading(true)

    const [{ data: vaccines }, { data: meds }, { data: visits }, { data: weights }] = await Promise.all([
      getVaccines(id),
      getMedications(id),
      getVetVisits(id),
      getWeights(id),
    ])

    // Next upcoming vaccine (soonest next_due_at in the future or most overdue)
    const vaccinesWithDue = (vaccines ?? []).filter(v => v.next_due_at)
    vaccinesWithDue.sort((a, b) => a.next_due_at!.localeCompare(b.next_due_at!))
    setNextVaccine(vaccinesWithDue[0] ?? null)

    // Active medication (periodic with next_due or daily)
    const active = (meds ?? []).find(m =>
      m.med_type === 'daily' ||
      (m.med_type === 'periodic' && m.next_due_at) ||
      (m.med_type === 'course' && m.end_date && new Date(m.end_date) >= new Date())
    )
    setActiveMed(active ?? null)

    // Last vet visit
    setLastVisit((visits ?? [])[0] ?? null)

    // Last weight
    setLastWeight((weights ?? [])[0] ?? null)

    setSummaryLoading(false)
  }

  useEffect(() => {
    loadPet()
    loadSummary()
  }, [id])

  function startEdit() {
    if (!pet) return
    setEditName(pet.name)
    setEditBreed(pet.breed ?? '')
    setEditBirth(pet.birth_date ?? '')
    setEditSex(pet.sex ?? '')
    setEditNotes(pet.notes ?? '')
    setEditPhotoFile(null)
    setEditPhotoPreview(null)
    setEditing(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditPhotoFile(file)
    setEditPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !user) return
    setSaving(true)

    let photoUrl = pet?.photo_url ?? null
    if (editPhotoFile) {
      const url = await uploadPetPhoto(user.id, id, editPhotoFile)
      if (url) photoUrl = url
    }

    await updatePet(id, {
      name: editName.trim(),
      breed: editBreed || null,
      birth_date: editBirth || null,
      sex: editSex || null,
      notes: editNotes || null,
      photo_url: photoUrl,
    })
    await loadPet()
    setEditing(false)
    setSaving(false)
  }

  async function handleDelete() {
    if (!id) return
    if (!confirm(`Tem certeza que deseja remover ${pet?.name}? Todos os dados serão perdidos.`)) return
    await deletePet(id)
    navigate('/pets')
  }

  if (!pet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const sections = [
    { icon: Syringe,       label: 'Vacinas',   color: 'text-blue-500 bg-blue-50',    path: `/pets/${id}/vaccines` },
    { icon: WeightIcon,    label: 'Peso',      color: 'text-green-500 bg-green-50',   path: `/pets/${id}/weights` },
    { icon: Pill,          label: 'Remédios',  color: 'text-purple-500 bg-purple-50', path: `/pets/${id}/medications` },
    { icon: Stethoscope,   label: 'Consultas', color: 'text-orange-500 bg-orange-50', path: `/pets/${id}/vet-visits` },
  ]

  // ── Health summary helpers ──
  const vaccDays = daysUntil(nextVaccine?.next_due_at)
  const vaccOverdue = isOverdue(nextVaccine?.next_due_at)

  return (
    <div className="pb-20">
      <TopBar
        title={editing ? 'Editar pet' : pet.name}
        back
        action={
          !editing
            ? <button onClick={startEdit} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Pencil size={18} className="text-gray-500" />
              </button>
            : undefined
        }
      />

      <div className="px-4 py-5 flex flex-col gap-5">

        {/* ── EDIT FORM ── */}
        {editing && (
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">

            {/* Photo */}
            <div className="flex flex-col items-center gap-2">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer flex flex-col items-center justify-center"
              >
                {editPhotoPreview
                  ? <img src={editPhotoPreview} className="w-full h-full object-cover" alt="preview" />
                  : <PetPhoto path={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" fallback={<><Camera size={22} className="text-gray-300" /><span className="text-xs text-gray-400 mt-1">Foto</span></>} />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              <span className="text-xs text-blue-500 cursor-pointer" onClick={() => fileRef.current?.click()}>
                {pet.photo_url ? 'Trocar foto' : 'Adicionar foto'}
              </span>
            </div>

            <Input label="Nome *" value={editName} onChange={e => setEditName(e.target.value)} required />
            <Input label="Raça" value={editBreed} onChange={e => setEditBreed(e.target.value)} placeholder="Ex: Golden Retriever" />
            <Input label="Data de nascimento" type="date" value={editBirth} onChange={e => setEditBirth(e.target.value)} />
            <Select
              label="Sexo"
              value={editSex}
              onChange={e => setEditSex(e.target.value as 'male' | 'female' | '')}
              options={[
                { value: '', label: 'Não informar' },
                { value: 'male', label: 'Macho' },
                { value: 'female', label: 'Fêmea' },
              ]}
            />
            <Textarea label="Observações" value={editNotes} onChange={e => setEditNotes(e.target.value)} />

            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
                <X size={15} /> Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving || !editName.trim()}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        )}

        {/* ── PROFILE VIEW ── */}
        {!editing && (
          <>
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-4xl overflow-hidden shrink-0">
                <PetPhoto path={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" fallback={<>🐶</>} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900">{pet.name}</h2>
                <p className="text-sm text-gray-500">{pet.breed ?? 'Raça não informada'}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {pet.birth_date && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {calcAge(pet.birth_date)} · nasc. {formatDate(pet.birth_date)}
                    </span>
                  )}
                  {pet.sex && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {pet.sex === 'male' ? '♂ Macho' : '♀ Fêmea'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── HEALTH SUMMARY ── */}
            {!summaryLoading && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resumo de Saúde</h3>
                <div className="grid grid-cols-2 gap-2">

                  {/* Next vaccine */}
                  <div className={`rounded-2xl p-3 flex flex-col gap-1 ${vaccOverdue ? 'bg-red-50' : vaccDays !== null && vaccDays <= 30 ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    <div className="flex items-center gap-1.5">
                      <Syringe size={13} className={vaccOverdue ? 'text-red-500' : vaccDays !== null && vaccDays <= 30 ? 'text-amber-500' : 'text-blue-500'} />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vacina</span>
                    </div>
                    {nextVaccine ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{nextVaccine.name}</p>
                        <div className={`flex items-center gap-1 text-xs font-medium ${vaccOverdue ? 'text-red-600' : vaccDays !== null && vaccDays <= 30 ? 'text-amber-600' : 'text-blue-600'}`}>
                          {vaccOverdue ? <AlertTriangle size={11} /> : <CheckCircle size={11} />}
                          {vaccOverdue ? `Vencida há ${Math.abs(vaccDays!)}d` : vaccDays !== null ? `em ${vaccDays}d — ${formatDate(nextVaccine.next_due_at)}` : formatDate(nextVaccine.next_due_at)}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Nenhuma agendada</p>
                    )}
                  </div>

                  {/* Active medication */}
                  <div className="rounded-2xl p-3 flex flex-col gap-1 bg-purple-50">
                    <div className="flex items-center gap-1.5">
                      <Pill size={13} className="text-purple-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remédio</span>
                    </div>
                    {activeMed ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{activeMed.name}</p>
                        <p className="text-xs text-purple-600 font-medium flex items-center gap-1">
                          {activeMed.med_type === 'daily'
                            ? <><Clock size={11} />{activeMed.daily_time?.slice(0,5) ?? 'Diário'}</>
                            : activeMed.next_due_at
                            ? <>Próx: {formatDate(activeMed.next_due_at)}</>
                            : 'Em curso'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Nenhum ativo</p>
                    )}
                  </div>

                  {/* Last weight */}
                  <div className="rounded-2xl p-3 flex flex-col gap-1 bg-green-50">
                    <div className="flex items-center gap-1.5">
                      <WeightIcon size={13} className="text-green-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Peso</span>
                    </div>
                    {lastWeight ? (
                      <>
                        <p className="text-sm font-bold text-gray-900">{lastWeight.weight_kg} <span className="text-xs font-normal text-gray-500">kg</span></p>
                        <p className="text-xs text-green-600 font-medium">{formatDate(lastWeight.recorded_at)}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Não registrado</p>
                    )}
                  </div>

                  {/* Last vet visit */}
                  <div className="rounded-2xl p-3 flex flex-col gap-1 bg-orange-50">
                    <div className="flex items-center gap-1.5">
                      <Stethoscope size={13} className="text-orange-500" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Consulta</span>
                    </div>
                    {lastVisit ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 leading-tight">{lastVisit.vet_name ?? lastVisit.vet_clinic ?? 'Veterinário'}</p>
                        <p className="text-xs text-orange-600 font-medium">{formatDate(lastVisit.visited_at)}</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Nenhuma registrada</p>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* Sections */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Saúde & Histórico</h3>
              <div className="grid grid-cols-2 gap-3">
                {sections.map(({ icon: Icon, label, color, path }) => (
                  <Card key={label} onClick={() => navigate(path)} className="flex flex-col items-center gap-2 py-5">
                    <div className={`p-2.5 rounded-xl ${color}`}>
                      <Icon size={22} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </Card>
                ))}
              </div>
            </div>

            {/* Notes */}
            {pet.notes && (
              <Card>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-gray-700">{pet.notes}</p>
              </Card>
            )}

            {/* Delete */}
            <Button variant="danger" fullWidth onClick={handleDelete} className="mt-2">
              <Trash2 size={16} /> Remover {pet.name}
            </Button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
