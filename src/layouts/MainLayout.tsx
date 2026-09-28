import React, { useEffect, useState, memo } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../hooks/store';
import { 
  FaHome, 
  FaUsers, 
  FaMapMarkedAlt, 
  FaCalendarAlt, 
  FaHeart, 
  FaBookOpen,
  FaSun,
  FaMoon,
  FaDownload,
  FaWifi,
  FaCrown,
  FaCity,
  FaGamepad
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes, FaRoute, FaStore, FaClock } from 'react-icons/fa';
import { FooterConsent } from '../components/FooterConsent';
import { CookieBanner } from '../components/CookieBanner';
import '../styles/layout.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const navItems = [
  { path: '/', label: 'Inicio', icon: <FaHome /> },
  { path: '/comparsa', label: 'Comparsa', icon: <FaUsers /> },
  { path: '/barrios', label: 'Barrios', icon: <FaCity /> },
  { path: '/recorridos', label: 'Recorridos', icon: <FaMapMarkedAlt /> },
  { path: '/enciclopedia', label: 'Enciclopedia', icon: <FaBookOpen /> },
  { path: '/agenda', label: 'Agenda', icon: <FaCalendarAlt /> },
  { path: '/favoritos', label: 'Favoritos', icon: <FaHeart /> },
  // Acceso destacado al area de juegos infantiles: aparece arriba en la barra de
  // escritorio y como boton destacado en la barra inferior del movil.
  { path: '/juegos', label: 'Juegos Peque', icon: <FaGamepad />, featured: true },
];

/**
 * Barra inferior del movil: EXACTAMENTE 5 destinos (grid de 5 columnas).
 *
 * Antes esta barra metia las 7 rutas del catalogo y los iconos acababan
 * apretados y sin etiqueta en pantallas de 360 px. Ahora son cuatro enlaces
 * iguales mas un boton de MENU: nada del sitio queda inaccesible desde el
 * movil, pero la barra solo ensena lo que el ciudadano necesita en la calle
 * mientras espera a que pase la comparsa.
 */
const mobileNavItems = [
  { path: '/', label: 'Inicio', icon: <FaHome /> },
  { path: '/gps-live', label: 'Mapa', icon: <FaMapMarkedAlt /> },
  { path: '/juegos', label: 'Juegos', icon: <FaGamepad />, featured: true },
  { path: '/agenda', label: 'Programa', icon: <FaCalendarAlt /> },
];

/**
 * Resto del sitio, accesible desde el boton "Menu" de la barra inferior.
 *
 * Esta lista NO se dibuja nunca en el flujo de la pagina: no existe barra de
 * enlaces al pie, solo se pinta dentro del cajon `MobileMenu`. Renderizarla
 * tambien en linea es justo lo que provoca el solapamiento con la barra fija
 * de 5 botones, asi que no debe duplicarse aqui ni en `FooterConsent`.
 */
const menuItems = [
  { path: '/comparsa', label: 'Comparsa', icon: <FaUsers /> },
  { path: '/barrios', label: 'Barrios', icon: <FaCity /> },
  { path: '/recorridos', label: 'Recorridos', icon: <FaRoute /> },
  { path: '/enciclopedia', label: 'Enciclopedia', icon: <FaBookOpen /> },
  { path: '/favoritos', label: 'Favoritos', icon: <FaHeart /> },
  { path: '/tiempo-real', label: 'Tiempo real', icon: <FaClock /> },
  { path: '/patrocinio', label: 'Comercio local', icon: <FaStore /> },
  { path: '/panel-municipio', label: 'Panel municipal', icon: <FaCity /> },
];

const PageLoader = memo(({ label }: { label: string }) => (
  <div className="layout-container" style={{ paddingTop: 40 }}>
    <div className="card-glass" style={{ textAlign: 'center', maxWidth: 360, margin: '0 auto' }}>
      {label}
    </div>
  </div>
));

PageLoader.displayName = 'PageLoader';

const DesktopNav = memo(() => {
  const location = useLocation();
  return (
    <nav className="desktop-nav" aria-label="Navegación principal">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`desktop-nav-link ${isActive ? 'active' : ''} ${item.featured ? 'is-featured' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
});
DesktopNav.displayName = 'DesktopNav';

const MobileNav = memo(
  ({ menuOpen, onOpenMenu }: { menuOpen: boolean; onOpenMenu: () => void }) => {
  const location = useLocation();
  const favorites = useAppStore((state) => state.favorites);
  return (
    <nav className="mobile-nav" aria-label="Navegación móvil">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-link ${isActive ? 'active' : ''}${item.featured ? ' is-featured' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Quinto hueco: abre el resto del sitio. El contador de favoritos vive
            aqui (y no en un enlace propio) para no perder el aviso al reducirlo
            a cinco botones. */}
        <button
          type="button"
          className={`mobile-nav-link mobile-nav-menu${menuOpen ? ' active' : ''}`}
          onClick={onOpenMenu}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-controls="mobile-menu"
        >
          <FaBars aria-hidden="true" />
          <span>Menú</span>
          {favorites.length > 0 && (
            <span className="fav-badge" aria-label={`${favorites.length} favoritos`}>{favorites.length}</span>
          )}
        </button>
      </nav>
    );
  }
);
MobileNav.displayName = 'MobileNav';

/**
 * Cajon de navegacion del movil (bottom sheet).
 *
 * Un solo panel para el resto del catalogo: en la calle nadie quiere un menu de
 * hamburguesa arriba (queda fuera del pulgar) ni siete iconos abajo. Aqui entra
 * todo lo que no cabe en los cuatro destinos frecuentes, con objetivos de 48 px
 * y cierre por fondo, boton o tecla Escape.
 */
const MobileMenu = memo(({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const location = useLocation();
  const favorites = useAppStore((state) => state.favorites);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="mobile-menu"
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Más secciones"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <button
            type="button"
            className="mobile-menu-backdrop"
            onClick={onClose}
            aria-label="Cerrar menú"
          />
          <motion.div
            className="mobile-menu-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div className="mobile-menu-head">
              <span>Más secciones</span>
              <button
                type="button"
                className="mobile-menu-close"
                onClick={onClose}
                aria-label="Cerrar menú"
              >
                <FaTimes aria-hidden="true" />
              </button>
            </div>

            <nav className="mobile-menu-grid" aria-label="Más secciones del sitio">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={onClose}
                  >
                    <span className="mobile-menu-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.path === '/favoritos' && favorites.length > 0 && (
                      <span className="fav-badge" aria-label={`${favorites.length} favoritos`}>
                        {favorites.length}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
MobileMenu.displayName = 'MobileMenu';



const LoadingScreen = () => (
  <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--color-bg-base))' }}>
    <div style={{ textAlign: 'center', padding: 24 }}>
      <div className="loading-spinner" />
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Cargando la comparsa…</div>
      <div style={{ color: 'hsl(var(--color-text-secondary))', fontSize: '0.95rem' }}>Preparando Inicio, Comparsa y Recorridos.</div>
    </div>
  </div>
);

export const MainLayout: React.FC = () => {
  const { theme, toggleTheme } = useAppStore();
  const location = useLocation();
  // Cajon de navegacion del movil: se cierra al navegar (ver efecto mas abajo),
  // con Escape o tocando el fondo.
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = React.useCallback(() => setMenuOpen(true), []);
  const closeMenu = React.useCallback(() => setMenuOpen(false), []);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isReady, setIsReady] = useState(false);

  // El cajon se cierra al pulsar un enlace (`onClick={onClose}` en cada
  // destino, en `MobileMenu`) y con la tecla Escape. No hace falta un efecto
  // que vigile la ruta: eso era un `setState` en cada navegacion, que dispara
  // un render extra de todo el arbol y ademas deja el panel abierto si se
  // vuelve con el boton "atras" del navegador.

  // Escape cierra el cajon y, mientras esta abierto, se bloquea el scroll del
  // fondo (si no, en iOS se desplaza la pagina de detras y el panel "flota").
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsReady(true));

    const handleBeforeInstallPrompt = (e: Event) => {
      const installPromptEvent = e as BeforeInstallPromptEvent;
      installPromptEvent.preventDefault();
      setDeferredPrompt(installPromptEvent);
      setIsInstallable(true);
    };

    const handleOnlineStatus = () => setIsOnline(true);
    const handleOfflineStatus = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <a className="skip-link" href="#main-content">Saltar al contenido</a>

      {/* Top Navbar */}
      <header className="app-header">
        <Link to="/" className="header-logo" aria-label="Ir al inicio">
          <FaCrown size={24} />
          <span>Gigantes y Cabezudos</span>
        </Link>

        <DesktopNav />

        {/* Header Action Buttons */}
        <div className="header-actions">
          {/* Offline alert indicator */}
          {!isOnline && (
            <div className="offline-badge" role="alert">
              <FaWifi />
              <span>Sin conexión</span>
            </div>
          )}

          {/* PWA Install Trigger */}
          {isInstallable && (
            <button 
              className="action-btn" 
              onClick={handleInstallApp} 
              title="Instalar Aplicación"
              aria-label="Instalar App"
              style={{ color: 'hsl(var(--color-accent))' }}
            >
              <FaDownload />
            </button>
          )}

          {/* Light/Dark mode switcher */}
          <button 
            className="action-btn" 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? <FaMoon /> : <FaSun />}
          </button>
        </div>
      </header>

      {/* Main Page Area */}
      <main id="main-content" className="main-content">
        <motion.div
          key={location.pathname}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <Outlet />
        </motion.div>
      </main>
      <FooterConsent />
      <MobileNav menuOpen={menuOpen} onOpenMenu={openMenu} />
      <MobileMenu open={menuOpen} onClose={closeMenu} />
      <CookieBanner />
    </div>
  );
};