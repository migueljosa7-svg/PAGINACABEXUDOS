import type { Route } from './singleSource';

// Recorrido de prueba para el flujo GPS ("Prueba Barrio")
// - Token: cmp_prueba_barrio
// - Zona: San José (aprox. alrededor del barrio)
// Este recorrido está pensado para ser lo suficientemente sencillo
// (pocos waypoints) para ver el marcador moverse en tiempo real.
export const pruebaBarrioRoute: Route = {
  id: 'prueba-barrio-san-jose',
  barrioId: 'san-jose',
  nombre: 'Prueba Barrio',
  distrito: 'barrio',
  category: 'cabezudo',
  dateString: '—',
  timeString: '12:00',
  description: 'Recorrido sencillo de prueba (San José) para verificar tracking GPS en tiempo real.',
  color: '#212121',
  characterEmoji: '📍',
  characterName: 'Prueba',
  streets: ['Salida', 'Calle de Prueba', 'Llegada'],
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
      calle: 'Calle de Prueba',
    },
    {
      lat: 41.6468,
      lng: -0.8750,
      calle: 'Llegada',
      isStop: true,
    },
  ],
};

