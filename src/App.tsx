import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import { lazyWithRecovery } from './services/chunkRecovery';
import { MainLayout } from './layouts/MainLayout';

// `lazyWithRecovery` sustituye a `React.lazy`: si un chunk falla al cargarse
// (tipicamente un HTML cacheado de un despliegue anterior), limpia la precache
// obsoleta y recarga una sola vez en vez de dejar la ruta en blanco.
// Ver src/services/chunkRecovery.ts.
const HomePage = lazyWithRecovery(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const ComparsaPage = lazyWithRecovery(() => import('./pages/Comparsa').then((m) => ({ default: m.Comparsa })));
const DetailPage = lazyWithRecovery(() => import('./pages/Detail').then((m) => ({ default: m.Detail })));
const RecorridosPage = lazyWithRecovery(() => import('./pages/Recorridos').then((m) => ({ default: m.Recorridos })));
const AgendaPage = lazyWithRecovery(() => import('./pages/Agenda').then((m) => ({ default: m.Agenda })));
const EnciclopediaPage = lazyWithRecovery(() => import('./pages/Enciclopedia').then((m) => ({ default: m.Enciclopedia })));
const FavoritosPage = lazyWithRecovery(() => import('./pages/Favoritos').then((m) => ({ default: m.Favoritos })));
const AdvancedPages = lazyWithRecovery(() => import('./pages/AdvancedPages').then((m) => ({ default: m.AdvancedPages })));
const BarriosPage = lazyWithRecovery(() => import('./pages/Barrios').then((m) => ({ default: m.Barrios })));
const AboutPage = lazyWithRecovery(() => import('./pages/About').then((m) => ({ default: m.About })));
const HeritagePage = lazyWithRecovery(() => import('./pages/Heritage').then((m) => ({ default: m.Heritage })));
const CollaborationPage = lazyWithRecovery(() => import('./pages/Collaboration').then((m) => ({ default: m.Collaboration })));
const RealtimeInfoPage = lazyWithRecovery(() => import('./pages/RealtimeInfo').then((m) => ({ default: m.RealtimeInfo })));
const GpsLivePage = lazyWithRecovery(() => import('./pages/GpsLive').then((m) => ({ default: m.GpsLive })));
const GpsEmisorPage = lazyWithRecovery(() => import('./pages/GpsEmisor').then((m) => ({ default: m.GpsEmisor })));
const FAQPage = lazyWithRecovery(() => import('./pages/FAQ').then((m) => ({ default: m.FAQ })));
const PrivacyPage = lazyWithRecovery(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })));
const LegalNoticePage = lazyWithRecovery(() => import('./pages/LegalNotice').then((m) => ({ default: m.LegalNotice })));
const CookiesPage = lazyWithRecovery(() => import('./pages/Cookies').then((m) => ({ default: m.Cookies })));
const AccessibilityPage = lazyWithRecovery(() => import('./pages/AccessibilityCommitment').then((m) => ({ default: m.AccessibilityCommitment })));
const JuegoPequePage = lazyWithRecovery(() => import('./pages/JuegoPeque').then((m) => ({ default: m.JuegoPeque })));
const PatrocinioPage = lazyWithRecovery(() => import('./pages/Patrocinio').then((m) => ({ default: m.Patrocinio })));
const PanelMunicipioPage = lazyWithRecovery(() => import('./pages/PanelMunicipio').then((m) => ({ default: m.PanelMunicipio })));

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
        {/* Main app routes with layout */}
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
          {/* Area de juegos infantiles */}
          <Route path="juegos" element={<Suspense fallback={<PageLoader label="Cargando juegos…" />}><JuegoPequePage /></Suspense>} />
          {/* Modulo de patrocinio: hosteleria y comercio local sobre el mapa */}
          <Route path="patrocinio" element={<Suspense fallback={<PageLoader label="Cargando patrocinadores…" />}><PatrocinioPage /></Suspense>} />
          {/* Panel municipal B2G: privado, con token (ver services/municipalPanel) */}
          <Route path="panel-municipio" element={<Suspense fallback={<PageLoader label="Cargando panel municipal…" />}><PanelMunicipioPage /></Suspense>} />

          <Route path="tiempo-real" element={<Suspense fallback={<PageLoader label="Cargando información en tiempo real…" />}><RealtimeInfoPage /></Suspense>} />
          <Route path="gps-live" element={<Suspense fallback={<PageLoader label="Cargando mapa GPS en vivo…" />}><GpsLivePage /></Suspense>} />
          <Route path="preguntas-frecuentes" element={<Suspense fallback={<PageLoader label="Cargando FAQ…" />}><FAQPage /></Suspense>} />
          <Route path="privacidad" element={<Suspense fallback={<PageLoader label="Cargando privacidad…" />}><PrivacyPage /></Suspense>} />
          <Route path="aviso-legal" element={<Suspense fallback={<PageLoader label="Cargando aviso legal…" />}><LegalNoticePage /></Suspense>} />
          <Route path="cookies" element={<Suspense fallback={<PageLoader label="Cargando política de cookies…" />}><CookiesPage /></Suspense>} />
          <Route path="accesibilidad" element={<Suspense fallback={<PageLoader label="Cargando accesibilidad…" />}><AccessibilityPage /></Suspense>} />

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

        {/* GPS Emisor - standalone route without layout */}
        <Route path="/gps-emisor" element={
          <Suspense fallback={<PageLoader label="Cargando GPS Emisor…" />}>
            <GpsEmisorPage />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;