import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPets } from '../lib/api'
import type { Pet } from '../lib/database.types'
import { TopBar } from '../components/ui/TopBar'
import { BottomNav } from '../components/ui/BottomNav'
import { Card } from '../components/ui/Card'
import { PetPhoto } from '../components/ui/PetPhoto'
import { calcAge } from '../lib/utils'
import { Syringe, Weight, Pill, Stethoscope } from 'lucide-react'

const SECTION_META: Record<string, { label: string; icon: typeof Syringe; color: string; iconColor: string }> = {
  vaccines:    { label: 'Vacinas',   icon: Syringe,      color: 'bg-blue-50',   iconColor: 'text-blue-500' },
  weights:     { label: 'Peso',      icon: Weight,       color: 'bg-green-50',  iconColor: 'text-green-500' },
  medications: { label: 'Remédios',  icon: Pill,         color: 'bg-purple-50', iconColor: 'text-purple-500' },
  'vet-visits':{ label: 'Consultas', icon: Stethoscope,  color: 'bg-orange-50', iconColor: 'text-orange-500' },
}

export default function SelectPetPage() {
  const { section } = useParams<{ section: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  const meta = SECTION_META[section ?? '']

  useEffect(() => {
    if (!user) return
    getPets(user.id).then(({ data }) => {
      if (data) {
        // If only one pet, skip this screen entirely
        if (data.length === 1) {
          navigate(`/pets/${data[0].id}/${section}`, { replace: true })
          return
        }
        setPets(data)
      }
      setLoading(false)
    })
  }, [user, section])

  if (!meta) return null

  const Icon = meta.icon

  return (
    <div className="pb-20">
      <TopBar
        title={meta.label}
        back
        action={
          <div className={`p-2 rounded-xl ${meta.color}`}>
            <Icon size={18} className={meta.iconColor} />
          </div>
        }
      />

      <div className="px-4 py-5 flex flex-col gap-4">
        <p className="text-sm text-gray-500">Selecione o pet para ver {meta.label.toLowerCase()}:</p>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && pets.map(pet => (
          <Card
            key={pet.id}
            onClick={() => navigate(`/pets/${pet.id}/${section}`)}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
              <PetPhoto path={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" fallback={<>🐶</>} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{pet.name}</p>
              <p className="text-sm text-gray-400">
                {pet.breed ?? 'Raça não informada'} · {calcAge(pet.birth_date)}
                {pet.sex ? ` · ${pet.sex === 'male' ? 'Macho' : 'Fêmea'}` : ''}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 ${meta.color}`}>
              <Icon size={18} className={meta.iconColor} />
            </div>
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
