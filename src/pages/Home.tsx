import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { comparsaMembers, comparsaMembers as members } from '../data/comparsaData';
import { FaCrown, FaMapMarkerAlt, FaGamepad, FaCalendarAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';

export const Home: React.FC = () => {
  // Mini-game state: Guess the Cabezudo by its copla
  const cabezudos = members.filter(m => m.type === 'cabezudo');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Generate quiz options
  const currentQuizItem = cabezudos[currentQuizIndex % cabezudos.length];
  // Select 3 random incorrect options + the correct one
  const getOptions = () => {
    const incorrect = cabezudos.filter(c => c.id !== currentQuizItem.id);
    const shuffledIncorrect = [...incorrect].sort(() => 0.5 - Math.random());
    const options = [currentQuizItem, shuffledIncorrect[0], shuffledIncorrect[1], shuffledIncorrect[2]];
    return options.sort(() => 0.5 - Math.random());
  };

  const [options, setOptions] = useState<typeof cabezudos>(() => getOptions());

  const handleQuizAnswer = (id: string) => {
    setSelectedOption(id);
    setShowAnswer(true);
    if (id === currentQuizItem.id) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuiz = () => {
    setCurrentQuizIndex(prev => prev + 1);
    setSelectedOption(null);
    setShowAnswer(false);
    // Force recalculate options for the next index
    const nextItem = cabezudos[(currentQuizIndex + 1) % cabezudos.length];
    const incorrect = cabezudos.filter(c => c.id !== nextItem.id);
    const shuffledIncorrect = [...incorrect].sort(() => 0.5 - Math.random());
    const nextOptions = [nextItem, shuffledIncorrect[0], shuffledIncorrect[1], shuffledIncorrect[2]];
    setOptions(nextOptions.sort(() => 0.5 - Math.random()));
  };

  // Featured character of the day (stable based on day of month)
  const dayOfMonth = new Date().getDate();
  const featuredIndex = dayOfMonth % comparsaMembers.length;
  const featured = comparsaMembers[featuredIndex];

  return (
    <div className="home-page layout-container">
      <style>{`
        .hero-banner {
          background: linear-gradient(135deg, hsl(var(--brand-garnet)) 0%, hsl(var(--brand-red)) 50%, hsl(var(--brand-gold)) 100%);
          border-radius: var(--border-radius-lg);
          padding: 40px 24px;
          color: white;
          text-align: center;
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
          margin-bottom: 30px;
        }
        .hero-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle, transparent 20%, rgba(0,0,0,0.4) 100%);
        }
        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 700px;
          margin: 0 auto;
        }
        .hero-tagline {
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 700;
          color: hsl(var(--brand-gold));
          margin-bottom: 12px;
        }
        .hero-title {
          font-size: 2.2rem;
          font-weight: 900;
          line-height: 1.2;
          margin-bottom: 16px;
        }
        .hero-desc {
          font-size: 1.05rem;
          opacity: 0.9;
          margin-bottom: 24px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 35px;
        }
        .stat-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          text-align: center;
          box-shadow: var(--shadow-sm);
        }
        .stat-num {
          font-size: 1.8rem;
          font-weight: 800;
          color: hsl(var(--color-primary));
        }
        .stat-label {
          font-size: 0.8rem;
          color: hsl(var(--color-text-secondary));
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 4px;
          font-weight: 600;
        }
        .section-title {
          font-size: 1.5rem;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: hsl(var(--color-border));
        }
        .section-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 30px;
        }
        .featured-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          position: relative;
        }
        .featured-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .featured-avatar {
          width: 60px;
          height: 60px;
          background: hsl(var(--color-bg-secondary));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          box-shadow: var(--shadow-sm);
          border: 2px solid;
        }
        .featured-meta h3 {
          font-size: 1.25rem;
        }
        .featured-meta span {
          font-size: 0.85rem;
          color: hsl(var(--color-text-secondary));
        }
        .featured-text {
          font-size: 0.95rem;
          line-height: 1.6;
          color: hsl(var(--color-text-secondary));
          margin-bottom: 20px;
        }
        .quiz-card {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
        }
        .quiz-copla {
          background: hsl(var(--color-bg-secondary));
          border-left: 4px solid hsl(var(--color-primary));
          padding: 16px;
          font-style: italic;
          border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;
          margin-bottom: 20px;
          font-size: 0.95rem;
          line-height: 1.6;
          color: hsl(var(--color-text-primary));
        }
        .quiz-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .quiz-opt-btn {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          padding: 12px;
          border-radius: var(--border-radius-sm);
          font-weight: 600;
          font-size: 0.9rem;
          transition: all var(--transition-fast);
          color: hsl(var(--color-text-primary));
        }
        .quiz-opt-btn:not(:disabled):hover {
          background: hsl(var(--color-border));
          transform: translateY(-1px);
        }
        .quiz-opt-btn.correct {
          background: rgba(46, 125, 50, 0.2);
          border-color: #2e7d32;
          color: #2e7d32;
        }
        .quiz-opt-btn.wrong {
          background: rgba(211, 47, 47, 0.2);
          border-color: #d32f2f;
          color: #d32f2f;
        }
        .quiz-result {
          text-align: center;
          margin-top: 12px;
          padding: 12px;
          background: hsl(var(--color-bg-secondary));
          border-radius: var(--border-radius-sm);
        }
        .quiz-score-badge {
          align-self: flex-end;
          background: hsl(var(--color-primary));
          color: white;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          margin-bottom: 12px;
        }
        @media (max-width: 768px) {
          .hero-banner {
            padding: 30px 16px;
            margin-bottom: 20px;
          }
          .hero-title {
            font-size: 1.65rem;
          }
          .hero-desc {
            font-size: 0.95rem;
          }
          .stat-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
          }
          .section-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .quiz-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Hero Banner */}
      <motion.section 
        className="hero-banner"
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-tagline">Comparsa de Zaragoza</div>
          <h1 className="hero-title">¡Sigue el Latido de la Ciudad!</h1>
          <p className="hero-desc">
            Bienvenido al portal oficial de los Gigantes y Cabezudos. Explora sus leyendas, consulta los horarios y localiza a la comparsa en tiempo real por el Casco Histórico.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/recorridos" className="btn-primary">
              <FaMapMarkerAlt />
              <span>Ver Mapa en Vivo</span>
            </Link>
            <Link to="/comparsa" className="btn-secondary">
              <FaCrown />
              <span>Explorar Comparsa</span>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Statistics counters */}
      <motion.section 
        className="stat-grid"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="stat-card">
          <div className="stat-num">14</div>
          <div className="stat-label">Gigantes</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">11</div>
          <div className="stat-label">Cabezudos</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">3</div>
          <div className="stat-label">Recorridos</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">185</div>
          <div className="stat-label">Años de Tradición</div>
        </div>
      </motion.section>

      {/* Dynamic contents section */}
      <div className="section-grid">
        
        {/* Personaje del Día */}
        <motion.section 
          className="featured-section"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h2 className="section-title">Personaje del Día</h2>
          <div className="featured-card" style={{ height: 'calc(100% - 44px)' }}>
            <div>
              <div className="featured-header">
                <div 
                  className="featured-avatar"
                  style={{ borderColor: featured.iconColor }}
                >
                  {featured.imagePlaceholder}
                </div>
                <div className="featured-meta">
                  <h3>{featured.name}</h3>
                  <span>
                    {featured.type === 'gigante' ? 'Gigante' : 'Cabezudo'} • Creado en {featured.year}
                  </span>
                </div>
              </div>
              <p className="featured-text">
                {featured.history.length > 180 ? `${featured.history.slice(0, 180)}...` : featured.history}
              </p>
            </div>
            <Link to={`/personaje/${featured.id}`} className="btn-secondary" style={{ width: '100%' }}>
              Conocer más de {featured.name}
            </Link>
          </div>
        </motion.section>

        {/* Mini-juego Adivinanza */}
        <motion.section 
          className="quiz-section"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h2 className="section-title">
            <FaGamepad style={{ color: 'hsl(var(--color-primary))' }} />
            <span>Adivina el Cabezudo</span>
          </h2>
          
          <div className="quiz-card">
            <div className="quiz-score-badge">
              Racha actual: {quizScore} 🔥
            </div>

            <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'hsl(var(--color-text-secondary))' }}>
              ¿Qué personaje canta la siguiente copla tradicional?
            </p>

            <blockquote className="quiz-copla">
              "{currentQuizItem.copla}"
            </blockquote>

            <div className="quiz-options">
              {options.map((opt) => {
                let btnClass = '';
                if (showAnswer) {
                  if (opt.id === currentQuizItem.id) {
                    btnClass = 'correct';
                  } else if (selectedOption === opt.id) {
                    btnClass = 'wrong';
                  }
                }
                return (
                  <button
                    key={opt.id}
                    className={`quiz-opt-btn ${btnClass}`}
                    onClick={() => handleQuizAnswer(opt.id)}
                    disabled={showAnswer}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>

            {showAnswer && (
              <div className="quiz-result">
                <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                  {selectedOption === currentQuizItem.id 
                    ? '¡Correcto! ¡Eres un experto! 🎉' 
                    : `Incorrecto. Era ${currentQuizItem.name}. 😢`}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--color-text-secondary))', marginBottom: '12px' }}>
                  {currentQuizItem.description}
                </p>
                <button className="btn-primary" onClick={handleNextQuiz} style={{ width: '100%', padding: '8px' }}>
                  Siguiente Pregunta
                </button>
              </div>
            )}
          </div>
        </motion.section>
      </div>
      
      {/* Quick link sections for calendar */}
      <motion.section
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{ background: 'hsl(var(--color-bg-card))', border: '1px solid hsl(var(--color-border))', borderRadius: 'var(--border-radius-md)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'hsla(var(--color-primary), 0.1)', color: 'hsl(var(--color-primary))', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            <FaCalendarAlt />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>Próximas Salidas de la Comparsa</h3>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--color-text-secondary))' }}>
              Consulte la agenda completa de desfiles y sus recorridos detallados.
            </p>
          </div>
        </div>
        <Link to="/agenda" className="btn-secondary" style={{ padding: '8px 16px' }}>
          Ver Agenda
        </Link>
      </motion.section>
    </div>
  );
};
