#!/usr/bin/env node
/**
 * Test de regresion: el efecto de conexion NO debe re-ejecutarse por un setState.
 *
 * El sintoma en produccion era una cascada infinita de "101 Switching
 * Protocols": al recibir `gps_authorized`, un setState provocaba un render que
 * regeneraba una funcion declarada en el array de dependencias del useEffect, el
 * cleanup cerraba el socket sano y el efecto volvia a abrir otro.
 *
 * Sin jsdom ni react-test-renderer en el proyecto, se comprueba la CAUSA raiz de
 * forma estatica sobre el AST real del componente:
 *   1. El efecto de conexion depende UNICAMENTE de [token].
 *   2. Toda funcion local del componente usada como dependencia esta
 *      memoizada (useCallback/useMemo): una funcion "a pelo" se recrea en cada
 *      render y reintroduce el bucle aunque las deps sean minimas.
 *
 * Uso: node scripts/verify-effect-stability.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'src', 'pages', 'GpsEmisor.tsx');
const sourceText = readFileSync(TARGET, 'utf8');
const source = ts.createSourceFile(TARGET, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// Solo cuentan las funciones declaradas DENTRO del cuerpo del componente: las de
// nivel de modulo se crean una unica vez al cargar el bundle y no se recrean en
// cada render, asi que no pueden provocar el bucle de dependencias.
const localFunctions = new Map(); // nombre -> { memoized, line }
let inComponentBody = false;

function walk(node) {
  if (ts.isFunctionDeclaration(node) && node.name) {
    // Entra en el cuerpo del componente (o de otro): aqui si cuentan.
    inComponentBody = true;
    localFunctions.set(node.name.text, { memoized: true, line: srcLine(node) });
    ts.forEachChild(node, (child) => walk(child));
    inComponentBody = false;
    return;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    const name = node.name.text;
    if (name === 'GpsEmisor' && node.initializer && ts.isArrowFunction(node.initializer)) {
      inComponentBody = true;
      ts.forEachChild(node.initializer, (child) => walk(child));
      inComponentBody = false;
      return;
    }
    if (inComponentBody && node.initializer) {
      // Desenvuelve parentesis: `(() => {})` sigue siendo una funcion a pelo.
      let init = node.initializer;
      while (ts.isParenthesizedExpression(init)) init = init.expression;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        const memoized =
          ts.isCallExpression(node.initializer) &&
          ts.isIdentifier(node.initializer.expression) &&
          ['useCallback', 'useMemo'].includes(node.initializer.expression.text);
        localFunctions.set(name, { memoized, line: srcLine(node) });
      }
    }
  }
  ts.forEachChild(node, (child) => walk(child));
}

function srcLine(node) {
  return source.getLineAndCharacterOfPosition(node.pos).line + 1;
}

walk(source);

/**
 * Localiza el useEffect de conexion: el que arranca el GPS y el socket
 * (identificables por invocar startGpsRef y connectRef/connectFnRef).
 */
let connectionEffect = null;
function findEffect(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'useEffect'
  ) {
    const bodyText = node.getText(source);
    if (/connectRef\.current\(\)/.test(bodyText) || /connectFnRef\.current\(\)/.test(bodyText)) {
      connectionEffect = node;
    }
  }
  ts.forEachChild(node, findEffect);
}
findEffect(source);

check('Se localiza el useEffect de conexion', !!connectionEffect);

if (connectionEffect) {
  // El segundo argumento del useEffect es el array de dependencias.
  const depsArray = connectionEffect.arguments[1];
  const deps = [];
  if (depsArray && ts.isArrayLiteralExpression(depsArray)) {
    for (const el of depsArray.elements) {
      if (ts.isIdentifier(el)) deps.push(el.text);
      else if (ts.isPropertyAccessExpression(el)) deps.push(el.getText(source));
    }
  }
  const onlyToken = deps.length === 1 && deps[0] === 'token';
  check('El efecto de conexion depende UNICAMENTE de [token]', onlyToken, `deps=[${deps.join(', ')}]`);

  const forbidden = deps.filter((d) => ['wsState', 'gpsState', 'label', 'smoothedKmh', 'error', 'ws'].includes(d));
  check('El efecto de conexion no depende de estado de UI', forbidden.length === 0, `encontrados=[${forbidden.join(', ')}]`);
}

// Verificacion de la CAUSA raiz, independiente de las deps: cualquier funcion
// declarada dentro del cuerpo del componente y que se use como dependencia de
// un useEffect DEBE estar memoizada. Una funcion "a pelo" tiene identidad nueva
// en cada render: aunque hoy no figure en el array, reintroduce el bucle en
// cuanto alguien la añada a las deps (y asi ocurrio originalmente).
const unsafeRefs = [];
for (const [name, info] of localFunctions) {
  if (!info.memoized) unsafeRefs.push(`${name} (L${info.line})`);
}
check(
  'Ninguna funcion del cuerpo del componente queda sin useCallback',
  unsafeRefs.length === 0,
  unsafeRefs.length ? unsafeRefs.join(', ') : 'ninguna',
);

// El array de dependencias real del efecto de conexion no debe contener ninguna
// funcion sin memoizar (mismo objetivo, vistas desde el array).
const nakedInDeps = [];
if (connectionEffect) {
  const depsArray = connectionEffect.arguments[1];
  if (depsArray && ts.isArrayLiteralExpression(depsArray)) {
    for (const el of depsArray.elements) {
      if (!ts.isIdentifier(el)) continue;
      const info = localFunctions.get(el.text);
      if (info && !info.memoized) nakedInDeps.push(`${el.text} (L${info.line})`);
    }
  }
}
check(
  'Ninguna dependencia del efecto es una funcion sin useCallback (causa raiz del bucle)',
  nakedInDeps.length === 0,
  nakedInDeps.length ? nakedInDeps.join(', ') : 'todas memoizadas',
);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
if (failed.length) {
  console.log('FALLOS:');
  for (const f of failed) console.log(` - ${f.name}`);
}
process.exit(failed.length ? 1 : 0);
