export type ComparsaId = string;

export type AuthorizedDeviceConfig = Record<
  ComparsaId,
  {
    /** Token that the authorized device will generate once and persist in localStorage. */
    deviceToken: string;
  }
>;

/**
 * Relación de dispositivos autorizados por comparsa.
 *
 * Para producción, sustituir los valores de ejemplo por tokens reales.
 */
// Nota: el servidor usa "routeId" para componer el canal. En la demo, routeId
// se asigna a una comparsa concreta, pero internamente soportamos la separación:
//   routeId -> comparsaId -> deviceToken
// Si en el futuro quieres separar routeId de comparsaId, ajusta el mapping del servidor.
export const AUTHORIZED_GPS_DEVICES: AuthorizedDeviceConfig = {
  // Token de prueba para la demo "Prueba Barrio".
  // Importante: el servidor valida tokens vía AUTHORIZED_GPS_DEVICES (ENV) y el frontend usa este token.
  'cmp_prueba_barrio': {
    deviceToken: 'cmp_prueba_barrio',
  },

  // Otros tokens (pendientes) para despliegues reales
  'san-jose': {
    deviceToken: '8c4b0bfab99b4496be650c06c66a7258',
  },

  'badorrey': {
    deviceToken: 'REPLACE_WITH_BADORREY_DEVICE_TOKEN',
  },
  'las-fuentes': {
    deviceToken: 'REPLACE_WITH_LAS_FUENTES_DEVICE_TOKEN',
  },
};



