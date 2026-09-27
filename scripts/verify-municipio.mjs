#!/usr/bin/env node
/**
 * Verificación de las tres capas nuevas (programa, patrocinio, panel B2G).
 *
 * Por qué existe: los tres módulos son cálculo puro (distancias, radios,
 * detección de paradas) y es exactamente donde se cuelan los errores silenciosos
 * — un metro de más en un radio y el local nunca se destaca; una parada de 3 s
 * que se cuela y la tabla de tiempos de parada del ayuntamiento miente.
 * Un `tsc` en verde no detecta nada de eso.
 *
 * Se compilan los `.ts` con esbuild (igual que `verify-data.mjs`) y el módulo
 * de analítica del servidor se importa directamente: es JS ESM sin dependencias.
 *
 * Uso: node scripts/verify-municipio.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'node_modules', '.tmp');
mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// ── 1) Capa TS del frontend ────────────────────────────────────────────────
const tsOutfile = join(OUT_DIR, 'municipio.verify.mjs');
await esbuild.build({
  stdin: {
    contents: `
      export * from './src/data/programaDelDia';
      export * from './src/data/patrocinadores';
      export * from './src/services/patrocinio';
      export { calendarEvents } from './src/data/calendarData';
    `,
    resolveDir: ROOT,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: tsOutfile,
  logLevel: 'error',
});

const front = await import(`file://${tsOutfile.replace(/\\/g, '/')}`);

// ── 2) Analítica del servidor (JS puro, sin compilar) ──────────────────────
const back = await import(`file://${join(ROOT, 'server', 'municipalAnalytics.js').replace(/\\/g, '/')}`);

console.log('── PROGRAMA DEL DÍA ─────────────────────────────────────');

// El recorrido municipal de referencia tiene que existir y tener geometría:
// sin él TODO el cálculo de proximidad devolvería `null` y la sección publicaría
// un "fuera del recorrido" para cada acto.
const puntos = front.recorridoPrograma();
check('El recorrido de referencia tiene waypoints', puntos.length >= 2, `n=${puntos.length}`);

const idsCalendario = new Set(front.calendarEvents.map((e) => e.id));
const anclajesHuerfanos = Object.keys(front.PROGRAMA_ANCLAJES).filter((id) => !idsCalendario.has(id));
check(
  'Todo anclaje apunta a un evento real del calendario',
  anclajesHuerfanos.length === 0,
  anclajesHuerfanos.length ? anclajesHuerfanos.join(', ') : 'sin huérfanos',
);

// Un día con programa conocido (12 de octubre de 2025: Pilar) debe devolver
// actos, y al menos uno debe caer junto al recorrido.
const pilar = front.buildProgramaDelDia(new Date(2025, 9, 12));
check('El día del Pilar tiene actos', pilar.total > 0, `total=${pilar.total}`);
check('Marca esos actos como "hoy"', pilar.esHoy === true);
check('Detecta actos junto al recorrido', pilar.totalEnRecorrido > 0, `${pilar.totalEnRecorrido} de ${pilar.total}`);
check('Los destacados no superan el máximo', pilar.destacados.length <= front.PROGRAMA_MAX_DESTACADOS, `${pilar.destacados.length}`);
check('Todo destacado está realmente en el recorrido', pilar.destacados.every((i) => i.enRecorrido));
check(
  'Los destacados llegan ordenados por cercanía',
  pilar.destacados.every((d, i, arr) => i === 0 || (arr[i - 1].distanciaAlRecorridoM ?? 0) <= (d.distanciaAlRecorridoM ?? 0)),
);
check(
  'Los actos vienen ordenados por hora',
  (() => {
    const horas = pilar.items.map((i) => i.evento.time ?? '99:99');
    return horas.every((h, i) => i === 0 || horas[i - 1] <= h);
  })(),
  pilar.items.map((i) => i.evento.time ?? '-').join(' '),
);

// Un día sin programa (3 de julio) NO debe fingir que hay actos: debe ofrecer
// el próximo día con programación y decirlo en el resumen.
const julio = front.buildProgramaDelDia(new Date(2026, 6, 3));
check('Un día sin actos no se presenta como "hoy"', julio.esHoy === false, `fecha=${julio.fechaActos}`);
check('Un día sin actos ofrece el próximo con programa', julio.total > 0, julio.fechaActos);
check('Avisa de que hoy no hay acto', julio.avisos.length > 0, julio.avisos[0] ?? '');
check('El resumen lo dice explícitamente', /no hay acto/i.test(julio.resumen), julio.resumen);

console.log('\n── PATROCINIO (HOSTELERÍA Y COMERCIO) ───────────────────');

check('El catálogo tiene fichas de alta', front.PATROCINADORES.length >= 6, `n=${front.PATROCINADORES.length}`);
check(
  'Todas las coordenadas están en Zaragoza',
  front.PATROCINADORES.every((p) => p.lat > 41.4 && p.lat < 41.8 && p.lng > -1.1 && p.lng < -0.7),
);
check(
  'No hay ids duplicados',
  new Set(front.PATROCINADORES.map((p) => p.id)).size === front.PATROCINADORES.length,
);
check(
  'Toda ficha tiene gancho y descripción',
  front.PATROCINADORES.every((p) => p.gancho.length > 5 && p.descripcion.length > 10),
);
check('El aviso de demostración es explícito', /no implican acuerdo/i.test(front.PATROCINIO_AVISO_DEMO));

// La dinámica: parado EN un patrocinador debe salir destacado a 0 m.
const bar = front.PATROCINADORES[0];
check('En la puerta del local la distancia es 0', front.distanciaAPatrocinador(bar, bar) < 1);
check('A 0 m el local está DESTACADO', front.clasificaProximidad(0) === 'destacado');
check('A 100 m todavía está destacado', front.clasificaProximidad(100) === 'destacado');
check('A 151 m pasa a "cerca"', front.clasificaProximidad(151) === 'cerca');
check('A 401 m pasa a "lejano"', front.clasificaProximidad(401) === 'lejano');
check(
  'Los límites coinciden con las constantes',
  front.PATROCINIO_RADIO_DESTACADO_M === 150 && front.PATROCINIO_RADIO_CERCA_M === 400,
);

const enMarcha = front.patrociniosEnMarcha(bar, { velocidadMs: 1.2 });
check('En la puerta hay al menos un local en marcha', enMarcha.length >= 1, `${enMarcha.length} locales`);
check('El primer local de la lista está destacado', enMarcha[0].proximidad === 'destacado', enMarcha[0].nombre);
check(
  'La lista viene ordenada por distancia',
  enMarcha.every((p, i, a) => i === 0 || a[i - 1].distanciaM <= p.distanciaM),
);
check('Con velocidad conocida hay ETA', enMarcha.some((p) => p.minutosEstimados != null));
check('ETA: parado = null (no se inventa)', front.minutosHastaPatrocinador(500, 0) === null);
check('ETA: sin velocidad = null', front.minutosHastaPatrocinador(500, null) === null);
check('ETA: 600 m a 1,2 m/s = 8 min', front.minutosHastaPatrocinador(600, 1.2) === 8, String(front.minutosHastaPatrocinador(600, 1.2)));
check('ETA: distancia 0 = 0 min', front.minutosHastaPatrocinador(0, 1.2) === 0);

// Filtrado por categoría (lo que usan los chips de la página).
const soloBares = front.patrociniosPorProximidad(bar, { solo: ['bar'] });
check('El filtro por categoría respeta `solo`', soloBares.every((p) => p.categoria === 'bar'), `${soloBares.length} bares`);

// Distancia al POLÍGONO del recorrido (lo que usa la página antes de salir).
const sobreRecorrido = front.patrociniosSobreRecorrido(puntos);
check('Hay locales sobre el recorrido de referencia', sobreRecorrido.length > 0, `${sobreRecorrido.length}`);
check('Todos están dentro del radio', sobreRecorrido.every((p) => p.distanciaM <= front.PATROCINIO_RADIO_CERCA_M));
check(
  'Ordenados por cercanía al trazado',
  sobreRecorrido.every((p, i, a) => i === 0 || a[i - 1].distanciaM <= p.distanciaM),
);
check('Sin recorrido no inventa distancia', front.distanciaAlRecorrido(bar, []) === Infinity);


console.log('\n── PANEL MUNICIPAL (B2G) ────────────────────────────────');

back.reiniciar();
check('Arranca sin salas', back.numSalas() === 0);

// Un emisor que recorre ~100 m en 10 s: distancia y duración deben ser exactas.
const t0 = 1700000000000;
for (let i = 0; i <= 10; i++) {
  back.registrarFix({ roomId: 'sala-test', lat: 41.656 + i * 0.0009, lng: -0.878, speed: 1.1, at: t0 + i * 1000 });
}
let r = back.resumen({ roomId: 'sala-test' });
check('Hay muestras registradas', r.muestras === 11, `n=${r.muestras}`);
// 10 pasos de 0,0009° de latitud ≈ 100,2 m cada uno: el total debe rondar 1 km.
check('Calcula distancia real', r.recorrido.distanciaM > 950 && r.recorrido.distanciaM < 1050, `${r.recorrido.distanciaM} m`);
check('Detecta la duración del tramo', r.recorrido.duracionMs === 10000, `${r.recorrido.duracionMs} ms`);
check('No inventa paradas en marcha', r.paradas.total === 0, `paradas=${r.paradas.total}`);
check('El heatmap tiene celdas', r.celdas.length > 0, `${r.celdas.length} celdas`);
check('La intensidad va normalizada 0..1', r.celdas.every((c) => c.intensidad >= 0 && c.intensidad <= 1));
check('La celda más pesada tiene intensidad 1', Math.max(...r.celdas.map((c) => c.intensidad)) === 1);

// Parada real: 60 s a velocidad 0 en el mismo sitio. Se pasa `ahora` explícito
// porque los datos sintéticos usan un reloj de referencia fijo y `resumen`
// usa el reloj real por defecto (en producción es justo lo que interesa).
const tParada = t0 + 20000;
for (let i = 0; i <= 60; i++) {
  back.registrarFix({ roomId: 'sala-test', lat: 41.665, lng: -0.878, speed: 0, at: tParada + i * 1000 });
}
const finParada = tParada + 60000;
r = back.resumen({ roomId: 'sala-test', ahora: finParada });
check('Detecta UNA parada larga', r.paradas.total === 1, `paradas=${r.paradas.total}`);
check('La parada dura ~60 s', r.paradas.lista[0].duracionSeg === 60, `${r.paradas.lista[0].duracionSeg} s`);
check('Acumula el tiempo en parada', r.paradas.segundosParados === 60, `${r.paradas.segundosParados} s`);

// La parada se mantiene en curso: si la comparsa arranca, se cierra con la
// duración completa (no con los 20 s que tardó en confirmarse).
back.registrarFix({ roomId: 'sala-test', lat: 41.6651, lng: -0.878, speed: 1.1, at: finParada + 1000 });
const cerrada = back.resumen({ roomId: 'sala-test', ahora: finParada + 1000 });
check('Al arrancar se cierra la parada', cerrada.paradas.lista[0].enCurso === false);
check('La parada cerrada conserva los 61 s', cerrada.paradas.lista[0].duracionSeg === 61, `${cerrada.paradas.lista[0].duracionSeg} s`);
check('No se duplica la parada', cerrada.paradas.total === 1, `paradas=${cerrada.paradas.total}`);

// Micro-parada: 5 s parado NO debe contar (sería un semáforo o el GPS).
back.reiniciar();
const tMicro = 1700000000000;
for (let i = 0; i <= 5; i++) {
  back.registrarFix({ roomId: 'sala-micro', lat: 41.657, lng: -0.878, speed: 0, at: tMicro + i * 1000 });
}
const finMicro = tMicro + 5000;
check(
  'Una parada de 5 s NO se cuenta',
  back.resumen({ roomId: 'sala-micro', ahora: finMicro }).paradas.total === 0,
);

// Privacidad: el resumen NUNCA debe devolver la clave real de la sala (el token).
// Ojo: aquí la sala viva es `sala-micro` (se reinició el estado antes), así que
// la huella que se comprueba es la suya, no la de `sala-test`.
const micro = back.resumen({ roomId: 'sala-micro' });
check('El resumen NO filtra el token de la sala', !JSON.stringify(micro).includes('sala-micro'));
check('El resumen devuelve una huella de 8 hex', typeof micro.hash === 'string' && micro.hash.length === 8, micro.hash);
check('La huella resuelve la sala dentro del servidor', back.resolverPorHash(micro.hash) === 'sala-micro');
check('Una huella inventada no resuelve nada', back.resolverPorHash('deadbeef') === null);
check('listarSalas NO expone el token', !JSON.stringify(back.listarSalas()).includes('sala-micro'));

// Audiencia: se imputa a la celda donde está la comparsa.
back.registrarAudiencia({ roomId: 'sala-micro', espectadores: 250, at: tMicro + 10000 });
const conAudiencia = back.resumen({ roomId: 'sala-micro' });
check('Registra los espectadores actuales', conAudiencia.audiencia.espectadores === 250);
check('Guarda el máximo de audiencia', conAudiencia.audiencia.maximo === 250);
check('La audiencia suma peso al heatmap', conAudiencia.celdas.some((c) => c.peso > 1));
back.registrarAudiencia({ roomId: 'sala-micro', espectadores: 0 });
check('Audiencia 0 no se imputa', back.resumen({ roomId: 'sala-micro' }).audiencia.espectadores === 250);

// Sala vacía: la respuesta honesta es "sin datos", no ceros que parecen medidas.
const vacia = back.resumen({ roomId: 'sala-inexistente' });
check('Una sala sin datos se marca `vacio`', vacia.vacio === true);
check('Una sala sin datos no inventa ceros falsos', vacia.recorrido.distanciaM === 0 && vacia.muestras === 0);

// Poda por TTL: una fiesta antigua no debe seguir ocupando memoria. Se limpia
// el estado previo, se dan varias muestras a la sala vieja y una sola a la
// fresca: así se puede comprobar no solo cuántas quedan, sino CUÁL sobrevive.
back.reiniciar();
for (let i = 0; i < 5; i++) {
  back.registrarFix({
    roomId: 'sala-vieja',
    lat: 41.65 + i * 0.0001,
    lng: -0.87,
    speed: 1,
    at: Date.now() - 7 * 60 * 60 * 1000 + i * 1000,
  });
}
back.registrarFix({ roomId: 'sala-fresca', lat: 41.66, lng: -0.87, speed: 1, at: Date.now() });
check('Hay dos salas antes de podar', back.numSalas() === 2, `salas=${back.numSalas()}`);
back.podar(Date.now());
const supervivientes = back.listarSalas();
check('La poda deja solo la sala fresca', back.numSalas() === 1, `salas=${back.numSalas()}`);
check('La sala superviviente es la reciente', supervivientes[0]?.muestras === 1, `muestras=${supervivientes[0]?.muestras}`);

back.reiniciar();

// ── Credencial del panel: saneamiento y 503 vs 401 ──────────────────────────
// Esta es la regresión que causó el 503 en producción: el valor pegado en el
// panel de Render llegaba con comillas, espacios o la asignación delante, y el
// `process.env.X || ''` a secas lo daba por "no configurado".
console.log('\n── CREDENCIAL DEL PANEL (503 vs 401) ───────────────────');

const auth = await import(`file://${join(ROOT, 'server', 'municipalAuth.js').replace(/\\/g, '/')}`);

check('Una credencial limpia no se toca', auth.saneaToken('a1b2c3d4e5') === 'a1b2c3d4e5');
check('Elimina comillas dobles', auth.saneaToken('"a1b2c3d4e5"') === 'a1b2c3d4e5');
check('Elimina comillas simples', auth.saneaToken("'a1b2c3d4e5'") === 'a1b2c3d4e5');
check('Elimina comillas dobles anidadas', auth.saneaToken('""a1b2c3d4e5""') === 'a1b2c3d4e5');
check('Recorta espacios', auth.saneaToken('   a1b2c3d4e5   ') === 'a1b2c3d4e5');
check('Elimina el salto de línea final', auth.saneaToken('a1b2c3d4e5\n') === 'a1b2c3d4e5');
check('Elimina el retorno de carro', auth.saneaToken('a1b2c3d4e5\r\n') === 'a1b2c3d4e5');
check('Elimina el zero-width de un copiado', auth.saneaToken('a1b2c3\u200bd4e5') === 'a1b2c3d4e5');
check('Elimina el BOM', auth.saneaToken('\uFEFFa1b2c3d4e5') === 'a1b2c3d4e5');
check('Elimina el espacio no separable', auth.saneaToken('a1b2\u00A0c3d4e5') === 'a1b2c3d4e5');
check(
  'Despeja el `MUNICIPAL_PANEL_TOKEN=` pegado en el valor',
  auth.saneaToken('MUNICIPAL_PANEL_TOKEN=a1b2c3d4e5') === 'a1b2c3d4e5',
);
check(
  'Despeja el `export MUNICIPAL_PANEL_TOKEN="..."` de una sesión de shell',
  auth.saneaToken('export MUNICIPAL_PANEL_TOKEN="a1b2c3d4e5"') === 'a1b2c3d4e5',
);
check('El saneamiento es idempotente', auth.saneaToken(auth.saneaToken(' "a1b2c3d4e5" \n')) === 'a1b2c3d4e5');
check('Un valor solo comillas queda vacío', auth.saneaToken('""') === '');
check('Un valor solo espacios queda vacío', auth.saneaToken('     ') === '');
check('undefined queda vacío', auth.saneaToken(undefined) === '');

// Los tres estados que antes se confundían en un único `|| ''`:
// sin variable -> 503; variable basura -> 503; variable válida -> 401 si falla.
check(
  'Sin variable la credencial se marca ausente',
  auth.leerTokenConfigurado({}).motivo === 'ausente' && !auth.leerTokenConfigurado({}).presente,
);
check(
  'Variable solo con comillas se marca vacía, no ausente',
  auth.leerTokenConfigurado({ MUNICIPAL_PANEL_TOKEN: '""' }).motivo === 'vacia',
);
check(
  'Variable con comillas y espacios SÍ es una credencial válida',
  auth.leerTokenConfigurado({ MUNICIPAL_PANEL_TOKEN: '  "a1b2c3d4e5"  ' }).token === 'a1b2c3d4e5',
);
check(
  'El token configurado se entrega ya saneado',
  auth.leerTokenConfigurado({ MUNICIPAL_PANEL_TOKEN: ' MUNICIPAL_PANEL_TOKEN=a1b2c3d4e5\n' }).token ===
    'a1b2c3d4e5',
);

// Cabeceras: la canónica, el alias y Authorization.
check('Lee la cabecera canónica', auth.extraerTokenCabecera({ 'x-panel-token': 'a1b2c3d4e5' }) === 'a1b2c3d4e5');
check('Lee el alias x-municipal-token', auth.extraerTokenCabecera({ 'x-municipal-token': 'a1b2c3d4e5' }) === 'a1b2c3d4e5');
check(
  'Lee Authorization: Bearer',
  auth.extraerTokenCabecera({ authorization: 'Bearer a1b2c3d4e5' }) === 'a1b2c3d4e5',
);
check(
  'Sanea también la cabecera',
  auth.extraerTokenCabecera({ 'x-panel-token': '  a1b2c3d4e5 \n' }) === 'a1b2c3d4e5',
);
check('Sin cabecera devuelve vacío', auth.extraerTokenCabecera({}) === '');
check('Una cabecera repetida toma la primera', auth.extraerTokenCabecera({ 'x-panel-token': ['a1b2c3d4e5'] }) === 'a1b2c3d4e5');

// Comparación en tiempo constante: no debe lanzar con longitudes distintas
// (el `timingSafeEqual` directo sí lanzaba) ni autorizar credenciales vacías.
check('Compara credenciales iguales', auth.compararTokens('a1b2c3d4e5', 'a1b2c3d4e5') === true);
check('Rechaza credenciales distintas', auth.compararTokens('a1b2c3d4e5', 'a1b2c3d4e6') === false);
check('No explota con longitudes distintas', auth.compararTokens('corto', 'una-credencial-mucho-mas-larga') === false);
check('Una credencial vacía nunca autoriza', auth.compararTokens('', '') === false);
check('Rechaza el prefijo común', auth.compararTokens('a1b2', 'a1b2c3d4e5') === false);
check('Sanea a ambos lados antes de comparar', auth.compararTokens(' "a1b2c3d4e5" ', 'a1b2c3d4e5') === true);

// ── Resumen ───────────────────────────────────────────────────────────────
const failed = results.filter((x) => !x.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
if (failed.length) {
  console.log('FALLOS:');
  for (const f of failed) console.log(` - ${f.name}`);
  process.exit(1);
}
process.exit(0);

