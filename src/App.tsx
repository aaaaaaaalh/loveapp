import { Routes, Route } from 'react-router-dom'
import { SpaceLayout } from './layouts/SpaceLayout'
import { HomePage } from './pages/HomePage'
import { PhotosPage } from './pages/PhotosPage'
import { LettersPage } from './pages/LettersPage'
import { WishesPage } from './pages/WishesPage'
import { GiftsPage } from './pages/GiftsPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { CloudGate } from './components/CloudGate'

export function App() {
  return <CloudGate><Routes><Route element={<SpaceLayout />}><Route index element={<HomePage />} /><Route path="photos" element={<PhotosPage />} /><Route path="letters" element={<LettersPage />} /><Route path="wishes" element={<WishesPage />} /><Route path="gifts" element={<GiftsPage />} /><Route path="profile" element={<ProfilePage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes></CloudGate>
}
