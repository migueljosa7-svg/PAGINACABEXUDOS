/**
 * PANEL DE PATROCINIO — enganche en directo con la cabalgata.
 *
 * Es la versión "de calle" del módulo: en lugar del catálogo completo, muestra
 * los locales que la comparsa tiene AHORA a menos de `PATROCINIO_RADIO_CERCA_M`
 * y destaca los que tiene encima (`proximidad: 'destacado'`).
 *
 * El componente es tonto a propósito: recibe la posición y la velocidad ya
 * calculadas por la página y delega el cálculo en `services/patrocinio`. Así el
 * mismo panel sirve para la posición GPS real y para una posición simulada, y
 * se puede probar sin navegador.
 */

import React, { useMemo } from 'react';
import { FaStore, FaMapMarkerAlt, FaClock, FaBolt } from 'react-icons/fa';
import {
  patrociniosEnMarcha,
  textoDistanciaPatrocinio,
  type PosicionReferencia,
} from '../services/patrocinio';
import {
  PATROCINIO_CATEGORIA_COLOR,
  PATROCINIO_CATEGORIA_GLYPH,
  PATROCINIO_CATEGORIA_LABEL,
  type PatrocinioCategoria,
} from '../data/patrocinadores';
import '../styles/patrocinio.css';

export interface PatrocinioPanelProps {
  /** Posición de la comparsa; si es null, no hay nada que proximityar. */
  posicion: PosicionReferencia | null;
  /** Velocidad media (m/s). Sin ella no se pinta ETA. */
  velocidadMs?: number | null;
  /** Categorías a mostrar. Vacío = todas. */
  categorias?: PatrocinioCategoria[];
  /** Máximo de locales listados. */
  maximo?: number;
  /** Emoji/rotulo del icono de cabecera. */
  titulo?: string;
}

export const PatrocinioPanel: React.FC<PatrocinioPanelProps> = ({
  posicion,
  velocidadMs = null,
  categorias = [],
  maximo = 4,
  titulo = 'Patrocinios cerca de la comparsa',
}) => {
  const lista = useMemo(() => {
    if (!posicion) return [];
    return patrociniosEnMarcha(posicion, {
      velocidadMs,
      solo: categorias.length ? categorias : undefined,
    }).slice(0, maximo);
  }, [posicion, velocidadMs, categorias, maximo]);

  if (!posicion) {
    return (
      <div className="patrocinio-panel">
        <div className="patrocinio-panel-head">
          <span>{titulo}</span>
        </div>
        <p className="patrocinio-panel-empty">
          Cuando la comparsa esté en marcha verás aquí los bares y comercios que tiene a su
          alrededor. Ahora mismo no hay posición GPS.
        </p>
      </div>
    );
  }

  return (
    <div className="patrocinio-panel">
      <div className="patrocinio-panel-head">
        <span>
          <FaStore aria-hidden="true" /> {titulo}
        </span>
        <span style={{ color: 'hsl(var(--color-text-secondary))', fontWeight: 700 }}>
          {lista.length} en ruta
        </span>
      </div>
      <p className="patrocinio-panel-sub">
        Distancia calculada sobre la posición real de la comparsa. Los destacados se recalculan
        en cada actualización del GPS.
      </p>
      {lista.length === 0 ? (
        <p className="patrocinio-panel-empty">
          La comparsa está en un tramo sin patrocinadores cercanos: el catálogo se limita a los
          locales que están sobre las calles de la fiesta.
        </p>
      ) : (
        <div className="patrocinio-panel-list">
          {lista.map((p) => (
            <div
              key={p.id}
              className={`patrocinio-panel-item${
                p.proximidad === 'destacado' ? ' is-destacado' : ''
              }`}
              style={{ '--pat-color': PATROCINIO_CATEGORIA_COLOR[p.categoria] } as React.CSSProperties}
            >
              <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
                {PATROCINIO_CATEGORIA_GLYPH[p.categoria]}
              </span>
              <div className="patrocinio-panel-item-body">
                <span className="patrocinio-panel-item-name">{p.nombre}</span>
                <span className="patrocinio-panel-item-meta">
                  {PATROCINIO_CATEGORIA_LABEL[p.categoria]} · {textoDistanciaPatrocinio(p)}
                </span>
              </div>
              <span className="patrocinio-panel-eta">
                {p.proximidad === 'destacado' ? (
                  <>
                    <FaBolt aria-hidden="true" /> AQUÍ
                  </>
                ) : p.minutosEstimados != null ? (
                  <>
                    <FaClock aria-hidden="true" /> {p.minutosEstimados} min
                  </>
                ) : (
                  <FaMapMarkerAlt aria-hidden="true" />
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatrocinioPanel;
