/**
 * BANNER DE PARADA — "la comparsa está parada junto a este local".
 *
 * Es el anuncio de comercio local que solo puede existir con GPS: cuando la
 * comparsa lleva más de `PARADA_MINIMA_BANNER_SEG` segundos quieta dentro del
 * radio de un patrocinador, el público que está mirando el mapa lee el nombre
 * del bar que tiene al lado. La venta del espacio es de barrio, no de banner
 * genérico, porque el local está acreditado por su POSICIÓN, no por un contrato
 * pintado en el mapa.
 *
 * El componente es tonto: recibe la parada ya resuelta por
 * `services/patrocinio.patrocinadorEnParada` (que es quien decide si hay parada
 * y si hay local) y solo la pinta. Así el mismo dato sirve para el visor en vivo
 * y para cualquier otro contexto, y se puede verificar sin navegador.
 *
 * AVISO DE DEMOSTRACIÓN: mientras el catálogo sea de ejemplo, el banner muestra
 * `PATROCINIO_AVISO_DEMO`. Un local real junto a una comparsa real se leería
 * como un acuerdo firmado, y no lo es.
 */

import React, { memo } from 'react';
import { FaStore, FaHourglassHalf } from 'react-icons/fa';
import {
  PATROCINIO_AVISO_DEMO,
  PATROCINIO_CATEGORIA_COLOR,
  PATROCINIO_CATEGORIA_GLYPH,
  PATROCINIO_CATEGORIA_LABEL,
  PATROCINIO_NIVEL_LABEL,
} from '../data/patrocinadores';
import type { ParadaEnComercio } from '../services/patrocinio';
import '../styles/patrocinio.css';

export interface StopSponsorBannerProps {
  /** Parada resuelta; se pinta tal cual, sin recalcular distancias. */
  parada: ParadaEnComercio;
}

/** Segundos de parada en formato corto ("45 s" / "2 min 10 s"). */
function fmtParada(seg: number): string {
  if (seg < 60) return `${seg} s`;
  const min = Math.floor(seg / 60);
  const resto = seg % 60;
  return resto ? `${min} min ${resto} s` : `${min} min`;
}

export const StopSponsorBanner = memo(function StopSponsorBanner({
  parada,
}: StopSponsorBannerProps) {
  const { patrocinador: local, segundosParado, mensaje } = parada;
  return (
    <aside
      className="sponsor-stop-banner"
      style={{ '--pat-color': PATROCINIO_CATEGORIA_COLOR[local.categoria] } as React.CSSProperties}
      aria-live="polite"
    >
      <div className="sponsor-stop-head">
        <span className="sponsor-stop-badge">
          <FaHourglassHalf aria-hidden="true" />
          Parada · {fmtParada(segundosParado)}
        </span>
        <span className="sponsor-stop-nivel">{PATROCINIO_NIVEL_LABEL[local.nivel]}</span>
      </div>

      <p className="sponsor-stop-message">
        <span aria-hidden="true" className="sponsor-stop-glyph">
          {PATROCINIO_CATEGORIA_GLYPH[local.categoria]}
        </span>
        <strong>{mensaje}</strong>
      </p>

      <p className="sponsor-stop-meta">
        <FaStore aria-hidden="true" />
        {local.nombre} · {PATROCINIO_CATEGORIA_LABEL[local.categoria]} · {local.direccion}
        {local.franja ? ` · ${local.franja}` : ''}
      </p>

      <p className="sponsor-stop-demo">{PATROCINIO_AVISO_DEMO}</p>
    </aside>
  );
});

export default StopSponsorBanner;
