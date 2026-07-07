import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { comparsaMembers } from '../data/comparsaData';
import type { ComparsaMember } from '../data/comparsaData';
import { useAppStore } from '../hooks/store';
import { FaHeart, FaRegHeart, FaSearch, FaVolumeUp, FaVolumeMute, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export const Comparsa: React.FC = () => {
  const { favorites, toggleFavorite } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'gigante' | 'cabezudo'>('todos');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Filter members based on tab and search query
  const filteredMembers = comparsaMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.creator.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'todos' || member.type === activeTab;
    
    return matchesSearch && matchesTab;
  });

  // Audio Voice Synth feature
  const speakCharacter = (member: ComparsaMember) => {
    if ('speechSynthesis' in window) {
      if (speakingId === member.id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }

      window.speechSynthesis.cancel(); // Stop anything playing
      
      const textToSpeak = member.type === 'cabezudo' && member.copla
        ? `Cantaré mi copla. ${member.copla}`
        : `${member.name}. Creado en el año ${member.year} por ${member.creator}. ${member.description}`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'es-ES';
      
      utterance.onend = () => {
        setSpeakingId(null);
      };
      
      utterance.onerror = () => {
        setSpeakingId(null);
      };

      setSpeakingId(member.id);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("La síntesis de voz no está soportada en tu navegador.");
    }
  };

  return (
    <div className="comparsa-page layout-container">
      <style>{`
        .search-filter-bar {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: var(--shadow-sm);
        }
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 16px;
          color: hsl(var(--color-text-secondary));
        }
        .search-input {
          width: 100%;
          padding: 12px 12px 12px 48px;
          border-radius: var(--border-radius-sm);
          border: 1px solid hsl(var(--color-border));
          background: hsl(var(--color-bg-secondary));
          color: hsl(var(--color-text-primary));
          font-family: var(--font-family);
          font-size: 1rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }
        .search-input:focus {
          border-color: hsl(var(--color-primary));
        }
        .tabs {
          display: flex;
          background: hsl(var(--color-bg-secondary));
          padding: 4px;
          border-radius: var(--border-radius-sm);
          border: 1px solid hsl(var(--color-border));
        }
        .tab-btn {
          flex: 1;
          padding: 10px;
          text-align: center;
          font-weight: 600;
          font-size: 0.9rem;
          border-radius: calc(var(--border-radius-sm) - 2px);
          color: hsl(var(--color-text-secondary));
          transition: all var(--transition-fast);
        }
        .tab-btn.active {
          background: hsl(var(--color-bg-card));
          color: hsl(var(--color-primary));
          box-shadow: var(--shadow-sm);
        }
        .grid-comparsa {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .character-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-normal);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .character-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 6px;
        }
        .card-top {
          padding: 24px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          background: linear-gradient(180deg, hsla(var(--color-border), 0.15) 0%, transparent 100%);
        }
        .card-emoji {
          width: 64px;
          height: 64px;
          background: hsl(var(--color-bg-secondary));
          border-radius: var(--border-radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
          border: 2px solid;
        }
        .card-meta {
          flex: 1;
        }
        .card-meta h3 {
          font-size: 1.15rem;
          margin-bottom: 2px;
        }
        .badge-type {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge-gigante {
          background: rgba(212, 175, 55, 0.15);
          color: #b89620;
        }
        .badge-cabezudo {
          background: rgba(209, 18, 31, 0.1);
          color: hsl(var(--brand-red));
        }
        .card-body {
          padding: 0 20px 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .card-desc {
          font-size: 0.88rem;
          color: hsl(var(--color-text-secondary));
          line-height: 1.5;
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          border-top: 1px solid hsl(var(--color-border));
          padding-top: 14px;
        }
        .circle-action {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-text-primary));
          transition: all var(--transition-fast);
        }
        .circle-action:hover {
          transform: scale(1.08);
          background: hsl(var(--color-border));
        }
        .circle-action.fav-active {
          background: rgba(209, 18, 31, 0.15);
          color: hsl(var(--brand-red));
          border-color: rgba(209, 18, 31, 0.3);
        }
        .circle-action.audio-active {
          background: rgba(255, 215, 0, 0.2);
          color: #d4af37;
          border-color: #d4af37;
          animation: audioPulse 1.5s infinite;
        }
        @keyframes audioPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .btn-detail {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85rem;
          font-weight: 700;
          color: hsl(var(--color-primary));
        }
        .btn-detail:hover {
          color: hsl(var(--color-secondary));
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          color: hsl(var(--color-text-secondary));
        }
      `}</style>

      {/* Header Info */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>La Comparsa</h1>
        <p style={{ color: 'hsl(var(--color-text-secondary))', fontSize: '0.95rem' }}>
          Conoce a los 14 Gigantes y 11 Cabezudos históricos que alegran las calles de Zaragoza.
        </p>
      </div>

      {/* Search and Filters Layout */}
      <section className="search-filter-bar">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre, historia, creador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
            onClick={() => setActiveTab('todos')}
          >
            Todos
          </button>
          <button 
            className={`tab-btn ${activeTab === 'gigante' ? 'active' : ''}`}
            onClick={() => setActiveTab('gigante')}
          >
            Gigantes
          </button>
          <button 
            className={`tab-btn ${activeTab === 'cabezudo' ? 'active' : ''}`}
            onClick={() => setActiveTab('cabezudo')}
          >
            Cabezudos
          </button>
        </div>
      </section>

      {/* Grid of Characters */}
      <motion.section 
        className="grid-comparsa"
        layout
      >
        <AnimatePresence mode="popLayout">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => {
              const isFav = favorites.includes(member.id);
              const isSpeaking = speakingId === member.id;
              
              return (
                <motion.article 
                  key={member.id}
                  className="character-card"
                  style={{ '--border-color': member.iconColor } as React.CSSProperties}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <style>{`
                    .character-card[style*="${member.iconColor}"]::before {
                      background-color: ${member.iconColor};
                    }
                  `}</style>
                  
                  <div className="card-top">
                    <div 
                      className="card-emoji" 
                      style={{ borderColor: member.iconColor, background: `${member.iconColor}15` }}
                    >
                      {member.imagePlaceholder}
                    </div>
                    <div className="card-meta">
                      <h3>{member.name}</h3>
                      <span className={`badge-type badge-${member.type}`}>
                        {member.type} • {member.year}
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    <p className="card-desc">{member.description} {member.history}</p>
                    
                    <div className="card-actions">
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Audio Speak button */}
                        <button 
                          className={`circle-action ${isSpeaking ? 'audio-active' : ''}`}
                          onClick={() => speakCharacter(member)}
                          title="Escuchar descripción/copla"
                          aria-label="Escuchar descripción"
                        >
                          {isSpeaking ? <FaVolumeMute /> : <FaVolumeUp />}
                        </button>
                        
                        {/* Favorite button */}
                        <button 
                          className={`circle-action ${isFav ? 'fav-active' : ''}`}
                          onClick={() => toggleFavorite(member.id)}
                          title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
                          aria-label="Añadir a favoritos"
                        >
                          {isFav ? <FaHeart /> : <FaRegHeart />}
                        </button>
                      </div>

                      <Link to={`/personaje/${member.id}`} className="btn-detail">
                        <span>Ficha</span>
                        <FaChevronRight size={10} />
                      </Link>
                    </div>
                  </div>
                </motion.article>
              );
            })
          ) : (
            <motion.div 
              className="empty-state"
              style={{ gridColumn: '1 / -1' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No se encontraron personajes que coincidan con la búsqueda.
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
};
