import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAppStore } from '../hooks/store';
import { 
  FaHome, 
  FaUsers, 
  FaMapMarkedAlt, 
  FaCalendarAlt, 
  FaHeart, 
  FaSun, 
  FaMoon, 
  FaDownload,
  FaWifi,
  FaCrown
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export const MainLayout: React.FC = () => {
  const { theme, toggleTheme, favorites } = useAppStore();
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleOnlineStatus = () => setIsOnline(true);
    const handleOfflineStatus = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
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

  const navItems = [
    { path: '/', label: 'Inicio', icon: <FaHome /> },
    { path: '/comparsa', label: 'Comparsa', icon: <FaUsers /> },
    { path: '/recorridos', label: 'Recorridos', icon: <FaMapMarkedAlt /> },
    { path: '/agenda', label: 'Agenda', icon: <FaCalendarAlt /> },
    { path: '/favoritos', label: 'Favoritos', icon: <FaHeart /> },
  ];

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* CSS Layout Helpers specifically for Header/Nav sizing */}
      <style>{`
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

      {/* Top Navbar */}
      <header className="app-header">
        <Link to="/" className="header-logo">
          <FaCrown size={24} />
          <span>Gigantes y Cabezudos</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`desktop-nav-link ${isActive ? 'active' : ''}`}
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
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`mobile-nav-link ${isActive ? 'active' : ''}`}
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
