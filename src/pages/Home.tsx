import React, { useState, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { comparsaMembers, comparsaMembers as members } from '../data/comparsaData';
import { FaCrown, FaMapMarkerAlt, FaGamepad, FaCalendarAlt } from 'react-icons/fa';
import { GlobalSearch } from '../components/GlobalSearch';
import { NextSalidaWidget } from '../components/NextSalidaWidget';
import { WeatherWidget } from '../components/WeatherWidget';
import { motion } from 'framer-motion';
import '../styles/home.css';

const FadeIn = memo(({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
  >
    {children}
  </motion.div>
));
FadeIn.displayName = 'FadeIn';

export const Home: React.FC = () => {
  // Mini-game state: Guess the Cabezudo by its copla
  const cabezudos = members.filter(m => m.type === 'cabezudo');

  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Generate quiz options
  const currentQuizItem = cabezudos[currentQuizIndex % cabezudos.length];

  const getQuizOptions = useCallback(() => {
    const incorrect = cabezudos.filter(c => c.id !== currentQuizItem.id);
    const shuffledIncorrect = [...incorrect].sort(() => 0.5 - Math.random());
    const options = [currentQuizItem, shuffledIncorrect[0], shuffledIncorrect[1], shuffledIncorrect[2]];
    return options.sort(() => 0.5 - Math.random());
  }, [currentQuizItem, cabezudos]);

  const [options, setOptions] = useState<typeof cabezudos>(() => getQuizOptions());

  const handleQuizAnswer = useCallback((id: string) => {
    setSelectedOption(id);
    setShowAnswer(true);
    if (id === currentQuizItem.id) {
      setQuizScore(prev => prev + 1);
    }
  }, [currentQuizItem]);

  const handleNextQuiz = useCallback(() => {
    setCurrentQuizIndex(prev => prev + 1);
    setSelectedOption(null);
    setShowAnswer(false);
    const nextItem = cabezudos[(currentQuizIndex + 1) % cabezudos.length];
    const incorrect = cabezudos.filter(c => c.id !== nextItem.id);
    const shuffledIncorrect = [...incorrect].sort(() => 0.5 - Math.random());
    const nextOptions = [nextItem, shuffledIncorrect[0], shuffledIncorrect[1], shuffledIncorrect[2]];
    setOptions(nextOptions.sort(() => 0.5 - Math.random()));
  }, [currentQuizIndex, cabezudos]);

  // Featured character of the day (stable based on day of month)
  const dayOfMonth = new Date().getDate();
  const featuredIndex = dayOfMonth % comparsaMembers.length;
  const featured = comparsaMembers[featuredIndex];

  return (
    <div className="home-page layout-container">
      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h2 className="hero-tagline">Comparsa de Zaragoza</h2>
          <h1 className="hero-title">¡Sigue el Latido de la Ciudad!</h1>
          <p className="hero-desc">
            Bienvenido al portal oficial de los Gigantes y Cabezudos. Explora sus leyendas, consulta los horarios y localiza a la comparsa en tiempo real por el Casco Histórico.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/recorridos" className="btn-primary">
              <FaMapMarkerAlt />
              <span>Ver recorrido en el mapa</span>
            </Link>
            <Link to="/comparsa" className="btn-secondary">
              <FaCrown />
              <span>Explorar la comparsa</span>
            </Link>
          </div>
        </div>
      </section>

      <GlobalSearch />
      <NextSalidaWidget />
      <WeatherWidget />

      {/* Information in real time */}
      <FadeIn delay={0.05}>
        <div className="realtime-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div className="realtime-icon">⏱️</div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 6 }}>Información en tiempo real</h3>
              <p style={{ color: 'hsl(var(--color-text-secondary))', lineHeight: 1.7, fontSize: '0.95rem' }}>
                La experiencia actual muestra una simulación de los recorridos. La arquitectura está preparada para
                integrarse con una futura API oficial del Ayuntamiento y mostrar datos en tiempo real.
              </p>
            </div>
            <Link to="/tiempo-real" className="btn-secondary" style={{ padding: '10px 16px' }}>
              Ver detalles
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* Statistics counters */}
      <FadeIn delay={0.1}>
        <div className="stat-grid">
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
        </div>
      </FadeIn>

      <FadeIn delay={0.12}>
        <div className="enciclopedia-cta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="enciclopedia-cta-icon">
              <FaCrown />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>Consulta la Enciclopedia</h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--color-text-secondary))', margin: 0 }}>
                Descubre cada cabezudo y gigante con su historia, características, copla y ubicación asociada.
              </p>
            </div>
          </div>
          <Link to="/enciclopedia" className="btn-secondary" style={{ padding: '8px 16px' }}>
            Abrir Enciclopedia
          </Link>
        </div>
      </FadeIn>

      {/* Dynamic contents section */}
      <div className="section-grid">
        
        {/* Personaje del Día */}
        <section>
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
        </section>

        {/* Mini-juego Adivinanza */}
        <section>
          <h2 className="section-title">
            <FaGamepad style={{ color: 'hsl(var(--color-primary))' }} />
            <span>Adivina el Cabezudo</span>
          </h2>
          
          <div className="quiz-card">
            <div className="quiz-score-badge">
              Progreso de aprendizaje: {quizScore} ✅
            </div>

            <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'hsl(var(--color-text-secondary))' }}>
              Aprende la historia de los Gigantes y Cabezudos respondiendo a la copla tradicional.
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
                    ? '¡Respuesta correcta! Sigue explorando la tradición. 🎉' 
                    : `No es ${currentQuizItem.name}. La respuesta correcta era ${currentQuizItem.name}.`}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--color-text-secondary))', marginBottom: '12px' }}>
                  {currentQuizItem.description}
                </p>
                <button className="btn-primary" onClick={handleNextQuiz} style={{ width: '100%', padding: '8px' }}>
                  Siguiente actividad
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
      
      {/* Quick link sections for calendar */}
      <FadeIn delay={0.2}>
        <div className="agenda-cta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="agenda-cta-icon">
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
        </div>
      </FadeIn>
    </div>
  );
};