/**
 * FICHA DE PARADA — los comercios que hay alrededor de una parada.
 *
 * Es la pieza que cierra la fusión de /recorridos: antes, para saber qué bar
 * estaba junto a una parada había que salirse del mapa y entrar en otra página
 * de patrocinio. Ahora se abre encima del propio recorrido.
 *
 * El componente es TONTO a propósito: recibe la ficha ya resuelta por
 * `services/comerciosParada` y solo la pinta. Toda la lógica de radio,
 * ordenación y association con el comercio que fijó el Ayuntamiento vive en el
 * servicio, que es puro y se puede verificar sin navegador
 * (`scripts/verify-municipio.mjs`).
 *
 * AVISO DE DEMOSTRACIÓN: mientras el catálogo sea de ejemplo, la ficha lo dice.
 * Un bar real con "Patrocinio Oro" al lado, sin convenio firmado, se leería
 * como un acuerdo que no existe.
 */

import React, { memo } from 'react';
import { FaStore, FaMapMarkerAlt, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import {
  PATROCINIO_AVISO_DEMO,
  PATROCINIO_CATEGORIA_COLOR,
  PATROCINIO_CATEGORIA_GLYPH,
  PATROCINIO_CATEGORIA_LABEL,
} from '../data/patrocinadores';
import { textoDistanciaPatrocinio, type FichaParada } from '../services/comerciosParada';
import '../styles/comerciosParada.css';

export interface FichaParadaComerciosProps {
  ficha: FichaParada;
  /** Cierra la ficha (tocar fuera, botón X, elegir otra parada). */
  onCerrar: () => void;
}

export const FichaParadaComercios = memo(function FichaParadaComercios({
  ficha,
  onCerrar,
}: FichaParadaComerciosProps) {
  const vacia = ficha.comercios.length === 0;

  return (
    <aside className="ficha-parada" role="dialog" aria-label={`Comercios en ${ficha.nombre}`}>
      <header className="ficha-parada-head">
        <span className="ficha-parada-titulo">
          <FaMapMarkerAlt aria-hidden="true" /> {ficha.nombre}
        </span>
        <button
          type="button"
          className="ficha-parada-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar ficha de la parada"
        >
          <FaTimes aria-hidden="true" />
        </button>
      </header>

      <p className={`ficha-parada-resumen ${vacia ? 'is-vacia' : ''}`}>{ficha.resumen}</p>

      {/*
        Asociación fijada a mano por el Ayuntamiento: se explica en vez de
        presentarse como un dato más, porque un local puede salir aunque no esté
        dentro del radio y eso parece un error si no se dice de dónde sale.
      */}
      {ficha.asociacion && (
        <p className="ficha-parada-asociada">
          <FaStore aria-hidden="true" /> Local asociado por el Ayuntamiento a esta parada.
        </p>
      )}

      <ul className="ficha-parada-lista">
        {ficha.comercios.map((c) => (
          <li
            key={c.id}
            className="ficha-parada-item"
            style={{ '--pat-color': PATROCINIO_CATEGORIA_COLOR[c.categoria] } as React.CSSProperties}
          >
            <span className="ficha-parada-glyph" aria-hidden="true">
              {PATROCINIO_CATEGORIA_GLYPH[c.categoria]}
            </span>
            <span className="ficha-parada-datos">
              <strong>{c.nombre}</strong>
              <span className="ficha-parada-meta">
                {PATROCINIO_CATEGORIA_LABEL[c.categoria]} · {textoDistanciaPatrocinio(c)}
                {c.franja ? ` · ${c.franja}` : ''}
              </span>
              <span className="ficha-parada-gancho">{c.gancho}</span>
            </span>
          </li>
        ))}
      </ul>

      {vacia && (
        <p className="ficha-parada-vacia">
          <FaExclamationTriangle aria-hidden="true" /> Esta parada todavía no tiene comercio local
          asignado. El Ayuntamiento puede añadirlo desde el panel municipal.
        </p>
      )}

      <p className="ficha-parada-demo">{PATROCINIO_AVISO_DEMO}</p>
    </aside>
  );
});

export default FichaParadaComercios;
