import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

interface TopBarProps {
  title: string
  back?: boolean
  action?: React.ReactNode
}

export function TopBar({ title, back = false, action }: TopBarProps) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronLeft size={22} className="text-gray-700" />
        </button>
      )}
      <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">{title}</h1>
      {action && <div>{action}</div>}
    </header>
  )
}
