#!/usr/bin/env node
/**
 * Exporta el catálogo de comercio local a `public/api/comercios.json`.
 *
 * Por qué existe: el catálogo de verdad es `src/data/patrocinadores.ts`
 * (TypeScript del bundle). El servidor (`server.js`) lo necesita para validar
 * que el `comercioId` que envía el panel municipal existe de verdad, pero no
 * puede importar un `.ts` sin duplicar la lista a mano — y una lista duplicada
 * se queda vieja en cuanto se alta un comercio nuevo, que es exactamente cuando
 * el técnico recibe un "comercio inválido" sin entender por qué.
 *
 * Este script compila el módulo con esbuild (la misma técnica que
 * `verify-municipio.mjs`) y escribe el JSON. Así el servidor y el cliente leen
 * del MISMO fichero, y `verify:municipio` falla si alguien olvida regenerarlo
 * después de tocar el catálogo.
 *
 * Es idempotente: se ejecuta en `npm run build`, antes de `vite build`.
 *
 * Uso: node scripts/export-comercios.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'node_modules', '.tmp');
const SALIDA = join(ROOT, 'public', 'api', 'comercios.json');

mkdirSync(OUT_DIR, { recursive: true });

const tmp = join(OUT_DIR, 'comercios.export.mjs');
await esbuild.build({
  stdin: {
    contents: `export * from './src/data/patrocinadores';`,
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: tmp,
  logLevel: 'error',
});

const mod = await import(`file://${tmp.replace(/\\/g, '/')}`);

// Solo los campos que el servidor y el mapa necesitan. Se recortan a proposito:
// el fichero acaba en `public/`, es decir, servible por cualquiera, y no tiene
// por que llevar datos de contacto internos de los locales de ejemplo.
const comercios = mod.PATROCINADORES.map((p) => ({
  id: p.id,
  nombre: p.nombre,
  categoria: p.categoria,
  nivel: p.nivel,
  direccion: p.direccion,
  lat: p.lat,
  lng: p.lng,
  gancho: p.gancho,
  franja: p.franja ?? null,
  demostracion: p.demostracion === true,
}));

mkdirSync(dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, `${JSON.stringify({GeneratedAt: new Date().toISOString(), comercios }, null, 2)}\n`, 'utf8');

console.log(`[export-comercios] ${comercios.length} comercios -> public/api/comercios.json`);
