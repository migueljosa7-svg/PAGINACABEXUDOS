import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Home } from './pages/Home';
import { Comparsa } from './pages/Comparsa';
import { Detail } from './pages/Detail';
import { Recorridos } from './pages/Recorridos';
import { Agenda } from './pages/Agenda';
import { Favoritos } from './pages/Favoritos';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="comparsa" element={<Comparsa />} />
          <Route path="personaje/:id" element={<Detail />} />
          <Route path="recorridos" element={<Recorridos />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="favoritos" element={<Favoritos />} />
          {/* Fallback route */}
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
