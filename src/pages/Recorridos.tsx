import React, { Suspense, lazy, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { barrios } from '../data/singleSource';
import type { Route } from '../data/singleSource';
import { PRUEBA_BARRIO } from '../config/pruebaBarrio';
import { AnimatePresence, motion } from 'framer-motion';
import { PATROCINIO_CATEGORIA_COLOR, PATROCINIO_CATEGORIA_GLYPH } from '../data/patrocinadores';
import type { Patrocinador, PatrocinioCategoria } from '../data/patrocinadores';
import { useRelayPosition } from '../hooks/useRelayPosition';
import type { MapLayerKey } from '../components/maps/mapLayers';
import { fetchOSRMRouteWithAutoFix, osrmToLatLng } from '../services/routingService';
import { getRouteMetrics } from '../services/animationService';
import { usePosition } from '../services/position';
import type { PositionSourceConfig } from '../services/position';
import {
  cargarParadas,
  fusionarParadas,
  type ParadaGestion,
} from '../services/paradas';
import { comerciosDeParada } from '../services/comerciosParada';
import FichaParadaComercios from '../components/FichaParadaComercios';

// Code-splitting: la pagina NO importa Leaflet en tiempo de ejecucion. El motor
// de mapas (~150 kB) se descarga con React.lazy DESPUES de que se hayan pintado
// los controles, la ficha del recorrido y sus metricas.
const RecorridosMap = lazy(() => import('../components/maps/RecorridosMap'));
// Multiplicadores de velocidad del recorrido y sus etiquetas.
import { DEMO_SPEED_MULTIPLIERS, DEMO_SPEED_LABEL } from '../services/position/telemetryUtils';
import {
  FaPlay,
  FaPause,
  FaUndo,
  FaClock,
  FaRoad,
  FaChevronRight,
  FaLocationArrow,
  FaFilter,
  FaSatellite,
} from 'react-icons/fa';
import '../styles/recorridos.css';

// Los componentes de mapa (MapEventsHandler, AutoFitBounds, FollowMarker y la
// creacion de iconos Leaflet) viven en components/maps/RecorridosMap.tsx, que se
// carga con React.lazy. Asi esta pagina no arrastra leaflet en su bundle.

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
/** Agrupación de las categorías de catálogo para el filtro rápido. */
const GRUPO_COMERCIO: Record<PatrocinioCategoria, 'hosteleria' | 'tradicional'> = {
  bar: 'hosteleria',
  restaurante: 'hosteleria',
  panaderia: 'tradicional',
  pasteleria: 'tradicional',
  tienda: 'tradicional',
};

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
  // El GPS solo se ofrece para el recorrido habilitado y solicita la ubicación
  // de este dispositivo después de que la persona lo active expresamente.
  const [positionMode, setPositionMode] = useState<'simulation' | 'gps'>('simulation');

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
  // Waypoints COMPLETOS del recorrido: sirven para trazar la línea del mapa y
  // para calcular el avance. Las PARADAS son solo un subconjunto de estos
  // (`isStop`), y son las que el gestor del Ayuntamiento puede mover.
  const points = selectedRoute.waypoints;
  const durationMinutes = selectedRoute.durationMinutes;
  const totalDurationMs = durationMinutes * 60 * 1000;

  // ==========================================================================
  // PARADAS EDITABLES POR EL AYUNTAMIENTO (gestor B2G)
  // ==========================================================================
  // Las paradas de serie viven en el bundle (`singleSource.ts`). El servidor
  // guarda solo lo que el técnico ha editado, y `fusionarParadas` decide:
  // si hay lista propia del recorrido, esa manda; si no, las del bundle.
  // Un fallo de red devuelve `null` y el mapa sigue con las suyas.
  const [paradasServidor, setParadasServidor] = useState<Record<string, ParadaGestion[]> | null>(null);

  useEffect(() => {
    const control = new AbortController();
    let vivo = true;
    cargarParadas(control.signal).then((datos) => {
      if (vivo) setParadasServidor(datos);
    });
    return () => {
      vivo = false;
      control.abort();
    };
  }, []);

  // Las paradas EFECTIVAS: las del servidor si las hay, las del bundle si no.
  const paradasEfectivas = useMemo(
    () => fusionarParadas(effectiveRouteId, selectedRoute.waypoints, paradasServidor),
    [effectiveRouteId, selectedRoute.waypoints, paradasServidor],
  );

  /**
   * `comercioId` es la asociación que el técnico fijó a mano en el gestor. Se
   * busca en la lista gestionada del servidor: si la parada viene del bundle no
   * hay asociación posible, y el servicio calcula los locales solo por radio.
   */
  const comercioAsociado = useCallback(
    (indice: number): string => {
      const gestionada = paradasServidor?.[effectiveRouteId]?.[indice];
      return gestionada?.comercioId ?? '';
    },
    [paradasServidor, effectiveRouteId],
  );

  // ---- Ficha de comercio de la parada seleccionada --------------------------
  // Se guarda el índice DENTRO del recorrido (`{rutaId, indice}`), no el índice
  // a secas. Así, cambiar de recorrido invalida la ficha por construcción — el
  // render ya no encuentra coincidencia y devuelve `null` — y no hace falta un
  // efecto que la cierre a posteriori (que además provocaría un render extra
  // y dejaría la ficha abierta un instante en el recorrido nuevo).
  const [seleccion, setSeleccion] = useState<{ rutaId: string; indice: number } | null>(null);

  const paradaSeleccionada =
    seleccion && seleccion.rutaId === effectiveRouteId ? seleccion.indice : null;

  const fichaParada = useMemo(() => {
    if (paradaSeleccionada === null) return null;
    const parada = paradasEfectivas[paradaSeleccionada];
    if (!parada) return null;
    return comerciosDeParada(parada, { comercioId: comercioAsociado(paradaSeleccionada) });
  }, [paradaSeleccionada, paradasEfectivas, comercioAsociado]);

  // ---- Comercio local a lo largo del recorrido --------------------------------
  // Une los locales que rodean cada parada (mismo cálculo que la ficha) para
  // poner en valor al comercio de los barrios por los que pasa la comparsa.
  const comercioRuta = useMemo(() => {
    const vistos = new Map<string, Patrocinador>();
    paradasEfectivas.forEach((parada, indice) => {
      comerciosDeParada(parada, { comercioId: comercioAsociado(indice) }).comercios.forEach((c) => {
        if (!vistos.has(c.id)) vistos.set(c.id, c);
      });
    });
    return [...vistos.values()];
  }, [paradasEfectivas, comercioAsociado]);

  // Filtro rápido por tipo de comercio.
  const [filtroComercio, setFiltroComercio] = useState<'todos' | 'hosteleria' | 'tradicional'>('todos');
  const comercioFiltrado = useMemo(
    () => comercioRuta.filter((c) => filtroComercio === 'todos' || GRUPO_COMERCIO[c.categoria] === filtroComercio),
    [comercioRuta, filtroComercio],
  );

  const handleStopSelect = useCallback(
    (_stop: { lat: number; lng: number; calle: string }, index: number) => {
      // Tocar la misma parada la cierra: es el gesto que espera quien ya ha
      // leído la ficha y quiere quitarse el panel de encima.
      setSeleccion((actual) =>
        actual && actual.rutaId === effectiveRouteId && actual.indice === index
          ? null
          : { rutaId: effectiveRouteId, indice: index },
      );
    },
    [effectiveRouteId],
  );

  const cerrarFichaParada = useCallback(() => setSeleccion(null), []);

  // ---- Aislamiento estricto de la transmision en vivo por recorrido ---------
  // Solo el recorrido habilitado ofrece GPS; el resto conserva el recorrido
  // seleccionado sin activar ni solicitar geolocalización.
  const isLiveRoute = selectedRoute?.id === PRUEBA_BARRIO.routeId;



  // Si el recorrido seleccionado no tiene GPS habilitado, se muestra siempre
  // su recorrido simulado. El modo se deriva en render para evitar estados
  // contradictorios al cambiar de barrio.
  const effectiveMode: 'simulation' | 'gps' = isLiveRoute ? positionMode : 'simulation';
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
  const pendingRouteStartRef = useRef(false);
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

  // ---- Modo en directo -----------------------------------------------------
  // La posición real llega del EMISOR (móvil de la comparsa) a través del relay:
  // GET /api/location/latest?token=cmp_prueba_barrio. El visitante NUNCA
  // comparte su propia ubicación, así que `usePosition` se queda siempre en
  // simulación y se pausa cuando el modo en directo está activo.
  const gpsActive = effectiveMode === 'gps';
  const relay = useRelayPosition(PRUEBA_BARRIO.id, gpsActive);
  const sourceMode: 'simulation' | 'gps' = 'simulation';

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

  useEffect(() => {
    if (gpsActive) pause();
  }, [gpsActive, pause]);

  // ---- Switch position mode ----
  const handleToggleMode = useCallback(() => {
    const nextMode = positionMode === 'simulation' ? 'gps' : 'simulation';
    setPositionMode(nextMode);
  }, [positionMode]);

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
    pendingRouteStartRef.current = true;
    setSelectedRouteId(e.target.value);
    setPositionMode('simulation');
    reset();
  }, [reset]);

  useEffect(() => {
    if (!pendingRouteStartRef.current) return;
    const timer = window.setTimeout(() => {
      if (!pendingRouteStartRef.current) return;
      pendingRouteStartRef.current = false;
      reset();
      play();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [routeChangeToken, reset, play]);

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
  const relayLat = relay.position?.lat;
  const relayLng = relay.position?.lng;
  const comparsaPos = useMemo<[number, number] | null>(() => {
    if (gpsActive) {
      return relayLat !== undefined && relayLng !== undefined ? ([relayLat, relayLng] as [number, number]) : null;
    }
    return Number.isFinite(simState.lat) && Number.isFinite(simState.lng)
      ? ([simState.lat, simState.lng] as [number, number])
      : null;
  }, [gpsActive, relayLat, relayLng, simState.lat, simState.lng]);

  // Estado legible del modo en directo (mismo criterio que el visor: 15 s).
  const liveState: 'live' | 'stale' | 'waiting' = !relay.position
    ? 'waiting'
    : relay.connected ? 'live' : 'stale';
  const liveText =
    liveState === 'live'
      ? `En directo · hace ${relay.ageSeconds} s${relay.position ? ` · ±${Math.round(relay.position.accuracyM)} m` : ''}`
      : liveState === 'stale'
        ? `Señal perdida hace ${relay.ageSeconds} s`
        : 'Esperando señal del emisor…';

  // ---- Estado que consume el mapa lazy ----
  // Los iconos (avatar de la comparsa y pin de parada) se crean dentro del
  // chunk del mapa: la pagina solo le pasa los datos primitivos.
  const comparsaStatusLine =
    gpsActive
      ? liveText
      : simState.status === 'Parada'
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
                    {route.characterEmoji} {route.nombre}
                  </option>
                ))
              ) : (
                <option value="">No hay recorridos que coincidan</option>
              )}
            </select>
          </div>

          {/* 3. GPS access and route player */}
          <div className="sim-actions-panel">
            {/* La ubicación solo se solicita cuando se activa GPS en el recorrido habilitado. */}
            <div className="gps-mode-row">
              <button
                className={`lock-btn gps-mode-btn ${effectiveMode === 'gps' ? 'active' : ''} ${isLiveRoute ? '' : 'is-disabled'}`}
                onClick={isLiveRoute ? handleToggleMode : undefined}
                disabled={!isLiveRoute}
                aria-pressed={effectiveMode === 'gps'}
                aria-disabled={!isLiveRoute}
                title={
                  isLiveRoute
                    ? effectiveMode === 'gps'
                      ? 'Detener el GPS de este dispositivo'
                      : 'Activar el GPS de este dispositivo para este recorrido'
                    : 'GPS no disponible para este recorrido'
                }
              >
                <FaSatellite size={12} />
                <span>{effectiveMode === 'gps' ? 'Desactivar GPS' : 'Activar GPS'}</span>
              </button>
            </div>

            {/* Indica por qué el control GPS está bloqueado en otros recorridos. */}
            {!isLiveRoute && (
              <p className="gps-live-status" data-state="offline" style={{ marginBottom: '10px' }}>
                <span className="gps-live-status-dot" aria-hidden="true" />
                El GPS solo está disponible para el recorrido habilitado
              </p>
            )}

            <AnimatePresence initial={false} mode="wait">
            {gpsActive && (
              <motion.p
                key={liveState}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22 }}
                className="gps-live-status" data-state={liveState === 'live' ? 'live' : liveState === 'waiting' ? 'waiting' : 'offline'} role="status" aria-live="polite">
                <span className="gps-live-status-dot" aria-hidden="true" />
                {liveText}
              </motion.p>
            )}
            </AnimatePresence>

            {gpsActive && relay.position && (
              <a
                className="share-whatsapp"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🎭 ¡La comparsa está en directo! Ahora mismo en https://www.google.com/maps?q=${relay.position.lat.toFixed(5)},${relay.position.lng.toFixed(5)} · Síguela en el mapa: ${window.location.origin}/gps-live?token=${PRUEBA_BARRIO.id}`,
                )}`}
              >
                <span aria-hidden="true">💬</span> Compartir por WhatsApp
              </a>
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

            {/* Follow lock option */}
            <button
              className={`lock-btn ${followMode ? 'active' : ''}`}
              onClick={() => setFollowMode(!followMode)}
            >
              <FaLocationArrow />
              <span>{followMode ? 'Seguimiento Activo' : 'Cámara Libre'}</span>
            </button>
          </div>

          {/* Comercio local: la comparsa pasa por sus puertas */}
          {comercioRuta.length > 0 && (
            <motion.aside
              key={effectiveRouteId}
              className="comercio-local-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              aria-label="Comercio local en este recorrido"
            >
              <p className="comercio-local-title">
                <span aria-hidden="true">🛍️</span> Apoya al comercio local
              </p>
              <p className="comercio-local-text">
                {comercioRuta.length === 1 ? '1 local' : `${comercioRuta.length} locales`} de los barrios por donde pasa la comparsa.
                Toca una parada del mapa para ver cuáles tienes cerca.
              </p>
              <div className="comercio-local-tabs" role="tablist" aria-label="Tipo de comercio">
                {(['todos', 'hosteleria', 'tradicional'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filtroComercio === f}
                    className={filtroComercio === f ? 'is-active' : ''}
                    onClick={() => setFiltroComercio(f)}
                  >
                    {f === 'todos' ? 'Todos' : f === 'hosteleria' ? '🍽️ Hostelería' : '🏪 Comercio tradicional'}
                  </button>
                ))}
              </div>
              <ul className="comercio-local-list">
                <AnimatePresence initial={false} mode="popLayout">
                  {comercioFiltrado.slice(0, 4).map((c) => (
                    <motion.li
                      key={c.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      style={{ '--chip': PATROCINIO_CATEGORIA_COLOR[c.categoria] } as React.CSSProperties}
                    >
                      <div className="comercio-local-item-head">
                        <span className="comercio-local-glyph" aria-hidden="true">{PATROCINIO_CATEGORIA_GLYPH[c.categoria]}</span>
                        <div>
                          <strong>{c.nombre}</strong>
                          <small>{c.direccion}</small>
                        </div>
                      </div>
                      <p>{c.gancho}</p>
                      <div className="comercio-local-cta">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}&travelmode=walking`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📍 Cómo llegar
                        </a>
                        {c.contacto && <a href={`tel:${c.contacto.replace(/\s+/g, '')}`}>📞 Llamar</a>}
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {comercioFiltrado.length === 0 && <li className="is-empty">No hay locales de este tipo en el recorrido.</li>}
              </ul>
              {comercioFiltrado.length > 4 && (
                <p className="comercio-local-more">+{comercioFiltrado.length - 4} más: toca las paradas del mapa.</p>
              )}
            </motion.aside>
          )}

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
                    {/* Kilometros, no metros: es la unidad en la que el
                        ciudadano piensa el recorrido de una cabalgata. */}
                    {(simState.distanceTraveled / 1000).toFixed(2).replace('.', ',')} km
                  </div>
                  <div className="dash-label">Kilómetros Recorridos</div>
                </div>
              </div>
              {/* Progreso del recorrido (0-100%). Sustituye a las dos tarjetas de
                  velocidad: en la vista publica la velocidad no aporta nada al
                  ciudadano y confundia al comparar chip GPS y calculo del panel. */}
              <div className="dash-card">
                <FaRoad className="dash-icon" style={{ color: 'hsl(var(--color-secondary))' }} />
                <div>
                  <div className="dash-num">{Math.round((simState.progress ?? 0) * 100)} %</div>
                  <div className="dash-label">Progreso del Recorrido</div>
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

          {/* ── Próximas paradas (y su comercio local) ── */}
          {/*
            Antes esta lista no existía: las paradas solo se veían si se tocaba
            el marcador en el mapa. Con el móvil en la mano, a dos metros de la
            calle, es mucho más cómodo tenerlas en columna y abrir la ficha desde
            ahí. Es la lista corta de la promesa de "Recorridos" como vista
            única del recorrido.
          */}
          <div className="paradas-lista">
            <div className="selector-label">Próximas paradas</div>
            {paradasEfectivas.length === 0 ? (
              <p className="paradas-lista-vacia">
                Este recorrido todavía no tiene paradas definidas.
              </p>
            ) : (
              <ul>
                {paradasEfectivas.map((parada, i) => (
                  <li key={`${parada.calle}-${i}`}>
                    <button
                      type="button"
                      className={`parada-item ${paradaSeleccionada === i ? 'is-activa' : ''}`}
                      onClick={() => handleStopSelect(parada, i)}
                      aria-expanded={paradaSeleccionada === i}
                    >
                      <span className="parada-item-idx">{i + 1}</span>
                      <span className="parada-item-nombre">{parada.calle}</span>
                      <FaChevronRight size={10} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </section>

        {/* Right Map Viewport */}
        <section className="map-wrapper">
          <Suspense fallback={<div className="recorridos-map-placeholder" role="status" aria-live="polite">Cargando mapa del recorrido...</div>}>
            <RecorridosMap
              routeColor={selectedRoute.color}
              frameRequest={gpsActive && relay.position ? { target: [relay.position.lat, relay.position.lng], nonce: relay.frameNonce } : null}
              routeGeometry={routeGeometryForAnim}
              layer={mapLayer}
              onLayerChange={handleLayerChange}
              stops={paradasEfectivas}
              onStopSelect={handleStopSelect}
              selectedStopIndex={paradaSeleccionada}
              fitWaypoints={routeWaypoints}
              fitBoundsEnabled={!isPlaying && effectiveMode === 'simulation'}
              comparsaPosition={comparsaPos}
              trail={gpsActive ? relay.trail : undefined}
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

          {/*
            Ficha de comercio de la parada.
            Va DENTRO de `.map-wrapper` (no junto a él) para poder fijarse al pie
            del mapa en móvil con `position: absolute`: es la respuesta a
            "¿qué tengo al lado?", y se consulta con el mapa delante.
          */}
          {fichaParada && (
            <div className="parada-ficha-posicion">
              <FichaParadaComercios ficha={fichaParada} onCerrar={cerrarFichaParada} />
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default Recorridos;
