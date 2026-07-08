import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { barrios } from '../data/singleSource';

import type { DistritoType } from '../data/singleSource';

import { FaCity, FaTree, FaUsers, FaFilter } from 'react-icons/fa';
import { motion } from 'framer-motion';
import '../styles/barrios.css';

export const Barrios: React.FC = () => {
  const navigate = useNavigate();

  const [zonaFilter, setZonaFilter] = useState<DistritoType | 'todas'>('todas');
  const [tieneGigantes, setTieneGigantes] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return barrios.filter((b) => {
      const matchZona = zonaFilter === 'todas' || b.distrito === zonaFilter;
      const matchGigantes = tieneGigantes === null || b.comparsa.hasGigantes === tieneGigantes;
      return matchZona && matchGigantes;
    });
  }, [zonaFilter, tieneGigantes]);

  const barriosCount = barrios.filter((c) => c.distrito === 'barrio').length;
  const pueblosCount = barrios.filter((c) => c.distrito === 'pueblo').length;
  const conGigantesCount = barrios.filter((c) => c.comparsa.hasGigantes).length;

  const openRecorridoForBarrio = (barrioId: string) => {
    // Navegamos directamente a /recorridos?barrio=<id>
    navigate(`/recorridos?barrio=${encodeURIComponent(barrioId)}`);
  };

  return (
    <div className="barrios-page layout-container">
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
          <button className={`filter-btn ${zonaFilter === 'todas' ? 'active' : ''}`} onClick={() => setZonaFilter('todas')}>
            Todas
          </button>
          <button className={`filter-btn ${zonaFilter === 'barrio' ? 'active' : ''}`} onClick={() => setZonaFilter('barrio')}>
            <FaCity size={10} /> Barrios
          </button>
          <button className={`filter-btn ${zonaFilter === 'pueblo' ? 'active' : ''}`} onClick={() => setZonaFilter('pueblo')}>
            <FaTree size={10} /> Pueblos
          </button>
        </div>
        <div className="filter-separator" />
        <div className="filter-group">
          <span className="filter-label-icon">Tipo:</span>
          <button className={`filter-btn ${tieneGigantes === null ? 'active' : ''}`} onClick={() => setTieneGigantes(null)}>
            Todas
          </button>
          <button className={`filter-btn ${tieneGigantes === true ? 'active' : ''}`} onClick={() => setTieneGigantes(true)}>
            Con Gigantes
          </button>
          <button className={`filter-btn ${tieneGigantes === false ? 'active' : ''}`} onClick={() => setTieneGigantes(false)}>
            Solo Cabezudos
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="barrios-grid">
        {filtered.length > 0 ? (
          filtered.map((b, index) => {
            const personajesCount = b.gigantes.length + b.cabezudos.length;
            const primerosPersonajes = [...b.gigantes, ...b.cabezudos].slice(0, 4);

            return (
              <motion.div
                key={b.id}
                className="barrio-card"
                onClick={() => {
                  setSelectedId(b.id);
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                {/* Card Header with gradient */}
                <div className="barrio-card-header" style={{ background: `linear-gradient(135deg, ${b.comparsa.id ? b.recorrido.color : '#999'} , ${b.recorrido.color}88)` }}>
                  <div className="barrio-card-icon">{b.distrito === 'barrio' ? '🏘️' : '🌲'}</div>
                  <div className="barrio-card-title">
                    <h3>{b.nombre}</h3>
                    <span>{b.comparsa.asociacion}</span>
                  </div>
                  <div className="barrio-zona-badge">{b.distrito === 'barrio' ? 'Barrio' : 'Pueblo'}</div>
                </div>

                <div className="barrio-card-body">
                  <p className="barrio-card-desc">{b.comparsa.description}</p>

                  <div className="barrio-tags">
                    {b.comparsa.hasGigantes && <span className="barrio-tag gigante">👑 Gigantes</span>}
                    {b.comparsa.hasCabezudos && <span className="barrio-tag cabezudo">😄 Cabezudos</span>}
                  </div>

                  <div className="barrio-card-personajes">
                    <div className="personajes-title">
                      <FaUsers size={10} style={{ marginRight: 4 }} />
                      Personajes ({personajesCount})
                    </div>
                    <div className="personajes-list">
                      {primerosPersonajes.map((p) => (
                        <span key={p.id} className="personaje-chip">
                          <span className="emoji">{p.emoji}</span>
                          <span>{p.name}</span>
                        </span>
                      ))}
                      {personajesCount > 4 && <span className="personaje-chip">+{personajesCount - 4}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (

          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            No se encontraron comparsas con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedId &&
        (() => {
          const comp = barrios.find((c) => c.id === selectedId);
          if (!comp) return null;

          const allPersonajes = [...comp.gigantes, ...comp.cabezudos];

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
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="modal-header"
                  style={{ background: `linear-gradient(135deg, ${comp.recorrido.color}, ${comp.recorrido.color}88)` }}
                >
                  <button className="modal-close" onClick={() => setSelectedId(null)}>
                    ✕
                  </button>
                  <div className="modal-title-area">
                    <div className="modal-icon">{comp.distrito === 'barrio' ? '🏘️' : '🌲'}</div>
                    <div>
                      <h2>{comp.nombre}</h2>
                      <div className="modal-subtitle">{comp.comparsa.asociacion}</div>
                    </div>
                  </div>
                </div>

                <div className="modal-body">
                  <div className="modal-section">
                    <h4>Descripción</h4>
                    <p>{comp.comparsa.description}</p>
                  </div>

                  <div className="modal-section">
                    <h4>Historia</h4>
                    <p>{comp.comparsa.historia}</p>
                  </div>

                  <div className="modal-section">
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {comp.comparsa.hasGigantes && <span className="barrio-tag gigante">👑 Gigantes</span>}
                      {comp.comparsa.hasCabezudos && <span className="barrio-tag cabezudo">😄 Cabezudos</span>}
                    </div>
                  </div>

                  <div className="modal-section">
                    <h4>Personajes ({allPersonajes.length})</h4>
                    <div className="modal-personajes-list">
                      {allPersonajes.map((p) => (
                        <div key={p.id} className="modal-personaje-item">
                          <div className="modal-personaje-emoji">{p.emoji}</div>
                          <div className="modal-personaje-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <h5>{p.name}</h5>
                              <span className="modal-personaje-type" style={{ color: p.name ? '#b89620' : '#d1121f' }}>
                                {p.id?.toString?.().includes('gigante') ? 'Gigante' : 'Cabezudo'}
                              </span>
                            </div>
                            <p>{p.description}</p>
                            {p.copla && (
                              <p style={{ fontStyle: 'italic', fontSize: '0.75rem', marginTop: 4 }}>🎵 {p.copla}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="modal-section" style={{ marginTop: 12 }}>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setSelectedId(null);
                        openRecorridoForBarrio(comp.id);
                      }}
                    >
                      Ver recorrido en mapa
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
    </div>
  );
};
