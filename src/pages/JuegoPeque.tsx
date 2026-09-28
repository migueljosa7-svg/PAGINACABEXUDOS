/**
 * Juego Peques — area de juegos infantiles.
 *
 * Tres retos cortos pensados para jugar en el movil mientras se espera a la
 * comparsa, con la garantia de que el contenido viene de la fuente de verdad
 * del proyecto (los mismos cabezudos y barrios que aparecen en el mapa y en la
 * enciclopedia, no nombres inventados).
 *
 *  - ADIVINANZA DEL DIA: un reto por dia, igual para toda la familia.
 *  - MEMORIA: emparejar las caras de los cabezudos.
 *  - SOPA DE LETRAS: buscar barrios y personajes en la cuadrícula.
 *
 * El progreso (estrellas, racha, retos superados) vive en localStorage, sin
 * cuentas ni datos personales: es una app pública de fiestas.
 *
 * Nota de privacidad: al ser una zona infantil NO se guarda nada identificativo,
 * solo un contador de estrellas y la racha de dias jugados.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaStar,
  FaFire,
  FaQuestionCircle,
  FaLayerGroup,
  FaFont,
  FaTrophy,
  FaRedo,
  FaPalette,
  FaIdCard,
  FaBullseye,
} from 'react-icons/fa';
import {
  MEMORY_CARDS,
  RIDDLE_ENTRIES,
  WORDSEARCH_WORDS,
  COLORING_FIGURES,
  STICKER_ALBUM,
  dailyRiddle,
  dailySeed,
  seededRandom,
  shuffleSeeded,
} from '../data/gameContent';
import { useGamesProgress } from '../hooks/useGamesProgress';
import '../styles/juegos.css';

// -----------------------------------------------------------------------------
// 1. Adivinanza diaria del cabezudo
// -----------------------------------------------------------------------------

const RiddleGame: React.FC<{ onSolved: (key: string) => void }> = ({ onSolved }) => {
  const today = useMemo(() => dailyRiddle(), []);
  const options = useMemo(() => {
    const others = RIDDLE_ENTRIES.filter((e) => e.id !== today.id);
    return shuffleSeeded([today, ...others.slice(0, 3)], dailySeed());
  }, [today]);

  const [picked, setPicked] = useState<string | null>(null);
  const solved = picked === today.id;
  const dayKey = useMemo(() => dailySeed().toString(), []);

  useEffect(() => {
    if (solved) onSolved(`riddle-${dayKey}`);
  }, [solved, dayKey, onSolved]);

  return (
    <div className="juego-card">
      <h3>
        <FaQuestionCircle /> Adivinanza del día
      </h3>
      <p className="juego-hint">¿Quién es? Lee la pista y elige al cabezudo correcto.</p>
      <blockquote className="juego-riddle">“{today.clue}”</blockquote>
      {today.copla && <p className="juego-copla">Su copla: {today.copla}</p>}

      <div className="juego-options">
        {options.map((opt) => {
          const isPicked = picked === opt.id;
          const isRight = opt.id === today.id;
          const state = isPicked ? (isRight ? 'ok' : 'ko') : '';
          return (
            <button
              key={opt.id}
              type="button"
              className={`juego-option ${state}`}
              onClick={() => setPicked(opt.id)}
              disabled={solved}
              style={state === 'ok' ? { borderColor: '#22c55e' } : undefined}
            >
              <span className="juego-option-emoji" style={{ color: opt.color }}>
                {opt.emoji}
              </span>
              <span>{opt.name}</span>
            </button>
          );
        })}
      </div>

      {solved && (
        <motion.div
          className="juego-success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FaStar /> ¡Muy bien! {today.name} es el acertado.
        </motion.div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// 2. Juego de memoria
// -----------------------------------------------------------------------------

interface MemoryState {
  id: string;
  flipped: boolean;
  matched: boolean;
}

/** Baraja de memoria: una carta por personaje, duplicada y mezclada. */
function newDeck(): MemoryState[] {
  const pairs = MEMORY_CARDS.flatMap((card) => [
    { id: card.id, flipped: false, matched: false },
    { id: card.id, flipped: false, matched: false },
  ]);
  // La semilla mezcla el dia con la hora: cada "Revolver" reparte distinto.
  return shuffleSeeded(pairs, dailySeed() * 31 + (Date.now() % 9973));
}

const MemoryGame: React.FC<{ onSolved: () => void }> = ({ onSolved }) => {
  // La baraja se genera como estado inicial perezoso, no en un efecto: evita el
  // render en cascada que dispara el primer setState tras el montaje.
  const [deck, setDeck] = useState<MemoryState[]>(() => newDeck());
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const deal = useCallback(() => {
    setDeck(newDeck());
    setPicked([]);
    setMoves(0);
    setWon(false);
  }, []);

  const flip = useCallback(
    (index: number) => {
      if (won || picked.length >= 2) return;
      if (deck[index]?.matched || deck[index]?.flipped) return;

      const next = deck.map((c, i) => (i === index ? { ...c, flipped: true } : c));
      const nextPicked = [...picked, index];
      setDeck(next);
      setPicked(nextPicked);

      if (nextPicked.length === 2) {
        setMoves((m) => m + 1);
        const [a, b] = nextPicked.map((i) => next[i]);
        if (a && b && a.id === b.id) {
          // Pareja: se fija y se comprueba la victoria.
          setDeck((cur) => {
            const fixed = cur.map((c) =>
              c.id === a.id ? { ...c, matched: true, flipped: true } : c
            );
            if (fixed.every((c) => c.matched)) setWon(true);
            return fixed;
          });
          setPicked([]);
        }
      }
    },
    [deck, picked, won]
  );

  useEffect(() => {
    if (won) onSolved();
  }, [won, onSolved]);

  // Vuelve a tapar las dos cartas cuando no forman pareja.
  useEffect(() => {
    if (picked.length !== 2) return;
    const [a, b] = picked.map((i) => deck[i]);
    if (a && b && a.id === b.id) return;
    const timer = setTimeout(() => {
      setDeck((cur) =>
        cur.map((c, i) => (picked.includes(i) ? { ...c, flipped: false } : c))
      );
      setPicked([]);
    }, 700);
    return () => clearTimeout(timer);
  }, [picked, deck]);

  const cardMeta = (id: string) => MEMORY_CARDS.find((c) => c.id === id);

  return (
    <div className="juego-card">
      <h3>
        <FaLayerGroup /> Parejas de gigantes y cabezudos
      </h3>
      <p className="juego-hint">Encuentra las parejas. Llevas {moves} movimientos.</p>

      <div className="juego-memory">
        {deck.map((card, index) => {
          const meta = cardMeta(card.id);
          const show = card.flipped || card.matched;
          return (
            <button
              key={`${card.id}-${index}`}
              type="button"
              className={`juego-card-face ${show ? 'is-open' : ''} ${card.matched ? 'is-matched' : ''}`}
              onClick={() => flip(index)}
              aria-label={show ? meta?.label : 'Carta oculta'}
              style={card.matched ? { borderColor: meta?.color } : undefined}
            >
              <span className="juego-card-inner">
                <span className="juego-card-side juego-card-back" aria-hidden="true">
                  ?
                </span>
                <span className="juego-card-side juego-card-front">
                  <span className="juego-card-emoji" style={{ color: meta?.color }}>
                    {meta?.emoji}
                  </span>
                  <span className="juego-card-label">{meta?.label}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {won && (
        <motion.div
          className="juego-success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FaTrophy /> ¡Todas las parejas en {moves} movimientos!
        </motion.div>
      )}

      <button type="button" className="juego-reset" onClick={deal}>
        <FaRedo /> Revolver
      </button>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 3. Sopa de letras (buscador de barrios y personajes)
// -----------------------------------------------------------------------------

const GRID_SIZE = 11;
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1],
];

type Grid = string[][];

interface FoundWord {
  word: string;
  cells: Array<{ r: number; c: number }>;
}

/** Coloca una palabra en la cuadrícula en horizontal, vertical o diagonal. */
function placeWord(grid: Grid, word: string, rand: () => number): Array<{ r: number; c: number }> | null {
  const letters = word.replace(/[^A-ZÑ]/g, '').split('');
  if (letters.length === 0 || letters.length > GRID_SIZE) return null;

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const dir = DIRS[Math.floor(rand() * DIRS.length)];
    const r0 = Math.floor(rand() * GRID_SIZE);
    const c0 = Math.floor(rand() * GRID_SIZE);
    const endR = r0 + dir[0] * (letters.length - 1);
    const endC = c0 + dir[1] * (letters.length - 1);
    if (endR < 0 || endR >= GRID_SIZE || endC < 0 || endC >= GRID_SIZE) continue;

    const cells: Array<{ r: number; c: number }> = [];
    let fits = true;
    for (let i = 0; i < letters.length; i += 1) {
      const r = r0 + dir[0] * i;
      const c = c0 + dir[1] * i;
      const current = grid[r][c];
      // Solo se pisa una letra si coincide: evita romper palabras ya placed.
      if (current !== '' && current !== letters[i]) {
        fits = false;
        break;
      }
      cells.push({ r, c });
    }
    if (!fits) continue;

    cells.forEach(({ r, c }, i) => {
      grid[r][c] = letters[i];
    });
    return cells;
  }
  return null;
}

/**
 * Álbum de cromos: se desbloquean al alcanzar las estrellas de los retos.
 *
 * El progreso se deriva solo de `progress.stars`, así que el álbum no necesita
 * su propio estado persistente: cualquier estrella ganada en cualquier juego
 * desbloquea el cromo correspondiente.
 */
const StickerAlbum: React.FC<{ stars: number }> = ({ stars }) => {
  const unlocked = useMemo(
    () => STICKER_ALBUM.filter((s) => stars >= s.starsNeeded).length,
    [stars]
  );
  const nextSticker = useMemo(
    () => STICKER_ALBUM.find((s) => stars < s.starsNeeded) ?? null,
    [stars]
  );

  return (
    <div className="juego-card">
      <h3>
        <FaIdCard /> Álbum de cromos
      </h3>
      <p className="juego-hint">
        {unlocked} de {STICKER_ALBUM.length} cromo(s) desbloqueados con tus estrellas.
        {nextSticker
          ? ` Te faltan ${nextSticker.starsNeeded - stars} para ${nextSticker.name}.`
          : ' ¡Colección completa!'}
      </p>

      <div className="juego-album">
        {STICKER_ALBUM.map((sticker) => {
          const isUnlocked = stars >= sticker.starsNeeded;
          return (
            <div
              key={sticker.id}
              className={`juego-sticker ${isUnlocked ? 'is-unlocked' : 'is-locked'}`}
              style={isUnlocked ? { borderColor: sticker.color } : undefined}
            >
              <span
                className="juego-sticker-emoji"
                style={isUnlocked ? { background: `${sticker.color}22` } : undefined}
                aria-hidden="true"
              >
                {isUnlocked ? sticker.emoji : '❔'}
              </span>
              <strong>{isUnlocked ? sticker.name : '???'}</strong>
              <small>{sticker.starsNeeded} ★</small>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Lienzo de colorear: el niño elige un color y toca una parte de la figura.
 *
 * Se pinta con eventos de puntero (igual que la sopa de letras) para que en
 * móvil no se seleccione el texto ni se pierda el trazo.
 */
// memo: igual que la sopa, evita repintar el SVG del lienzo cuando cambian las
// estrellas de otro reto (la pagina es quien re-renderiza, no el colorear).
const ColoringGame = memo(function ColoringGame({ onSolved }: { onSolved: () => void }) {
  const [figureId, setFigureId] = useState(COLORING_FIGURES[0]?.id ?? '');
  const figure = useMemo(
    () => COLORING_FIGURES.find((f) => f.id === figureId) ?? COLORING_FIGURES[0],
    [figureId]
  );
  // Colores por parte. Se inicializa en blanco (lienzo sin pintar).
  const [colors, setColors] = useState<Record<string, string>>({});
  const [activeColor, setActiveColor] = useState(figure?.palette[0] ?? '#1565C0');

  // --- Feedback al pintar: brillo + pito opcional -----------------------------
  // Brillo: la ultima parte tocada se marca 550 ms y vuelve sola. Sirve de
  // confirmacion en moviles, donde no hay hover ni doble clic.
  const [fresh, setFresh] = useState<string | null>(null);
  const freshTimerRef = useRef<number | null>(null);
  // Sonido: OPCIONAL y desactivable en la propia tarjeta. Se crea el AudioContext
  // en el primer toque (politica de autoplay) y no se toca nada mas.
  const [sonido, setSonido] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);

  const ping = useCallback(
    (freq: number) => {
      if (!sonido) return;
      try {
        const ctx = audioRef.current ?? new AudioContext();
        audioRef.current = ctx;
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch {
        // Sin audio (permisos, navegador sin WebAudio): el juego no depende de el.
      }
    },
    [sonido],
  );

  // Libera el AudioContext al desmontarse: si no, el navegador lo mantiene vivo
  // mientras la ruta siga montada.
  useEffect(() => {
    return () => {
      const ctx = audioRef.current;
      audioRef.current = null;
      if (ctx) ctx.close().catch(() => undefined);
      if (freshTimerRef.current) window.clearTimeout(freshTimerRef.current);
    };
  }, []);

  // Cambiar de figura reinicia el lienzo. Se hace en el manejador y no con un
  // efecto: un `setState` en el cuerpo del efecto provoca un render en cascada.
  const selectFigure = useCallback((id: string) => {
    setFigureId(id);
    setColors({});
    setActiveColor(COLORING_FIGURES.find((f) => f.id === id)?.palette[0] ?? '#1565C0');
  }, []);

  const paint = useCallback(
    (event: React.PointerEvent<SVGPathElement>, partId: string) => {
      event.preventDefault();
      setColors((prev) => ({ ...prev, [partId]: activeColor }));
      // Confirmacion sensorial: brillo corto sobre la zona tocada + nota musical.
      setFresh(partId);
      if (freshTimerRef.current) window.clearTimeout(freshTimerRef.current);
      freshTimerRef.current = window.setTimeout(() => setFresh(null), 550);
      ping(520);
    },
    [activeColor, ping],
  );

  // Figura completa = todas las partes pintadas.
  const painted = figure ? figure.parts.every((p) => colors[p.id]) : false;
  useEffect(() => {
    if (painted) onSolved();
  }, [painted, onSolved]);

  // Tono de "figura completa": una sola vez por pintado, no en cada render.
  const paintedBeforeRef = useRef(false);
  useEffect(() => {
    if (painted && !paintedBeforeRef.current) ping(880);
    paintedBeforeRef.current = painted;
  }, [painted, ping]);

  if (!figure) return null;

  return (
    <div className="juego-card">
      <h3>
        <FaPalette /> Colorea a los cabezudos
      </h3>
      <p className="juego-hint">
        Elige un color y toca las partes de {figure.name} para pintar de{' '}
        {figure.emoji}. Píntalos todos para ganar una estrella.
      </p>

      <div className="juego-figure-picker">
        {COLORING_FIGURES.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`juego-figure-btn ${f.id === figureId ? 'active' : ''}`}
            onClick={() => selectFigure(f.id)}
            aria-pressed={f.id === figureId}
            title={f.name}
          >
            <span aria-hidden="true">{f.emoji}</span>
          </button>
        ))}
      </div>

      <div className="juego-canvas-wrap">
        <svg
          viewBox="0 0 100 100"
          className="juego-canvas"
          role="img"
          aria-label={`Figura para colorear: ${figure.name}`}
        >
          {figure.parts.map((part) => (
            <path
              key={part.id}
              d={part.d}
              fill={colors[part.id] ?? '#ffffff'}
              stroke="hsl(var(--color-border))"
              strokeWidth={1.5}
              strokeLinejoin="round"
              fillRule="evenodd"
              onPointerDown={(e) => paint(e, part.id)}
              className={`juego-canvas-part${fresh === part.id ? ' is-fresh' : ''}`}
            >
              <title>{part.hint}</title>
            </path>
          ))}
        </svg>
      </div>

      <div className="juego-palette" role="group" aria-label="Colores">
        {figure.palette.map((color) => (
          <button
            key={color}
            type="button"
            className={`juego-color ${color === activeColor ? 'active' : ''}`}
            style={{ background: color }}
            onClick={() => setActiveColor(color)}
            aria-label={`Color ${color}`}
            aria-pressed={color === activeColor}
          />
        ))}
        {/* Sonido: opcional y explicito. Fuera del alcance accidental de la
            mano: su propio boton con texto, no un icono suelto. */}
        <button
          type="button"
          className="juego-sound"
          onClick={() => setSonido((v) => !v)}
          aria-pressed={sonido}
          title="Sonido al pintar"
        >
          {sonido ? '🔊' : '🔇'} {sonido ? 'Sonido' : 'Sin sonido'}
        </button>
        <button type="button" className="juego-reset" onClick={() => setColors({})}>
          <FaRedo /> Borrar
        </button>
      </div>

      {painted && (
        <motion.div
          className="juego-success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FaTrophy /> ¡{figure.name} está pintado!
        </motion.div>
      )}
    </div>
  );
});

/**
 * Confeti: piezas que estallan al encontrar una palabra.
 *
 * Es animacion pura (nada de logica de juego) y se destruye sola tras ~1.4 s.
 * Se monta con `key` distinto en cada celebracion para que cada acierto repita
 * el efecto en lugar de reutilizar el nodo ya animado.
 */
const Confetti: React.FC<{ seed: number }> = ({ seed }) => {
  const pieces = useMemo(() => {
    // PRNG con semilla (no `Math.random`): el render tiene que ser puro, y de
    // paso cada celebracion es reproducible con su propio `seed`.
    const rand = seededRandom(seed * 7919 + 13);
    const palette = ['#f97316', '#22c55e', '#eab308', '#D1121F', '#0ea5e9', '#a855f7'];
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: Math.round(rand() * 240 - 120),
      y: Math.round(rand() * -70 - 40),
      rot: Math.round(rand() * 540 - 270),
      delay: rand() * 0.15,
      color: palette[i % palette.length],
      emoji: i % 5 === 0 ? '🎉' : '',
    }));
  }, [seed]);

  return (
    <div className="juego-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="juego-confetti-piece"
          style={{ background: p.color }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.6 }}
          animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rot, scale: 1.25 }}
          transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
};

// memo: la pagina re-renderiza cada vez que cambian las estrellas (que suben al
// resolver CUALQUIER reto); sin esto la cuadricula de 121 celdas se repintaria
// por un acierto en la adivinanza.
const WordSearchGame = memo(function WordSearchGame({ onSolved }: { onSolved: () => void }) {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<Array<{ r: number; c: number }>>([]);
  const [found, setFound] = useState<FoundWord[]>([]);
  // Contador de celebraciones: cada palabra encontrada lo incrementa y su valor
  // hace de `key` para que el confeti se vuelva a montar (y se destruya) solo.
  const [celebra, setCelebra] = useState(0);
  // Gesto activo: hay un puntero presionado sobre la cuadricula.
  const [dragging, setDragging] = useState(false);
  const [anchor, setAnchor] = useState<{ r: number; c: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  // Espejo de `selected` para que el handler de pointerup (que depende solo de
  // `dragging`) lea la seleccion mas reciente sin recrearse en cada trama.
  // Se sincroniza en un efecto SIN setState, que es el patron correcto para
  // espejos: escribir la ref en render esta prohibido (lectura inconsistente).
  const selectedRef = useRef<Array<{ r: number; c: number }>>([]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const puzzle = useMemo(() => {
    const seed = dailySeed() + round * 7919;
    const rand = seededRandom(seed);
    const grid: Grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));

    // Cuantas mas palabras caben, mas densa la sopa.
    const words = shuffleSeeded(WORDSEARCH_WORDS, seed).slice(0, 5);
    const placed: FoundWord[] = [];
    for (const { word } of words) {
      const cells = placeWord(grid, word, rand);
      if (cells) placed.push({ word, cells });
    }

    // Relleno con letras aleatorias (incluye Ñ para que el mapa sea fiel).
    const alphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    for (let r = 0; r < GRID_SIZE; r += 1) {
      for (let c = 0; c < GRID_SIZE; c += 1) {
        if (grid[r][c] === '') grid[r][c] = alphabet[Math.floor(rand() * alphabet.length)];
      }
    }

    return { grid, placed, target: words.length };
  }, [round]);

  const isHighlighted = useCallback(
    (r: number, c: number) => {
      if (selected.some((cell) => cell.r === r && cell.c === c)) return 'is-selected';
      const inWord = found.some((w) => w.cells.some((cell) => cell.r === r && cell.c === c));
      return inWord ? 'is-found' : '';
    },
    [selected, found]
  );

  /**
   * Resuelve la seleccion al soltar: comprueba si las celdas marcadas forman
   * alguna de las palabras pendientes.
   *
   * Se separa del gesto porque con arrastre puede haber muchas celdas
   * marcadas y la comprobacion solo tiene sentido al final.
   */
  const commitSelection = useCallback(
    (cells: Array<{ r: number; c: number }>) => {
      if (cells.length === 0) return;
      const text = cells.map((cell) => puzzle.grid[cell.r][cell.c]).join('');
      const reversed = text.split('').reverse().join('');
      const hit = puzzle.placed.find(
        (w) => (w.word === text || w.word === reversed) && !found.some((f) => f.word === w.word)
      );
      if (hit) {
        setFound((f) => [...f, hit]);
        setSelected([]);
        setDragging(false);
        // Palabra acertada: confeti + pulso en la pildora de la palabra.
        setCelebra((n) => n + 1);
      }
    },
    [puzzle, found]
  );

  // --- GESTO TACTIL -------------------------------------------------------
  // Con `onClick` por celda, al arrastrar el dedo el navegador selecciona el
  // texto y el evento se pierde. Por eso se usa Pointer Events: se captura el
  // puntero, se impide la seleccion y se marca la celda de inicio; al soltar se
  // resuelve. Un puntero (toque o raton) a la vez: `pointerId` lo garantiza.
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, r: number, c: number) => {
      // Sin preventDefault el movil interpretaria el gesto como scroll o como
      // seleccion de texto, y la partida se descuadra.
      event.preventDefault();
      pointerIdRef.current = event.pointerId;
      setDragging(true);
      setSelected([{ r, c }]);
    },
    []
  );

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, r: number, c: number) => {
      if (!dragging || event.pointerId !== pointerIdRef.current) return;
      // Sin esto, el arrastre sobre letras dispara el menu contextual del
      // navegador en algunos Android.
      event.preventDefault();
      setSelected((prev) => {
        if (prev.length === 0) return [{ r, c }];
        if (prev.some((cell) => cell.r === r && cell.c === c)) return prev;
        return [...prev, { r, c }];
      });
    },
    [dragging]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragging || event.pointerId !== pointerIdRef.current) return;
      event.preventDefault();
      setDragging(false);
      commitSelection(selectedRef.current);
    },
    [dragging, commitSelection]
  );

  /**
   * Seleccion alternativa con DOS toques: pulsar la celda de inicio y luego la
   * de final. Es la via accesible (tambien con teclado) y la que funciona en
   * moviles donde el arrastre con letra pequena es impreciso.
   */
  const handleTap = useCallback(
    (_event: React.MouseEvent<HTMLButtonElement>, r: number, c: number) => {
      // `detail === 0` = activacion por teclado.
      setSelected((prev) => {
        if (prev.length === 0) {
          setAnchor({ r, c });
          return [{ r, c }];
        }
        const start = prev[0];
        const end = { r, c };
        const stepRow = Math.sign(end.r - start.r);
        const stepCol = Math.sign(end.c - start.c);
        // Solo se acepta una linea recta (horizontal, vertical o diagonal).
        const isStraight =
          stepRow === 0 || stepCol === 0 || Math.abs(end.r - start.r) === Math.abs(end.c - start.c);
        if (!isStraight) {
          setAnchor(end);
          return [end];
        }
        const cells: Array<{ r: number; c: number }> = [];
        for (let i = 0; ; i += 1) {
          const rr = start.r + stepRow * i;
          const cc = start.c + stepCol * i;
          cells.push({ r: rr, c: cc });
          if (rr === end.r && cc === end.c) break;
        }
        setSelected(cells);
        // La resolucion se hace fuera del updater para no anidar setState.
        queueMicrotask(() => commitSelection(cells));
        return cells;
      });
    },
    [commitSelection]
  );

  useEffect(() => {
    if (found.length > 0 && found.length === puzzle.placed.length) onSolved();
  }, [found, puzzle.placed.length, onSolved]);

  // El confeti dura 1.4 s: al terminar se desmonta solo para no dejar nodos
  // (ni animaciones) consumiendo CPU mientras el niño sigue jugando.
  useEffect(() => {
    if (!celebra) return;
    const t = window.setTimeout(() => setCelebra(0), 1400);
    return () => window.clearTimeout(t);
  }, [celebra]);

  const restart = useCallback(() => {
    setRound((r) => r + 1);
    setSelected([]);
    setFound([]);
    setDragging(false);
    setAnchor(null);
    pointerIdRef.current = null;
  }, []);

  return (
    <div className="juego-card">
      <h3>
        <FaFont /> Sopa de letras
      </h3>
      <p className="juego-hint">
        Toca las letras en orden para encontrar los nombres. {found.length} de{' '}
        {puzzle.placed.length} encontrados.
      </p>

      <div className="juego-words">
        {puzzle.placed.map((w) => (
          <span key={w.word} className={found.some((f) => f.word === w.word) ? 'is-found' : ''}>
            {w.word}
          </span>
        ))}
      </div>

      {/* `touch-action: none` + `user-select: none` viven en el CSS de
          `.juego-wordsearch` / `.juego-cell` (ver juegos.css). */}
      <div className="juego-wordsearch" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
        {puzzle.grid.map((row, r) =>
          row.map((letter, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              className={`juego-cell ${isHighlighted(r, c)}`}
              // Pointer Events: capturan el gesto en movil sin que el navegador
              // seleccione texto ni abra el menu contextual.
              onPointerDown={(e) => handlePointerDown(e, r, c)}
              onPointerEnter={(e) => handlePointerEnter(e, r, c)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              // Alternativa de dos toques / teclado (inicio y final).
              onClick={(e) => handleTap(e, r, c)}
              aria-label={`Letra ${letter}, fila ${r + 1}, columna ${c + 1}`}
              aria-pressed={selected.some((cell) => cell.r === r && cell.c === c)}
            >
              {letter}
            </button>
          ))
        )}
      </div>

      {/* Celebracion del acierto: confeti sobre la cuadricula (sin bloquear el
          gesto: no captura punteros). */}
      {celebra > 0 && <Confetti key={celebra} seed={celebra} />}

      <p className="juego-hint" style={{ marginTop: '8px' }}>
        Arrastra el dedo sobre las letras, o toca la letra inicial y la final.
        {anchor && <strong> Inicio fijado en fila {anchor.r + 1}.</strong>}
      </p>

      {found.length === puzzle.placed.length && puzzle.placed.length > 0 && (
        <motion.div
          className="juego-success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FaTrophy /> ¡Las has encontrado todas!
        </motion.div>
      )}

      <button type="button" className="juego-reset" onClick={restart}>
        <FaRedo /> Otra sopa
      </button>
    </div>
  );
});


// -----------------------------------------------------------------------------
// 5. El Atrapacabezudos — reflejos contra las ventanas del Ayuntamiento
// -----------------------------------------------------------------------------
// Reto nuevo para las esperas largas: el nino tiene que tocar el cabezudo que
// asoma antes de que se esconda. Sin cuenta y con toda la logica en la tarjeta:
// los timeouts se limpian al desmontar, para no dejar timers corriendo cuando
// se cambia de seccion.

/** Ventanas de la fachada del Ayuntamiento. */
const WINDOWS = 6;
/** Atrapones necesarios para ganar. */
const OBJETIVO_ATRAPA = 8;
/** Duracion de una partida, en segundos. */
const PARTIDA_SEG = 40;

interface PopUp {
  /** Ventana (0..WINDOWS-1) en la que asoma. */
  win: number;
  emoji: string;
  color: string;
}

const Atrapacabezudos: React.FC<{ onSolved: () => void }> = ({ onSolved }) => {
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PARTIDA_SEG);
  const [active, setActive] = useState<PopUp | null>(null);
  const [won, setWon] = useState(false);
  const [fallos, setFallos] = useState(false);
  const timersRef = useRef<number[]>([]);
  const scheduleRef = useRef<() => void>(() => {});

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  /** Suelta un cabezudo en una ventana al azar y lo esconde si nadie lo toca. */
  const scheduleNext = useCallback(() => {
    const apertura = window.setTimeout(() => {
      const idx = Math.floor(Math.random() * WINDOWS);
      const card = MEMORY_CARDS[idx % MEMORY_CARDS.length];
      setActive({ win: idx, emoji: card.emoji, color: card.color });
      const cierre = window.setTimeout(() => {
        setActive(null);
        scheduleRef.current();
      }, 850 + Math.random() * 500);
      timersRef.current.push(cierre);
    }, 450 + Math.random() * 650);
    timersRef.current.push(apertura);
  }, []);

  // Encadenado via ref: `scheduleNext` se llama a si misma sin recrearse y sin
  // declararse antes de usarse (que lo prohibiria el lint).
  useEffect(() => {
    scheduleRef.current = scheduleNext;
  }, [scheduleNext]);

  // Nada de timeouts sueltos al desmontar la tarjeta o al cambiar de ruta.
  useEffect(() => clearTimers, [clearTimers]);

  // Fin de partida: deja de jugar, limpia los timeouts pendientes y decide si
  // hay caldo o no. Se invoca DESDE un callback (el reloj o un toque), nunca
  // desde el cuerpo de un efecto: un setState en el cuerpo encadena renders.
  const finish = useCallback(
    (ganado: boolean) => {
      setPlaying(false);
      clearTimers();
      setActive(null);
      if (ganado) setWon(true);
      else setFallos(true);
    },
    [clearTimers],
  );

  // Reloj de la partida: un toque por segundo, no un render por frame. Vive en
  // una ref para que el callback pueda decidir el final sin leer estado viejo.
  const timeRef = useRef(PARTIDA_SEG);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      timeRef.current = Math.max(0, timeRef.current - 1);
      setTimeLeft(timeRef.current);
      if (timeRef.current === 0) finish(false);
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, finish]);

  useEffect(() => {
    if (won) onSolved();
  }, [won, onSolved]);


  const start = useCallback(() => {
    clearTimers();
    setScore(0);
    timeRef.current = PARTIDA_SEG;
    setTimeLeft(PARTIDA_SEG);
    setActive(null);
    setWon(false);
    setFallos(false);
    setPlaying(true);
    scheduleNext();
  }, [clearTimers, scheduleNext]);

  const tap = useCallback(
    (win: number) => {
      if (!playing || !active || active.win !== win) return;
      clearTimers();
      setActive(null);
      const siguiente = score + 1;
      setScore(siguiente);
      // Al completar el objetivo se termina al instante: no se espera al reloj.
      if (siguiente >= OBJETIVO_ATRAPA) {
        finish(true);
        return;
      }
      scheduleNext();
    },
    [playing, active, score, clearTimers, scheduleNext, finish],
  );

  return (
    <div className="juego-card">
      <h3>
        <FaBullseye aria-hidden="true" /> El Atrapacabezudos
      </h3>
      <p className="juego-hint">
        Toca al cabezudo antes de que se esconda entre las ventanas del Ayuntamiento. ¡Atrapa{' '}
        {OBJETIVO_ATRAPA} en {PARTIDA_SEG} s y gana dos estrellas!
      </p>

      <div className="juego-ayto" role="group" aria-label="Ventanas del Ayuntamiento">
        {Array.from({ length: WINDOWS }, (_, i) => {
          const abierto = active?.win === i;
          return (
            <button
              key={i}
              type="button"
              className={`juego-ventana${abierto ? ' is-open' : ''}`}
              onClick={() => tap(i)}
              disabled={!playing}
              aria-label={
                abierto ? `Cabezudo en la ventana ${i + 1}: ¡toca ya!` : `Ventana ${i + 1}`
              }
            >
              <span
                className="juego-ventana-cabezudo"
                aria-hidden="true"
                style={abierto ? { color: active.color } : undefined}
              >
                {abierto ? active.emoji : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="juego-atrapa-hud">
        <span className="juego-atrapa-score">
          <FaStar aria-hidden="true" /> {score} / {OBJETIVO_ATRAPA}
        </span>
        <span className={`juego-atrapa-time${timeLeft <= 10 ? ' is-urgent' : ''}`}>
          {timeLeft} s
        </span>
      </div>

      {!playing && (
        <button type="button" className="juego-reset" onClick={start}>
          <FaRedo aria-hidden="true" /> {score > 0 || won ? 'Otra partida' : 'Empezar'}
        </button>
      )}

      {won && (
        <motion.div
          className="juego-success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <FaTrophy aria-hidden="true" /> ¡{OBJETIVO_ATRAPA} cabezudos atrapados!
        </motion.div>
      )}

      {fallos && !playing && !won && (
        <div className="juego-hint" role="status">
          ¡Casi! Has atrapado {score} de {OBJETIVO_ATRAPA}. Vuelve a intentarlo.
        </div>
      )}
    </div>
  );
};



// -----------------------------------------------------------------------------
// Pagina
// -----------------------------------------------------------------------------

export const JuegoPeque: React.FC = () => {
  const { progress, complete, touch } = useGamesProgress();

  // Una visita cuenta para la racha aunque no se supere ningun reto: asi la
  // racha premia la constancia, que es lo que fideliza la visita diaria.
  useEffect(() => {
    touch();
  }, [touch]);

  const handleRiddleSolved = useCallback(
    (key: string) => complete('riddle', key),
    [complete]
  );
  const handleMemorySolved = useCallback(() => complete('memory'), [complete]);
  const handleWordSearchSolved = useCallback(() => complete('wordsearch'), [complete]);
  const handleColoringSolved = useCallback(() => complete('riddle'), [complete]);
  // El Atrapacabezudos tiene SU propio contador: no suma a memoria ni a la
  // sopa, para que el álbum de cromos distinga de dónde vinieron las estrellas.
  const handleAtrapadosSolved = useCallback(() => complete('atrapa'), [complete]);

  return (
    <div className="juegos-page layout-container">
      <motion.section
        className="juegos-hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1>Juegos Peque</h1>
        <p>
          Retos rápidos con los gigantes y cabezudos de las fiestas del Pilar.
          Sin descargas, sin registro y sin publicidad: se juega en el móvil
          mientras se espera a la comparsa.
        </p>
        <div className="juegos-score">
          <span className="juegos-score-item">
            <FaStar /> <strong>{progress.stars}</strong> estrellas
          </span>
          <span className="juegos-score-item">
            <FaFire /> racha de <strong>{progress.streak}</strong>{' '}
            {progress.streak === 1 ? 'día' : 'días'}
          </span>
        </div>
      </motion.section>

      <div className="juegos-grid">
        <RiddleGame onSolved={handleRiddleSolved} />
        <MemoryGame onSolved={handleMemorySolved} />
        <WordSearchGame onSolved={handleWordSearchSolved} />
        <Atrapacabezudos onSolved={handleAtrapadosSolved} />
        <ColoringGame onSolved={handleColoringSolved} />
        <StickerAlbum stars={progress.stars} />
      </div>

      <p className="juegos-note">
        Las estrellas se guardan solo en este dispositivo (no hay cuentas ni
        datos personales). Los personajes y barrios de los retos son los mismos
        que aparecen en la enciclopedia de la app.
      </p>
    </div>
  );
};

export default JuegoPeque;
