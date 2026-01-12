import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Apiaries from './pages/Apiaries';
import Hives from './pages/Hives';
import HiveDetail from './pages/HiveDetail';
import ImportExport from './pages/ImportExport';
import VarroDetectorImport from './pages/VarroDetectorImport';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Dashboard />} />
          <Route path="apiaries" element={<Apiaries />} />
          <Route path="hives" element={<Hives />} />
          <Route path="hives/:id" element={<HiveDetail />} />
          <Route path="varrodetector" element={<VarroDetectorImport />} />
          <Route path="import-eksport" element={<ImportExport />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
