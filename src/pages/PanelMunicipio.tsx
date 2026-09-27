/**
 * PANEL DE GESTIÓN Y ANALÍTICA MUNICIPAL (B2G).
 *
 * Panel privado para lasonianfailed concejería. Tres bloques, que son los tres
 * que se pidieron:
 *   1. Estadísticas de recorrido: distancia, duración y velocidad real.
 *   2. Tiempos de parada: tabla con inicio, fin y duración de cada parada.
 *   3. Mapa de calor de afluencia: celdas de 100 m coloreadas por intensidad.
 *
 * ── Sobre el acceso ────────────────────────────────────────────────────────
 * No hay usuarios ni contraseñas en este proyecto (el relay tampoco los tiene:
 * se autentica por token). El panel exige el `MUNICIPAL_PANEL_TOKEN` del
 * servidor, que vive en la variable de entorno y NUNCA en el bundle. Lo que
 * escribe el usuario se queda en `sessionStorage`: al cerrar la pestaña, la
 * credencial desaparece. Es la decisión correcta para un equipo que se lleva
 * el portátil.
 *
 * ── Sobre lo que NO hace ───────────────────────────────────────────────────
 * No rastrea personas. Las celdas son agregados de 100 m que combinan el
 * recorrido del emisor con los espectadores del stream (demanda observada, no
 * un censo). El texto de privacidad está en pantalla, no escondido en la nota
 * legal: es parte del producto.
 */

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaLock,
  FaShieldAlt,
  FaSyncAlt,
  FaSignOutAlt,
  FaMapMarkedAlt,
  FaClock,
  FaUsers,
  FaRoute,
  FaExclamationTriangle,
} from 'react-icons/fa';
import {
  PanelError,
  leerTokenPanel,
  guardarTokenPanel,
  normalizarTokenPanel,
  tokenPanelValido,
  obtenerResumen,
  obtenerSalas,
  type PanelResumen,
  type PanelSala,
} from '../services/municipalPanel';
import { PRUEBA_BARRIO_CENTER } from '../data/pruebaBarrioRoute';
import type { MapLayerKey } from '../components/maps/mapLayers';
import MapLayerSwitch from '../components/maps/MapLayerSwitch';
import '../styles/panelMunicipio.css';

const PanelHeatmap = lazy(() => import('../components/maps/PanelHeatmap'));

/** Periodo de refresco del panel: 15 s dan datos frescos sin martillear el relay. */
const REFRESH_MS = 15000;

const fmtInt = new Intl.NumberFormat('es-ES');
const fmtDecimal = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

function fmtHora(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuracion(seg: number | null): string {
  if (seg == null) return 'en curso';
  if (seg < 60) return `${seg} s`;
  const min = Math.floor(seg / 60);
  const resto = seg % 60;
  return resto ? `${min} min ${resto} s` : `${min} min`;
}

/** Puerta de acceso: pide el token del panel y lo valida contra el servidor. */
const Puerta: React.FC<{ onAcceso: (token: string) => void }> = ({ onAcceso }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tokenPanelValido(token)) {
      setError('El token debe tener al menos 8 caracteres (alfanumérico, - y _).');
      return;
    }
    // Normalizamos una vez y reutilizamos: validar, validar contra el servidor
    // y guardar deben comparar SIEMPRE el mismo valor, o un espacio pegado
    // hace que la puerta acepte y la API rechace.
    const limpio = normalizarTokenPanel(token);
    setEnviando(true);
    try {
      // Se valida contra el servidor ANTES de guardar nada: una credencial
      // equivocada no debe quedarse en la sesión de la Concejala.
      await obtenerResumen(limpio);
      guardarTokenPanel(limpio);
      onAcceso(limpio);
    } catch (err) {
      setError(err instanceof PanelError ? err.message : 'No se pudo validar el acceso.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="panel-gate">
      <div className="panel-gate-icon" aria-hidden="true">
        <FaLock />
      </div>
      <h1>Panel municipal</h1>
      <p>
        Acceso restringido para la Concejalía. Necesita la credencial del panel
        (<code>MUNICIPAL_PANEL_TOKEN</code>) que configuró el servicio.
      </p>
      {error && (
        <div className="panel-error" role="alert">
          <FaExclamationTriangle aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={enviar}>
        <input
          className="panel-field"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Token del panel"
          autoComplete="off"
          aria-label="Token del panel municipal"
        />
        <button className="btn-primary" type="submit" disabled={enviando} style={{ width: '100%' }}>
          {enviando ? 'Validando…' : 'Entrar'}
        </button>
      </form>
      <p className="panel-hint">
        La credencial se guarda solo en esta pestaña (sessionStorage) y se borra al cerrarla. No
        se envía en la URL: viaja en una cabecera para no acabar en los logs del servidor.
      </p>
      <p className="panel-hint">
        <Link to="/">← Volver a la portada pública</Link>
      </p>
    </div>
  );
};

export const PanelMunicipio: React.FC = () => {
  const [token, setToken] = useState<string>(() => leerTokenPanel());
  const [resumen, setResumen] = useState<PanelResumen | null>(null);
  const [salas, setSalas] = useState<PanelSala[]>([]);
  const [hash, setHash] = useState<string>('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [layer, setLayer] = useState<MapLayerKey>('estandar');

  const cargar = useCallback(
    async (tokenActivo: string, hashActivo: string, silencioso = false) => {
      // `silencioso` evita marcar "cargando" en la primera carga del effect: ese
      // setState síncrono provocaría un render en cascada en cada montaje.
      if (!silencioso) setCargando(true);
      try {
        const [res, lista] = await Promise.all([
          obtenerResumen(tokenActivo, hashActivo || undefined),
          obtenerSalas(tokenActivo).catch(() => [] as PanelSala[]),
        ]);
        setResumen(res);
        setSalas(lista);
        setError('');
      } catch (err) {
        setError(err instanceof PanelError ? err.message : 'Error desconocido al leer la analítica.');
        if (err instanceof PanelError && (err.code === 'no_autorizado' || err.code === 'no_configurado')) {
          guardarTokenPanel('');
          setToken('');
        }
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    [],
  );

  // Primera carga y refresco periódico mientras haya sesión abierta.
  //
  // La primera lectura se lanza dentro de una IIFE async a propósito: un
  // `cargar()` directo en el cuerpo del effect marca "cargando" de forma
  // síncrona y encadena un render extra en cada montaje. Con la IIFE, todo lo
  // que ocurre dentro ocurre ya en una microtarea.
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    const id = window.setInterval(() => {
      if (vivo) void cargar(token, hash);
    }, REFRESH_MS);
    void (async () => {
      if (vivo) await cargar(token, hash, true);
    })();
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [token, hash, cargar]);

  const salir = () => {
    guardarTokenPanel('');
    setToken('');
    setResumen(null);
    setSalas([]);
    setHash('');
  };

  // Centro del mapa: el último punto real si lo hay; si no, el enclave de referencia.
  const center = useMemo<[number, number]>(() => {
    const ultimo = resumen?.trayectoria[resumen.trayectoria.length - 1];
    return ultimo ? [ultimo.lat, ultimo.lng] : PRUEBA_BARRIO_CENTER;
  }, [resumen]);

  if (!token) return <Puerta onAcceso={setToken} />;

  const celdaM = 100;
  const sinDatos = !resumen || resumen.vacio;

  return (
    <div className="panel-page">
      <div className="panel-wrap">
        <header className="panel-head">
          <div>
            <h1>Panel de gestión y analítica</h1>
            <p>
              Recorrido, paradas y afluencia · datos agregados, sin datos personales
            </p>
          </div>
          <div className="panel-head-actions">
            {salas.length > 1 && (
              <select
                className="panel-select"
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                aria-label="Seleccionar comparsa"
              >
                <option value="">Todas las comparsas</option>
                {salas.map((s) => (
                  <option key={s.hash} value={s.hash}>
                    Sala {s.hash} ({s.muestras} muestras)
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="panel-btn"
              onClick={() => void cargar(token, hash)}
              disabled={cargando}
            >
              <FaSyncAlt aria-hidden="true" /> {cargando ? 'Actualizando…' : 'Actualizar'}
            </button>
            <button type="button" className="panel-btn" onClick={salir}>
              <FaSignOutAlt aria-hidden="true" /> Salir
            </button>
            <div style={{ position: 'relative' }}>
              <MapLayerSwitch active={layer} onChange={setLayer} />
            </div>
          </div>
        </header>

        <div className="panel-privacy">
          <FaShieldAlt aria-hidden="true" />
          <span>
            Datos agregados por celdas de 100 m que combinan el recorrido del emisor con los
            espectadores del stream. No se registra ninguna identidad: sin nombres, sin
            identificadores de dispositivo y con caducidad automática de 6 horas.
          </span>
        </div>

        {error && (
          <div className="panel-error" role="alert" style={{ marginTop: 14 }}>
            <FaExclamationTriangle aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <section className="panel-kpis" aria-label="Indicadores de recorrido">
          <div className="panel-kpi">
            <div className="panel-kpi-label">Distancia</div>
            <div className="panel-kpi-value">
              {sinDatos ? '—' : fmtInt.format(Math.round((resumen?.recorrido.distanciaM ?? 0) / 10) / 100)}{' '}
              <small>km</small>
            </div>
          </div>
          <div className="panel-kpi">
            <div className="panel-kpi-label">Duración en marcha</div>
            <div className="panel-kpi-value">
              {sinDatos ? '—' : fmtDuracion(Math.round((resumen?.recorrido.duracionMs ?? 0) / 1000))}
            </div>
          </div>
          <div className="panel-kpi">
            <div className="panel-kpi-label">Velocidad media</div>
            <div className="panel-kpi-value">
              {sinDatos ? '—' : fmtDecimal.format((resumen?.recorrido.velocidadMediaMs ?? 0) * 3.6)}{' '}
              <small>km/h</small>
            </div>
          </div>
          <div className="panel-kpi">
            <div className="panel-kpi-label">Paradas</div>
            <div className="panel-kpi-value">{sinDatos ? '—' : (resumen?.paradas.total ?? 0)}</div>
          </div>
          <div className="panel-kpi">
            <div className="panel-kpi-label">Tiempo en parada</div>
            <div className="panel-kpi-value">
              {sinDatos ? '—' : fmtDuracion(resumen?.paradas.segundosParados ?? 0)}
            </div>
          </div>
          <div className="panel-kpi">
            <div className="panel-kpi-label">Espectadores</div>
            <div className="panel-kpi-value">
              {sinDatos ? '—' : fmtInt.format(resumen?.audiencia.espectadores ?? 0)}
            </div>
          </div>
        </section>


        <div className="panel-grid">
          {/* ── Mapa de calor + trayectoria ── */}
          <div className="panel-card">
            <div className="panel-card-title">
              <FaMapMarkedAlt aria-hidden="true" /> Afluencia de público y recorrido real
            </div>
            <div className="panel-card-body">
              <div className="panel-heatmap">
                {sinDatos ? (
                  <div className="panel-heatmap-placeholder" role="status" aria-live="polite">
                    Sin datos de recorrido todavía. En cuanto el emisor GPS envíe su primera
                    posición, el mapa se rellenará solo.
                  </div>
                ) : (
                  <Suspense
                    fallback={
                      <div className="panel-heatmap-placeholder" role="status" aria-live="polite">
                        Cargando mapa de calor…
                      </div>
                    }
                  >
                    <PanelHeatmap
                      celdas={resumen?.celdas ?? []}
                      trayectoria={resumen?.trayectoria ?? []}
                      celdaM={celdaM}
                      center={center}
                      layer={layer}
                    />
                  </Suspense>
                )}
              </div>
              <div className="panel-heatmap-legend">
                <span>Baja</span>
                <span className="panel-legend-ramp" aria-hidden="true" />
                <span>Alta</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'hsl(var(--color-text-secondary))', margin: '8px 0 0' }}>
                Intensidad = recorrido del emisor + espectadores del stream en esa manzana. La línea
                negra es el trazado REAL, no el previsto: comparar ambos es lo que permite ajustar
                el recorrido del año que viene.
              </p>
            </div>
          </div>

          {/* ── Tiempos de parada ── */}
          <div className="panel-card">
            <div className="panel-card-title">
              <FaClock aria-hidden="true" /> Tiempos de parada
            </div>
            <div className="panel-card-body">
              {!resumen || resumen.paradas.lista.length === 0 ? (
                <p className="panel-empty">
                  {sinDatos
                    ? 'Sin datos: todavía no se ha registrado ninguna parada.'
                    : 'La comparsa no ha detenido más de 20 segundos en lo que va de salida.'}
                </p>
              ) : (
                <table className="panel-stops">
                  <thead>
                    <tr>
                      <th scope="col">Inicio</th>
                      <th scope="col">Fin</th>
                      <th scope="col">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.paradas.lista.map((p, i) => (
                      <tr key={`${p.inicioAt}-${i}`} className={p.enCurso ? 'is-curso' : ''}>
                        <td>{fmtHora(p.inicioAt)}</td>
                        <td>{p.enCurso ? 'ahora' : fmtHora(p.finAt)}</td>
                        <td>
                          {/* La duración de una parada en curso la calcula el
                              servidor en cada lectura; aquí no se llama a
                              Date.now() porque el render debe ser puro. */}
                          {p.enCurso ? `en curso · ${fmtDuracion(p.duracionSeg)}` : fmtDuracion(p.duracionSeg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p style={{ fontSize: '0.72rem', color: 'hsl(var(--color-text-secondary))', margin: '12px 0 0' }}>
                Se considera parada la permanencia con velocidad ≤ 0,4 m/s durante al menos 20
                segundos (semáforos y flujos de la plaza quedan fuera).
              </p>
            </div>
          </div>
        </div>

        <p style={{ marginTop: 16, fontSize: '0.74rem', color: 'hsl(var(--color-text-secondary))' }}>
          <FaRoute aria-hidden="true" /> Última lectura: {fmtHora(resumen?.generadoAt ?? null)} ·{' '}
          {fmtInt.format(resumen?.muestras ?? 0)} muestras GPS · refresco automático cada 15 s ·{' '}
          <FaUsers aria-hidden="true" /> máximo de espectadores en la sala:{' '}
          {fmtInt.format(resumen?.audiencia.maximo ?? 0)}
        </p>
      </div>
    </div>
  );
};

export default PanelMunicipio;

