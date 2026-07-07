import React, { useEffect, useState } from 'react';
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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const MainLayout: React.FC = () => {
  const { theme, toggleTheme, favorites } = useAppStore();
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
    return (
      <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--color-bg-base))' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid hsl(var(--color-border))', borderTopColor: 'hsl(var(--color-primary))', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Cargando la comparsa…</div>
          <div style={{ color: 'hsl(var(--color-text-secondary))', fontSize: '0.95rem' }}>Preparando Inicio, Comparsa y Recorridos.</div>
        </div>
      </div>
    );
  }

  const navItems = [
    { path: '/', label: 'Inicio', icon: <FaHome /> },
    { path: '/comparsa', label: 'Comparsa', icon: <FaUsers /> },
    { path: '/barrios', label: 'Barrios', icon: <FaCity /> },
    { path: '/recorridos', label: 'Recorridos', icon: <FaMapMarkedAlt /> },
    { path: '/enciclopedia', label: 'Enciclopedia', icon: <FaBookOpen /> },
    { path: '/agenda', label: 'Agenda', icon: <FaCalendarAlt /> },
    { path: '/favoritos', label: 'Favoritos', icon: <FaHeart /> },
  ];

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* CSS Layout Helpers specifically for Header/Nav sizing */}
      <style>{`
        .skip-link {
          position: absolute;
          top: -48px;
          left: 16px;
          background: hsl(var(--color-primary));
          color: white;
          padding: 10px 14px;
          border-radius: 999px;
          z-index: 2000;
          transition: top var(--transition-fast);
        }
        .skip-link:focus {
          top: 16px;
        }
        .app-header {
          position: sticky;
          top: 0;
          height: var(--header-height);
          background: hsla(var(--color-bg-card), 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid hsl(var(--color-border));
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          box-shadow: var(--shadow-sm);
        }
        .header-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 800;
          font-size: 1.25rem;
          background: linear-gradient(135deg, hsl(var(--color-primary)) 0%, hsl(var(--color-secondary)) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .header-logo svg {
          color: hsl(var(--color-primary));
          -webkit-text-fill-color: hsl(var(--color-primary));
        }
        .desktop-nav {
          display: flex;
          gap: 8px;
        }
        .desktop-nav-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: var(--border-radius-sm);
          font-weight: 600;
          font-size: 0.95rem;
          color: hsl(var(--color-text-secondary));
          transition: all var(--transition-fast);
        }
        .desktop-nav-link:hover, .desktop-nav-link.active {
          color: hsl(var(--color-text-primary));
          background: hsl(var(--color-bg-secondary));
        }
        .desktop-nav-link.active {
          border-bottom: 2px solid hsl(var(--color-primary));
          border-radius: var(--border-radius-sm) var(--border-radius-sm) 0 0;
          background: hsla(var(--color-primary), 0.08);
          color: hsl(var(--color-primary));
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .action-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: hsl(var(--color-bg-secondary));
          color: hsl(var(--color-text-primary));
          border: 1px solid hsl(var(--color-border));
          transition: all var(--transition-fast);
          font-size: 1.1rem;
        }
        .action-btn:hover {
          background: hsl(var(--color-border));
          transform: scale(1.05);
        }
        .offline-badge {
          background: hsl(var(--color-error));
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          animation: pulse 2s infinite;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
        }
        .mobile-nav {
          display: none;
        }
        @keyframes pulse {
          0% { opacity: 0.8; }
          50% { opacity: 1; }
          100% { opacity: 0.8; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none;
          }
          .header-logo span {
            font-size: 1.1rem;
          }
          .main-content {
            padding-bottom: var(--nav-height-mobile);
          }
          .mobile-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: var(--nav-height-mobile);
            background: hsla(var(--color-nav-bg), 0.9);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-top: 1px solid hsl(var(--color-nav-border));
            justify-content: space-around;
            align-items: center;
            padding: 0 12px;
            z-index: 1000;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
          }
          .mobile-nav-link {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: hsl(var(--color-text-secondary));
            font-size: 0.75rem;
            font-weight: 500;
            text-decoration: none;
            width: 20%;
            height: 100%;
            position: relative;
            transition: color var(--transition-fast);
          }
          .mobile-nav-link svg {
            font-size: 1.4rem;
            margin-bottom: 2px;
            transition: transform var(--transition-fast);
          }
          .mobile-nav-link.active {
            color: hsl(var(--color-primary));
            font-weight: 700;
          }
          .mobile-nav-link.active svg {
            transform: translateY(-2px);
          }
          .fav-badge {
            position: absolute;
            top: 4px;
            right: calc(50% - 18px);
            background: hsl(var(--brand-red));
            color: white;
            font-size: 0.65rem;
            min-width: 16px;
            height: 16px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            border: 2px solid hsl(var(--color-nav-bg));
          }
        }
      `}</style>

      <a className="skip-link" href="#main-content">Saltar al contenido</a>

      {/* Top Navbar */}
      <header className="app-header">
        <Link to="/" className="header-logo">
          <FaCrown size={24} />
          <span>Gigantes y Cabezudos</span>
        </Link>

        {/* Desktop Navigation Links */}
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

        {/* Header Action Buttons */}
        <div className="header-actions">
          {/* Offline alert indicator */}
          {!isOnline && (
            <div className="offline-badge">
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
          transition={{ duration: 0.2 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          <Outlet />
        </motion.div>
      </main>
        <FooterConsent />
      {/* Mobile Bottom Navigation Bar */}
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
                <span className="fav-badge">{favorites.length}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
