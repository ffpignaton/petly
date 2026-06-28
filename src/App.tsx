import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PetsPage from './pages/PetsPage'
import PetProfilePage from './pages/PetProfilePage'
import VaccinesPage from './pages/VaccinesPage'
import WeightsPage from './pages/WeightsPage'
import MedicationsPage from './pages/MedicationsPage'
import VetVisitsPage from './pages/VetVisitsPage'
import SelectPetPage from './pages/SelectPetPage'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/pets" element={<PetsPage />} />
      <Route path="/pets/:id" element={<PetProfilePage />} />
      <Route path="/pets/:id/vaccines" element={<VaccinesPage />} />
      <Route path="/pets/:id/weights" element={<WeightsPage />} />
      <Route path="/pets/:id/medications" element={<MedicationsPage />} />
      <Route path="/pets/:id/vet-visits" element={<VetVisitsPage />} />
      <Route path="/select/:section" element={<SelectPetPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
