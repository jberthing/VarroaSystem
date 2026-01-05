import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Apiaries from './pages/Apiaries'
import Hives from './pages/Hives'
import HiveDetail from './pages/HiveDetail'
import ImportExport from './pages/ImportExport'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/oversigt" replace />} />
          <Route path="oversigt" element={<Dashboard />} />
          <Route path="bigaarde" element={<Apiaries />} />
          <Route path="bistader" element={<Hives />} />
          <Route path="bistader/:id" element={<HiveDetail />} />
          <Route path="import-eksport" element={<ImportExport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
