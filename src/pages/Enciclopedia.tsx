import React, { useState, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaBookOpen, FaUsers, FaChild,
  FaMapMarkerAlt, FaLightbulb, FaClock,
  FaRuler, FaWeight, FaPalette, FaStar, FaTimes,
  FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { enciclopediaData, type EnciclopediaEntry } from '../data/enciclopediaData';
import { barrioComparsas } from '../data/barrioComparsasData';

import '../styles/enciclopedia.css';

// ─── Filter types ────────────────────────────────────────────
type TypeFilter = 'todos' | 'gigante' | 'cabezudo';

// ─── Sub-components ──────────────────────────────────────────

interface CharacterCardProps {
  entry: EnciclopediaEntry;
  onClick: () => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ entry, onClick }) => (
  <motion.div
    className="enc-card"
    onClick={onClick}
    whileHover={{ y: -6, scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    layout
  >
    {/* Image placeholder */}
    <div
      className="enc-card-image"
      style={{ background: entry.imageBg }}
    >
      <span className="enc-card-placeholder">Imagen ilustrativa</span>
      <span className="enc-card-emoji">{entry.emoji}</span>
      <span className={`enc-card-badge enc-card-badge--${entry.type}`}>
        {entry.type === 'gigante' ? '👑 Gigante' : '😄 Cabezudo'}
      </span>
    </div>

    {/* Card body */}
    <div className="enc-card-body">
      <h3 className="enc-card-name">{entry.name}</h3>
      <p className="enc-card-year">
        <FaClock style={{ marginRight: 4 }} />
        Desde {entry.year} · {entry.creator}
      </p>
      <p className="enc-card-origin">
        <FaMapMarkerAlt style={{ marginRight: 4 }} />
        {entry.origin}
      </p>

      {/* Color dots */}
      <div className="enc-card-colors">
        {entry.colors.map(c => (
          <div
            key={c.hex}
            className="enc-color-dot"
            style={{ backgroundColor: c.hex }}
            title={c.name}
          />
        ))}
      </div>

      {/* Giant-only stats */}
      {entry.type === 'gigante' && (
        <div className="enc-card-stats">
          {entry.height && (
            <span><FaRuler /> {entry.height}m</span>
          )}
          {entry.weight && (
            <span><FaWeight /> {entry.weight}kg</span>
          )}
        </div>
      )}
    </div>
  </motion.div>
);

// ─── Modal content ─────────────────────────────────────────────

interface DetailModalProps {
  entry: EnciclopediaEntry;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

const DetailModal: React.FC<DetailModalProps> = ({
  entry,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) => {
  const [activeTab, setActiveTab] = useState<'historia' | 'personalidad' | 'curiosidades' | 'copla'>('historia');

  return (
    <motion.div
      className="enc-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="enc-modal"
        initial={{ scale: 0.85, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="enc-modal-header" style={{ background: entry.imageBg }}>
          <button className="enc-modal-close" onClick={onClose}>
            <FaTimes />
          </button>

          {/* Nav arrows */}
          <button
            className="enc-modal-nav enc-modal-nav--prev"
            onClick={onPrev}
            disabled={!hasPrev}
          >
            <FaChevronLeft />
          </button>
          <button
            className="enc-modal-nav enc-modal-nav--next"
            onClick={onNext}
            disabled={!hasNext}
          >
            <FaChevronRight />
          </button>

          <div className="enc-modal-hero">
            <span className="enc-modal-emoji">{entry.emoji}</span>
            <div>
              <span className={`enc-card-badge enc-card-badge--${entry.type}`}>
                {entry.type === 'gigante' ? '👑 Gigante Municipal' : '😄 Cabezudo Municipal'}
              </span>
              <span className="enc-modal-placeholder-badge">Imagen ilustrativa</span>
              <h2 className="enc-modal-title">{entry.name}</h2>
              <p className="enc-modal-subtitle">
                {entry.origin} · Desde {entry.year}
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="enc-modal-stats">
          <div className="enc-stat">
            <FaClock />
            <span>{entry.year}</span>
            <small>Año</small>
          </div>
          <div className="enc-stat">
            <FaUsers />
            <span style={{ fontSize: '0.75rem' }}>{entry.creator}</span>
            <small>Creador</small>
          </div>
          {entry.type === 'gigante' && entry.height && (
            <div className="enc-stat">
              <FaRuler />
              <span>{entry.height}m</span>
              <small>Altura</small>
            </div>
          )}
          {entry.type === 'gigante' && entry.weight && (
            <div className="enc-stat">
              <FaWeight />
              <span>{entry.weight}kg</span>
              <small>Peso</small>
            </div>
          )}
          <div className="enc-stat">
            <FaPalette />
            <div className="enc-stat-colors">
              {entry.colors.map(c => (
                <div key={c.hex} className="enc-stat-color-dot" style={{ backgroundColor: c.hex }} title={c.name} />
              ))}
            </div>
            <small>Colores</small>
          </div>
        </div>

        {/* Tabs */}
        <div className="enc-modal-tabs">
          {(['historia', 'personalidad', 'curiosidades', 'copla'] as const).map(tab => (
            <button
              key={tab}
              className={`enc-tab ${activeTab === tab ? 'enc-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'historia' && <FaBookOpen />}
              {tab === 'personalidad' && <FaStar />}
              {tab === 'curiosidades' && <FaLightbulb />}
              {tab === 'copla' && '🎵'}
<span style={{ textTransform: 'capitalize' }}>{tab}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="enc-modal-body">
          <AnimatePresence mode="wait">
            {activeTab === 'historia' && (
              <motion.div
                key="historia"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="enc-tab-content"
              >
                <div className="enc-section-header">
                  <FaBookOpen className="enc-section-icon" />
                  <h3>Historia</h3>
                </div>
                <div className="enc-origin-badge">
                  <FaMapMarkerAlt /> {entry.origin}
                </div>
                {entry.history.split('\n\n').map((p, i) => (
                  <p key={i} className="enc-paragraph">{p}</p>
                ))}
              </motion.div>
            )}

            {activeTab === 'personalidad' && (
              <motion.div
                key="personalidad"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="enc-tab-content"
              >
                <div className="enc-section-header">
                  <FaStar className="enc-section-icon" />
                  <h3>Personalidad</h3>
                </div>
                <p className="enc-paragraph">{entry.personality}</p>

                <div className="enc-section-header" style={{ marginTop: '1.5rem' }}>
                  <FaPalette className="enc-section-icon" />
                  <h3>Colores predominantes</h3>
                </div>
                <div className="enc-colors-grid">
                  {entry.colors.map(c => (
                    <div key={c.hex} className="enc-color-item">
                      <div className="enc-color-swatch" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                      <code>{c.hex}</code>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'curiosidades' && (
              <motion.div
                key="curiosidades"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="enc-tab-content"
              >
                <div className="enc-section-header">
                  <FaLightbulb className="enc-section-icon" />
                  <h3>Curiosidades</h3>
                </div>
                <ul className="enc-curiosidades">
                  {entry.curiosities.map((c, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="enc-curiosidad-item"
                    >
                      <span className="enc-curiosidad-num">{i + 1}</span>
                      <span>{c}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}

            {activeTab === 'copla' && (
              <motion.div
                key="copla"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="enc-tab-content"
              >
                <div className="enc-section-header">
                  <span className="enc-section-icon">🎵</span>
                  <h3>Copla Tradicional</h3>
                </div>
                {entry.copla ? (
                  <blockquote className="enc-copla">
                    {entry.copla.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < entry.copla!.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </blockquote>
                ) : (
                  <p className="enc-paragraph" style={{ fontStyle: 'italic', opacity: 0.6 }}>
                    La copla tradicional de este personaje no está documentada.
                  </p>
                )}
              </motion.div>
            )}


          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────

export const Enciclopedia: React.FC = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [barrioFilter, setBarrioFilter] = useState<string>('todos');

  const barriosOptions = useMemo(() => barrioComparsas.map((b) => ({ id: b.id, label: b.name })), []);






  const [selectedId, setSelectedId] = useState<string | null>(null);

  const barrioPersonajes = useMemo(() => {
    const barrio = barrioComparsas.find((b) => b.id === barrioFilter);
    if (!barrio || barrioFilter === 'todos') return null;
    return barrio.personajes;
  }, [barrioFilter]);

  const filtered = useMemo(() => {
    // Si NO hay barrio seleccionado, usamos enciclopediaData (municipal)
    if (barrioFilter === 'todos' || !barrioPersonajes) {
      return enciclopediaData.filter(e => {
        const matchType = typeFilter === 'todos' || e.type === typeFilter;

        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.origin.toLowerCase().includes(q) ||
          e.history.toLowerCase().includes(q);

        return matchType && matchSearch;
      });
    }

    // Si SÍ hay barrio seleccionado, usamos los personajes de barrioComparsasData
    const q = search.toLowerCase();
    const matchSearch = (p: { name: string; description: string }) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    };

    const list = barrioPersonajes
      .filter(p => typeFilter === 'todos' || p.type === typeFilter)
      .filter(p => matchSearch(p));

    // Convertimos a EnciclopediaEntry “compatible” (para que el resto del UI funcione)
    return list.map(p => {
      const bg = `linear-gradient(135deg, ${p.color}, rgba(255,255,255,0.15), rgba(0,0,0,0.25))`;
      return {
        id: `${barrioFilter}-${p.id}`,
        name: p.name,
        type: p.type,
        emoji: p.emoji,
        year: p.year,
        creator: barrioComparsas.find(b => b.id === barrioFilter)?.asociacion ?? '',
        origin: barrioComparsas.find(b => b.id === barrioFilter)?.name ?? '',
        history: p.description,
        personality: p.description,
        curiosities: [],
        copla: p.copla,
        colors: [{ name: p.name, hex: p.color }],
        imageBg: bg,
        relatedRouteId: undefined,
        height: p.type === 'gigante' ? undefined : undefined,
        weight: p.type === 'gigante' ? undefined : undefined,
      } satisfies EnciclopediaEntry;
    });
  }, [search, typeFilter, barrioFilter, barrioPersonajes]);


  // Busca en el array filtrado (que incluye tanto municipales como de barrio)
  const selectedEntry = filtered.find(e => e.id === selectedId) ?? null;
  const selectedIndex = filtered.findIndex(e => e.id === selectedId);

  const filteredCabezudosCount = useMemo(
    () => filtered.filter(e => e.type === 'cabezudo').length,
    [filtered]
  );
  const filteredGigantesCount = useMemo(
    () => filtered.filter(e => e.type === 'gigante').length,
    [filtered]
  );


  const handlePrev = () => {
    if (selectedIndex > 0) setSelectedId(filtered[selectedIndex - 1].id);
  };
  const handleNext = () => {
    if (selectedIndex < filtered.length - 1) setSelectedId(filtered[selectedIndex + 1].id);
  };

  return (
    <div className="enc-page">

      {/* ── Hero Banner ─────────────────────────── */}
      <motion.div
        className="enc-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="enc-hero-inner">
          <div className="enc-hero-badge">
            <FaBookOpen /> Enciclopedia
          </div>
          <h1 className="enc-hero-title">Gigantes y Cabezudos</h1>
          <p className="enc-hero-subtitle">
            Fichas completas de los {filteredCabezudosCount} cabezudos y {filteredGigantesCount} gigantes
            de la Comparsa Municipal de Zaragoza
          </p>


          {/* Search */}
          <div className="enc-search-wrapper">
            <FaSearch className="enc-search-icon" />
            <input
              className="enc-search"
              type="text"
              placeholder="Buscar personaje, origen, historia…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="enc-search-clear" onClick={() => setSearch('')}>
                <FaTimes />
              </button>
            )}
          </div>

          {/* Type filters */}
          <div className="enc-type-filters">

            {/* Barrio filter (solo visual, muestra cabezudos del barrio) */}
            {barrioFilter !== 'todos' && (
              <div style={{ width: '100%', marginTop: '0.75rem', textAlign: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, opacity: 0.9 }}>
                  Filtrando por barrio: {barrioComparsas.find((b) => b.id === barrioFilter)?.name ?? barrioFilter}
                </span>
              </div>
            )}

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
              <select
                value={barrioFilter}
                onChange={(e) => {
                  setBarrioFilter(e.target.value);
                  // si elige un barrio, forzamos a mostrar cabezudos (lo que se pidió)
                  setTypeFilter('cabezudo');
                  setSelectedId(null);
                }}
                style={{
                  width: 'min(520px, 100%)',
                  padding: '0.7rem 1rem',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'linear-gradient(180deg, rgba(170, 20, 30, 0.75), rgba(110, 10, 18, 0.65))',
                  color: '#fff',
                  fontWeight: 800,
                  backdropFilter: 'blur(8px)',
                  outline: 'none',
                  boxShadow: '0 10px 30px rgba(139, 0, 0, 0.20)',
                }}
              >
                <option value="todos" style={{ color: '#fff', backgroundColor: '#6e0a12' }}>Todos los barrios</option>
                {barriosOptions.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    style={{ color: '#fff', backgroundColor: '#6e0a12' }}
                  >
                    {b.label}
                  </option>
                ))}
              </select>

            </div>
            {([['todos', '🎭 Todos', ''], ['cabezudo', '😄 Cabezudos', `${filteredCabezudosCount}`], ['gigante', '👑 Gigantes', `${filteredGigantesCount}`]] as const).map(

              ([val, label, count]) => (
                <motion.button
                  key={val}
                  className={`enc-type-btn ${typeFilter === val ? 'enc-type-btn--active' : ''}`}
                  onClick={() => setTypeFilter(val)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {label}
                  {count && <span className="enc-type-count">{count}</span>}
                </motion.button>
              )
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stats bar ────────────────────────────── */}
      <div className="enc-stats-bar">
          <div className="enc-stats-item">
          <FaChild />
          <span>{filteredCabezudosCount} Cabezudos</span>
        </div>

        <div className="enc-divider" />
        <div className="enc-stats-item">
          <FaUsers />
          <span>{filteredGigantesCount} Gigantes</span>
        </div>

        <div className="enc-divider" />
        <div className="enc-stats-item">
          <FaSearch />
          <span>{filtered.length} resultados</span>
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────── */}
      <div className="enc-content">
        {/* Cabezudos section */}
        {(typeFilter === 'todos' || typeFilter === 'cabezudo') && (
          <section className="enc-section">
            <motion.div
              className="enc-section-title-row"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="enc-section-emoji">😄</span>
              <h2>Cabezudos Municipales</h2>
            <span className="enc-section-count">{filteredCabezudosCount}</span>

            </motion.div>

            <motion.div className="enc-grid" layout>
              <AnimatePresence>
                {filtered
                  .filter(e => e.type === 'cabezudo')
                  .map(entry => (
                    <CharacterCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => setSelectedId(entry.id)}
                    />
                  ))}
              </AnimatePresence>
            </motion.div>
          </section>
        )}

        {/* Gigantes section */}
        {(typeFilter === 'todos' || typeFilter === 'gigante') && (
          <section className="enc-section">
            <motion.div
              className="enc-section-title-row"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="enc-section-emoji">👑</span>
              <h2>Gigantes Municipales</h2>
              <span className="enc-section-count">{filteredGigantesCount}</span>

            </motion.div>

            <motion.div className="enc-grid" layout>
              <AnimatePresence>
                {filtered
                  .filter(e => e.type === 'gigante')
                  .map(entry => (
                    <CharacterCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => setSelectedId(entry.id)}
                    />
                  ))}
              </AnimatePresence>
            </motion.div>
          </section>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            className="enc-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="enc-empty-emoji">🔍</span>
            <h3>Sin resultados</h3>
            <p>No se encontró ningún personaje con «{search}»</p>
            <button className="enc-empty-btn" onClick={() => { setSearch(''); setTypeFilter('todos'); }}>
              Limpiar filtros
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────── */}
      <AnimatePresence>
        {selectedEntry && (
          <DetailModal
            entry={selectedEntry}
            onClose={() => setSelectedId(null)}
            onPrev={handlePrev}
            onNext={handleNext}
            hasPrev={selectedIndex > 0}
            hasNext={selectedIndex < filtered.length - 1}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
