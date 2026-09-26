import type { Route } from './singleSource';

/**
 * Recorrido GPS en tiempo real para la DEMO INSTITUCIONAL.
 *
 * - Autenticación: token de emisión inyectado vía AUTHORIZED_GPS_DEVICES
 *   (nunca en el repo). Generar con: npm run generate-env
 * - Zona: PLAZA DEL PILAR / AYUNTAMIENTO DE ZARAGOZA, el enclave de referencia
 *   para Zaragoza Cultural y el Patronato de Fiestas. El trazado baja por
 *   Calle Don Jaime I y vuelve a subir, que es el eje de concentracion real
 *   durante las fiestas.
 *
 * Waypoints con coordenadas WGS84 verificadas sobre el callejero: la salida
 * coincide con la Plaza del Pilar junto al Ayuntamiento, de modo que el
 * marcador del emisor aparece en el mismo punto que la cámara al abrir el visor.
 * El geofence del relay (41.4..41.8 / -1.1..-0.7) admite todo este trazado.
 */
export const PRUEBA_BARRIO_CENTER: [number, number] = [41.6563, -0.8789];

export const pruebaBarrioRoute: Route = {
  id: 'prueba-barrio-san-jose-ayuntamiento',
  barrioId: 'prueba-barrio-san-jose-ayuntamiento',
  nombre: 'San José Demo - Ayuntamiento',
  distrito: 'barrio',
  category: 'cabezudo',
  dateString: '—',
  timeString: '12:00',
  description:
    'Recorrido de demostración en torno a la Plaza del Pilar y el Ayuntamiento de Zaragoza, con GPS real en vivo desde dispositivos móviles.',
  color: '#212121',
  characterEmoji: '🏛️',
  characterName: 'San José',
  streets: [
    'Plaza del Pilar (Ayuntamiento)',
    'Calle Don Jaime I',
    'Calle Alfonso I',
    'Plaza del Pilar (Ayuntamiento)',
  ],
  durationMinutes: 12,
  distanceMeters: 1400,
  waypoints: [
    {
      // Salida: Plaza del Pilar, frente al Ayuntamiento.
      lat: 41.6563,
      lng: -0.8789,
      calle: 'Plaza del Pilar (Ayuntamiento)',
      isStop: true,
    },
    {
      lat: 41.6558,
      lng: -0.8784,
      calle: 'Plaza del Pilar (Ayuntamiento)',
    },
    {
      lat: 41.6549,
      lng: -0.8779,
      calle: 'Calle Don Jaime I',
      isStop: true,
    },
    {
      lat: 41.6539,
      lng: -0.8774,
      calle: 'Calle Don Jaime I',
    },
    {
      lat: 41.6541,
      lng: -0.8786,
      calle: 'Calle Alfonso I',
      isStop: true,
    },
    {
      lat: 41.6553,
      lng: -0.8791,
      calle: 'Calle Alfonso I',
    },
    {
      lat: 41.6563,
      lng: -0.8789,
      calle: 'Plaza del Pilar (Ayuntamiento)',
      isStop: true,
    },
  ],
};

