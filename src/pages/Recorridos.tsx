import React, { Suspense, lazy, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { barrios } from '../data/singleSource';
import type { Route } from '../data/singleSource';
import { PRUEBA_BARRIO } from '../config/pruebaBarrio';
import { useRelayPosition } from '../hooks/useRelayPosition';
import type { MapLayerKey } from '../components/maps/mapLayers';
import { fetchOSRMRouteWithAutoFix, osrmToLatLng } from '../services/routingService';
import { getRouteMetrics } from '../services/animationService';
import { usePosition } from '../services/position';
import type { PositionSourceConfig } from '../services/position';

// Code-splitting: la pagina NO importa Leaflet en tiempo de ejecucion. El motor
// de mapas (~150 kB) se descarga con React.lazy DESPUES de que se hayan pintado
// los controles, la ficha del recorrido y sus metricas.
const RecorridosMap = lazy(() => import('../components/maps/RecorridosMap'));
// Multiplicadores canonicos de la demo (1x / 2x / 4x) y sus etiquetas.
import { DEMO_SPEED_MULTIPLIERS, DEMO_SPEED_LABEL } from '../services/position/telemetryUtils';
import {
  FaPlay,
  FaPause,
  FaUndo,
  FaClock,
  FaRoad,
  FaHourglassHalf,
  FaChevronRight,
  FaLocationArrow,
  FaFilter,
  FaSatellite,
  FaDesktop,
} from 'react-icons/fa';
import '../styles/recorridos.css';

// Los componentes de mapa (MapEventsHandler, AutoFitBounds, FollowMarker y la
// creacion de iconos Leaflet) viven en components/maps/RecorridosMap.tsx, que se
// carga con React.lazy. Asi esta pagina no arrastra leaflet en su bundle.

/** Formatea la velocidad del emisor con un decimal y coma decimal (es-ES). */
const fmt1Kmh = (kmh: number): string =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(kmh);

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export const Recorridos: React.FC = () => {
  // ---- Filters ----
  const [filterType, setFilterType] = useState<'todos' | 'municipal' | 'barrio'>('todos');
  const [filterCategory, setFilterCategory] = useState<'todos' | 'gigante' | 'cabezudo'>('todos');

  const location = useLocation();
  const navigate = useNavigate();
  const barrioQueryId = new URLSearchParams(location.search).get('barrio');

  // ---- Derived route data ----
  const routeList = useMemo<Route[]>(() => barrios.map((b) => b.recorrido), []);

  const initialSelectedRouteId = useMemo(() => {
    if (barrioQueryId) return barrioQueryId;
    return routeList[0]?.id ?? '';
  }, [barrioQueryId, routeList]);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(initialSelectedRouteId);
  const [followMode, setFollowMode] = useState<boolean>(true);

  // Track if this is the first render to handle URL query param correctly
  const isFirstRenderRef = useRef(true);
  
  // Sync state when barrio query param changes (e.g., from Barrios modal navigation)
  // This effect runs once on mount and when the URL query param changes
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      // On first render, if there's a barrio query, ensure state is synced
      if (barrioQueryId) {
        setFilterType('barrio');
      }
      return;
    }
    // On subsequent renders (URL change), update the selected route
    if (barrioQueryId && barrioQueryId !== selectedRouteId) {
      setSelectedRouteId(barrioQueryId);
      setFilterType('barrio');
    }
  }, [barrioQueryId, selectedRouteId]);

  // ---- Position mode toggle ----
  // 'gps' = ver la COMPARSA en directo (stream del relay, no el movil del
  // visitante). Antes este modo usaba el GPS del propio dispositivo, lo que
  // obligaba a pulsar Play y nunca mostraba al emisor.
  const [positionMode, setPositionMode] = useState<'simulation' | 'gps'>('simulation');
  // GPS de este dispositivo: alternativa explicita para cuando el movil que
  // consulta ES la comparsa (pruebas en mano). Por defecto, no.
  const [useLocalGps, setUseLocalGps] = useState(false);

  // ---- Filtered routes ----
  const filteredRoutes: Route[] = useMemo(() => {
    return routeList.filter((route) => {
      const matchesType = filterType === 'todos' || filterType === 'barrio';
      const matchesCategory = filterCategory === 'todos' || route.category === filterCategory;
      return matchesType && matchesCategory;
    });
  }, [routeList, filterType, filterCategory]);

  // When barrio query param is present, search by barrioId first, then by route.id
  // This handles the case where the URL has barrio=delicias but the route id is route-delicias
  // We use useMemo to avoid re-renders and compute the correct route and id in one pass
  const { selectedRoute, effectiveRouteId } = useMemo(() => {
    const routeFoundById = routeList.find((route) => route.id === selectedRouteId);
    const routeFoundByBarrioId = routeList.find((route) => route.barrioId === selectedRouteId);
    const route = routeFoundById ?? routeFoundByBarrioId ?? filteredRoutes[0] ?? routeList[0];
    return {
      selectedRoute: route,
      effectiveRouteId: routeFoundById ? selectedRouteId : (routeFoundByBarrioId?.id ?? selectedRouteId),
    };
  }, [routeList, selectedRouteId, filteredRoutes]);

  const routeChangeToken = selectedRoute?.id ?? 'unknown';
  const points = selectedRoute.waypoints;
  const durationMinutes = selectedRoute.durationMinutes;
  const totalDurationMs = durationMinutes * 60 * 1000;

  // ---- Aislamiento estricto de la transmision en vivo por recorrido ---------
  // SOLO el recorrido de San José Demo (Ayuntamiento) tiene emisor propio
  // (token cmp_prueba_barrio). Para cualquier otro barrio (Las Fuentes, Actur,
  // Delicias...) la opcion GPS Real NO se suscribe a nada: el mapa se queda en
  // su trazado estatico. Sin esta comprobacion, la posicion de San José movia
  // el mapa de todos los demás recorridos.
  const isLiveRoute = selectedRoute?.id === PRUEBA_BARRIO.routeId;



  // Si el recorrido seleccionado NO tiene emisor, el modo efectivo es Demo
  // aunque el usuario hubiera elegido GPS Real en el recorrido anterior. Se
  // DERIVA en render en vez de corregir el estado con un efecto: asi no hay
  // render en cascada y la verdad es siempre coherente con lo que se muestra.
  const effectiveMode: 'simulation' | 'gps' = isLiveRoute ? positionMode : 'simulation';
  // Suscripcion al relay. Solo se abre si el recorrido es el de la demo Y el
  // modo es GPS Real; en Demo o en otro barrio no hay ninguna conexion SSE.
  const relay = useRelayPosition(
    PRUEBA_BARRIO.id,
    isLiveRoute && effectiveMode === 'gps' && !useLocalGps
  );
  // Peticion de encuadre de camara: la consume el mapa (lazy) con un flyTo.
  const [frameRequest, setFrameRequest] = useState<{ target: [number, number]; nonce: number } | null>(null);
  const framedNonceRef = useRef(0);

  // ---- OSRM state ----
  type OsrmRouteState = {
    coordinates: { lat: number; lng: number }[];
    distance: number;
    duration: number;
  };

  const osrmCacheRef = useRef<Map<string, OsrmRouteState>>(new Map());
  const routeWaypoints = useMemo(() => points.map((p) => ({ lat: p.lat, lng: p.lng })), [points]);

  const osrmCacheKey = useCallback((wps: { lat: number; lng: number }[]) => {
    return wps.map((wp) => `${wp.lat.toFixed(5)},${wp.lng.toFixed(5)}`).join('|');
  }, []);

  const [routeGeometryForAnim, setRouteGeometryForAnim] = useState<{ lat: number; lng: number }[]>(routeWaypoints);
  // Zoom actual del mapa: tamaño adaptativo del icono de la comparsa.
  const [mapZoom, setMapZoom] = useState(15);

  // Reset geometry when route changes
  useEffect(() => {
    // Defer state updates to avoid strict lint rule failures
    Promise.resolve().then(() => {
      setRouteGeometryForAnim(routeWaypoints);
      setFollowMode(true);
    });
  }, [routeChangeToken, routeWaypoints]);


  // ---- OSRM fetch ----
  const lastOsrmRequestIdRef = useRef<number>(0);
  const lastOsrmFailAtRef = useRef<number>(0);
  const osrmInFlightRef = useRef(false);

  const prevRouteChangeTokenRef = useRef<string>(routeChangeToken);
  useEffect(() => {
    if (prevRouteChangeTokenRef.current !== routeChangeToken) {
      prevRouteChangeTokenRef.current = routeChangeToken;
      lastOsrmFailAtRef.current = 0;
      osrmInFlightRef.current = false;
    }
  }, [routeChangeToken]);


  useEffect(() => {
    let cancelled = false;
    const requestId = ++lastOsrmRequestIdRef.current;

    const doFetch = async () => {
      if (routeWaypoints.length < 2) {
        setRouteGeometryForAnim(routeWaypoints);
        return;
      }

      const now = Date.now();
      const FAIL_COOLDOWN_MS = 20_000;
      if (now - lastOsrmFailAtRef.current < FAIL_COOLDOWN_MS) return;
      if (osrmInFlightRef.current) return;
      osrmInFlightRef.current = true;

      try {
        const key = osrmCacheKey(routeWaypoints);
        const cached = osrmCacheRef.current.get(key);
        if (cached) {
          setRouteGeometryForAnim(cached.coordinates);
          return;
        }

        const fixRes = await fetchOSRMRouteWithAutoFix(routeWaypoints, {
          maxAttempts: 5,
          minAcceptableScore: 0.15,
        });

        if (cancelled) return;
        if (requestId !== lastOsrmRequestIdRef.current) return;

        if (!fixRes.geometry) {
          setRouteGeometryForAnim(routeWaypoints);
          return;
        }

        const coordsLatLng = osrmToLatLng(fixRes.geometry.coordinates);
        const nextState: OsrmRouteState = {
          coordinates: coordsLatLng,
          distance: fixRes.geometry.distance,
          duration: fixRes.geometry.duration,
        };
        osrmCacheRef.current.set(key, nextState);
        setRouteGeometryForAnim(coordsLatLng);
      } catch {
        lastOsrmFailAtRef.current = Date.now();
      } finally {
        osrmInFlightRef.current = false;
      }
    };

    doFetch();
    return () => { cancelled = true; };
  }, [routeWaypoints, osrmCacheKey]);

  // ---- Route metrics ----
  const metrics = getRouteMetrics(routeGeometryForAnim);

  // ---- Street points for position system ----
  const streetPoints = useMemo(() => points.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    streetName: p.calle,
    isStop: p.isStop,
  })), [points]);

  // ---- Position source config for usePosition hook ----
  const positionConfig: PositionSourceConfig = useMemo(() => ({
    animCoords: routeGeometryForAnim,
    streetPoints,
    totalDurationMs,
    durationMinutes,
    timeString: selectedRoute.timeString,
    metrics,
  }), [routeGeometryForAnim, streetPoints, totalDurationMs, durationMinutes, selectedRoute.timeString, metrics]);

  // ---- Modo real: la fuente de posicion -----------------------------------
  // En "GPS Real" la fuente por defecto es el RELAY (la comparsa). La fuente
  // GPS del propio dispositivo solo se activa si el usuario lo pide de forma
  // explicita; asi no se dispara el permiso de geolocalizacion del visitante
  // sin querer ni se le pide que pulse Play.
  const sourceMode: 'simulation' | 'gps' =
    effectiveMode === 'gps' && !useLocalGps ? 'simulation' : effectiveMode;

  // ---- Use the unified position hook ----
  const {
    state: simState,
    play,
    pause,
    reset,
    setSpeed,
    isPlaying,
    speed,
  } = usePosition({
    mode: sourceMode,
    config: positionConfig,
  });

  // ---- Switch position mode ----
  const handleToggleMode = useCallback(() => {
    const nextMode = positionMode === 'simulation' ? 'gps' : 'simulation';
    setPositionMode(nextMode);
    // Al activar GPS Real se olvida el GPS local: cada reactivacion vuelve al
    // stream de la comparsa, que es el comportamiento predecible.
    setUseLocalGps(false);
  }, [positionMode]);

  // GPS Real sobre el GPS de ESTE dispositivo (caso del movil en la Parade).
  // Arranca solo: antes habia que pulsar ▶.
  const handleUseLocalGps = useCallback(() => {
    setUseLocalGps(true);
    play();
  }, [play]);

  // ---- Play/pause/reset handlers ----
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // ---- Route change handler ----
  const handleRouteChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRouteId(e.target.value);
    reset();
  }, [reset]);

  // ---- Capa base del mapa (calle / satelite) ----
  const [mapLayer, setMapLayer] = useState<MapLayerKey>('estandar');
  const handleLayerChange = useCallback((key: MapLayerKey) => {
    setMapLayer(key);
  }, []);

  // ---- Handlers de camara que consume el mapa lazy ----
  // useCallback para que el subarbol de mapa no se re-renderice al cambiar
  // cualquier otro estado de la pagina (velocidad, modo, ruta...).
  const handleMapDragStart = useCallback(() => {
    setFollowMode(false);
  }, []);

  const handleFollowMode = useCallback(() => {
    setFollowMode(true);
  }, []);

  // ---- Posicion del marcador ---------------------------------------------
  // En GPS Real manda la posicion del RELAY (la comparsa). La fuente local solo
  // se usa si el usuario eligio "GPS de este movil".
  const relayPosition = relay.position;
  const useRelayForMarker = isLiveRoute && effectiveMode === 'gps' && !useLocalGps && relayPosition != null;

  const comparsaPos = useMemo<[number, number] | null>(() => {
    if (useRelayForMarker && relayPosition) {
      return [relayPosition.lat, relayPosition.lng];
    }
    return Number.isFinite(simState.lat) && Number.isFinite(simState.lng)
      ? ([simState.lat, simState.lng] as [number, number])
      : null;
  }, [useRelayForMarker, relayPosition, simState.lat, simState.lng]);

  // ---- Reencuadre automatico al llegar la posicion real --------------------
  // Se pide un vuelo UNA vez por trama viva: la camara salta de la Plaza del
  // Pilar a donde este el movil emisor, llegue la trama antes o despues de que
  // el mapa (lazy) este montado.
  useEffect(() => {
    if (!useRelayForMarker || !relayPosition) return;
    if (framedNonceRef.current === relay.frameNonce) return;
    framedNonceRef.current = relay.frameNonce;
    setFrameRequest({ target: [relayPosition.lat, relayPosition.lng], nonce: relay.frameNonce });
  }, [useRelayForMarker, relayPosition, relay.frameNonce]);

  // ---- Estado que consume el mapa lazy ----
  // Los iconos (avatar de la comparsa y pin de parada) se crean dentro del
  // chunk del mapa: la pagina solo le pasa los datos primitivos.
  const comparsaStatusLine =
    simState.status === 'Parada'
      ? `Parada en ${simState.activeStopName}`
      : `Recorriendo ${simState.currentStreet}`;

  return (
    <div className="recorridos-page" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="recorridos-grid" style={{ position: 'relative', zIndex: 1 }}>

        {/* Left Control Panel */}
        <section className="left-controls">

          {/* 1. Category & Type Filters */}
          <div className="filter-section-wrapper">
            <div className="selector-label">
              <FaFilter size={10} style={{ marginRight: '6px' }} />
              Filtros de Recorridos
            </div>
            <div className="filter-row">
              <button
                className={`filter-btn-rec ${filterType === 'todos' ? 'active' : ''}`}
                onClick={() => setFilterType('todos')}
              >
                Todos
              </button>
              <button
                className={`filter-btn-rec ${filterType === 'municipal' ? 'active' : ''}`}
                onClick={() => setFilterType('municipal')}
              >
                Municipal
              </button>
              <button
                className={`filter-btn-rec ${filterType === 'barrio' ? 'active' : ''}`}
                onClick={() => setFilterType('barrio')}
              >
                Barrios
              </button>
            </div>
            <div className="filter-row">
              <button
                className={`filter-btn-rec ${filterCategory === 'todos' ? 'active' : ''}`}
                onClick={() => setFilterCategory('todos')}
              >
                G + C
              </button>
              <button
                className={`filter-btn-rec ${filterCategory === 'gigante' ? 'active' : ''}`}
                onClick={() => setFilterCategory('gigante')}
              >
                Gigantes
              </button>
              <button
                className={`filter-btn-rec ${filterCategory === 'cabezudo' ? 'active' : ''}`}
                onClick={() => setFilterCategory('cabezudo')}
              >
                Cabezudos
              </button>
            </div>
          </div>

          {/* 2. Route Selector */}
          <div>
            <div className="selector-label">Seleccionar Desfile</div>
            <select
              className="route-dropdown"
              value={effectiveRouteId}
              onChange={handleRouteChange}
            >
              {/* When barrio query param is present, show all routes to ensure the barrio route is in the list */}
              {(barrioQueryId ? routeList : filteredRoutes).length > 0 ? (
                (barrioQueryId ? routeList : filteredRoutes).map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.characterEmoji} {route.nombre} ({route.barrioId})
                  </option>
                ))
              ) : (
                <option value="">No hay recorridos que coincidan</option>
              )}
            </select>
          </div>

          {/* 3. Mode Toggle + Simulation Player Dashboard */}
          <div className="sim-actions-panel">
            {/* Mode toggle.
                El resaltado usa `positionMode` (lo que el USUARIO eligio) y no
                `mode` de usePosition: en GPS Real la fuente sigue siendo la de
                simulacion (el marcador lo mueve el relay), asi que antes la
                pestana se quedaba congelada en "Demo". */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                className={`lock-btn ${effectiveMode === 'simulation' ? 'active' : ''}`}
                onClick={effectiveMode === 'simulation' ? undefined : handleToggleMode}
                aria-pressed={effectiveMode === 'simulation'}
                title="Cambiar a modo demostración"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <FaDesktop size={12} />
                <span>Demo</span>
              </button>
              <button
                className={`lock-btn ${effectiveMode === 'gps' ? 'active' : ''} ${isLiveRoute ? '' : 'is-disabled'}`}
                onClick={effectiveMode === 'gps' || !isLiveRoute ? undefined : handleToggleMode}
                disabled={!isLiveRoute}
                aria-pressed={effectiveMode === 'gps'}
                aria-disabled={!isLiveRoute}
                title={
                  isLiveRoute
                    ? 'Ver la posición real que emite la comparsa'
                    : 'Transmisión en vivo no disponible para este recorrido'
                }
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <FaSatellite size={12} />
                <span>GPS Real</span>
              </button>
            </div>

            {/* Aviso explicito cuando el recorrido no tiene emisor propio: sin
                esto el usuario pulsaba GPS Real y no occuria nada. */}
            {!isLiveRoute && (
              <p className="gps-live-status" data-state="offline" style={{ marginBottom: '10px' }}>
                <span className="gps-live-status-dot" aria-hidden="true" />
                Transmisión en vivo no disponible para este recorrido
              </p>
            )}

            {effectiveMode === 'simulation' && (
              <>
                {/* Simulation controls */}
                <div className="play-row">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={`control-circle-btn ${isPlaying ? 'playing' : ''}`}
                      onClick={handlePlayPause}
                      title={isPlaying ? 'Pausar Simulación' : 'Iniciar Simulación'}
                      aria-label="Play/Pause"
                    >
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <button
                      className="control-circle-btn"
                      onClick={handleReset}
                      title="Reiniciar Desfile"
                      aria-label="Reset"
                    >
                      <FaUndo />
                    </button>
                  </div>
                  <div className="speed-group">
                    {DEMO_SPEED_MULTIPLIERS.map((s) => (
                      <button
                        key={s}
                        className={`speed-btn ${speed === s ? 'active' : ''}`}
                        onClick={() => setSpeed(s)}
                        title={`${s}x — ${DEMO_SPEED_LABEL[s]}`}
                        aria-label={`Velocidad ${s}x: ${DEMO_SPEED_LABEL[s]}`}
                        aria-pressed={speed === s}
                      >
                        x{s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {effectiveMode === 'gps' && (
              <>
                {/* Estado real de la comparsa. En este modo NO hay reproductor:
                    la posicion llega del emisor y no hay nada que "reproducir". */}
                <div
                  className="gps-live-status"
                  role="status"
                  aria-live="polite"
                  data-state={relay.position ? 'live' : relay.connected ? 'waiting' : 'offline'}
                >
                  <span className="gps-live-status-dot" aria-hidden="true" />
                  {useLocalGps ? (
                    simState.gpsError ?? 'GPS de este dispositivo activo'
                  ) : relay.position ? (
                    <>
                      <strong>{relayPosition?.label}</strong> · {relay.ageSeconds} s ·{' '}
                      {relayPosition ? fmt1Kmh(relayPosition.speedKmh) : ''}
                      {relayPosition && relayPosition.accuracyM > 0
                        ? ` · ±${Math.round(relayPosition.accuracyM)} m`
                        : ''}
                    </>
                  ) : relay.connected ? (
                    'Conectado al canal: esperando al emisor…'
                  ) : (
                    'Sin conexión con el canal de la comparsa'
                  )}
                </div>

                {/* Alternativa explicita: usar el GPS de ESTE movil (cuando el
                    que consulta es la propia comparsa). Arranca solo. */}
                {!useLocalGps && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: '100%', marginTop: '8px', fontSize: '0.72rem' }}
                    onClick={handleUseLocalGps}
                  >
                    Usar el GPS de este móvil
                  </button>
                )}
              </>
            )}

            {/* Follow lock option */}
            <button
              className={`lock-btn ${followMode ? 'active' : ''}`}
              onClick={() => setFollowMode(!followMode)}
            >
              <FaLocationArrow />
              <span>{followMode ? 'Seguimiento Activo' : 'Cámara Libre'}</span>
            </button>
          </div>

          {/* 4. Active Dashboard Indicators */}
          <div className="stats-dashboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--color-border))', paddingBottom: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Monitoreo en Vivo</div>
              <span className={`status-badge ${
                simState.status === 'Esperando inicio' ? 'status-waiting' :
                simState.status === 'En marcha' ? 'status-active' :
                simState.status === 'Parada' ? 'status-stopped' : 'status-finished'
              }`}>
                {simState.status === 'Parada' ? `Parada en ${simState.activeStopName}` : simState.status}
              </span>
            </div>

            <div className="dashboard-grid">
              <div className="dash-card">
                <FaClock className="dash-icon" />
                <div>
                  <div className="dash-num">{simState.elapsedTimeFormatted}</div>
                  <div className="dash-label">Tiempo Transcurrido</div>
                </div>
              </div>
              <div className="dash-card">
                <FaRoad className="dash-icon" style={{ color: 'hsl(var(--color-accent))' }} />
                <div>
                  <div className="dash-num">
                    {simState.distanceTraveled} m
                  </div>
                  <div className="dash-label">Distancia Recorrida</div>
                </div>
              </div>
              <div className="dash-card">
                <FaHourglassHalf className="dash-icon" />
                <div>
                  <div className="dash-num">{simState.speed} km/h</div>
                  <div className="dash-label">Velocidad</div>
                </div>
              </div>
              <div className="dash-card">
                <FaHourglassHalf className="dash-icon" style={{ color: 'hsl(var(--color-secondary))' }} />
                <div>
                  <div className="dash-num">{simState.avgSpeed} km/h</div>
                  <div className="dash-label">Velocidad Media</div>
                </div>
              </div>
            </div>

            {/* Next Street information */}
            <div style={{ marginTop: '16px' }}>
              <div className="selector-label" style={{ fontSize: '0.75rem' }}>Próxima Calle</div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'hsl(var(--color-primary))', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaChevronRight size={10} />
                <span>{simState.nextStreet}</span>
              </div>
            </div>
          </div>

          {/* 5. Street checklist */}
          <div>
            <div className="selector-label">Itinerario de Calles</div>
            <div className="streets-scroller">
              {selectedRoute.streets.map((street, idx) => {
                const isActive = simState.currentStreet.includes(street);
                const isNext = simState.nextStreet.includes(street);

                return (
                  <div
                    key={idx}
                    className={`street-item ${isActive ? 'active' : isNext ? 'next' : ''}`}
                  >
                    <span style={{ fontSize: '0.65rem' }}>{isActive ? '●' : '○'}</span>
                    <span>{street}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Route Description + Map Legend */}
          <div className="route-info-box">
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid hsl(var(--color-border))' }}>
              <div className="selector-label" style={{ fontSize: '0.75rem', marginBottom: 10 }}>
                Leyenda del mapa
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'hsla(var(--color-primary), 0.06)', border: '1px solid hsla(var(--color-primary), 0.16)', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: 'hsl(var(--color-primary))' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Comparsa en marcha</div>
                </div>
                <div style={{ background: 'hsla(46, 100%, 50%, 0.12)', border: '1px solid hsla(46, 100%, 50%, 0.22)', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: 'hsl(var(--color-accent))' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Próxima salida</div>
                </div>
                <div style={{ background: 'hsla(142, 70%, 45%, 0.12)', border: '1px solid hsla(142, 70%, 45%, 0.22)', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: 'hsl(142, 70%, 45%)' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Recorrido programado</div>
                </div>
                <div style={{ background: 'hsla(350, 80%, 50%, 0.12)', border: '1px solid hsla(350, 80%, 50%, 0.22)', borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: 'hsl(350, 80%, 50%)' }} />
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>Finalizado</div>
                </div>
              </div>
            </div>
            <span className="route-badge badge-type-bar">
              Comparsa barrio
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>{selectedRoute.nombre}</h3>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--color-text-secondary))', lineHeight: 1.5 }}>
              {selectedRoute.description}
            </p>
            {selectedRoute.id === PRUEBA_BARRIO.routeId && (
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 12, width: '100%' }}
                onClick={() => navigate(`/gps-live?token=${encodeURIComponent(PRUEBA_BARRIO.id)}`)}
              >
                <FaLocationArrow size={12} /> Abrir mapa en vivo (SSE)
              </button>
            )}
          </div>

        </section>

        {/* Right Map Viewport */}
        <section className="map-wrapper">
          <Suspense fallback={<div className="recorridos-map-placeholder" role="status" aria-live="polite">Cargando mapa del recorrido...</div>}>
            <RecorridosMap
              routeColor={selectedRoute.color}
              routeGeometry={routeGeometryForAnim}
              layer={mapLayer}
              onLayerChange={handleLayerChange}
              frameRequest={frameRequest}
              stops={points}
              fitWaypoints={routeWaypoints}
              fitBoundsEnabled={!isPlaying && effectiveMode === 'simulation'}
              comparsaPosition={comparsaPos}
              comparsaName={selectedRoute.characterName}
              comparsaEmoji={selectedRoute.characterEmoji}
              comparsaZoom={mapZoom}
              followCameraEnabled={followMode && (isPlaying || effectiveMode === 'gps')}
              statusLine={comparsaStatusLine}
              onDragStart={handleMapDragStart}
              onFollowMode={handleFollowMode}
              onZoomChange={setMapZoom}
            />
          </Suspense>
        </section>

      </div>
    </div>
  );
};

export default Recorridos;
