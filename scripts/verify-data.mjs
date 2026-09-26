#!/usr/bin/env node
/**
 * Validacion de la fuente de verdad de datos, EJECUTADA de verdad.
 *
 * Por que existe: `runSingleSourceValidationGuard()` se invoca desde main.tsx,
 * pero Rollup/Vite NO ejecutan el bundle durante el build. Por eso un
 * `npm run build` puede terminar en verde y, al abrir la pagina en el movil,
 * reventar con "singleSource validation failed". Asi que un build verde NO
 * demuestra que los datos sean coherentes.
 *
 * Este script compila singleSource + el validador y los EJECUTA en Node, que es
 * exactamente lo que hara el navegador al arrancar. Si aqui falla, fallara en
 * produccion.
 *
 * Uso: node scripts/verify-data.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'node_modules', '.tmp');
const OUTFILE = join(OUT_DIR, 'singleSource.verify.mjs');

mkdirSync(OUT_DIR, { recursive: true });

await esbuild.build({
  stdin: {
    contents: `
      export { barrios, barriosById, getAllBarrioIds } from './src/data/singleSource';
      export { validateSingleSource } from './src/data/singleSourceValidator';
      export { runSingleSourceValidationGuard } from './src/data/singleSourceValidationGuard';
      export { PRUEBA_BARRIO_ID, normalizePruebaBarrioId } from './src/data/pruebaBarrioRoute';
    `,
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: OUTFILE,
  logLevel: 'error',
});

const {
  barrios,
  barriosById,
  validateSingleSource,
  runSingleSourceValidationGuard,
  PRUEBA_BARRIO_ID,
  normalizePruebaBarrioId,
} = await import(`file://${OUTFILE.replace(/\\/g, '/')}`);

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// 0) EL GUARD DE PRODUCCION. main.tsx llama exactamente a esta funcion al
// arrancar; si lanza aqui, la pagina queda en blanco en Render. Es el punto de
// fallo que reportaste, asi que se ejecuta de verdad y no solo su validacion.
let guardError = null;
try {
  runSingleSourceValidationGuard();
  check('runSingleSourceValidationGuard() no lanza (arranque en produccion)', true);
} catch (err) {
  guardError = err;
  check('runSingleSourceValidationGuard() no lanza (arranque en produccion)', false,
    err?.message || String(err));
}

// 0.b) El normalizador debe ser idempotente: aplicarlo dos veces no duplica el
// prefijo, que era exactamente el bug corregido.
check('normalizePruebaBarrioId es idempotente',
  normalizePruebaBarrioId(normalizePruebaBarrioId('x')) === 'prueba-barrio-x',
  normalizePruebaBarrioId(normalizePruebaBarrioId('x')));
check('normalizePruebaBarrioId no toca un id ya prefijado',
  normalizePruebaBarrioId(PRUEBA_BARRIO_ID) === PRUEBA_BARRIO_ID,
  normalizePruebaBarrioId(PRUEBA_BARRIO_ID));

// 1) La propia validacion: esto es lo que revienta en produccion.
let validation = null;
try {
  validation = validateSingleSource();
  check('validateSingleSource() no lanza', true);
} catch (err) {
  check('validateSingleSource() no lanza', false, err?.message || String(err));
}

if (validation) {
  check('singleSource no reporta inconsistencias', validation.ok,
    validation.ok ? '0 issues' : `${validation.issues.length} issues`);
  for (const issue of validation.issues) {
    console.log(`      - [${issue.code}] ${issue.message}`);
  }
}

// 2) El caso concreto que reventaba: prefijo duplicado en la demo.
// El id canonico viene del propio modulo de datos: si cambia alli, esta
// comprobacion sigue siendo valida sin editar el test.
const demo = barrios.find((b) => b.id === PRUEBA_BARRIO_ID);
check('Existe el barrio de la demo con el ID canonico', Boolean(demo), `id=${PRUEBA_BARRIO_ID}`);

if (demo) {
  check('demo.recorrido.barrioId === demo.id', demo.recorrido.barrioId === demo.id,
    `barrioId=${demo.recorrido.barrioId} id=${demo.id}`);
  check('El barrio de la demo esta en barriosById', barriosById.get(demo.id) === demo);
}

// 3) Ningun ID con el prefijo duplicado debe existir en ningun sitio.
const doubled = getDoubledPrefixIds();
check('Ningun ID duplica el prefijo "prueba-barrio-"', doubled.length === 0,
  doubled.length ? doubled.join(', ') : 'ninguno');

// 4) Invariante general: ningun recorrido puede apuntar a un barrio inexistente.
const orphans = barrios
  .filter((b) => !barriosById.get(b.recorrido.barrioId))
  .map((b) => `${b.recorrido.id} -> ${b.recorrido.barrioId}`);
check('Ningun recorrido apunta a un barrio inexistente', orphans.length === 0,
  orphans.length ? orphans.join(', ') : 'ninguno');

function getDoubledPrefixIds() {
  const found = [];
  for (const b of barrios) {
    for (const id of [b.id, b.recorrido.id, b.recorrido.barrioId]) {
      if (typeof id === 'string' && id.includes('prueba-barrio-prueba-barrio-')) found.push(id);
    }
  }
  return Array.from(new Set(found));
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
if (failed.length) {
  console.log('FALLOS:');
  for (const f of failed) console.log(` - ${f.name}`);
  process.exit(1);
}
process.exit(0);
