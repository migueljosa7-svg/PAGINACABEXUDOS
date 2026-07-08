import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { barrios } from '../data/singleSource';
import type { Route } from '../data/singleSource';
import { fetchOSRMRouteWithAutoFix, haversineDistance, osrmToLatLng } from '../services/routingService';
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
} from 'react-icons/fa';
import '../styles/recorridos.css';


// NOTE: Previously a MapViewportController component existed here, but the current implementation
// centers the map via MapBoundsUpdater. Keeping this file lean avoids unused-vars lint errors.



interface MapEventsProps {
  onDragStart: () => void;
}

const MapEventsHandler: React.FC<MapEventsProps> = ({ onDragStart }) => {
  useMapEvents({
    dragstart: onDragStart
  });
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

    const bounds = L.latLngBounds(waypoints.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17, animate: true });
  }, [enabled, map, waypoints]);

  return null;
};

export const Recorridos: React.FC = () => {
  // Filters state
  const [filterType, setFilterType] = useState<'todos' | 'municipal' | 'barrio'>('todos');
  const [filterCategory, setFilterCategory] = useState<'todos' | 'gigante' | 'cabezudo'>('todos');

  const location = useLocation();
  const barrioQueryId = new URLSearchParams(location.search).get('barrio');

  // Routes derived from singleSource
  const routeList = useMemo<Route[]>(() => {
    // singleSource exposes exactly-one route per barrio.
    return barrios.map((b) => b.recorrido);
  }, []);

  const initialSelectedRouteId = useMemo(() => {
    if (barrioQueryId) return barrioQueryId;
    return routeList[0]?.id ?? '';
  }, [barrioQueryId, routeList]);

  // Selected Route state
  const [selectedRouteId, setSelectedRouteId] = useState<string>(initialSelectedRouteId);



  // Simulation play state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [followMode, setFollowMode] = useState<boolean>(true); // Center view on cabezudo marker

  // Refs for tracking animation loops
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  // Filter routes list (singleSource: solo barrios)
  const filteredRoutes: Route[] = useMemo(() => {
    const base = routeList;
    return base.filter((route) => {
      const matchesType = filterType === 'todos' || filterType === 'barrio';
      const matchesCategory = filterCategory === 'todos' || route.category === filterCategory;
      return matchesType && matchesCategory;
    });
  }, [routeList, filterType, filterCategory]);

  const selectedRoute =
    filteredRoutes.find((route) => route.id === selectedRouteId) ?? filteredRoutes[0] ?? routeList[0];

  const routeChangeToken = selectedRoute?.id ?? 'unknown';

  const points = selectedRoute.waypoints;
  const durationMinutes = selectedRoute.durationMinutes;
  const totalDurationMs = durationMinutes * 60 * 1000;


  const streetPoints = points.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    streetName: p.calle,
    isStop: p.isStop,
  }));



  // -------- OSRM state + cache (memory) --------
  type OsrmRouteState = {
    coordinates: { lat: number; lng: number }[];
    distance: number; // meters
    duration: number; // seconds (OSRM)
  };

  // Simple in-memory cache to avoid repeated OSRM calls per session
  // Key is built from ordered waypoints (rounded to reduce cache misses)
  const osrmCacheRef = useRef<Map<string, OsrmRouteState>>(new Map());



  const routeWaypoints = points.map((p) => ({ lat: p.lat, lng: p.lng }));


  const osrmCacheKey = useCallback((wps: { lat: number; lng: number }[]) => {
    return wps
      .map((wp) => `${wp.lat.toFixed(5)},${wp.lng.toFixed(5)}`)
      .join('|');
  }, []);


  // Build route metrics for interpolation. If OSRM is available we use its geometry.
  const getRouteMetrics = (coords: { lat: number; lng: number }[]) => {
    let cumulative = 0;
    const segmentDistances: number[] = [];
    const cumulativeDistances: number[] = [];

    for (let i = 0; i < coords.length - 1; i++) {
      const dist = haversineDistance(
        coords[i].lat, coords[i].lng,
        coords[i + 1].lat, coords[i + 1].lng
      );
      segmentDistances.push(dist);
      cumulative += dist;
      cumulativeDistances.push(cumulative);
    }

    return {
      segmentDistances,
      cumulativeDistances,
      totalDistance: cumulative
    };
  };

  const [routeGeometryForAnim, setRouteGeometryForAnim] = useState<{ lat: number; lng: number }[]>(
    routeWaypoints
  );

  // Reset everything when the route changes (single source of truth)
  useEffect(() => {
    setIsPlaying(false);
    setElapsedTimeMs(0);
    previousTimeRef.current = null;

    // Reset geometry to the original waypoints while OSRM re-fetches
    setRouteGeometryForAnim(routeWaypoints);

    // If an animation frame is running, stop it
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }

    // Also enable followMode; user can turn it off afterwards
    setFollowMode(true);
  }, [routeChangeToken, routeWaypoints]);


  // const waypoints = points.map((p) => L.latLng(p.lat, p.lng));
  // (eliminado porque MapBoundsUpdater fue removido y esta variable ya no se usa)

  const { segmentDistances, cumulativeDistances, totalDistance } = getRouteMetrics(routeGeometryForAnim);


  // Main animation frame updater (Lerp)
  const animate = useCallback(function animate(time: number) {
    if (previousTimeRef.current !== null) {
      const delta = time - previousTimeRef.current;
      setElapsedTimeMs(prev => {
        const next = prev + delta * speed;
        if (next >= totalDurationMs) {
          setIsPlaying(false);
          return totalDurationMs;
        }
        return next;
      });
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [speed, totalDurationMs]);

  // -------- OSRM fetch (with cache + obsolete response protection) --------
  const lastOsrmRequestIdRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++lastOsrmRequestIdRef.current;

    const doFetch = async () => {
      if (routeWaypoints.length < 2) {
        setRouteGeometryForAnim(routeWaypoints);
        return;
      }

      const key = osrmCacheKey(routeWaypoints);
      const cached = osrmCacheRef.current.get(key);
      if (cached) {
        setRouteGeometryForAnim(cached.coordinates);
        return;
      }

      const fixRes = await fetchOSRMRouteWithAutoFix(routeWaypoints);
      console.log(fixRes);
      if (cancelled) return;
      if (requestId !== lastOsrmRequestIdRef.current) return; // ignore obsolete

      if (!fixRes.geometry) {
        console.warn(
          "OSRM no devolvió geometría, usando waypoints originales",
          fixRes
        );

        setRouteGeometryForAnim(routeWaypoints);
        return;
      }

      // IMPORTANT: no teleport while playing.
      // We only update geometry when not playing; otherwise we keep the current geometry
      // until the user pauses/resets or switches route.
      const coordsLatLng = osrmToLatLng(fixRes.geometry.coordinates);
      const nextState: OsrmRouteState = {
        coordinates: coordsLatLng,
        distance: fixRes.geometry.distance,
        duration: fixRes.geometry.duration,
      };

      // Cache siempre
      osrmCacheRef.current.set(key, nextState);

      // No teletransportar mientras se reproduce.
      if (!isPlaying) {
        setRouteGeometryForAnim(coordsLatLng);
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [routeWaypoints, osrmCacheKey, isPlaying]);

  // Trigger loop on play/pause changes
  useEffect(() => {
    if (isPlaying) {
      previousTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate, selectedRouteId, isPlaying]);

  // Handle simulation triggers
  const handlePlayPause = () => {
    if (elapsedTimeMs >= totalDurationMs) {
      setElapsedTimeMs(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setElapsedTimeMs(0);
    previousTimeRef.current = null;
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  };

  // Interpolate active position of the comparsa marker
  const getInterpolatedPosition = () => {
    const progress = Math.min(elapsedTimeMs / totalDurationMs, 1);
    const targetDistance = progress * totalDistance;

    const animCoords = routeGeometryForAnim;

    let currentLat = animCoords[0]?.lat ?? points[0].lat;
    let currentLng = animCoords[0]?.lng ?? points[0].lng;
    let currentStreet = streetPoints[0]?.streetName ?? points[0].calle;
    let nextStreet = streetPoints[0]?.streetName ?? points[0].calle;
    let isAtStop = false;
    let activeStopName = '';


    if (animCoords.length > 1) {

      if (targetDistance <= 0) {
        currentLat = animCoords[0]?.lat ?? points[0].lat;
        currentLng = animCoords[0]?.lng ?? points[0].lng;
        currentStreet = streetPoints[0]?.streetName ?? points[0].calle;
        nextStreet = streetPoints[1]?.streetName ?? points[1]?.calle;
        isAtStop = points[0].isStop || false;
        activeStopName = streetPoints[0]?.streetName ?? points[0].calle;

      } else if (targetDistance >= totalDistance) {
        const lastIdx = animCoords.length - 1;
        currentLat = animCoords[lastIdx]?.lat ?? points[points.length - 1].lat;
        currentLng = animCoords[lastIdx]?.lng ?? points[points.length - 1].lng;
        currentStreet = streetPoints[points.length - 1]?.streetName ?? points[points.length - 1].calle;
        nextStreet = 'Llegada';
        isAtStop = points[points.length - 1].isStop || false;
        activeStopName = streetPoints[points.length - 1]?.streetName ?? points[points.length - 1].calle;

      } else {
        // Find segment index
        let segmentIdx = 0;
        for (let i = 0; i < cumulativeDistances.length; i++) {
          if (targetDistance < cumulativeDistances[i]) {
            segmentIdx = i;
            break;
          }
        }

        const prevCumulative = segmentIdx === 0 ? 0 : cumulativeDistances[segmentIdx - 1];
        const segmentProgress = targetDistance - prevCumulative;
        const segmentLength = segmentDistances[segmentIdx];
        const t = segmentProgress / segmentLength; // Interpolation factor (0 to 1)

        const pStart = animCoords[segmentIdx];
        const pEnd = animCoords[segmentIdx + 1];

        // LERP coordinates
        currentLat = pStart.lat + t * (pEnd.lat - pStart.lat);
        currentLng = pStart.lng + t * (pEnd.lng - pStart.lng);

        // Keep street/stop UI based on the original program points
        // (OSRM geometry is too granular to map 1:1 to street names/official stop flags)
        currentStreet = streetPoints[segmentIdx]?.streetName ?? currentStreet;
        nextStreet = streetPoints[segmentIdx + 1]?.streetName ?? nextStreet;

        const pStartProg = streetPoints[segmentIdx];
        const pEndProg = streetPoints[segmentIdx + 1];

        if (pStartProg?.isStop && t < 0.1) {
          isAtStop = true;
          activeStopName = pStartProg.streetName;
        } else if (pEndProg?.isStop && t > 0.9) {
          isAtStop = true;
          activeStopName = pEndProg.streetName;
        }

      }
    }

    // Calculate simulated current time
    const [startH, startM] = selectedRoute.timeString.split(':').map(Number);
    const elapsedMinutes = progress * durationMinutes;
    const totalMinutes = startH * 60 + startM + elapsedMinutes;
    const currentH = Math.floor(totalMinutes / 60) % 24;
    const currentM = Math.floor(totalMinutes % 60);
    const simulatedTime = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

    // Status logic
    const status: 'Esperando inicio' | 'En marcha' | 'Parada' | 'Finalizado' = elapsedTimeMs === 0
      ? 'Esperando inicio'
      : elapsedTimeMs >= totalDurationMs
        ? 'Finalizado'
        : isAtStop
          ? 'Parada'
          : 'En marcha';

    return {
      lat: currentLat,
      lng: currentLng,
      currentStreet,
      nextStreet,
      simulatedTime,
      distanceTraveled: Math.round(targetDistance),
      timeRemaining: Math.max(0, Math.round(durationMinutes * (1 - progress))),
      status,
      activeStopName
    };
  };

  const simState = getInterpolatedPosition();

  // Guard against undefined/NaN positions during route switching/animation
  const comparsaPos = (
    Number.isFinite(simState.lat) && Number.isFinite(simState.lng)
      ? ([simState.lat, simState.lng] as [number, number])
      : null
  );

  // Custom marker icons
  const comparsaIcon = L.divIcon({
    className: 'custom-map-icon',
    html: `<div class="marker-pin" style="background: hsl(var(--color-primary)); animation: pulse 1s infinite"><div class="marker-inner-content">${selectedRoute.characterEmoji}</div></div>`,
    iconSize: [38, 48],
    iconAnchor: [19, 48]
  });

  const stopIcon = L.divIcon({
    className: 'custom-map-icon',
    html: `<div class="marker-pin" style="background: hsl(var(--brand-garnet))"><div class="marker-inner-content" style="color: white; font-weight:700; font-size:10px">St</div></div>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34]
  });

  return (
    <div className="recorridos-page" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      
      <div className="recorridos-grid">
        
        {/* Left Control Panel */}
        <section className="left-controls">
          
          {/* 1. Category & Type Filters */}
          <div className="filter-section-wrapper">
            <div className="selector-label">
              <FaFilter size={10} style={{ marginRight: '6px' }} />
              Filtros de Recorridos
            </div>
            
            {/* Municipal vs Neighborhood comparsas */}
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

            {/* Giants vs Big-Heads */}
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
              value={selectedRouteId}
              onChange={(e) => {
                setSelectedRouteId(e.target.value);
                handleReset();
              }}
            >
              {filteredRoutes.length > 0 ? (
                filteredRoutes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.characterEmoji} {route.nombre} ({route.barrioId})
                  </option>
                ))
              ) : (
                <option value="">No hay recorridos que coincidan</option>
              )}
            </select>
          </div>

          {/* 3. Simulation Player Dashboard */}
          <div className="sim-actions-panel">
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

              {/* Speed modifiers */}
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
                    {simState.distanceTraveled} m / {(totalDistance / 1000).toFixed(2)} km
                  </div>
                  <div className="dash-label">Progreso del Recorrido</div>
                </div>
              </div>
            </div>

            {/* Next Streets information */}
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

            {/* 6. Route Description */}
          <div className="route-info-box">

            {/* 7. Map legend (legend) */}
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
            <span className={`route-badge ${'badge-type-bar'}`}>
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
            center={[41.6568, -0.8783]} // Zaragoza center
            zoom={15}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapEventsHandler onDragStart={() => setFollowMode(false)} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Setup Viewport Follow Tracker */}
            {/* NOTE: MapBoundsUpdater removed (it was not defined in this file/project). */}

            {/* Auto-centering on route change */}
            <AutoFitBounds waypoints={routeWaypoints} enabled={!isPlaying} />

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
                position={comparsaPos} 
                icon={comparsaIcon}
                eventHandlers={{
                  click: () => {
                  setFollowMode(true); // Lock camera onto marker when clicked
                }
              }}
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '4px' }}>{selectedRoute.characterEmoji}</div>
                  <div style={{ fontWeight: 800, color: 'hsl(var(--color-primary))' }}>
                    {selectedRoute.characterName}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {simState.status === 'Parada' ? `Parada en ${simState.activeStopName}` : `Recorriendo ${simState.currentStreet}`}
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
