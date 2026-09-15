export type ComparsaId = string;

export type AuthorizedDeviceConfig = Record<
  ComparsaId,
  {
    /** Token that the authorized device will generate once and persist in localStorage. */
    deviceToken: string;
  }
>;

/**
 * Mapa de dispositivos GPS autorizados, resuelto en tiempo de build.
 *
 * SEGURIDAD: este archivo NUNCA debe contener tokens reales.
 * Cualquier valor declarado aquí se empaqueta en el JS público del bundle
 * (el cliente lo puede leer). Los tokens reales viven exclusivamente en:
 *   - Servidor: variable de entorno AUTHORIZED_GPS_DEVICES (Render).
 *   - Móvil del porteador: URL ?token= generada con `npm run generate-env`.
 *
 * Se acepta un mapa opcional desde Vite SOLO para entornos de desarrollo
 * local: VITE_GPS_DEVICE_TOKENS='{"san-jose":"<token-dev>"}' en .env.local
 * (nunca en producción ni en el repositorio).
 */
function parseDevicesFromBuildEnv(): AuthorizedDeviceConfig {
  try {
    const raw = (import.meta.env.VITE_GPS_DEVICE_TOKENS as string | undefined)?.trim();
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as AuthorizedDeviceConfig;
  } catch {
    return {};
  }
}

export const AUTHORIZED_GPS_DEVICES: AuthorizedDeviceConfig = parseDevicesFromBuildEnv();

/**
 * Resuelve el token de un dispositivo autorizado.
 *
 * @returns el token si está configurado por entorno, o cadena vacía.
 *          Sin token, el emisor no conecta (fail-secure).
 */
export function getDeviceToken(comparsaId: ComparsaId): string {
  const entry = AUTHORIZED_GPS_DEVICES[comparsaId];
  return entry?.deviceToken?.trim() || '';
}

