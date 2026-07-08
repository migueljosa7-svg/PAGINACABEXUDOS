import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { comparsaMembers } from '../data/comparsaData';
import { coplasById } from '../data/coplasById';
import { useAppStore } from '../hooks/store';
import { FaArrowLeft, FaHeart, FaRegHeart, FaVolumeUp, FaVolumeMute, FaCalendar, FaUser, FaWeightHanging, FaRulerVertical, FaQuoteLeft } from 'react-icons/fa';
import { motion } from 'framer-motion';
import '../styles/detail.css';

export const Detail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { favorites, toggleFavorite } = useAppStore();
  const [speaking, setSpeaking] = useState(false);

  const member = comparsaMembers.find(m => m.id === id);

  const related = useMemo(() => {
    if (!member) {
      return [];
    }
    return comparsaMembers
      .filter((candidate) => candidate.type === member.type && candidate.id !== member.id)
      .slice(0, 3);
  }, [member]);

  // Stop reading if character changes
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [id]);

  if (!member) {
    return (
      <div className="layout-container text-center" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <h2>Personaje no encontrado</h2>
        <p style={{ margin: '16px 0', color: 'hsl(var(--color-text-secondary))' }}>
          Lo sentimos, el personaje que buscas no existe en nuestra comparsa actual.
        </p>
        <button className="btn-primary" onClick={() => navigate('/comparsa')}>
          Volver a la Comparsa
        </button>
      </div>
    );
  }

  const isFav = favorites.includes(member.id);

  const speakCharacter = () => {
    if ('speechSynthesis' in window) {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }

      const unifiedCopla = member.type === 'cabezudo' ? coplasById[member.id] : undefined;
      const text = member.type === 'cabezudo' && unifiedCopla
        ? `${member.name}. Copla tradicional: ${unifiedCopla}. Historia: ${member.history}`
        : `${member.name}. Historia: ${member.history}. Descripción física: ${member.description}`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeaking(false);
    }
  };

  return (
    <div className="detail-page layout-container">
      {/* Back to index link */}
      <button onClick={() => navigate(-1)} className="back-btn">
        <FaArrowLeft />
        <span>Volver</span>
      </button>

      {/* Main card */}
      <motion.article 
        className="detail-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Top Hero header */}
        <div className="detail-hero">
          <div 
            className="detail-hero-bg" 
            style={{ 
              background: `radial-gradient(circle, ${member.iconColor} 0%, transparent 80%)`,
            }} 
          />
          
          <div 
            className="detail-emoji-container"
            style={{ 
              borderColor: member.iconColor, 
              color: member.iconColor 
            }}
          >
            {member.imagePlaceholder}
          </div>

          <div className="detail-title-block">
            <h1>{member.name}</h1>
            <div className="detail-badges">
              <span className={`badge-type badge-${member.type}`}>{member.type}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>•</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--color-text-secondary))' }}>
                Año {member.year}
              </span>
            </div>
          </div>

          <div className="detail-hero-actions">
            <button 
              className={`hero-action-circle ${speaking ? 'speaking-active' : ''}`}
              onClick={speakCharacter}
              title="Escuchar historia del personaje"
              aria-label="Escuchar historia"
            >
              {speaking ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            
            <button 
              className={`hero-action-circle ${isFav ? 'fav-active' : ''}`}
              onClick={() => toggleFavorite(member.id)}
              title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
              aria-label="Añadir a favoritos"
            >
              {isFav ? <FaHeart /> : <FaRegHeart />}
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="detail-content">
          
          {/* Main Info */}
          <div className="history-section">
            
            {/* Copla (if cabezudo) */}
            {member.type === 'cabezudo' && coplasById[member.id] && (
              <div className="copla-quote">
                <FaQuoteLeft />
                <div className="copla-text">
                  "{coplasById[member.id]}"
                </div>
              </div>
            )}

            <h2>Historia y Leyenda</h2>
            <p>{member.history}</p>

            <h2>Aspecto y Vestimenta</h2>
            <p>{member.description}</p>
          </div>

          {/* Specifications list (sidebar) */}
          <div className="spec-section">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Ficha Técnica</h3>
            <div className="spec-list">
              <div className="spec-card">
                <div className="spec-icon"><FaUser /></div>
                <div className="spec-info">
                  <h4>Creador original</h4>
                  <p>{member.creator}</p>
                </div>
              </div>
              
              <div className="spec-card">
                <div className="spec-icon"><FaCalendar /></div>
                <div className="spec-info">
                  <h4>Año de creación</h4>
                  <p>{member.year}</p>
                </div>
              </div>

              {member.height && (
                <div className="spec-card">
                  <div className="spec-icon"><FaRulerVertical /></div>
                  <div className="spec-info">
                    <h4>Altura aproximada</h4>
                    <p>{member.height} metros</p>
                  </div>
                </div>
              )}

              {member.weight && (
                <div className="spec-card">
                  <div className="spec-icon"><FaWeightHanging /></div>
                  <div className="spec-info">
                    <h4>Peso aproximado</h4>
                    <p>{member.weight} kg</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </motion.article>

      {/* Related section */}
      <section className="related-section">
        <h3 style={{ fontSize: '1.2rem', borderBottom: '1px solid hsl(var(--color-border))', paddingBottom: '8px' }}>
          Otros {member.type === 'gigante' ? 'Gigantes' : 'Cabezudos'} Relacionados
        </h3>
        
        <div className="related-grid">
          {related.map((rel) => (
            <Link 
              key={rel.id} 
              to={`/personaje/${rel.id}`} 
              className="related-card"
            >
              <div className="related-emoji">{rel.imagePlaceholder}</div>
              <div className="related-name">{rel.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-secondary))', marginTop: '2px' }}>
                {rel.year}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};