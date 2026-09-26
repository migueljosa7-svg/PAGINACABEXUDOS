/**
 * Prueba de humo de la logica de juegos (sin navegador).
 *
 * Verifica que los datos derivados existen y que los generadores son
 * deterministas: si un reto diario cambiara de una visita a otra, los niños
 * verian una adivinanza distinta cada vez que recargan.
 *
 * Uso: node scripts/verify-games.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// Se compila gameContent.ts a un modulo temporal para poder importarlo.
const outfile = join(ROOT, 'node_modules', '.tmp', 'gameContent.verify.mjs');
await esbuild.build({
  entryPoints: [join(ROOT, 'src', 'data', 'gameContent.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'error',
});

const {
  RIDDLE_ENTRIES,
  MEMORY_CARDS,
  WORDSEARCH_WORDS,
  dailyRiddle,
  dailySeed,
  shuffleSeeded,
  seededRandom,
} = await import(`file://${outfile.replace(/\\/g, '/')}`);

check('Hay entradas de adivinanza', RIDDLE_ENTRIES.length >= 4, `n=${RIDDLE_ENTRIES.length}`);
check(
  'Toda entrada tiene pista no vacia',
  RIDDLE_ENTRIES.every((e) => typeof e.clue === 'string' && e.clue.length > 10),
);
check('Hay parejas para memoria', MEMORY_CARDS.length >= 6, `n=${MEMORY_CARDS.length}`);
check('Hay palabras para la sopa', WORDSEARCH_WORDS.length >= 5, `n=${WORDSEARCH_WORDS.length}`);
check(
  'Las palabras de la sopa son solo A-Z y Ñ',
  WORDSEARCH_WORDS.every((w) => /^[A-ZÑ ]+$/.test(w.word)),
  WORDSEARCH_WORDS.map((w) => w.word).join(', '),
);

// Determinismo: el reto del dia no debe cambiar entre visitas.
const d1 = dailyRiddle(new Date(2026, 0, 15));
const d2 = dailyRiddle(new Date(2026, 0, 15));
check('La adivinanza diaria es estable', d1.id === d2.id, `${d1.name}`);

const d3 = dailyRiddle(new Date(2026, 0, 16));
check('La adivinanza cambia de un dia a otro', d1.id !== d3.id || RIDDLE_ENTRIES.length === 1);

// La semilla diaria es un entero estable.
check('dailySeed es numerico', Number.isFinite(dailySeed(new Date(2026, 0, 15))));

// shuffle determinista y sin perder elementos.
const base = [1, 2, 3, 4, 5, 6, 7, 8];
const s1 = shuffleSeeded(base, 42);
const s2 = shuffleSeeded(base, 42);
check('shuffle es determinista con la misma semilla', JSON.stringify(s1) === JSON.stringify(s2));
check('shuffle conserva todos los elementos', s1.slice().sort((a, b) => a - b).join() === base.join());
check('shuffle no devuelve el orden original', JSON.stringify(s1) !== JSON.stringify(base));

// PRNG en rango [0,1).
const rand = seededRandom(7);
let inRange = true;
for (let i = 0; i < 1000; i += 1) {
  const v = rand();
  if (!(v >= 0 && v < 1)) inRange = false;
}
check('seededRandom devuelve valores en [0,1)', inRange);

// --- Replica del algoritmo de la sopa de letras de JuegoPeque.tsx ------------
// Si la cuadricula no contiene las palabras, el juego es injugable: es el unico
// modo de fallo que no se ve leyendo el codigo a simple vista.
const GRID_SIZE = 11;
const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];

function placeWord(grid, word, rand) {
  const letters = word.replace(/[^A-ZÑ]/g, '').split('');
  if (letters.length === 0 || letters.length > GRID_SIZE) return null;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const dir = DIRS[Math.floor(rand() * DIRS.length)];
    const r0 = Math.floor(rand() * GRID_SIZE);
    const c0 = Math.floor(rand() * GRID_SIZE);
    const endR = r0 + dir[0] * (letters.length - 1);
    const endC = c0 + dir[1] * (letters.length - 1);
    if (endR < 0 || endR >= GRID_SIZE || endC < 0 || endC >= GRID_SIZE) continue;
    const cells = [];
    let fits = true;
    for (let i = 0; i < letters.length; i += 1) {
      const r = r0 + dir[0] * i;
      const c = c0 + dir[1] * i;
      const current = grid[r][c];
      if (current !== '' && current !== letters[i]) { fits = false; break; }
      cells.push({ r, c });
    }
    if (!fits) continue;
    cells.forEach(({ r, c }, i) => { grid[r][c] = letters[i]; });
    return cells;
  }
  return null;
}

let boardsOk = 0;
let boardsChecked = 0;
for (let round = 0; round < 50; round += 1) {
  const seed = 20260101 + round * 7919;
  const r = seededRandom(seed);
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(''));
  const words = shuffleSeeded(WORDSEARCH_WORDS, seed).slice(0, 5);
  const placed = [];
  for (const { word } of words) {
    const cells = placeWord(grid, word, r);
    if (cells) placed.push({ word, cells });
  }
  boardsChecked += 1;
  // Cada palabra colocada debe ser legible en la cuadícula.
  const allReadable = placed.every((p) => p.cells.every((cell) => grid[cell.r][cell.c] === p.word[cell_r(p, cell)]));
  const lettersOk = placed.every((p) => p.cells.length === p.word.length);
  if (placed.length >= 3 && allReadable && lettersOk) boardsOk += 1;
  else if (round === 0) {
    check('Sopa: las palabras colocadas se leen en la cuadícula', false, `colocadas=${placed.length}`);
  }
}
check('Sopa: 50 tableros generables y legibles', boardsOk === boardsChecked, `${boardsOk}/${boardsChecked}`);

function cell_r(p, cell) {
  return p.cells.indexOf(cell);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
if (failed.length) {
  console.log('FALLOS:');
  for (const f of failed) console.log(` - ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
