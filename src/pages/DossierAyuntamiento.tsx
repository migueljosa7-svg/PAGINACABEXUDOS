/**
 * Portal Municipal / Dossier Institucional
 *
 * Vista orientada a responsables de area (Zaragoza Cultural, Patronato de
 * Fiestas, Proteccion Civil y Comercio de barrio). Traduce la misma
 * telemetria que alimenta el mapa publico en tres cosas que la administracion
 * necesita ver: cuanto público hay por tramo, si la comitiva se desvía o se
 * retrasa, y que superficie de Shops queda expuesta al recorrido.
 *
 * Dos reglas de honestidad recorren toda la pagina:
 *   1. Los datos duros (geometria, paradas, cobertura) vienen de la fuente de
 *      verdad del proyecto y son verificables.
 *   2. El aforo es una ESTIMACION con supuestos declarados y visibles
 *      (CROWD_MODEL), jamos se presenta como medicion.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaLandmark,
  FaUsers,
  FaStore,
  FaShieldAlt,
  FaMapMarkedAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import { barrios } from '../data/singleSource';
import { useLiveComparsaSignal } from '../hooks/useLiveComparsaSignal';
import {
  CROWD_MODEL,
  buildCoverage,
  buildCrowdingAlerts,
  buildEconomicImpact,
  buildLiveAlerts,
  buildSegmentCrowding,
  measureDeviationMeters,
} from '../services/municipalMetrics';
import type { MunicipalAlert, RiskLevel } from '../services/municipalMetrics';
import { PRUEBA_BARRIO } from '../config/pruebaBarrio';
import '../styles/dossier.css';

const fmt = new Intl.NumberFormat('es-ES');
const fmt1 = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const RISK_LABEL: Record<RiskLevel, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Crítico',
};

function AlertCard({ alert }: { alert: MunicipalAlert }) {
  const Icon =
    alert.severity === 'critico' ? FaExclamationTriangle : alert.severity === 'aviso' ? FaInfoCircle : FaCheckCircle;
  return (
    <li className={`dossier-alert is-${alert.severity}`}>
      <span className="dossier-alert-icon" aria-hidden="true">
        <Icon />
      </span>
      <div>
        <strong>{alert.title}</strong>
        <p>{alert.detail}</p>
      </div>
    </li>
  );
}

export const DossierAyuntamiento: React.FC = () => {
  // Recorrido de referencia para el calculo de tramos (San José, el que emite
  // la demo en vivo). La cobertura, en cambio, se calcula sobre TODO el
  // catalogo de barrios.
  const referenceRoute = useMemo(() => {
    const demo = barrios.find((b) => b.comparsa.id === PRUEBA_BARRIO.id);
    return (demo ?? barrios[barrios.length - 1]).recorrido;
  }, []);

  const coverage = useMemo(() => buildCoverage(barrios), []);
  const segments = useMemo(() => buildSegmentCrowding(referenceRoute), [referenceRoute]);
  const impact = useMemo(() => buildEconomicImpact(coverage), [coverage]);
  const live = useLiveComparsaSignal();

  const totalEstimated = useMemo(
    () => segments.reduce((acc, s) => acc + s.estimatedSpectators, 0),
    [segments],
  );
  const criticalSegments = useMemo(
    () => segments.filter((s) => s.risk === 'alto' || s.risk === 'critico'),
    [segments],
  );

  const deviationM = useMemo(
    () => (live.connected ? measureDeviationMeters(referenceRoute, live.lat, live.lng) : null),
    [live, referenceRoute],
  );

  const alerts = useMemo<MunicipalAlert[]>(
    () => [
      ...buildLiveAlerts({
        route: referenceRoute,
        live: live.connected ? { lat: live.lat, lng: live.lng, label: live.label } : null,
      }),
      ...buildCrowdingAlerts(segments),
    ],
    [live, referenceRoute, segments],
  );

  return (
    <div className="dossier-page layout-container">
      {/* ---------------- Cabecera institucional ---------------- */}
      <motion.section
        className="dossier-hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="dossier-hero-badge" aria-hidden="true">
          <FaLandmark />
        </div>
        <div>
          <h1>Portal Municipal · Zaragoza Cultural</h1>
          <p>
            Dossier de operación para la dirección de eventos y fiestas, Protección
            Civil y el comercio de barrio. Los datos de posición y cobertura son
            verificables; el aforo se presenta siempre como estimación con sus
            supuestos declarados.
          </p>
        </div>
      </motion.section>

      {/* ---------------- KPIs de cobertura (dato duro) ---------------- */}
      <section className="dossier-kpis" aria-label="Cobertura territorial">
        <div className="dossier-kpi">
          <span className="dossier-kpi-value">{fmt.format(coverage.totalBarrios)}</span>
          <span className="dossier-kpi-label">Barrios catalogados</span>
        </div>
        <div className="dossier-kpi">
          <span className="dossier-kpi-value">{fmt.format(coverage.totalRoutes)}</span>
          <span className="dossier-kpi-label">Recorridos con trazado</span>
        </div>
        <div className="dossier-kpi">
          <span className="dossier-kpi-value">{fmt.format(coverage.totalRouteKm)}</span>
          <span className="dossier-kpi-label">Km de recorrido oficial</span>
        </div>
        <div className="dossier-kpi">
          <span className="dossier-kpi-value">{fmt.format(coverage.totalOfficialStops)}</span>
          <span className="dossier-kpi-label">Paradas oficiales</span>
        </div>
        <div className="dossier-kpi">
          <span className="dossier-kpi-value">{fmt.format(coverage.districts)}</span>
          <span className="dossier-kpi-label">Distritos alcanzados</span>
        </div>
      </section>

      <div className="dossier-columns">
        {/* ---------------- Operación en vivo ---------------- */}
        <section className="dossier-card" aria-label="Operación en vivo">
          <h2>
            <FaMapMarkedAlt /> Operación en vivo
          </h2>

          <div className={`dossier-live ${live.connected ? 'is-online' : 'is-offline'}`}>
            <span className="dossier-live-dot" aria-hidden="true" />
            {live.connected
              ? `${live.label} · señal de hace ${live.ageSeconds} s`
              : 'Sin emisor conectado en esta comparsa'}
          </div>

          {live.connected && (
            <dl className="dossier-kv">
              <div>
                <dt>Posición</dt>
                <dd>
                  {live.lat.toFixed(5)}, {live.lng.toFixed(5)}
                </dd>
              </div>
              <div>
                <dt>Velocidad</dt>
                <dd>{fmt1.format(live.speedKmh)} km/h</dd>
              </div>
              <div>
                <dt>Precisión GPS</dt>
                <dd>±{Math.round(live.accuracyM)} m</dd>
              </div>
              <div>
                <dt>Desvío del trazado</dt>
                <dd>
                  {deviationM === null
                    ? '—'
                    : `${Math.round(deviationM)} m (tolerancia ${CROWD_MODEL.deviationToleranceM} m)`}
                </dd>
              </div>
            </dl>
          )}

          <p className="dossier-note">
            El desvío se calcula comparando la posición GPS con el trazado oficial
            del recorrido. Si supera la tolerancia se genera una alerta de corte de
            vía para Protección Civil.
          </p>

          <Link className="dossier-cta" to={`/gps-live?token=${PRUEBA_BARRIO.id}`}>
            <FaMapMarkedAlt /> Abrir el mapa en vivo
          </Link>
        </section>

        {/* ---------------- Alertas ---------------- */}
        <section className="dossier-card" aria-label="Alertas operativas">
          <h2>
            <FaShieldAlt /> Alertas operativas
          </h2>
          {alerts.length === 0 ? (
            <p className="dossier-empty">
              Sin alertas: la comitiva va dentro de los márgenes de desvío, retraso y
              densidad.
            </p>
          ) : (
            <ul className="dossier-alerts">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </ul>
          )}
        </section>
      </div>


      {/* ---------------- Densidad por tramo ---------------- */}
      <section className="dossier-card" aria-label="Aforo estimado por tramo">
        <h2>
          <FaUsers /> Aforo estimado y densidad por tramo
        </h2>
        <p className="dossier-note">
          Recorrido de referencia: <strong>{referenceRoute.nombre}</strong>. Aforo
          estimado total <strong>{fmt.format(totalEstimated)} personas</strong> ·{' '}
          {criticalSegments.length} de {segments.length} tramos por encima del umbral
          de densidad. Estimación basada en superficie y tipo de vía, no en recuento
          con sensor.
        </p>

        <div className="dossier-table-wrap">
          <table className="dossier-table">
            <caption className="sr-only">Aforo estimado por tramo del recorrido</caption>
            <thead>
              <tr>
                <th scope="col">Tramo</th>
                <th scope="col">Tipo</th>
                <th scope="col">Longitud</th>
                <th scope="col">Aforo est.</th>
                <th scope="col">Densidad</th>
                <th scope="col">Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => (
                <tr key={`${s.street}-${s.lengthM}`}>
                  <th scope="row">
                    {s.street}
                    {s.isOfficialStop && <span className="dossier-tag">parada</span>}
                  </th>
                  <td>{s.kind}</td>
                  <td>{fmt.format(s.lengthM)} m</td>
                  <td>{fmt.format(s.estimatedSpectators)}</td>
                  <td>{fmt1.format(s.densityPerM2)} pers/m²</td>
                  <td>
                    <span className={`dossier-risk is-${s.risk}`}>{RISK_LABEL[s.risk]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="dossier-columns">
        {/* ---------------- Impacto económico ---------------- */}
        <section className="dossier-card" aria-label="Impacto económico">
          <h2>
            <FaStore /> Impacto económico y comercio de barrio
          </h2>
          <div className="dossier-impact">
            <div className="dossier-impact-figure">
              <span className="dossier-kpi-value">
                {fmt.format(impact.exposureKm)} km
              </span>
              <span className="dossier-kpi-label">Superficie de exposición comercial</span>
            </div>
            <p className="dossier-note">
              Estimación orientativa del gasto diario atribuible al recorrido sobre
              hostelería y comercio de barrio. Es una estimación con supuestos
              declarados, no una previsión de facturación.
            </p>
            <details className="dossier-assumptions">
              <summary>Ver supuestos del modelo</summary>
              <ul>
                {impact.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </details>
          </div>
        </section>

        {/* ---------------- Escaparate digital ---------------- */}
        <section className="dossier-card" aria-label="Escaparate digital para comercios">
          <h2>
            <FaStore /> Escaparate digital para el comercio
          </h2>
          <p className="dossier-note">
            Cada comercio del recorrido puede ganar visibilidad en la app (Ficha,
            Agenda y mapa) a cambio de mantener su informacion al dia. El directorio
            muestra el escaparate de ejemplo que la plataforma ya soporta.
          </p>
          <ul className="dossier-directory">
            <li>
              <strong>Bar · TABERNA DEL PILAR</strong>
              <span>Plaza del Pilar (eje del recorrido)</span>
            </li>
            <li>
              <strong>Panadería · HORNO DE SAN JOSÉ</strong>
              <span>Barrio de San José</span>
            </li>
            <li>
              <strong>Heladería · LA PILA</strong>
              <span>Calle Alfonso I</span>
            </li>
          </ul>
          <a
            className="dossier-cta is-secondary"
            href="https://www.zaragoza.es/ciudad/cultura/gigantes"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaExternalLinkAlt /> Zaragoza Cultural
          </a>
        </section>
      </div>

      <footer className="dossier-footer-note">
        Esta vista es una herramienta de apoyo a la decisión. Las cifras de aforo
        son estimaciones; los datos de posición, cobertura y alertas de desvío
        provienen de telemetría real del recorrido.
      </footer>
    </div>
  );
};

export default DossierAyuntamiento;
