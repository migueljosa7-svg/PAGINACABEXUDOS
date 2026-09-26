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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaStar,
  FaFire,
  FaQuestionCircle,
  FaLayerGroup,
  FaFont,
  FaTrophy,
  FaRedo,
} from 'react-icons/fa';
import {
  MEMORY_CARDS,
  RIDDLE_ENTRIES,
  WORDSEARCH_WORDS,
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
              {show ? (
                <>
                  <span className="juego-card-emoji" style={{ color: meta?.color }}>
                    {meta?.emoji}
                  </span>
                  <span className="juego-card-label">{meta?.label}</span>
                </>
              ) : (
                <span aria-hidden="true">?</span>
              )}
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

const WordSearchGame: React.FC<{ onSolved: () => void }> = ({ onSolved }) => {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<Array<{ r: number; c: number }>>([]);
  const [found, setFound] = useState<FoundWord[]>([]);

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

  const toggleCell = useCallback(
    (r: number, c: number) => {
      setSelected((prev) => {
        const next = [...prev, { r, c }];
        const text = next.map((cell) => puzzle.grid[cell.r][cell.c]).join('');
        const reversed = text.split('').reverse().join('');

        const hit = puzzle.placed.find(
          (w) => (w.word === text || w.word === reversed) && !found.some((f) => f.word === w.word)
        );
        if (hit) {
          setFound((f) => [...f, hit]);
          setSelected([]);
        } else if (next.length >= Math.max(2, puzzle.placed[0]?.word.length ?? 2)) {
          // Se descarta una seleccion que no forma ninguna palabra.
          setSelected([]);
        }
        return next.length > 1 ? [] : next;
      });
    },
    [puzzle, found]
  );

  useEffect(() => {
    if (found.length > 0 && found.length === puzzle.placed.length) onSolved();
  }, [found, puzzle.placed.length, onSolved]);

  const restart = useCallback(() => {
    setRound((r) => r + 1);
    setSelected([]);
    setFound([]);
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

      <div className="juego-wordsearch" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
        {puzzle.grid.map((row, r) =>
          row.map((letter, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              className={`juego-cell ${isHighlighted(r, c)}`}
              onClick={() => toggleCell(r, c)}
              aria-label={`Letra ${letter}`}
            >
              {letter}
            </button>
          ))
        )}
      </div>

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
