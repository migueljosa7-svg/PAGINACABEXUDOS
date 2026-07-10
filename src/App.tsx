import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { MainLayout } from './layouts/MainLayout';

const HomePage = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const ComparsaPage = lazy(() => import('./pages/Comparsa').then((m) => ({ default: m.Comparsa })));
const DetailPage = lazy(() => import('./pages/Detail').then((m) => ({ default: m.Detail })));
const RecorridosPage = lazy(() => import('./pages/Recorridos').then((m) => ({ default: m.Recorridos })));
const AgendaPage = lazy(() => import('./pages/Agenda').then((m) => ({ default: m.Agenda })));
const EnciclopediaPage = lazy(() => import('./pages/Enciclopedia').then((m) => ({ default: m.Enciclopedia })));
const FavoritosPage = lazy(() => import('./pages/Favoritos').then((m) => ({ default: m.Favoritos })));
const AdvancedPages = lazy(() => import('./pages/AdvancedPages').then((m) => ({ default: m.AdvancedPages })));
const BarriosPage = lazy(() => import('./pages/Barrios').then((m) => ({ default: m.Barrios })));
const AboutPage = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const HeritagePage = lazy(() => import('./pages/Heritage').then((m) => ({ default: m.Heritage })));
const CollaborationPage = lazy(() => import('./pages/Collaboration').then((m) => ({ default: m.Collaboration })));
const RealtimeInfoPage = lazy(() => import('./pages/RealtimeInfo').then((m) => ({ default: m.RealtimeInfo })));
const GpsLivePage = lazy(() => import('./pages/GpsLive').then((m) => ({ default: m.GpsLive })));
const FAQPage = lazy(() => import('./pages/FAQ').then((m) => ({ default: m.FAQ })));
const PrivacyPage = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })));
const LegalNoticePage = lazy(() => import('./pages/LegalNotice').then((m) => ({ default: m.LegalNotice })));

const PageLoader = ({ label }: { label: string }) => (
  <div className="layout-container" style={{ paddingTop: 40 }}>
    <div className="card-glass" style={{ textAlign: 'center', maxWidth: 360, margin: '0 auto' }}>
      {label}
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Suspense fallback={<PageLoader label="Cargando Inicio…" />}><HomePage /></Suspense>} />
          <Route path="comparsa" element={<Suspense fallback={<PageLoader label="Cargando Comparsa…" />}><ComparsaPage /></Suspense>} />
          <Route path="personaje/:id" element={<Suspense fallback={<PageLoader label="Cargando personaje…" />}><DetailPage /></Suspense>} />
          <Route path="recorridos" element={<Suspense fallback={<PageLoader label="Cargando Recorridos…" />}><RecorridosPage /></Suspense>} />
          <Route path="enciclopedia" element={<Suspense fallback={<PageLoader label="Cargando Enciclopedia…" />}><EnciclopediaPage /></Suspense>} />
          <Route path="agenda" element={<Suspense fallback={<PageLoader label="Cargando Agenda…" />}><AgendaPage /></Suspense>} />
          <Route path="favoritos" element={<Suspense fallback={<PageLoader label="Cargando Favoritos…" />}><FavoritosPage /></Suspense>} />
          <Route path="barrios" element={<Suspense fallback={<PageLoader label="Cargando Barrios…" />}><BarriosPage /></Suspense>} />

          {/* Institutional / collaboration pages */}
          <Route path="acerca" element={<Suspense fallback={<PageLoader label="Cargando el proyecto…" />}><AboutPage /></Suspense>} />
          <Route path="patrimonio" element={<Suspense fallback={<PageLoader label="Cargando patrimonio…" />}><HeritagePage /></Suspense>} />
          <Route path="colaboran" element={<Suspense fallback={<PageLoader label="Cargando colaboraciones…" />}><CollaborationPage /></Suspense>} />
          <Route path="tiempo-real" element={<Suspense fallback={<PageLoader label="Cargando información en tiempo real…" />}><RealtimeInfoPage /></Suspense>} />
          <Route path="gps-live" element={<Suspense fallback={<PageLoader label="Cargando mapa GPS en vivo…" />}><GpsLivePage /></Suspense>} />
          <Route path="preguntas-frecuentes" element={<Suspense fallback={<PageLoader label="Cargando FAQ…" />}><FAQPage /></Suspense>} />
          <Route path="privacidad" element={<Suspense fallback={<PageLoader label="Cargando privacidad…" />}><PrivacyPage /></Suspense>} />
          <Route path="aviso-legal" element={<Suspense fallback={<PageLoader label="Cargando aviso legal…" />}><LegalNoticePage /></Suspense>} />

          {/* Advanced content routes (existing) */}
          <Route path="contenido" element={<Suspense fallback={<PageLoader label="Cargando contenido avanzado…" />}><AdvancedPages /></Suspense>} />
          <Route path="historia" element={<Suspense fallback={<PageLoader label="Cargando historia…" />}><AdvancedPages /></Suspense>} />
          <Route path="galeria" element={<Suspense fallback={<PageLoader label="Cargando galería…" />}><AdvancedPages /></Suspense>} />
          <Route path="videos" element={<Suspense fallback={<PageLoader label="Cargando vídeos…" />}><AdvancedPages /></Suspense>} />
          <Route path="noticias" element={<Suspense fallback={<PageLoader label="Cargando noticias…" />}><AdvancedPages /></Suspense>} />
          <Route path="rutas" element={<Suspense fallback={<PageLoader label="Cargando rutas…" />}><AdvancedPages /></Suspense>} />
          <Route path="cronologia" element={<Suspense fallback={<PageLoader label="Cargando cronología…" />}><AdvancedPages /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<PageLoader label="Cargando Inicio…" />}><HomePage /></Suspense>} />
        </Route>
      </Routes>
      
    </BrowserRouter>
  );
}

export default App;
