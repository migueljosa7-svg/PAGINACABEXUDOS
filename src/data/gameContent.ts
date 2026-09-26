/**
 * Contenido de la seccion "Juegos Peques".
 *
 * Datos derivados de la fuente de verdad del proyecto (enciclopedia y
 * singleSource) para que los retos no se inventen personajes: si mañana se
 * actualiza la enciclopedia, la adivinanza sigue siendo coherente con ella.
 */

import { enciclopediaData } from './enciclopediaData';
import { barrios } from './singleSource';

export interface RiddleEntry {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** Pista corta, apta para niños de 6-10 años. */
  clue: string;
  copla?: string;
}

// Solo los cabezudos municipales: son los personajes que los niños buscan en
// la calle y los que la enciclopedia documenta con historia propia.
export const RIDDLE_ENTRIES: RiddleEntry[] = enciclopediaData
  .filter((e) => e.type === 'cabezudo')
  .map((e) => ({
    id: e.id,
    name: e.name,
    emoji: e.emoji,
    color: e.colors[0]?.hex ?? '#D1121F',
    clue: e.personality.split('.')[0]?.trim() || `Personaje tradicional de las fiestas del Pilar.`,
    copla: e.copla,
  }));

export interface MemoryCard {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

/** Parejas para el juego de memoria (6 parejas = 12 cartas). */
export const MEMORY_CARDS: MemoryCard[] = enciclopediaData
  .filter((e) => e.type === 'cabezudo')
  .slice(0, 6)
  .map((e) => ({
    id: e.id,
    label: e.name,
    emoji: e.emoji,
    color: e.colors[0]?.hex ?? '#D1121F',
  }));

/**
 * Palabras para la sopa de letras: barrios y personajes.
 *
 * Se normalizan a mayusculas SIN ESPACIOS ni tildes (la Ñ se conserva) porque
 * la cuadricula solo admite letras: un espacio o una tilde harian fallar el
 * `placeWord` y la palabra no apareceria nunca en el tablero.
 */
export const WORDSEARCH_WORDS: Array<{ word: string; hint: string }> = [
  ...barrios.slice(0, 6).map((b) => ({
    word: b.nombre.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ''),
    hint: 'Barrio de Zaragoza',
  })),
  ...enciclopediaData
    .filter((e) => e.type === 'cabezudo')
    .slice(0, 4)
    .map((e) => ({
      word: e.name
        .replace(/^(El|La)\s+/i, '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ''),
      hint: 'Cabezudo',
    })),
].filter((w) => w.word.length >= 4);

/**
 * Generador pseudoaleatorio con semilla (mulberry32). Permite que el reto
 * diario sea SIEMPRE el mismo para todo el mundo y que la sopa de letras sea
 * distinta cada partida sin depender de Math.random.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Barajado Fisher-Yates con la semilla indicada. */
export function shuffleSeeded<T>(items: T[], seed: number): T[] {
  const rand = seededRandom(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Semilla estable del día (AAAA-MM-DD -> número). */
export function dailySeed(date: Date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/** Reto de adivinanza del día: el mismo para todos durante 24 h. */
export function dailyRiddle(date: Date = new Date()): RiddleEntry {
  return RIDDLE_ENTRIES[dailySeed(date) % RIDDLE_ENTRIES.length];
}

// -----------------------------------------------------------------------------
// Lienzo de colorear y álbum de cromos
// -----------------------------------------------------------------------------

/**
 * Figuras para colorear.
 *
 * Se generan a partir de los personajes reales de la enciclopedia: cada figura
 * tiene una silueta simple (formas SVG rellenas por el niño) y una paleta de
 * los colores tradicionales del personaje. Al ser vector y estar parametrizado,
 * no hace falta ningún asset nuevo ni conexión: el lienzo es un SVG con
 * `fill` controlado por el estado.
 */
export interface ColoringFigure {
  id: string;
  name: string;
  emoji: string;
  /** Paleta sugerida: el niño puede cambiar cualquier color. */
  palette: string[];
  /**
   * Partes de la figura. Cada parte es una figura SVG que se pinta de un
   * color; `d` usa el viewBox 0 0 100 100.
   */
  parts: Array<{ id: string; d: string; hint: string }>;
}

const svgPath = { fillRule: 'evenodd' as const };

/** Figuras compartidas: cabeza con cara, tocado y cuerpo. */
const figureTemplates: ColoringFigure[] = [
  {
    id: 'fig-morico',
    name: 'El Morico',
    emoji: '🏇',
    palette: ['#1565C0', '#D32F2F', '#FFD700', '#A0522D'],
    parts: [
      // cabeza
      { id: 'head', d: 'M50 18a22 22 0 1 1 0 44 22 22 0 0 1 0-44z', hint: 'la cara', ...svgPath },
      // gorro de jockey
      { id: 'hat', d: 'M26 22h48l-4-8H30zM30 14h40l-2-6H32z', hint: 'la gorra', ...svgPath },
      // cuerpo
      { id: 'body', d: 'M28 60h44l6 32H22z', hint: 'el cuerpo', ...svgPath },
      // brazos
      { id: 'arms', d: 'M22 62l-12 18 8 6 12-16zM78 62l12 18-8 6-12-16z', hint: 'los brazos', ...svgPath },
    ],
  },
  {
    id: 'fig-forana',
    name: 'La Forana',
    emoji: '🌾',
    palette: ['#B71C1C', '#FFD700', '#6D4C41', '#F06292'],
    parts: [
      { id: 'head', d: 'M50 20a20 20 0 1 1 0 40 20 20 0 0 1 0-40z', hint: 'la cara', ...svgPath },
      { id: 'hair', d: 'M28 26c0-10 10-16 22-16s22 6 22 16c0 6-4 8-4 8s-2-8-18-8-18 8-18 8-4-2-4-8z', hint: 'el pelo', ...svgPath },
      { id: 'body', d: 'M26 62h48l8 30H18z', hint: 'la falda', ...svgPath },
      { id: 'basket', d: 'M74 70h18l-3 14H77z', hint: 'la cesta', ...svgPath },
    ],
  },
  {
    id: 'fig-tuerto',
    name: 'El Tuerto',
    emoji: '👁️',
    palette: ['#263238', '#D84315', '#ECEFF1', '#8D6E63'],
    parts: [
      { id: 'head', d: 'M50 20a21 21 0 1 1 0 42 21 21 0 0 1 0-42z', hint: 'la cara', ...svgPath },
      { id: 'hat', d: 'M24 24h52l-6-10H30z', hint: 'el sombrero', ...svgPath },
      { id: 'coat', d: 'M28 62h44l4 30H24z', hint: 'la chaqueta', ...svgPath },
    ],
  },
  {
    id: 'fig-berrugon',
    name: 'El Berrugón',
    emoji: '👴',
    palette: ['#4E342E', '#FFD54F', '#3E2723', '#A1887F'],
    parts: [
      { id: 'head', d: 'M50 20a20 20 0 1 1 0 40 20 20 0 0 1 0-40z', hint: 'la cara', ...svgPath },
      { id: 'beard', d: 'M32 40c0 14 8 22 18 22s18-8 18-22c0 0-6 8-18 8s-18-8-18-8z', hint: 'la barba', ...svgPath },
      { id: 'body', d: 'M28 64h44l5 28H23z', hint: 'el traje', ...svgPath },
    ],
  },
  {
    id: 'fig-pilara',
    name: 'La Pilarara',
    emoji: '👑',
    palette: ['#C2185B', '#FFD700', '#7B1FA2', '#FFF176'],
    parts: [
      { id: 'head', d: 'M50 22a20 20 0 1 1 0 40 20 20 0 0 1 0-40z', hint: 'la cara', ...svgPath },
      { id: 'crown', d: 'M28 22l6-12 8 8 8-12 8 12 8-8 6 12z', hint: 'la corona', ...svgPath },
      { id: 'dress', d: 'M28 64h44l10 28H18z', hint: 'el vestido', ...svgPath },
    ],
  },
  {
    id: 'fig-berrugon-rey',
    name: 'El Rey',
    emoji: '🕺',
    palette: ['#6A1B9A', '#FFD700', '#F5F5F5', '#FF8F00'],
    parts: [
      { id: 'head', d: 'M50 22a19 19 0 1 1 0 38 19 19 0 0 1 0-38z', hint: 'la cara', ...svgPath },
      { id: 'crown', d: 'M30 22l4-10 8 7 8-11 8 11 8-7 4 10z', hint: 'la corona', ...svgPath },
      { id: 'cloak', d: 'M24 64h52l8 28H16z', hint: 'la capa', ...svgPath },
    ],
  },
];

export const COLORING_FIGURES: ColoringFigure[] = figureTemplates;

/** Cromo del album: un personaje y las estrellas necesarias para desbloquearlo. */
export interface Sticker {
  id: string;
  name: string;
  emoji: string;
  color: string;
  starsNeeded: number;
}

export const STICKER_ALBUM: Sticker[] = [
  { id: 'st-morico', name: 'El Morico', emoji: '🏇', color: '#1565C0', starsNeeded: 1 },
  { id: 'st-forana', name: 'La Forana', emoji: '🌾', color: '#B71C1C', starsNeeded: 2 },
  { id: 'st-tuerto', name: 'El Tuerto', emoji: '👁️', color: '#263238', starsNeeded: 4 },
  { id: 'st-berrugon', name: 'El Berrugón', emoji: '👴', color: '#4E342E', starsNeeded: 6 },
  { id: 'st-pilara', name: 'La Pilarara', emoji: '👑', color: '#C2185B', starsNeeded: 9 },
  { id: 'st-reina', name: 'La Reina', emoji: '👸', color: '#6A1B9A', starsNeeded: 12 },
];
