import { useLocation, useNavigate } from 'react-router-dom'
import { Home, PawPrint } from 'lucide-react'
import { cn } from '../../lib/utils'

const tabs = [
  { label: 'Início', icon: Home, path: '/' },
  { label: 'Meus Pets', icon: PawPrint, path: '/pets' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-20 bg-white border-t border-gray-100 flex safe-bottom">
      {tabs.map(({ label, icon: Icon, path }) => {
        const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors',
              active ? 'text-blue-500' : 'text-gray-400',
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
