import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { neighborhoodRoutes } from '../data/barriosData';
import { 
  FaPlay, 
  FaPause, 
  FaUndo, 
  FaClock, 
  FaRoad, 
  FaHourglassHalf, 
  FaChevronRight, 
  FaLocationArrow,
  FaFilter
} from 'react-icons/fa';

// Helper to calculate distance in meters between two coordinates
const getLatLngDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

// Component to dynamically fit the map bounds to the current route coordinates
interface BoundsUpdaterProps {
  waypoints: L.LatLng[];
  shouldCenter: boolean;
  comparsaPos: [number, number] | null;
}

const MapBoundsUpdater: React.FC<BoundsUpdaterProps> = ({ waypoints, shouldCenter, comparsaPos }) => {
  const map = useMap();
  const prevRouteRef = useRef<string>('');

  // Fit bounds when the route points change (on initial load of route)
  useEffect(() => {
    if (!map || waypoints.length < 2) return;
    const routeKey = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
    if (routeKey !== prevRouteRef.current) {
      prevRouteRef.current = routeKey;
      const bounds = L.latLngBounds(waypoints);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [map, waypoints]);

  // Center map on comparsa if 'follow mode' is active
  useEffect(() => {
    if (shouldCenter && comparsaPos && comparsaPos[0] && comparsaPos[1]) {
      map.setView(comparsaPos, map.getZoom(), { animate: true });
    }
  }, [map, comparsaPos, shouldCenter]);

  return null;
};

interface MapEventsProps {
  onDragStart: () => void;
}

const MapEventsHandler: React.FC<MapEventsProps> = ({ onDragStart }) => {
  useMapEvents({
    dragstart: onDragStart
  });
  return null;
};

export const Recorridos: React.FC = () => {
  // Filters state
  const [filterType, setFilterType] = useState<'todos' | 'municipal' | 'barrio'>('todos');
  const [filterCategory, setFilterCategory] = useState<'todos' | 'gigante' | 'cabezudo'>('todos');
  
  // Selected Route state
  const [selectedRouteId, setSelectedRouteId] = useState<string>(neighborhoodRoutes[0].id);

  // Simulation play state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [followMode, setFollowMode] = useState<boolean>(true); // Center view on cabezudo marker

  // Refs for tracking animation loops
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  // Filter routes list
  const filteredRoutes = neighborhoodRoutes.filter(route => {
    const matchesType = filterType === 'todos' || route.type === filterType;
    const matchesCategory = filterCategory === 'todos' || route.category === filterCategory;
    return matchesType && matchesCategory;
  });

  const selectedRoute = filteredRoutes.find((route) => route.id === selectedRouteId) ?? filteredRoutes[0] ?? neighborhoodRoutes[0];
  const points = selectedRoute.points;
  const durationMinutes = selectedRoute.duration;
  const totalDurationMs = durationMinutes * 60 * 1000;

  // Calculate segment distances and cumulative lengths for coordinates interpolation
  const getRouteMetrics = () => {
    let cumulative = 0;
    const segmentDistances: number[] = [];
    const cumulativeDistances: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const dist = getLatLngDistance(
        points[i].lat, points[i].lng,
        points[i + 1].lat, points[i + 1].lng
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

  const { segmentDistances, cumulativeDistances, totalDistance } = getRouteMetrics();
  const waypoints = points.map(p => L.latLng(p.lat, p.lng));

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
  }, [animate, isPlaying, selectedRouteId]);

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

    let currentLat = points[0].lat;
    let currentLng = points[0].lng;
    let currentStreet = points[0].streetName;
    let nextStreet = points[0].streetName;
    let isAtStop = false;
    let activeStopName = '';

    if (points.length > 1) {
      if (targetDistance <= 0) {
        currentLat = points[0].lat;
        currentLng = points[0].lng;
        currentStreet = points[0].streetName;
        nextStreet = points[1].streetName;
        isAtStop = points[0].isStop || false;
        activeStopName = points[0].streetName;
      } else if (targetDistance >= totalDistance) {
        const lastIdx = points.length - 1;
        currentLat = points[lastIdx].lat;
        currentLng = points[lastIdx].lng;
        currentStreet = points[lastIdx].streetName;
        nextStreet = 'Llegada';
        isAtStop = points[lastIdx].isStop || false;
        activeStopName = points[lastIdx].streetName;
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

        const pStart = points[segmentIdx];
        const pEnd = points[segmentIdx + 1];

        // LERP coordinates
        currentLat = pStart.lat + t * (pEnd.lat - pStart.lat);
        currentLng = pStart.lng + t * (pEnd.lng - pStart.lng);

        currentStreet = pStart.streetName;
        nextStreet = pEnd.streetName;

        // Check if close to a official stop point
        if (pStart.isStop && t < 0.1) {
          isAtStop = true;
          activeStopName = pStart.streetName;
        } else if (pEnd.isStop && t > 0.9) {
          isAtStop = true;
          activeStopName = pEnd.streetName;
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
  const comparsaPos: [number, number] = [simState.lat, simState.lng];

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
      
      {/* Styles for dynamic control panels & animations */}
      <style>{`
        .recorridos-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          height: calc(100vh - var(--header-height));
          overflow: hidden;
        }
        .left-controls {
          background: hsl(var(--color-bg-card));
          border-right: 1px solid hsl(var(--color-border));
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          z-index: 10;
        }
        .map-wrapper {
          position: relative;
          height: 100%;
          width: 100%;
        }
        .filter-section-wrapper {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-row {
          display: flex;
          gap: 6px;
        }
        .filter-btn-rec {
          flex: 1;
          padding: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: var(--border-radius-sm);
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-text-secondary));
          transition: all var(--transition-fast);
        }
        .filter-btn-rec.active {
          background: hsl(var(--color-primary));
          color: white;
          border-color: hsl(var(--color-primary));
        }
        .selector-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: hsl(var(--color-text-secondary));
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .route-dropdown {
          width: 100%;
          padding: 12px;
          border-radius: var(--border-radius-sm);
          border: 1px solid hsl(var(--color-border));
          background: hsl(var(--color-bg-secondary));
          color: hsl(var(--color-text-primary));
          font-family: var(--font-family);
          font-weight: 700;
          outline: none;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .route-info-box {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          box-shadow: var(--shadow-sm);
        }
        .route-badge {
          display: inline-block;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .badge-type-mun {
          background: rgba(209, 18, 31, 0.1);
          color: hsl(var(--brand-red));
        }
        .badge-type-bar {
          background: rgba(212, 175, 55, 0.15);
          color: #b89620;
        }
        .stats-dashboard {
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 16px;
          box-shadow: var(--shadow-sm);
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 14px;
        }
        .dash-card {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-sm);
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .dash-icon {
          font-size: 1.1rem;
          color: hsl(var(--color-primary));
        }
        .dash-num {
          font-weight: 800;
          font-size: 0.95rem;
          line-height: 1.2;
        }
        .dash-label {
          font-size: 0.7rem;
          color: hsl(var(--color-text-secondary));
        }
        .streets-scroller {
          max-height: 100px;
          overflow-y: auto;
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-sm);
          padding: 8px 12px;
          margin-top: 8px;
        }
        .street-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          margin-bottom: 4px;
        }
        .street-item.active {
          color: hsl(var(--color-primary));
          font-weight: 700;
        }
        .street-item.next {
          color: hsl(var(--color-accent));
          font-weight: 600;
        }
        .sim-actions-panel {
          background: hsl(var(--color-bg-secondary));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .play-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .control-circle-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-text-primary));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .control-circle-btn:hover {
          transform: scale(1.05);
          background: hsl(var(--color-border));
        }
        .control-circle-btn.playing {
          background: hsl(var(--color-primary));
          color: white;
          border-color: hsl(var(--color-primary));
        }
        .speed-group {
          display: flex;
          gap: 4px;
        }
        .speed-btn {
          padding: 6px 10px;
          font-size: 0.75rem;
          font-weight: 800;
          border-radius: var(--border-radius-sm);
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-text-secondary));
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .speed-btn.active {
          background: hsl(var(--color-accent));
          color: #3e2723;
          border-color: hsl(var(--color-accent));
        }
        .lock-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          border-radius: var(--border-radius-sm);
          background: hsl(var(--color-bg-card));
          border: 1px solid hsl(var(--color-border));
          color: hsl(var(--color-text-secondary));
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .lock-btn.active {
          background: rgba(2, 136, 209, 0.1);
          color: #0288d1;
          border-color: #0288d1;
        }
        .status-badge {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 12px;
          text-transform: uppercase;
        }
        .status-waiting { background: #e0e0e0; color: #616161; }
        .status-active { background: rgba(46, 125, 50, 0.15); color: #2e7d32; }
        .status-stopped { background: rgba(212, 175, 55, 0.15); color: #b89620; }
        .status-finished { background: rgba(211, 47, 47, 0.15); color: #d32f2f; }
        
        @media (max-width: 768px) {
          .recorridos-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            height: calc(100vh - var(--header-height) - var(--nav-height-mobile));
          }
          .left-controls {
            padding: 12px;
            gap: 12px;
            max-height: 280px;
            overflow-y: auto;
            border-right: none;
            border-bottom: 1px solid hsl(var(--color-border));
          }
          .dashboard-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>

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
                    {route.characterEmoji} {route.name} ({route.barrioName})
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
            <span className={`route-badge ${selectedRoute.type === 'municipal' ? 'badge-type-mun' : 'badge-type-bar'}`}>
              Comparsa {selectedRoute.type}
            </span>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '6px' }}>{selectedRoute.name}</h3>
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
            <MapBoundsUpdater 
              waypoints={waypoints} 
              shouldCenter={followMode} 
              comparsaPos={comparsaPos}
            />

            {/* Draw Parade Polyline */}
            <Polyline
              positions={points.map(p => [p.lat, p.lng] as [number, number])}
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
                    {stop.streetName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-secondary))', marginTop: '4px' }}>
                    La comparsa realiza un baile especial aquí.
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Draw Animated Comparsa/Cabezudo Marker */}
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
          </MapContainer>
        </section>

      </div>
    </div>
  );
};
export default Recorridos;
