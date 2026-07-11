import type { Route } from './singleSource';

// Recorrido GPS en tiempo real para demostración ("Comparsa San José - Demo en vivo")
// - Token: cmp_prueba_barrio
// - Zona: San José (aprox. alrededor del barrio)
// Este recorrido está pensado para ser lo suficientemente sencillo
// (pocos waypoints) para ver el marcador moverse en tiempo real con GPS real.
export const pruebaBarrioRoute: Route = {
  id: 'prueba-barrio-san-jose',
  barrioId: 'prueba-barrio-prueba-barrio-san-jose',
  nombre: 'San José - Demo en vivo',
  distrito: 'barrio',
  category: 'cabezudo',
  dateString: '—',
  timeString: '12:00',
  description: 'Recorrido optimizado para demostrar el seguimiento GPS real en vivo desde dispositivos móviles.',
  color: '#212121',
  characterEmoji: '📍',
  characterName: 'San José',
  streets: ['Salida', 'Calle Principal', 'Llegada'],
  durationMinutes: 10,
  distanceMeters: 1200,
  waypoints: [
    {
      lat: 41.6435,
      lng: -0.8742,
      calle: 'Salida',
      isStop: true,
    },
    {
      lat: 41.6455,
      lng: -0.8730,
      calle: 'Calle Principal',
    },
    {
      lat: 41.6468,
      lng: -0.8750,
      calle: 'Llegada',
      isStop: true,
    },
  ],
};

