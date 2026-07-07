import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { comparsaMembers } from '../data/comparsaData';
import { useAppStore } from '../hooks/store';
import { FaTrash, FaInfoCircle, FaWifi, FaMobileAlt, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export const Favoritos: React.FC = () => {
  const { favorites, toggleFavorite } = useAppStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const favoriteMembers = comparsaMembers.filter(m => favorites.includes(m.id));

  const handleClearAll = () => {
    if (window.confirm("¿Seguro que deseas vaciar tu lista de personajes favoritos?")) {
      favorites.forEach(id => toggleFavorite(id));
    }
  };

  return (
    <div className="favoritos-page layout-container">
      <style>{`
        .favs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 35px;
        }
        .fav-item-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-fast);
        }
        .fav-item-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: hsl(var(--color-primary));
        }
        .fav-emoji {
          width: 50px;
          height: 50px;
          background: hsl(var(--color-bg-secondary));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          border: 2px solid;
        }
        .fav-info {
          flex: 1;
        }
        .fav-name {
          font-weight: 700;
          font-size: 1rem;
        }
        .fav-meta {
          font-size: 0.75rem;
          color: hsl(var(--color-text-secondary));
          text-transform: capitalize;
        }
        .fav-remove-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--color-text-secondary));
          transition: all var(--transition-fast);
        }
        .fav-remove-btn:hover {
          background: rgba(211, 47, 47, 0.1);
          color: #d32f2f;
        }
        .empty-favs {
          text-align: center;
          padding: 60px 20px;
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-lg);
          color: hsl(var(--color-text-secondary));
          margin-bottom: 35px;
        }
        .settings-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }
        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid hsl(var(--color-border));
        }
        .settings-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .settings-label {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .settings-label svg {
          color: hsl(var(--color-primary));
          font-size: 1.2rem;
        }
        .settings-title {
          font-size: 0.95rem;
          font-weight: 600;
        }
        .settings-desc {
          font-size: 0.75rem;
          color: hsl(var(--color-text-secondary));
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Tus Favoritos</h1>
          <p style={{ color: 'hsl(var(--color-text-secondary))', fontSize: '0.95rem' }}>
            Guarda tus personajes más queridos para verlos rápidamente.
          </p>
        </div>
        
        {favorites.length > 0 && (
          <button className="btn-secondary" style={{ color: '#d32f2f', border: '1px solid rgba(211,47,47,0.3)' }} onClick={handleClearAll}>
            <FaTrash />
            <span>Borrar Todos</span>
          </button>
        )}
      </div>

      {/* Favorites List */}
      <section>
        {favoriteMembers.length > 0 ? (
          <motion.div className="favs-grid" layout>
            <AnimatePresence mode="popLayout">
              {favoriteMembers.map((member) => (
                <motion.div 
                  key={member.id}
                  className="fav-item-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <div 
                    className="fav-emoji"
                    style={{ borderColor: member.iconColor, background: `${member.iconColor}10` }}
                  >
                    {member.imagePlaceholder}
                  </div>
                  
                  <div className="fav-info">
                    <Link to={`/personaje/${member.id}`} className="fav-name hover-primary">
                      {member.name}
                    </Link>
                    <div className="fav-meta">{member.type} • {member.year}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link 
                      to={`/personaje/${member.id}`} 
                      className="fav-remove-btn" 
                      title="Ver Ficha"
                      aria-label="Ver Ficha"
                    >
                      <FaChevronRight size={14} />
                    </Link>
                    
                    <button 
                      className="fav-remove-btn"
                      onClick={() => toggleFavorite(member.id)}
                      title="Quitar de favoritos"
                      aria-label="Quitar de favoritos"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="empty-favs">
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❤️</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No tienes favoritos guardados</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
              Navega por la comparsa completa y marca tus gigantes y cabezudos favoritos con el corazón.
            </p>
            <Link to="/comparsa" className="btn-primary">
              Explorar Comparsa
            </Link>
          </div>
        )}
      </section>

      {/* App configurations and PWA info details */}
      <section className="settings-card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', borderBottom: '1px solid hsl(var(--color-border))', paddingBottom: '8px' }}>
          Configuración e Info Técnica
        </h3>
        
        <div className="settings-row">
          <div className="settings-label">
            <FaWifi />
            <div>
              <div className="settings-title">Estado de Red</div>
              <div className="settings-desc">Comprueba la conectividad de la aplicación.</div>
            </div>
          </div>
          <div>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              color: isOnline ? '#2e7d32' : 'hsl(var(--color-error))', 
              background: isOnline ? 'rgba(46,125,50,0.1)' : 'rgba(211,47,47,0.1)',
              padding: '4px 10px',
              borderRadius: '12px'
            }}>
              {isOnline ? 'CONECTADO' : 'SIN CONEXIÓN'}
            </span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <FaMobileAlt />
            <div>
              <div className="settings-title">Soporte PWA (Aplicación de Escritorio/Móvil)</div>
              <div className="settings-desc">Uso offline habilitado con Service Workers.</div>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--color-text-secondary))' }}>
            Habilitado (PWA)
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">
            <FaInfoCircle />
            <div>
              <div className="settings-title">Almacenamiento Local</div>
              <div className="settings-desc">Limpiar todos los datos locales persistidos en este dispositivo.</div>
            </div>
          </div>
          <button 
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#d32f2f' }}
            onClick={() => {
              if (window.confirm("Se borrarán las configuraciones de favoritos y tema. ¿Proceder?")) {
                localStorage.clear();
                window.location.reload();
              }
            }}
          >
            Restablecer App
          </button>
        </div>
      </section>
    </div>
  );
};
