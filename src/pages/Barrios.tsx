import React, { useState } from 'react';
import { barrioComparsas, type ZonaType } from '../data/barrioComparsasData';
import { FaCity, FaTree, FaUsers, FaFilter } from 'react-icons/fa';
import { motion } from 'framer-motion';


export const Barrios: React.FC = () => {
  const [zonaFilter, setZonaFilter] = useState<ZonaType | 'todas'>('todas');
  const [tieneGigantes, setTieneGigantes] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = barrioComparsas.filter(c => {
    const matchZona = zonaFilter === 'todas' || c.zona === zonaFilter;
    const matchGigantes = tieneGigantes === null || c.hasGigantes === tieneGigantes;
    return matchZona && matchGigantes;
  });

  const barriosCount = barrioComparsas.filter(c => c.zona === 'barrio').length;
  const pueblosCount = barrioComparsas.filter(c => c.zona === 'pueblo').length;
  const conGigantesCount = barrioComparsas.filter(c => c.hasGigantes).length;

  return (
    <div className="barrios-page layout-container">
      <style>{`
        .barrios-header {
          margin-bottom: 24px;
        }
        .barrios-header h1 {
          font-size: 1.8rem;
          margin-bottom: 8px;
        }
        .barrios-header p {
          color: hsl(var(--color-text-secondary));
          font-size: 0.95rem;
        }
        .barrios-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .barrios-stat-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          text-align: center;
        }
        .barrios-stat-num {
          font-size: 1.6rem;
          font-weight: 800;
          color: hsl(var(--color-primary));
        }
        .barrios-stat-label {
          font-size: 0.75rem;
          color: hsl(var(--color-text-secondary));
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
          font-weight: 600;
        }
        .filters-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 12px;
        }
        .filter-group {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .filter-label-icon {
          font-size: 0.8rem;
          color: hsl(var(--color-text-secondary));
          margin-right: 6px;
        }
        .filter-btn {
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: var(--border-radius-sm);
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-text-secondary));
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .filter-btn.active {
          background: hsl(var(--color-primary));
          color: white;
          border-color: hsl(var(--color-primary));
        }
        .filter-separator {
          width: 1px;
          background: hsl(var(--color-border));
          margin: 0 8px;
        }
        .barrios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        .barrio-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-normal);
          cursor: pointer;
        }
        .barrio-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: hsl(var(--color-primary));
        }
        .barrio-card-header {
          position: relative;
          padding: 20px;
          color: white;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .barrio-card-icon {
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .barrio-card-title {
          flex: 1;
        }
        .barrio-card-title h3 {
          font-size: 1.1rem;
          margin-bottom: 2px;
          color: white;
        }
        .barrio-card-title span {
          font-size: 0.75rem;
          opacity: 0.9;
        }
        .barrio-zona-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          background: rgba(255,255,255,0.2);
        }
        .barrio-card-body {
          padding: 16px 20px;
        }
        .barrio-card-desc {
          font-size: 0.85rem;
          color: hsl(var(--color-text-secondary));
          line-height: 1.5;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .barrio-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .barrio-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          background: rgba(33, 150, 243, 0.1);
          color: #1976D2;
        }
        .barrio-tag.gigante {
          background: rgba(212, 175, 55, 0.12);
          color: #b89620;
        }
        .barrio-tag.cabezudo {
          background: rgba(209, 18, 31, 0.08);
          color: #d1121f;
        }
        .barrio-card-personajes {
          border-top: 1px solid hsl(var(--color-border));
          padding-top: 12px;
        }
        .personajes-title {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: hsl(var(--color-text-secondary));
          margin-bottom: 8px;
        }
        .personajes-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .personaje-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          padding: 2px 8px 2px 4px;
          border-radius: 12px;
          border: 1px solid hsl(var(--color-border));
        }
        .personaje-chip .emoji {
          font-size: 0.85rem;
        }
        .selected-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .selected-modal {
          background: hsl(var(--color-bg-card));
          border-radius: var(--border-radius-lg);
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }
        .modal-header {
          position: relative;
          padding: 24px;
          color: white;
        }
        .modal-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-title-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .modal-icon {
          width: 56px;
          height: 56px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
        }
        .modal-title-area h2 {
          font-size: 1.4rem;
          color: white;
          margin-bottom: 4px;
        }
        .modal-subtitle {
          font-size: 0.8rem;
          opacity: 0.9;
        }
        .modal-body {
          padding: 24px;
        }
        .modal-section {
          margin-bottom: 20px;
        }
        .modal-section h4 {
          font-size: 0.85rem;
          font-weight: 700;
          color: hsl(var(--color-text-secondary));
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .modal-section p {
          font-size: 0.95rem;
          line-height: 1.6;
          color: hsl(var(--color-text-primary));
        }
        .modal-personajes-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .modal-personaje-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: hsl(var(--color-bg-secondary));
          border-radius: var(--border-radius-sm);
          border: 1px solid hsl(var(--color-border));
        }
        .modal-personaje-emoji {
          font-size: 1.5rem;
        }
        .modal-personaje-info h5 {
          font-size: 0.9rem;
          font-weight: 700;
        }
        .modal-personaje-info p {
          font-size: 0.8rem;
          color: hsl(var(--color-text-secondary));
          margin: 0;
        }
        .modal-personaje-type {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 8px;
          text-transform: uppercase;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          color: hsl(var(--color-text-secondary));
          gridColumn: '1 / -1';
        }
        @media (max-width: 768px) {
          .barrios-stats {
            grid-template-columns: 1fr 1fr;
          }
          .barrios-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div className="barrios-header">
        <h1>🏘️ Comparsas de Barrios y Pueblos</h1>
        <p>
          Descubre todas las comparsas de gigantes y cabezudos de los barrios urbanos y pueblos rurales de Zaragoza. Filtra por zona o por tipo de personajes.
        </p>
      </div>

      {/* Stats */}
      <div className="barrios-stats">
        <div className="barrios-stat-card">
          <div className="barrios-stat-num">{barriosCount}</div>
          <div className="barrios-stat-label">Barrios Urbanos</div>
        </div>
        <div className="barrios-stat-card">
          <div className="barrios-stat-num">{pueblosCount}</div>
          <div className="barrios-stat-label">Pueblos Rurales</div>
        </div>
        <div className="barrios-stat-card">
          <div className="barrios-stat-num">{conGigantesCount}</div>
          <div className="barrios-stat-label">Con Gigantes</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-row">
        <div className="filter-group">
          <FaFilter className="filter-label-icon" />
          <span className="filter-label-icon">Zona:</span>
          <button className={`filter-btn ${zonaFilter === 'todas' ? 'active' : ''}`} onClick={() => setZonaFilter('todas')}>Todas</button>
          <button className={`filter-btn ${zonaFilter === 'barrio' ? 'active' : ''}`} onClick={() => setZonaFilter('barrio')}><FaCity size={10} /> Barrios</button>
          <button className={`filter-btn ${zonaFilter === 'pueblo' ? 'active' : ''}`} onClick={() => setZonaFilter('pueblo')}><FaTree size={10} /> Pueblos</button>
        </div>
        <div className="filter-separator" />
        <div className="filter-group">
          <span className="filter-label-icon">Tipo:</span>
          <button className={`filter-btn ${tieneGigantes === null ? 'active' : ''}`} onClick={() => setTieneGigantes(null)}>Todas</button>
          <button className={`filter-btn ${tieneGigantes === true ? 'active' : ''}`} onClick={() => setTieneGigantes(true)}>Con Gigantes</button>
          <button className={`filter-btn ${tieneGigantes === false ? 'active' : ''}`} onClick={() => setTieneGigantes(false)}>Solo Cabezudos</button>
        </div>
      </div>

      {/* Grid */}
      <div className="barrios-grid">
        {filtered.length > 0 ? filtered.map((comp, index) => (
          <motion.div
            key={comp.id}
            className="barrio-card"
            onClick={() => setSelectedId(comp.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            {/* Card Header with gradient */}
            <div className="barrio-card-header" style={{ background: `linear-gradient(135deg, ${comp.color}, ${comp.color}88)` }}>
              <div className="barrio-card-icon">
                {comp.zona === 'barrio' ? '🏘️' : '🌲'}
              </div>
              <div className="barrio-card-title">
                <h3>{comp.name}</h3>
                <span>{comp.asociacion}</span>
              </div>
              <div className="barrio-zona-badge">
                {comp.zona === 'barrio' ? 'Barrio' : 'Pueblo'}
              </div>
            </div>

            <div className="barrio-card-body">
              <p className="barrio-card-desc">{comp.description}</p>

              <div className="barrio-tags">
                {comp.hasGigantes && <span className="barrio-tag gigante">👑 Gigantes</span>}
                {comp.hasCabezudos && <span className="barrio-tag cabezudo">😄 Cabezudos</span>}
              </div>

              <div className="barrio-card-personajes">
                <div className="personajes-title">
                  <FaUsers size={10} style={{ marginRight: 4 }} />
                  Personajes ({comp.personajes.length})
                </div>
                <div className="personajes-list">
                  {comp.personajes.slice(0, 4).map(p => (
                    <span key={p.id} className="personaje-chip">
                      <span className="emoji">{p.emoji}</span>
                      <span>{p.name}</span>
                    </span>
                  ))}
                  {comp.personajes.length > 4 && <span className="personaje-chip">+{comp.personajes.length - 4}</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            No se encontraron comparsas con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedId && (() => {
        const comp = barrioComparsas.find(c => c.id === selectedId);
        if (!comp) return null;
        return (
          <motion.div
            className="selected-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              className="selected-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header" style={{ background: `linear-gradient(135deg, ${comp.color}, ${comp.color}88)` }}>
                <button className="modal-close" onClick={() => setSelectedId(null)}>✕</button>
                <div className="modal-title-area">
                  <div className="modal-icon">
                    {comp.zona === 'barrio' ? '🏘️' : '🌲'}
                  </div>
                  <div>
                    <h2>{comp.name}</h2>
                    <div className="modal-subtitle">{comp.asociacion}</div>
                  </div>
                </div>
              </div>

              <div className="modal-body">
                <div className="modal-section">
                  <h4>Descripción</h4>
                  <p>{comp.description}</p>
                </div>

                <div className="modal-section">
                  <h4>Historia</h4>
                  <p>{comp.historia}</p>
                </div>

                <div className="modal-section">
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {comp.hasGigantes && <span className="barrio-tag gigante">👑 Gigantes</span>}
                    {comp.hasCabezudos && <span className="barrio-tag cabezudo">😄 Cabezudos</span>}
                  </div>
                </div>

                <div className="modal-section">
                  <h4>Personajes ({comp.personajes.length})</h4>
                  <div className="modal-personajes-list">
                    {comp.personajes.map(p => (
                      <div key={p.id} className="modal-personaje-item">
                        <div className="modal-personaje-emoji">{p.emoji}</div>
                        <div className="modal-personaje-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <h5>{p.name}</h5>
                            <span className="modal-personaje-type" style={{ color: p.type === 'gigante' ? '#b89620' : '#d1121f' }}>
                              {p.type === 'gigante' ? 'Gigante' : 'Cabezudo'}
                            </span>
                          </div>
                          <p>{p.description}</p>
                          {p.copla && <p style={{ fontStyle: 'italic', fontSize: '0.75rem', marginTop: 4 }}>🎵 {p.copla}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
    </div>
  );
};