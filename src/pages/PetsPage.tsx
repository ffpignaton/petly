import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPets, createPet, updatePet, uploadPetPhoto } from '../lib/api'
import type { Pet } from '../lib/database.types'
import { TopBar } from '../components/ui/TopBar'
import { BottomNav } from '../components/ui/BottomNav'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { PetPhoto } from '../components/ui/PetPhoto'
import { calcAge } from '../lib/utils'
import { Plus, PawPrint, X, Camera } from 'lucide-react'

export default function PetsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | ''>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    if (!user) return
    const { data } = await getPets(user.id)
    if (data) setPets(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function resetForm() {
    setName(''); setBreed(''); setBirthDate(''); setSex('')
    setPhotoFile(null); setPhotoPreview(null)
    setShowForm(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !name.trim()) return
    setSaving(true)

    // 1. Create pet first (without photo)
    const { data: newPet } = await createPet({
      user_id: user.id,
      name: name.trim(),
      breed: breed || null,
      birth_date: birthDate || null,
      sex: sex || null,
      photo_url: null,
      notes: null,
    })

    // 2. Upload photo if provided, then update pet
    if (newPet && photoFile) {
      const url = await uploadPetPhoto(user.id, newPet.id, photoFile)
      if (url) {
        await updatePet(newPet.id, { photo_url: url })
      }
    }

    resetForm()
    await load()
    setSaving(false)
  }

  return (
    <div className="pb-20">
      <TopBar
        title="Meus Pets"
        action={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Novo
          </Button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* New pet form */}
        {showForm && (
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Novo pet</h3>
              <button onClick={resetForm}><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">

              {/* Photo picker */}
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors hover:bg-gray-50"
                >
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                    : (
                      <>
                        <Camera size={22} className="text-gray-300 mb-1" />
                        <span className="text-xs text-gray-400">Foto</span>
                      </>
                    )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Remover foto
                  </button>
                )}
              </div>

              <Input label="Nome *" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Thor" required />
              <Input label="Raça" value={breed} onChange={e => setBreed(e.target.value)} placeholder="Ex: Golden Retriever" />
              <Input label="Data de nascimento" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
              <Select
                label="Sexo"
                value={sex}
                onChange={e => setSex(e.target.value as 'male' | 'female' | '')}
                options={[
                  { value: '', label: 'Não informar' },
                  { value: 'male', label: 'Macho' },
                  { value: 'female', label: 'Fêmea' },
                ]}
              />
              <Button type="submit" fullWidth disabled={saving || !name.trim()}>
                {saving ? 'Salvando...' : 'Salvar pet'}
              </Button>
            </form>
          </Card>
        )}

        {/* Pets list */}
        {!loading && pets.length === 0 && !showForm && (
          <EmptyState
            icon={<PawPrint size={56} />}
            title="Nenhum pet cadastrado"
            description="Adicione seu primeiro pet para começar a registrar a saúde dele."
            action={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Adicionar pet</Button>}
          />
        )}

        {pets.map(pet => (
          <Card key={pet.id} onClick={() => navigate(`/pets/${pet.id}`)} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
              <PetPhoto path={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" fallback={<>🐶</>} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{pet.name}</p>
              <p className="text-sm text-gray-400">
                {pet.breed ?? 'Raça não informada'} · {calcAge(pet.birth_date)}
                {pet.sex ? ` · ${pet.sex === 'male' ? 'Macho' : 'Fêmea'}` : ''}
              </p>
            </div>
          </Card>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
