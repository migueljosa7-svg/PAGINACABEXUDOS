import React, { useState, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { comparsaMembers, comparsaMembers as members } from '../data/comparsaData';
import { FaCrown, FaMapMarkerAlt, FaGamepad, FaCalendarAlt } from 'react-icons/fa';
import { GlobalSearch } from '../components/GlobalSearch';
import { NextSalidaWidget } from '../components/NextSalidaWidget';
import { WeatherWidget } from '../components/WeatherWidget';
import { ProgramaDelDia } from '../components/ProgramaDelDia';
import { HomeLivePreview } from '../components/HomeLivePreview';
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
      <section className="home-hero relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-950 to-red-800 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[36px] border-white/5" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-300 sm:text-sm">Fiestas y tradición · Zaragoza</p>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">La tradición de Zaragoza, en movimiento</h1>
          <p className="mx-auto mb-7 mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-lg">
            Consulta las próximas salidas, conoce a gigantes y cabezudos y sigue el recorrido de la comparsa cuando esté en la calle.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/recorridos" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-200">
              <FaMapMarkerAlt />
              <span>Consultar recorridos</span>
            </Link>
            <Link to="/comparsa" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/20">
              <FaCrown />
              <span>Explorar la comparsa</span>
            </Link>
          </div>
        </div>
      </section>

      <GlobalSearch />
      {/* Resumen del programa oficial calculado para HOY, con la distancia de
          cada acto al recorrido: sustituye al bloque impreso, que no se
          actualiza solo. */}
      <ProgramaDelDia />
      <NextSalidaWidget />
      <WeatherWidget />

      <FadeIn delay={0.05}>
        <HomeLivePreview />
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