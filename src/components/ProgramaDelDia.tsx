/**
 * PROGRAMA DEL DÍA — resumen informativo del programa oficial.
 *
 * Es la parte que el programa impreso no puede dar: en lugar de un bloque de
 * texto fijo, esto se calcula al abrir la página y responde a dos preguntas
 * que el vecino se hace en la calle:
 *
 *   1. ¿Qué pasa hoy?  -> `buildProgramaDelDia()` sobre la agenda oficial.
 *   2. ¿Pasa por donde estoy? -> distancia de cada acto al recorrido, con el
 *      mismo radio (250 m) que usa el visor GPS para el vecindario.
 *
 * Si hoy no hay programa (día entre festividades) NO se muestra un hueco vacío:
 * se ofrece el próximo día con actos y se dice expresamente que no es hoy, para
 * que nadie salga a la calle con una fecha equivocada.
 *
 * Es un componente presentacional puro: recibe la fecha de referencia y no
 * toca la red ni el reloj por su cuenta (el padre decide), lo que lo hace
 * determinista y testeable.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaCalendarCheck,
  FaClock,
  FaMapMarkerAlt,
  FaRoute,
  FaExclamationTriangle,
  FaListUl,
} from 'react-icons/fa';
import {
  buildProgramaDelDia,
  etiquetaDia,
  textoDistancia,
  type ProgramaItem,
} from '../data/programaDelDia';
import { categoryLabels, type EventCategory } from '../data/calendarData';
import '../styles/programaDia.css';

export interface ProgramaDelDiaProps {
  /** Fecha de referencia. Por defecto, hoy (se inyecta en tests). */
  fecha?: Date;
  /** Muestra todos los actos del día, no solo los que están junto al recorrido. */
  mostrarTodos?: boolean;
  /** Etiqueta del encabezado (por defecto "Programa del día"). */
  titulo?: string;
}

/** Una fila del programa: hora, título, lugar y distancia al recorrido. */
const ProgramaFila: React.FC<{ item: ProgramaItem }> = ({ item }) => {
  const { evento } = item;
  return (
    <li
      className={`programa-dia-item${item.enRecorrido ? ' is-en-recorrido' : ''}`}
      style={{ borderLeftColor: evento.color }}
    >
      <span className="programa-dia-item-emoji" aria-hidden="true">
        {evento.emoji}
      </span>
      <div className="programa-dia-item-body">
        <p className="programa-dia-item-title">{evento.title}</p>
        <div className="programa-dia-item-meta">
          {evento.time ? (
            <span>
              <FaClock aria-hidden="true" /> {evento.time}
              {evento.endTime ? `–${evento.endTime}` : ''}
            </span>
          ) : (
            <span>Sin hora</span>
          )}
          <span>
            <FaMapMarkerAlt aria-hidden="true" /> {evento.location}
          </span>
          <span className="programa-dia-item-dist">
            <FaRoute aria-hidden="true" /> {textoDistancia(item)}
          </span>
          {item.esMunicipal && <span className="programa-dia-tag-municipal">OFICIAL</span>}
        </div>
      </div>
    </li>
  );
};

export const ProgramaDelDia: React.FC<ProgramaDelDiaProps> = ({
  fecha,
  mostrarTodos = false,
  titulo = 'Programa del día',
}) => {
  const programa = useMemo(() => buildProgramaDelDia(fecha ?? new Date()), [fecha]);

  // Sin acotar, la lista arranca por los actos que están sobre el recorrido
  // (los que de verdad ve el ciudadano) y continúa con el resto del día.
  const items = mostrarTodos
    ? programa.items
    : [...programa.destacados, ...programa.items.filter((i) => !i.enRecorrido)];

  const fechaLegible = new Date(`${programa.fechaActos}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <motion.section
      className="programa-dia"
      aria-labelledby="programa-dia-title"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="programa-dia-head">
        <span className="programa-dia-head-icon" aria-hidden="true">
          <FaCalendarCheck />
        </span>
        <div className="programa-dia-head-titles">
          <h2 className="programa-dia-title" id="programa-dia-title">
            {titulo}
          </h2>
          <p className="programa-dia-date">{fechaLegible}</p>
        </div>
        <span className="programa-dia-badge">{etiquetaDia(programa.diasDeDiferencia)}</span>
      </header>

      <p className="programa-dia-resumen">{programa.resumen}</p>

      {programa.avisos.length > 0 && (
        <ul className="programa-dia-avisos">
          {programa.avisos.map((aviso) => (
            <li key={aviso}>
              <FaExclamationTriangle aria-hidden="true" /> {aviso}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 ? (
        <ul className="programa-dia-list">
          {items.map((item) => (
            <ProgramaFila key={item.evento.id} item={item} />
          ))}
        </ul>
      ) : (
        <p className="programa-dia-empty">
          No hay actos en el calendario oficial. Consulta la agenda completa para ver el resto de
          fechas.
        </p>
      )}

      <div className="programa-dia-actions">
        <Link className="programa-dia-link" to="/agenda">
          <FaListUl aria-hidden="true" /> Agenda completa
        </Link>
        <Link className="programa-dia-link" to="/recorridos">
          <FaRoute aria-hidden="true" /> Ver recorridos
        </Link>
        {programa.destacados[0] && (
          <span className="programa-dia-link" style={{ cursor: 'default' }}>
            {categoryLabels[programa.destacados[0].evento.category as EventCategory]}
          </span>
        )}
      </div>
    </motion.section>
  );
};

export default ProgramaDelDia;
