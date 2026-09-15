#!/usr/bin/env node
/**
 * PAGINACABEXUDOS — Generador de entorno seguro para Render (producción)
 *
 * Genera tokens criptográficos de 256 bits y los imprime formateados
 * para copiar/pegar directamente en el panel de Render:
 *   Dashboard > Tu servicio > Environment > Add Environment Variable
 *
 * Uso:
 *   npm run generate-env
 *
 * No escribe ningún secreto en disco ni modifica archivos.
 * El flujo GPS (watchPosition -> ws.send -> broadcast -> Leaflet) no se toca.
 */

import { randomBytes } from 'crypto';

const CORS_ORIGIN = 'https://paginacabexudos.onrender.com';
const DEVICE_NAME = 'Recorrido Oficial';

const gpsToken = randomBytes(32).toString('hex'); // 256 bits -> 64 hex chars
const healthToken = randomBytes(32).toString('hex'); // 256 bits -> 64 hex chars

const authorizedDevices = JSON.stringify({
  [gpsToken]: { name: DEVICE_NAME },
});

const emitterUrl = `${CORS_ORIGIN}/gps-emisor?token=${gpsToken}`;

const line = (char = '─', n = 64) => char.repeat(n);

console.log('');
console.log('╔' + '═'.repeat(62) + '╗');
console.log('║  PAGINACABEXUDOS — Variables de entorno para Render (prod)  ║');
console.log('╚' + '═'.repeat(62) + '╝');
console.log('');
console.log('1) Copia estas 3 variables en el panel de Render');
console.log('   (Environment > Environment Variables > Add):');
console.log(line());
console.log('Key:   AUTHORIZED_GPS_DEVICES');
console.log(`Value: ${authorizedDevices}`);
console.log('');
console.log('Key:   HEALTH_TOKEN');
console.log(`Value: ${healthToken}`);
console.log('');
console.log('Key:   CORS_ORIGIN');
console.log(`Value: ${CORS_ORIGIN}`);
console.log(line());
console.log('');
console.log('2) URL de emisión GPS (móvil del porteador):');
console.log(`   ${emitterUrl}`);
console.log('');
console.log('3) Health check (navegador / UptimeRobot):');
console.log(`   ${CORS_ORIGIN}/health`);
console.log(`   ${CORS_ORIGIN}/health?key=${healthToken}   (con detalle de salas)`);
console.log('');
console.log('⚠️  No commitees estos valores. Guárdalos en un gestor de secretos.');
console.log('   Regenera con: npm run generate-env');
console.log('');
