/**
 * COMERCIOS POR PARADA — la ficha que se abre al tocar una parada.
 *
 * Es el cambio de producto que justifica el resto del refactor: antes el comercio
 * local vivía en una página aparte (`/patrocinio`) que nadie encontraba, y el
 * mapa del recorrido no decía nada de quién está al lado de cada parada. Ahora
 * el ciudadano toca una parada del desfile y lee qué bares y tiendas tiene
 * alrededor, que es la pregunta que se hace de verdad alguien esperando en la
 * calle.
 *
 * ── Regla de oro: NUNCA inventar un local cercano ───────────────────────────
 * Se devuelve lo que hay a `radioM` REAL de la parada y, si no hay ninguno, se
 * dice "sin comercios en este radio". Devolver el más lejano como si estuviera
 * al lado es peor que no devolver nada: manda a una familia a media ciudad con
 * la comparsa parada. Por eso el radio es un tope duro, no un "los primeros N".
 *
 * La cuenta sale de `services/patrocinio.patrociniosPorProximidad`, que ya
 * calcula distancias haversine y las usa el resto de la app (visor en vivo,
 * panel). Reutilizarlo es lo que evita que el radio del mapa y el del panel se
 * contradigan.
 */

import {
  patrociniosPorProximidad,
  textoDistanciaPatrocinio,
  type PatrocinadorConDistancia,
  type PosicionReferencia,
} from './patrocinio';

/**
 * Radio (m) de la ficha de parada.
 *
 * 250 m es "se ve desde la puerta de la parada", no "en la misma acera": una
 * parada de desfile no tiene una dirección exacta y el público se reparte en un
 *radio mayor que el escaparate. Con 150 m (el radio del destacado en mapa) casi
 * ninguna parada real tendría ficha; con 400 m se meterían locales de otra calle.
 */
export const RADIO_FICHA_PARADA_M = 250;

/**
 * Locales que se listan en la ficha.
 *
 * Dos a cuatro, como se pidió. El mínimo importa: una ficha con un solo bar es
 * ruido de datos, no información útil para decidir dónde pararse.
 */
export const MIN_FICHA_COMERCIOS = 2;
export const MAX_FICHA_COMERCIOS = 4;

/** Una parada y los comercios que tiene alrededor. */
export interface FichaParada {
  /** Identificador de la parada (el `id` del gestor, o el índice si es del bundle). */
  paradaId: string;
  nombre: string;
  lat: number;
  lng: number;
  /** Comercios dentro del radio, ordenados por cercanía. */
  comercios: PatrocinadorConDistancia[];
  /** Texto de la cabecera: "3 locales a menos de 250 m" / "sin locales en 250 m". */
  resumen: string;
  /**
   * `true` cuando el local viene de la asociación explícita del técnico
   * (el `comercioId` de la parada) y no del radio. Se marca aparte para poder
   * explicar en la ficha de dónde sale el dato.
   */
  asociacion?: boolean;
}

/**
 * Comercios dentro del radio de una parada.
 *
 * `comercioId` es la asociación que el Ayuntamiento haya fijado a mano en el
 * gestor de paradas: si existe, se garantiza que ese local salga primero y esté
 * aunque el cálculo por radio no lo alcance. Es el mando que necesita el técnico
 * cuando un comercio de la plaza no entra en el radio pero tiene la parada
 * enfrente.
 */
export function comerciosDeParada(
  parada: PosicionReferencia & { id?: string; nombre?: string },
  opciones: {
    radioM?: number;
    comercioId?: string;
    catalogo?: PatrocinadorConDistancia[] | null;
  } = {},
): FichaParada {
  const radioM = opciones.radioM ?? RADIO_FICHA_PARADA_M;
  const id = parada.id ?? '';
  const nombre = parada.nombre ?? 'Parada';

  // Lista base: todo el catálogo, o la que se le pase (tests, subconjuntos).
  const base = opciones.catalogo ?? null;
  // `patrociniosPorProximidad` NO filtra por radio (devuelve el catálogo entero
  // ordenado); el corte por `radioM` se hace aquí, con un tope DURO. Por eso
  // `OpcionesProximidad` no lleva `radioM` y no se le pasa.
  const proximity = base ?? patrociniosPorProximidad(parada);

  let dentro = proximity.filter((p) => p.distanciaM <= radioM);

  // Asociación explícita del técnico: se antepone y se garantiza.
  let asociacion = false;
  const elegido = opciones.comercioId
    ? proximity.find((p) => p.id === opciones.comercioId)
    : undefined;
  if (elegido) {
    dentro = [elegido, ...dentro.filter((p) => p.id !== elegido.id)];
    asociacion = true;
  }

  const comercios = dentro.slice(0, MAX_FICHA_COMERCIOS);

  const resumen =
    comercios.length === 0
      ? `Sin comercios en ${radioM} m a la redonda.`
      : `${comercios.length} ${comercios.length === 1 ? 'local' : 'locales'} a menos de ${radioM} m · ${comercios
          .map((c) => c.nombre)
          .slice(0, 2)
          .join(', ')}${comercios.length > 2 ? '…' : ''}`;

  return {
    paradaId: id,
    nombre,
    lat: parada.lat,
    lng: parada.lng,
    comercios,
    resumen,
    asociacion,
  };
}

/** Reexportado para que la ficha no tenga que importar dos módulos. */
export { textoDistanciaPatrocinio };
export type { PatrocinadorConDistancia };
