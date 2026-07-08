import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { comparsaMembers } from '../data/comparsaData';
import type { ComparsaMember } from '../data/comparsaData';
import { useAppStore } from '../hooks/store';
import { FaHeart, FaRegHeart, FaSearch, FaVolumeUp, FaVolumeMute, FaChevronRight } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/comparsa.css';

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
      setSpeakingId(null);
      // Feedback integrado (sin alert): el botón solo cambia estado si el navegador lo soporta.
    }
  };

  return (
    <div className="comparsa-page layout-container">

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
