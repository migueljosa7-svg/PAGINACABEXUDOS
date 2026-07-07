import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { comparsaMembers } from '../data/comparsaData';
import { useAppStore } from '../hooks/store';
import { FaArrowLeft, FaHeart, FaRegHeart, FaVolumeUp, FaVolumeMute, FaCalendar, FaUser, FaWeightHanging, FaRulerVertical, FaQuoteLeft } from 'react-icons/fa';
import { motion } from 'framer-motion';

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

      const text = member.type === 'cabezudo' && member.copla
        ? `${member.name}. Copla tradicional: ${member.copla}. Historia: ${member.history}`
        : `${member.name}. Historia: ${member.history}. Descripción física: ${member.description}`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Tu navegador no soporta síntesis de voz.");
    }
  };

  return (
    <div className="detail-page layout-container">
      <style>{`
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          color: hsl(var(--color-text-secondary));
          margin-bottom: 20px;
          transition: color var(--transition-fast);
        }
        .back-btn:hover {
          color: hsl(var(--color-primary));
        }
        .detail-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-md);
          margin-bottom: 30px;
        }
        .detail-hero {
          position: relative;
          padding: 40px 24px;
          text-align: center;
          color: white;
          overflow: hidden;
          background: linear-gradient(135deg, hsl(var(--color-bg-secondary)) 0%, hsl(var(--color-bg-base)) 100%);
        }
        .detail-hero-bg {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0.15;
          z-index: 1;
        }
        .detail-emoji-container {
          position: relative;
          z-index: 2;
          width: 100px;
          height: 100px;
          margin: 0 auto 16px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          box-shadow: var(--shadow-md);
          border: 4px solid;
        }
        .detail-title-block {
          position: relative;
          z-index: 2;
        }
        .detail-title-block h1 {
          font-size: 2.2rem;
          margin-bottom: 8px;
          color: hsl(var(--color-text-primary));
        }
        .detail-badges {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .detail-hero-actions {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          gap: 12px;
        }
        .hero-action-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-text-primary));
          box-shadow: var(--shadow-sm);
          font-size: 1.25rem;
          transition: all var(--transition-fast);
        }
        .hero-action-circle:hover {
          transform: scale(1.08);
          background: hsl(var(--color-bg-secondary));
        }
        .hero-action-circle.fav-active {
          color: hsl(var(--brand-red));
          background: rgba(209, 18, 31, 0.08);
          border-color: rgba(209, 18, 31, 0.3);
        }
        .hero-action-circle.speaking-active {
          color: #d4af37;
          background: rgba(255, 215, 0, 0.1);
          border-color: #d4af37;
          animation: speakPulse 1.5s infinite;
        }
        @keyframes speakPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .detail-content {
          padding: 30px;
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
        }
        .history-section h2 {
          font-size: 1.4rem;
          margin-bottom: 16px;
          border-bottom: 2px solid hsl(var(--color-border));
          padding-bottom: 8px;
        }
        .history-section p {
          font-size: 1rem;
          line-height: 1.7;
          color: hsl(var(--color-text-primary));
          margin-bottom: 20px;
        }
        .spec-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .spec-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .spec-icon {
          font-size: 1.5rem;
          color: hsl(var(--color-primary));
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: hsl(var(--color-bg-card));
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid hsl(var(--color-border));
        }
        .spec-info h4 {
          font-size: 0.8rem;
          color: hsl(var(--color-text-secondary));
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .spec-info p {
          font-size: 1rem;
          font-weight: 700;
          color: hsl(var(--color-text-primary));
        }
        .copla-quote {
          background: linear-gradient(135deg, hsla(var(--color-primary), 0.05) 0%, hsla(var(--color-secondary), 0.05) 100%);
          border-left: 5px solid hsl(var(--color-primary));
          border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0;
          padding: 24px;
          margin-bottom: 24px;
          position: relative;
        }
        .copla-quote svg {
          position: absolute;
          top: 16px; left: 16px;
          font-size: 3rem;
          color: hsla(var(--color-primary), 0.08);
        }
        .copla-text {
          font-size: 1.1rem;
          font-style: italic;
          font-weight: 600;
          line-height: 1.6;
          position: relative;
          z-index: 2;
          padding-left: 20px;
          color: hsl(var(--color-text-primary));
        }
        .related-section {
          margin-top: 20px;
        }
        .related-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 16px;
        }
        .related-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          text-align: center;
          display: block;
          transition: all var(--transition-fast);
        }
        .related-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-sm);
          border-color: hsl(var(--color-primary));
        }
        .related-emoji {
          font-size: 2rem;
          margin-bottom: 8px;
        }
        .related-name {
          font-weight: 700;
          font-size: 0.9rem;
          color: hsl(var(--color-text-primary));
        }
        @media (max-width: 768px) {
          .detail-content {
            grid-template-columns: 1fr;
            padding: 20px;
            gap: 20px;
          }
          .detail-title-block h1 {
            font-size: 1.8rem;
          }
          .related-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

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
            {member.type === 'cabezudo' && member.copla && (
              <div className="copla-quote">
                <FaQuoteLeft />
                <div className="copla-text">
                  "{member.copla}"
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
