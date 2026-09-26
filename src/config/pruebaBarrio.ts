import {
  PRUEBA_BARRIO_CENTER,
  PRUEBA_BARRIO_ID,
  PRUEBA_BARRIO_TOKEN,
} from '../data/pruebaBarrioRoute';

export const PRUEBA_BARRIO = {
  /** Token de la sala demo. Debe existir en AUTHORIZED_GPS_DEVICES. */
  id: PRUEBA_BARRIO_TOKEN,
  /**
   * Reexportado para no obligar a los consumidores a importar el modulo de
   * datos: el id de la demo ahora tiene UNA sola definicion.
   */
  routeId: PRUEBA_BARRIO_ID,
  name: 'San José Demo - Ayuntamiento',
  /** Centro del recorrido: Plaza del Pilar / Ayuntamiento de Zaragoza. */
  center: PRUEBA_BARRIO_CENTER,
};

