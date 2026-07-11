import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { barrios } from '../data/singleSource';
import type { Route } from '../data/singleSource';
import { fetchOSRMRouteWithAutoFix, osrmToLatLng } from '../services/routingService';
import { getRouteMetrics } from '../services/animationService';
import { usePosition } from '../services/position';
import type { PositionSourceConfig } from '../services/position';
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

// ---------------------------------------------------------------------------
// Leaflet helper components
// ---------------------------------------------------------------------------

interface MapEventsProps {
  onDragStart: () => void;
}

const MapEventsHandler: React.FC<MapEventsProps> = ({ onDragStart }) => {
  useMapEvents({ dragstart: onDragStart });
  return null;
};

interface AutoFitBoundsProps {
  waypoints: { lat: number; lng: number }[];
  enabled: boolean;
}

const AutoFitBounds: React.FC<AutoFitBoundsProps> = ({ waypoints, enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    if (!waypoints || waypoints.length < 2) return;
    if (!map || !map.getCenter) return;

    // Defer to next frame to ensure map container is fully rendered
    const frameId = requestAnimationFrame(() => {
      if (!map || !map.getCenter) return;
      const bounds = L.latLngBounds(waypoints.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17, animate: true });
    });

    return () => cancelAnimationFrame(frameId);
  }, [enabled, map, waypoints]);

  return null;
};

const FollowMarker: React.FC<{
  position: [number, number];
  enabled: boolean;
}> = ({ position, enabled }) => {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !position) return;
    if (!map || !map.getCenter) return;

    // Defer to next frame to ensure map container is fully rendered
    const frameId = requestAnimationFrame(() => {
      if (!map || !map.getCenter) return;
      const currentZoom = map.getZoom();
      if (typeof currentZoom !== 'number' || !Number.isFinite(currentZoom)) return;
      map.setView(position, currentZoom, { animate: true });
    });

    return () => cancelAnimationFrame(frameId);
  }, [enabled, map, position]);

  return null;
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export const Recorridos: React.FC = () => {
  // ---- Filters ----
  const [filterType, setFilterType] = useState<'todos' | 'municipal' | 'barrio'>('todos');
  const [filterCategory, setFilterCategory] = useState<'todos' | 'gigante' | 'cabezudo'>('todos');

  const location = useLocation();
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
  const points = selectedRoute.waypoints;
  const durationMinutes = selectedRoute.durationMinutes;
  const totalDurationMs = durationMinutes * 60 * 1000;

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

  // ---- Use the unified position hook ----
  const {
    state: simState,
    mode,
    play,
    pause,
    reset,
    setSpeed,
    isPlaying,
    speed,
    setMode,
  } = usePosition({
    mode: positionMode,
    config: positionConfig,
    gpsOptions: positionMode === 'gps' ? {
      wsUrl: 'wss://paginacabexudos.onrender.com',
      token: selectedRouteId === 'cmp_prueba_barrio' || selectedRouteId === 'prueba-barrio-san-jose' ? 'cmp_prueba_barrio' : selectedRouteId,
    } : undefined,

  });

  // ---- Switch position mode ----
  const handleToggleMode = useCallback(() => {
    const nextMode = positionMode === 'simulation' ? 'gps' : 'simulation';
    setPositionMode(nextMode);
    setMode(nextMode);
  }, [positionMode, setMode]);

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

  // ---- Validated position for marker ----
  const comparsaPos = (
    Number.isFinite(simState.lat) && Number.isFinite(simState.lng)
      ? ([simState.lat, simState.lng] as [number, number])
      : null
  );

  // ---- Marker Icons ----
  const comparsaIcon = L.divIcon({
    className: 'custom-map-icon',
    html: `<div class="marker-pin" style="background: hsl(var(--color-primary)); animation: pulse 1s infinite"><div class="marker-inner-content">${selectedRoute.characterEmoji}</div></div>`,
    iconSize: [38, 48],
    iconAnchor: [19, 48],
  });

  const stopIcon = L.divIcon({
    className: 'custom-map-icon',
    html: `<div class="marker-pin" style="background: hsl(var(--brand-garnet))"><div class="marker-inner-content" style="color: white; font-weight:700; font-size:10px">St</div></div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
  });

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
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
<button
                className={`lock-btn ${mode === 'simulation' ? 'active' : ''}`}
                onClick={mode === 'simulation' ? undefined : handleToggleMode}
                title="Cambiar a modo demostración"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <FaDesktop size={12} />
                <span>Demo</span>
              </button>
              <button
                className={`lock-btn ${mode === 'gps' ? 'active' : ''}`}
                onClick={mode === 'gps' ? undefined : handleToggleMode}
                title="Cambiar a modo GPS real"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <FaSatellite size={12} />
                <span>GPS Real</span>
              </button>
            </div>

            {mode === 'simulation' && (
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
                    {[1, 2, 4].map(s => (
                      <button
                        key={s}
                        className={`speed-btn ${speed === s ? 'active' : ''}`}
                        onClick={() => setSpeed(s)}
                      >
                        x{s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

{mode === 'gps' && (
              <div style={{ padding: '8px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-secondary))', marginBottom: '4px' }}>
                  📡 Modo GPS activo
                </div>
                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))', marginBottom: '10px' }}>
                  Enviando posición desde tu teléfono
                </div>
              </div>
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
                  <div className="dash-num">{simState.simulatedTime}</div>
                  <div className="dash-label">Hora Simulada</div>
                </div>
              </div>
              <div className="dash-card">
                <FaHourglassHalf className="dash-icon" />
                <div>
                  <div className="dash-num">{simState.timeRemaining} min</div>
                  <div className="dash-label">Tiempo Restante</div>
                </div>
              </div>
              <div className="dash-card" style={{ gridColumn: '1 / -1' }}>
                <FaRoad className="dash-icon" style={{ color: 'hsl(var(--color-accent))' }} />
                <div style={{ flex: 1 }}>
                  <div className="dash-num">
                    {simState.distanceTraveled} m / {(metrics.totalDistance / 1000).toFixed(2)} km
                  </div>
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
          </div>

        </section>

        {/* Right Map Viewport */}
        <section className="map-wrapper">
          <MapContainer
            center={[41.6568, -0.8783]}
            zoom={15}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapEventsHandler onDragStart={() => setFollowMode(false)} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Follow-mode camera tracking - enabled for both simulation and GPS */}
            {comparsaPos && <FollowMarker position={comparsaPos} enabled={followMode && (isPlaying || mode === 'gps')} />}

            {/* Auto-centering on route change */}
            <AutoFitBounds waypoints={routeWaypoints} enabled={!isPlaying && mode === 'simulation'} />

            {/* Draw Parade Polyline */}
            <Polyline
              positions={routeGeometryForAnim.map(p => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: selectedRoute.color, weight: 6, opacity: 0.8 }}
            />

            {/* Draw Parade Stops */}
            {points.filter(p => p.isStop).map((stop, index) => (
              <Marker
                key={index}
                position={[stop.lat, stop.lng]}
                icon={stopIcon}
              >
                <Popup>
                  <div style={{ fontWeight: 800 }}>📌 Parada Oficial</div>
                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--color-text-primary))' }}>
                    {stop.calle}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-secondary))', marginTop: '4px' }}>
                    La comparsa realiza un baile especial aquí.
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Draw Animated Comparsa/Cabezudo Marker */}
            {comparsaPos && (
              <Marker
                key={`${simState.lat}-${simState.lng}`}
                position={comparsaPos}
                icon={comparsaIcon}
                eventHandlers={{ click: () => setFollowMode(true) }}
              >
                <Popup>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{selectedRoute.characterEmoji}</div>
                    <div style={{ fontWeight: 800, color: 'hsl(var(--color-primary))' }}>
                      {selectedRoute.characterName}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {simState.status === 'Parada'
                        ? `Parada en ${simState.activeStopName}`
                        : `Recorriendo ${simState.currentStreet}`}
                    </div>
                    <button
                      className="btn-primary"
                      style={{ padding: '4px 10px', fontSize: '0.7rem', marginTop: '8px', borderRadius: '4px' }}
                      onClick={() => setFollowMode(true)}
                    >
                      Centrar Cámara
                    </button>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </section>

      </div>
    </div>
  );
};

export default Recorridos;