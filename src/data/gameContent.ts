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
