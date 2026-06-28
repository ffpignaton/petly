import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPets, getVaccines, getMedications } from '../lib/api'
import type { Pet } from '../lib/database.types'
import { TopBar } from '../components/ui/TopBar'
import { BottomNav } from '../components/ui/BottomNav'
import { Card } from '../components/ui/Card'
import { PetPhoto } from '../components/ui/PetPhoto'
import { calcAge } from '../lib/utils'
import { Syringe, Weight, Pill, Stethoscope, Bell, PawPrint } from 'lucide-react'

type Alert = { petName: string; message: string; type: 'warning' | 'danger'; icon: 'vaccine' | 'pill' }

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pets, setPets] = useState<Pet[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getPets(user.id).then(async ({ data }) => {
      if (!data) return
      setPets(data)

      const allAlerts: Alert[] = []
      for (const pet of data) {
        // ── Vaccine alerts ────────────────────────────────────────────────
        const { data: vaccines } = await getVaccines(pet.id)
        if (vaccines) {
          for (const v of vaccines) {
            if (!v.next_due_at) continue
            const days = Math.ceil((new Date(v.next_due_at).getTime() - Date.now()) / 86400000)
            if (days < 0) {
              allAlerts.push({ petName: pet.name, message: `Vacina ${v.name} — vencida há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`, type: 'danger', icon: 'vaccine' })
            } else if (days <= (v.alert_days_before ?? 30)) {
              allAlerts.push({ petName: pet.name, message: `Vacina ${v.name} — vence em ${days} dia${days !== 1 ? 's' : ''}`, type: 'warning', icon: 'vaccine' })
            }
          }
        }

        // ── Medication alerts ─────────────────────────────────────────────
        const { data: meds } = await getMedications(pet.id)
        if (meds) {
          for (const m of meds) {
            const alertDays = m.alert_days_before ?? 7
            if (m.med_type === 'periodic' && m.next_due_at) {
              const days = Math.ceil((new Date(m.next_due_at).getTime() - Date.now()) / 86400000)
              if (days < 0) {
                allAlerts.push({ petName: pet.name, message: `${m.name} — próxima dose vencida há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`, type: 'danger', icon: 'pill' })
              } else if (days <= alertDays) {
                allAlerts.push({ petName: pet.name, message: `${m.name} — próxima dose em ${days} dia${days !== 1 ? 's' : ''}`, type: 'warning', icon: 'pill' })
              }
            }
            if (m.med_type === 'daily') {
              allAlerts.push({ petName: pet.name, message: `${m.name} — lembrete diário${m.daily_time ? ` às ${m.daily_time.slice(0,5)}` : ''}`, type: 'warning', icon: 'pill' })
            }
            if ((m.med_type === 'course') && m.end_date) {
              const days = Math.ceil((new Date(m.end_date).getTime() - Date.now()) / 86400000)
              if (days >= 0 && days <= alertDays) {
                allAlerts.push({ petName: pet.name, message: `${m.name} — tratamento termina em ${days} dia${days !== 1 ? 's' : ''}`, type: 'warning', icon: 'pill' })
              }
            }
          }
        }
      }

      // Sort: danger first
      allAlerts.sort((a, b) => (a.type === 'danger' ? -1 : 1) - (b.type === 'danger' ? -1 : 1))
      setAlerts(allAlerts)
      setLoading(false)
    })
  }, [user])

  return (
    <div className="pb-20">
      <TopBar title="Petly 🐾" />
      <div className="px-4 py-5 flex flex-col gap-5">
        {/* Greeting */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Olá! 👋</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {pets.length === 0
              ? 'Cadastre seus pets para começar.'
              : `Você tem ${pets.length} pet${pets.length > 1 ? 's' : ''} cadastrado${pets.length > 1 ? 's' : ''}.`}
          </p>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Bell size={15} /> Alertas
              <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {alerts.length}
              </span>
            </h3>
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2.5 text-sm flex items-start gap-2 ${
                  a.type === 'danger' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {a.icon === 'vaccine' ? <Syringe size={15} className="mt-0.5 shrink-0" /> : <Pill size={15} className="mt-0.5 shrink-0" />}
                <div>
                  <span className="font-semibold">{a.petName}: </span>
                  {a.message}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick access */}
        {pets.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Acesso rápido</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Syringe, label: 'Vacinas',  color: 'text-blue-500 bg-blue-50',   sub: 'vaccines' },
                { icon: Weight,  label: 'Peso',     color: 'text-green-500 bg-green-50',  sub: 'weights' },
                { icon: Pill,    label: 'Remédios', color: 'text-purple-500 bg-purple-50',sub: 'medications' },
                { icon: Stethoscope, label: 'Consultas', color: 'text-orange-500 bg-orange-50', sub: 'vet-visits' },
              ].map(({ icon: Icon, label, color, sub }) => (
                <Card
                  key={label}
                  onClick={() => navigate(`/select/${sub}`)}
                  className="flex flex-col items-center gap-2 py-5"
                >
                  <div className={`p-2.5 rounded-xl ${color}`}>
                    <Icon size={22} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pets list */}
        {!loading && pets.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Meus pets</h3>
            <div className="flex flex-col gap-2">
              {pets.map(pet => (
                <Card key={pet.id} onClick={() => navigate(`/pets/${pet.id}`)} className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xl overflow-hidden">
                    <PetPhoto path={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" fallback={<>🐶</>} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{pet.name}</p>
                    <p className="text-xs text-gray-400 truncate">{pet.breed ?? 'Raça não informada'} · {calcAge(pet.birth_date)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty pets */}
        {!loading && pets.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <PawPrint size={40} className="text-gray-200" />
            <p className="font-medium text-gray-700">Nenhum pet cadastrado</p>
            <p className="text-sm text-gray-400">Vá em "Meus Pets" para adicionar seu primeiro pet.</p>
          </Card>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
