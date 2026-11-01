import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

interface HomeLiveMapProps {
  position: [number, number];
  trail: [number, number][];
  label: string;
  accuracy: number;
}

function FollowPosition({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.panTo(position, { animate: true, duration: 0.6 });
  }, [map, position[0], position[1]]);

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function SmoothMarker({ position, icon, label }: { position: [number, number]; icon: L.DivIcon; label: string }) {
  const markerRef = useRef<L.Marker | null>(null);
  const initialPosition = useRef(position);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    const from = marker.getLatLng();
    const startedAt = performance.now();
    const durationMs = 700;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - (1 - progress) ** 3;
      marker.setLatLng([
        from.lat + (position[0] - from.lat) * eased,
        from.lng + (position[1] - from.lng) * eased,
      ]);
      if (progress < 1) animationRef.current = requestAnimationFrame(animate);
      else animationRef.current = null;
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [position[0], position[1]]);

  return (
    <Marker ref={markerRef} position={initialPosition.current} icon={icon}>
      <Popup>{label}</Popup>
    </Marker>
  );
}

export default function HomeLiveMap({ position, trail, label, accuracy }: HomeLiveMapProps) {
  const markerIcon = useMemo(() => L.divIcon({
    className: 'home-live-marker-shell',
    html: '<span class="home-live-marker" aria-hidden="true">🎭</span>',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  }), []);
  const accuracyRadius = Number.isFinite(accuracy) ? Math.min(Math.max(accuracy, 8), 120) : 20;

  return (
    <MapContainer
      center={position}
      zoom={16}
      minZoom={12}
      maxZoom={19}
      scrollWheelZoom={false}
      className="h-full w-full"
      aria-label="Mapa en directo del recorrido de la comparsa"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FollowPosition position={position} />
      {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#9f1239', weight: 5, opacity: 0.8 }} />}
      <Circle center={position} radius={accuracyRadius} pathOptions={{ color: '#9f1239', weight: 1, fillOpacity: 0.1 }} />
      <SmoothMarker position={position} icon={markerIcon} label={label} />
    </MapContainer>
  );
}
