/**
 * Registro de salas de transmision (multi-comparsa).
 *
 * Cada comparsa que emite GPS tiene su propio token en el relay (declarado en
 * AUTHORIZED_GPS_DEVICES, nunca en el repo). El visor escucha UNA sala a la vez,
 * de modo que para varias comparsas simultaneas basta con resolver el token
 * correcto al abrir el enlace:
 *
 *   /gps-live?token=cmp_prueba_barrio        -> San José Demo (Ayuntamiento)
 *   /gps-live?token=<hex64 oficial>          -> cualquier comparsa oficial
 *   /gps-live                                -> cae en la sala demo
 *
 * El token viaja en la query del stream y NUNCA se muestra en la interfaz ni
 * se persiste: es una credencial de solo lectura.
 */

import { PRUEBA_BARRIO } from './pruebaBarrio';
import { pruebaBarrioRoute } from '../data/pruebaBarrioRoute';

/** Formato de token aceptado por el relay (server.js lo valida igual). */
const TOKEN_RE = /^[a-zA-Z0-9_-]{3,128}$/;

/**
 * Salas conocidas con metadatos de presentación. Las salas no catalogadas
 * (tokens oficiales en hexadecimal) siguen siendo validas: se muestran con su
 * etiqueta generica, que es exactamente lo que ve un espectador.
 */
export interface LiveRoom {
  token: string;
  label: string;
  /** Centro de la cámara antes de que llegue la primera posición real. */
  center: [number, number];
  routeId?: string;
}

const DEMO_ROOM: LiveRoom = {
  token: PRUEBA_BARRIO.id,
  label: PRUEBA_BARRIO.name,
  center: PRUEBA_BARRIO.center,
  routeId: pruebaBarrioRoute.id,
};

/** Token oficial de 64 hex (los que emite la comarsa municipal). */
const OFFICIAL_TOKEN_RE = /^[a-f0-9]{64}$/i;

/**
 * Resuelve la sala a escuchar a partir del token de la URL.
 * Devuelve null si el token no tiene un formato válido (fail-secure: el visor
 * no se suscribe a una sala arbitraria solo porque el usuario la escribiera).
 */
export function resolveRoom(tokenParam: string | null | undefined): LiveRoom {
  const raw = (tokenParam ?? '').trim();
  if (!raw || !TOKEN_RE.test(raw)) return DEMO_ROOM;

  if (raw === DEMO_ROOM.token) return DEMO_ROOM;

  if (OFFICIAL_TOKEN_RE.test(raw)) {
    return {
      token: raw,
      label: 'Comparsa oficial',
      // Sin catálogo conocido se abre el centro histórico: la cámara se
      // reencuadra sola en cuanto llega la primera posición real.
      center: [41.6563, -0.8789],
    };
  }

  return DEMO_ROOM;
}
