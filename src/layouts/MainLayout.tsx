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
  FaCity
} from 'react-icons/fa';
import { motion } from 'framer-motion';
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
            className={`desktop-nav-link ${isActive ? 'active' : ''}`}
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

const MobileNav = memo(() => {
  const location = useLocation();
  const favorites = useAppStore((state) => state.favorites);
  return (
    <nav className="mobile-nav" aria-label="Navegación móvil">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className={`mobile-nav-link ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.path === '/favoritos' && favorites.length > 0 && (
              <span className="fav-badge" aria-label={`${favorites.length} favoritos`}>{favorites.length}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
});
MobileNav.displayName = 'MobileNav';

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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isReady, setIsReady] = useState(false);

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
      <MobileNav />
      <CookieBanner />
    </div>
  );
};